-- BARMAP follows migration.
-- Safe to run in Supabase SQL Editor after profiles exist.

create index if not exists profiles_user_status_idx
  on public.profiles (user_status, created_at desc);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_follower_created_at_idx
  on public.follows (follower_id, created_at desc);

create index if not exists follows_following_created_at_idx
  on public.follows (following_id, created_at desc);

alter table public.follows enable row level security;

drop policy if exists "Anyone can read follows" on public.follows;
create policy "Anyone can read follows"
  on public.follows
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Approved users can follow approved users" on public.follows;
create policy "Approved users can follow approved users"
  on public.follows
  for insert
  to authenticated
  with check (
    auth.uid() = follower_id
    and follower_id <> following_id
    and exists (
      select 1
      from public.profiles follower
      where follower.id = auth.uid()
        and follower.user_status = 'approved'
    )
    and exists (
      select 1
      from public.profiles following
      where following.id = following_id
        and following.user_status = 'approved'
    )
  );

drop policy if exists "Users can unfollow from their own account" on public.follows;
create policy "Users can unfollow from their own account"
  on public.follows
  for delete
  to authenticated
  using (auth.uid() = follower_id);
