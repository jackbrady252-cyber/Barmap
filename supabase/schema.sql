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
  user_status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists user_status text not null default 'pending';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_user_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_user_status_check
      check (user_status in ('pending', 'approved', 'rejected'));
  end if;
end;
$$;

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

  insert into public.profiles (id, username, display_name, avatar_url, bio, home_city, user_status)
  values (
    new.id,
    left(coalesce(nullif(base_username, ''), 'athlete'), 15) || '_' || substr(new.id::text, 1, 8),
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1), 'BARMAP Athlete'),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    coalesce(new.raw_user_meta_data->>'bio', ''),
    coalesce(new.raw_user_meta_data->>'home_city', ''),
    case
      when lower(coalesce(new.email, '')) = 'jackbrady252@gmail.com' then 'approved'
      else 'pending'
    end
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

create table if not exists public.saved_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

create index if not exists saved_posts_user_created_at_idx
  on public.saved_posts (user_id, created_at desc);

create index if not exists saved_posts_user_post_idx
  on public.saved_posts (user_id, post_id);

alter table public.saved_posts enable row level security;

drop policy if exists "Users can read their own saved posts" on public.saved_posts;
create policy "Users can read their own saved posts"
  on public.saved_posts
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can save posts for themselves" on public.saved_posts;
create policy "Users can save posts for themselves"
  on public.saved_posts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can unsave their own posts" on public.saved_posts;
create policy "Users can unsave their own posts"
  on public.saved_posts
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

-- Internal admin access. Admins are identified by auth email so the first
-- administrator can be bootstrapped before their auth user id is known.
create table if not exists public.app_admins (
  email text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

insert into public.app_admins (email)
values ('jackbrady252@gmail.com')
on conflict (email) do nothing;

alter table public.app_admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_admins
    where lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
      or user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to authenticated;

create or replace function public.is_approved_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and user_status = 'approved'
    );
$$;

grant execute on function public.is_approved_user() to authenticated;

update public.profiles
set user_status = 'approved'
where id in (
  select id
  from auth.users
  where lower(email) = 'jackbrady252@gmail.com'
);

create or replace function public.prevent_non_admin_user_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.user_status is distinct from new.user_status and not public.is_admin() then
    raise exception 'Only BARMAP admins can change user approval status.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_non_admin_user_status_change on public.profiles;
create trigger prevent_non_admin_user_status_change
  before update on public.profiles
  for each row execute function public.prevent_non_admin_user_status_change();

drop policy if exists "Admins can read admin records" on public.app_admins;
create policy "Admins can read admin records"
  on public.app_admins
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can update admin records" on public.app_admins;
create policy "Admins can update admin records"
  on public.app_admins
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- User approval gates. Pending and rejected users can see their own status,
-- approved profiles can be read publicly for feed/profile joins, and admins can
-- review everyone through RPCs without exposing auth emails publicly.
drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Approved profiles are readable"
  on public.profiles
  for select
  to anon, authenticated
  using (
    user_status = 'approved'
    or auth.uid() = id
    or public.is_admin()
  );

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their pending profile"
  on public.profiles
  for insert
  to authenticated
  with check (
    auth.uid() = id
    and (
      user_status = 'pending'
      or (
        user_status = 'approved'
        and lower(coalesce(auth.jwt()->>'email', '')) = 'jackbrady252@gmail.com'
      )
    )
  );

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own non-status profile fields"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

drop policy if exists "Anyone can read posts" on public.posts;
create policy "Anyone can read posts"
  on public.posts
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = posts.user_id
        and profiles.user_status = 'approved'
    )
  );

drop policy if exists "Users can create their own posts" on public.posts;
create policy "Approved users can create their own posts"
  on public.posts
  for insert
  to authenticated
  with check (auth.uid() = user_id and public.is_approved_user());

drop policy if exists "Users can update their own posts" on public.posts;
create policy "Approved users can update their own posts"
  on public.posts
  for update
  to authenticated
  using (auth.uid() = user_id and public.is_approved_user())
  with check (auth.uid() = user_id and public.is_approved_user());

drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Approved users can delete their own posts"
  on public.posts
  for delete
  to authenticated
  using (auth.uid() = user_id and public.is_approved_user());

drop policy if exists "Users can save posts for themselves" on public.saved_posts;
create policy "Approved users can save posts for themselves"
  on public.saved_posts
  for insert
  to authenticated
  with check (auth.uid() = user_id and public.is_approved_user());

drop policy if exists "Users can unsave their own posts" on public.saved_posts;
create policy "Approved users can unsave their own posts"
  on public.saved_posts
  for delete
  to authenticated
  using (auth.uid() = user_id and public.is_approved_user());

drop policy if exists "Anyone can submit pending spots" on public.submitted_spots;
create policy "Approved users can submit pending spots"
  on public.submitted_spots
  for insert
  to authenticated
  with check (status = 'pending' and public.is_approved_user());

drop policy if exists "Users can upload their own post media" on storage.objects;
create policy "Approved users can upload their own post media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_approved_user()
  );

drop policy if exists "Users can update their own post media" on storage.objects;
create policy "Approved users can update their own post media"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_approved_user()
  )
  with check (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_approved_user()
  );

drop policy if exists "Users can delete their own post media" on storage.objects;
create policy "Approved users can delete their own post media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_approved_user()
  );

