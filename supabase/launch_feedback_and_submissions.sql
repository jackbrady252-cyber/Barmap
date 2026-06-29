-- BARMAP public launch migration.
-- Adds park submission photo support and user feedback storage.

alter table public.submitted_spots
  add column if not exists photo_url text not null default '';

alter table public.profiles
  alter column user_status set default 'approved';

create or replace function public.is_approved_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and user_status <> 'rejected'
  );
$$;

grant execute on function public.is_approved_user() to authenticated;

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

drop policy if exists "Users can insert their pending profile" on public.profiles;
create policy "Users can insert their pending profile"
  on public.profiles
  for insert
  to authenticated
  with check (
    auth.uid() = id
    and user_status in ('pending', 'approved')
  );

drop policy if exists "Approved users can submit discovery candidates" on public.discovery_candidates;
create policy "Approved users can submit discovery candidates"
  on public.discovery_candidates
  for insert
  to authenticated
  with check (
    public.is_approved_user()
    and source <> 'openstreetmap'
    and status = 'pending'
    and image_status <> 'none'
    and image_count > 0
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('park-submissions', 'park-submissions', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('feedback-screenshots', 'feedback-screenshots', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can read park submission photos" on storage.objects;
create policy "Anyone can read park submission photos"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'park-submissions');

drop policy if exists "Users can upload park submission photos" on storage.objects;
create policy "Users can upload park submission photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'park-submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Anyone can read feedback screenshots" on storage.objects;
create policy "Anyone can read feedback screenshots"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'feedback-screenshots');

drop policy if exists "Users can upload feedback screenshots" on storage.objects;
create policy "Users can upload feedback screenshots"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'feedback-screenshots');

create table if not exists public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  category text not null check (category in ('bug', 'feature', 'park_info', 'contact')),
  message text not null,
  screenshot_url text not null default '',
  email_reply text not null default '',
  app_version text not null default '',
  device_info text not null default '',
  status text not null default 'new' check (status in ('new', 'reviewing', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists feedback_reports_status_created_at_idx
  on public.feedback_reports (status, created_at desc);

create index if not exists feedback_reports_category_created_at_idx
  on public.feedback_reports (category, created_at desc);

alter table public.feedback_reports enable row level security;

drop policy if exists "Anyone can submit feedback" on public.feedback_reports;
create policy "Anyone can submit feedback"
  on public.feedback_reports
  for insert
  to anon, authenticated
  with check (user_id is null or auth.uid() = user_id);

drop policy if exists "Admins can read feedback" on public.feedback_reports;
create policy "Admins can read feedback"
  on public.feedback_reports
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can update feedback" on public.feedback_reports;
create policy "Admins can update feedback"
  on public.feedback_reports
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
