-- BARMAP user discovery policy cleanup.
-- Safe to run multiple times. Makes normal, non-rejected users discoverable.

alter table public.profiles
  alter column user_status set default 'approved';

drop policy if exists "Approved profiles are readable" on public.profiles;
drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Non-rejected profiles are readable"
  on public.profiles
  for select
  to anon, authenticated
  using (
    user_status <> 'rejected'
    or auth.uid() = id
    or public.is_admin()
  );

drop policy if exists "Approved users can follow approved users" on public.follows;
create policy "Non-rejected users can follow non-rejected users"
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
        and follower.user_status <> 'rejected'
    )
    and exists (
      select 1
      from public.profiles following
      where following.id = following_id
        and following.user_status <> 'rejected'
    )
  );