create or replace function public.list_pending_user_applications()
returns table (
  id uuid,
  email text,
  username text,
  display_name text,
  home_city text,
  user_status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    profiles.id,
    auth.users.email,
    profiles.username,
    profiles.display_name,
    profiles.home_city,
    profiles.user_status,
    profiles.created_at
  from public.profiles
  join auth.users on auth.users.id = profiles.id
  where public.is_admin()
    and profiles.user_status = 'pending'
  order by profiles.created_at asc;
$$;

grant execute on function public.list_pending_user_applications() to authenticated;

create or replace function public.review_user_application(profile_id uuid, next_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only BARMAP admins can review user applications.';
  end if;

  if next_status not in ('approved', 'rejected') then
    raise exception 'Invalid user status: %', next_status;
  end if;

  update public.profiles
  set user_status = next_status
  where id = profile_id
    and user_status = 'pending';

  if not found then
    raise exception 'Pending user application not found.';
  end if;
end;
$$;

grant execute on function public.review_user_application(uuid, text) to authenticated;

-- Discovery candidates are private internal research records. Nothing here is
-- publicly readable; approved candidates are copied into public_spots instead.
create table if not exists public.discovery_candidates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  area text not null,
  lat double precision not null,
  lng double precision not null,
  source text not null,
  source_url text not null default '',
  evidence text not null default '',
  equipment_guess text[] not null default '{}',
  photo_url text not null default '',
  attribution text not null default '',
  confidence_score numeric(4, 2) not null default 0 check (confidence_score >= 0 and confidence_score <= 100),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

alter table public.discovery_candidates
  add column if not exists address text not null default '';

alter table public.discovery_candidates
  add column if not exists region text not null default 'ireland';

alter table public.discovery_candidates
  drop constraint if exists discovery_candidates_region_check;

alter table public.discovery_candidates
  add constraint discovery_candidates_region_check
  check (region in ('ireland', 'uk', 'london', 'new-york'));

create index if not exists discovery_candidates_status_created_at_idx
  on public.discovery_candidates (status, created_at desc);

create index if not exists discovery_candidates_region_status_idx
  on public.discovery_candidates (region, status, created_at desc);

create index if not exists discovery_candidates_location_idx
  on public.discovery_candidates (lat, lng);

alter table public.discovery_candidates enable row level security;

drop policy if exists "Admins can read discovery candidates" on public.discovery_candidates;
create policy "Admins can read discovery candidates"
  on public.discovery_candidates
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can create discovery candidates" on public.discovery_candidates;
create policy "Admins can create discovery candidates"
  on public.discovery_candidates
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update discovery candidates" on public.discovery_candidates;
create policy "Admins can update discovery candidates"
  on public.discovery_candidates
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Approved discovery candidates are copied here so the public app can read
-- reviewed spots without exposing the private review queue.
create table if not exists public.public_spots (
  id uuid primary key default gen_random_uuid(),
  discovery_candidate_id uuid not null unique references public.discovery_candidates(id) on delete restrict,
  name text not null,
  area text not null,
  address text not null default '',
  region text not null default 'ireland',
  lat double precision not null,
  lng double precision not null,
  source text not null,
  source_url text not null default '',
  evidence text not null default '',
  equipment text[] not null default '{}',
  photo_url text not null default '',
  attribution text not null default '',
  created_at timestamptz not null default now()
);

alter table public.public_spots
  add column if not exists address text not null default '';

alter table public.public_spots
  add column if not exists region text not null default 'ireland';

alter table public.public_spots
  drop constraint if exists public_spots_region_check;

alter table public.public_spots
  add constraint public_spots_region_check
  check (region in ('ireland', 'uk', 'london', 'new-york'));

create index if not exists public_spots_created_at_idx
  on public.public_spots (created_at desc);

create index if not exists public_spots_location_idx
  on public.public_spots (lat, lng);

alter table public.public_spots enable row level security;

drop policy if exists "Anyone can read public spots" on public.public_spots;
create policy "Anyone can read public spots"
  on public.public_spots
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can create public spots" on public.public_spots;
create policy "Admins can create public spots"
  on public.public_spots
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update public spots" on public.public_spots;
create policy "Admins can update public spots"
  on public.public_spots
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.review_discovery_candidate(candidate_id uuid, next_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate public.discovery_candidates%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Only BARMAP admins can review discovery candidates.';
  end if;

  if next_status not in ('approved', 'rejected') then
    raise exception 'Invalid discovery candidate status: %', next_status;
  end if;

  select *
  into candidate
  from public.discovery_candidates
  where id = candidate_id
  for update;

  if not found then
    raise exception 'Discovery candidate not found.';
  end if;

  update public.discovery_candidates
  set status = next_status,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where id = candidate_id;

  if next_status = 'approved' then
    insert into public.public_spots (
      discovery_candidate_id,
      name,
      area,
      address,
      region,
      lat,
      lng,
      source,
      source_url,
      evidence,
      equipment,
      photo_url,
      attribution
    )
    values (
      candidate.id,
      candidate.name,
      candidate.area,
      candidate.address,
      candidate.region,
      candidate.lat,
      candidate.lng,
      candidate.source,
      candidate.source_url,
      candidate.evidence,
      candidate.equipment_guess,
      candidate.photo_url,
      candidate.attribution
    )
    on conflict (discovery_candidate_id) do update
    set name = excluded.name,
        area = excluded.area,
        address = excluded.address,
        region = excluded.region,
        lat = excluded.lat,
        lng = excluded.lng,
        source = excluded.source,
        source_url = excluded.source_url,
        evidence = excluded.evidence,
        equipment = excluded.equipment,
        photo_url = excluded.photo_url,
        attribution = excluded.attribution;
  else
    delete from public.public_spots
    where discovery_candidate_id = candidate.id;
  end if;
end;
$$;

grant execute on function public.review_discovery_candidate(uuid, text) to authenticated;
