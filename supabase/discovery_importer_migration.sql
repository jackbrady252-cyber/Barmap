-- BARMAP discovery importer migration only.
-- Safe to run in Supabase SQL Editor when profiles/auth policies already exist.
-- This creates the private discovery review queue and public approved spot table.

-- The discovery tables need gen_random_uuid(). Supabase usually has this
-- already, but this is safe if it is not enabled yet.
create extension if not exists pgcrypto;

-- Minimal admin bootstrap required by discovery RLS. This does not touch
-- profiles or auth policies.
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

create table if not exists public.discovery_candidates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  area text not null,
  address text not null default '',
  region text not null default 'ireland',
  lat double precision not null,
  lng double precision not null,
  source text not null,
  source_url text not null default '',
  evidence text not null default '',
  equipment_guess text[] not null default '{}',
  photo_url text not null default '',
  attribution text not null default '',
  image_status text not null default 'none' check (image_status in ('none', 'internet_verified', 'community_verified')),
  image_count integer not null default 0 check (image_count >= 0),
  image_urls text[] not null default '{}',
  image_sources text[] not null default '{}',
  image_attributions text[] not null default '{}',
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
  add column if not exists image_status text not null default 'none';

alter table public.discovery_candidates
  add column if not exists image_count integer not null default 0;

alter table public.discovery_candidates
  add column if not exists image_urls text[] not null default '{}';

alter table public.discovery_candidates
  add column if not exists image_sources text[] not null default '{}';

alter table public.discovery_candidates
  add column if not exists image_attributions text[] not null default '{}';

alter table public.discovery_candidates
  drop constraint if exists discovery_candidates_region_check;

alter table public.discovery_candidates
  add constraint discovery_candidates_region_check
  check (region in ('ireland', 'uk', 'london', 'new-york'));

alter table public.discovery_candidates
  drop constraint if exists discovery_candidates_image_status_check;

alter table public.discovery_candidates
  add constraint discovery_candidates_image_status_check
  check (image_status in ('none', 'internet_verified', 'community_verified'));

alter table public.discovery_candidates
  drop constraint if exists discovery_candidates_image_count_check;

alter table public.discovery_candidates
  add constraint discovery_candidates_image_count_check
  check (image_count >= 0);

update public.discovery_candidates
set image_status = 'internet_verified',
    image_count = 1,
    image_urls = array[photo_url],
    image_sources = array['Existing candidate photo URL'],
    image_attributions = array[coalesce(nullif(attribution, ''), source_url, 'Existing candidate photo URL')]
where photo_url <> ''
  and image_count = 0;

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

  if next_status = 'approved' and (candidate.image_status = 'none' or candidate.image_count < 1) then
    raise exception 'Image evidence is required before approving discovery candidates.';
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
      coalesce(nullif(candidate.photo_url, ''), candidate.image_urls[1], ''),
      coalesce(nullif(candidate.attribution, ''), array_to_string(candidate.image_attributions, '; '))
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
