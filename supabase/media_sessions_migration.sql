-- BARMAP media, park contribution, and session hosting migration.
-- Safe to run multiple times.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('post-media', 'post-media', true, 83886080, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime', 'video/webm']),
  ('park-media', 'park-media', true, 83886080, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime', 'video/webm']),
  ('park-submissions', 'park-submissions', true, 83886080, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can read park media files" on storage.objects;
create policy "Anyone can read park media files"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'park-media');

drop policy if exists "Users can upload park media files" on storage.objects;
create policy "Users can upload park media files"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'park-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can upload post media" on storage.objects;
create policy "Users can upload post media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'post-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Anyone can read post media" on storage.objects;
create policy "Anyone can read post media"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'post-media');

drop policy if exists "Users can upload park submission photos" on storage.objects;
create policy "Users can upload park submission photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'park-submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  media_type text not null check (media_type in ('image', 'video')),
  media_url text not null,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);

create index if not exists post_media_post_position_idx
  on public.post_media (post_id, position);

alter table public.post_media enable row level security;

drop policy if exists "Anyone can read post media rows" on public.post_media;
create policy "Anyone can read post media rows"
  on public.post_media
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Users can add media to their own posts" on public.post_media;
create policy "Users can add media to their own posts"
  on public.post_media
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.posts
      where posts.id = post_id
        and posts.user_id = auth.uid()
    )
  );

create table if not exists public.park_media (
  id uuid primary key default gen_random_uuid(),
  park_id integer not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  media_type text not null check (media_type in ('image', 'video')),
  media_url text not null,
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

create index if not exists park_media_park_status_created_at_idx
  on public.park_media (park_id, moderation_status, created_at desc);

create index if not exists park_media_status_created_at_idx
  on public.park_media (moderation_status, created_at desc);

alter table public.park_media enable row level security;

drop policy if exists "Public can read approved park media" on public.park_media;
create policy "Public can read approved park media"
  on public.park_media
  for select
  to anon, authenticated
  using (moderation_status = 'approved');

drop policy if exists "Users can read their own pending park media" on public.park_media;
create policy "Users can read their own pending park media"
  on public.park_media
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Admins can read all park media" on public.park_media;
create policy "Admins can read all park media"
  on public.park_media
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Approved users can submit park media" on public.park_media;
create policy "Approved users can submit park media"
  on public.park_media
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and moderation_status = 'pending'
    and public.is_approved_user()
  );

drop policy if exists "Admins can review park media" on public.park_media;
create policy "Admins can review park media"
  on public.park_media
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  park_id integer not null,
  park_name text not null,
  park_area text not null,
  host_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Community training session',
  start_at timestamptz not null,
  end_at timestamptz,
  description text not null default '',
  participant_limit integer check (participant_limit is null or (participant_limit > 0 and participant_limit <= 200)),
  created_at timestamptz not null default now()
);

create index if not exists sessions_start_at_idx
  on public.sessions (start_at);

create index if not exists sessions_host_created_at_idx
  on public.sessions (host_user_id, created_at desc);

alter table public.sessions enable row level security;

drop policy if exists "Anyone can read sessions" on public.sessions;
create policy "Anyone can read sessions"
  on public.sessions
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Approved users can host sessions" on public.sessions;
create policy "Approved users can host sessions"
  on public.sessions
  for insert
  to authenticated
  with check (
    host_user_id = auth.uid()
    and public.is_approved_user()
    and start_at > now()
  );

drop policy if exists "Hosts can update their sessions" on public.sessions;
create policy "Hosts can update their sessions"
  on public.sessions
  for update
  to authenticated
  using (host_user_id = auth.uid() or public.is_admin())
  with check (host_user_id = auth.uid() or public.is_admin());
