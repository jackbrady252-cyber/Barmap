-- BARMAP Supabase schema.
-- Run this in the Supabase SQL editor for the project connected by
-- NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.

-- Profiles are public-facing account records linked 1:1 to Supabase Auth users.
-- Sensitive account data stays in auth.users; this table only stores app profile fields.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (
    char_length(username) >= 3
    and char_length(username) <= 32
    and username ~ '^[a-z0-9_]+$'
  ),
  display_name text not null,
  avatar_url text not null default '',
  bio text not null default '',
  home_city text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists profiles_username_idx
  on public.profiles (username);

alter table public.profiles enable row level security;

-- Safe public profile reads. These rows should not contain private auth data.
drop policy if exists "Anyone can read profiles" on public.profiles;
drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

-- Authenticated users can only create the profile row linked to their auth user id.
drop policy if exists "Users can create their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- Authenticated users can only edit their own profile.
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Automatically create a profile whenever a Supabase Auth user signs up.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
begin
  base_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'athlete'), '[^a-zA-Z0-9_]+', '_', 'g'));
  base_username := trim(both '_' from base_username);

  insert into public.profiles (id, username, display_name, avatar_url, bio, home_city)
  values (
    new.id,
    left(coalesce(nullif(base_username, ''), 'athlete'), 15) || '_' || substr(new.id::text, 1, 8),
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1), 'BARMAP Athlete'),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    coalesce(new.raw_user_meta_data->>'bio', ''),
    coalesce(new.raw_user_meta_data->>'home_city', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  caption text not null check (char_length(caption) <= 2200),
  media_type text not null check (media_type in ('image', 'video')),
  media_url text not null default '',
  park_id integer,
  location_name text,
  location_area text,
  mission_tag text,
  likes_count integer not null default 0 check (likes_count >= 0),
  comments_count integer not null default 0 check (comments_count >= 0),
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx
  on public.posts (created_at desc);

create index if not exists posts_user_created_at_idx
  on public.posts (user_id, created_at desc);

create index if not exists posts_park_created_at_idx
  on public.posts (park_id, created_at desc)
  where park_id is not null;

alter table public.posts enable row level security;

drop policy if exists "Anyone can read posts" on public.posts;
create policy "Anyone can read posts"
  on public.posts
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Users can create their own posts" on public.posts;
create policy "Users can create their own posts"
  on public.posts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own posts" on public.posts;
create policy "Users can update their own posts"
  on public.posts
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts"
  on public.posts
  for delete
  to authenticated
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media',
  'post-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can read post media" on storage.objects;
create policy "Anyone can read post media"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'post-media');

drop policy if exists "Users can upload their own post media" on storage.objects;
create policy "Users can upload their own post media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own post media" on storage.objects;
create policy "Users can update their own post media"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own post media" on storage.objects;
create policy "Users can delete their own post media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create table if not exists public.submitted_spots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  area text not null,
  lat double precision not null,
  lng double precision not null,
  equipment text[] not null default '{}',
  hidden_level text not null default 'Easy to find',
  best_time text not null default '',
  notes text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists submitted_spots_status_created_at_idx
  on public.submitted_spots (status, created_at desc);

alter table public.submitted_spots enable row level security;

drop policy if exists "Anyone can submit pending spots" on public.submitted_spots;
create policy "Anyone can submit pending spots"
  on public.submitted_spots
  for insert
  to anon, authenticated
  with check (status = 'pending');

drop policy if exists "Anyone can read submitted spots" on public.submitted_spots;
create policy "Anyone can read submitted spots"
  on public.submitted_spots
  for select
  to anon, authenticated
  using (true);
