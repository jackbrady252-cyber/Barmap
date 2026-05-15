-- BARMAP submitted parks schema.
-- Run this in the Supabase SQL editor for the project connected by
-- NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.

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
  to anon
  with check (status = 'pending');

drop policy if exists "Anyone can read submitted spots" on public.submitted_spots;
create policy "Anyone can read submitted spots"
  on public.submitted_spots
  for select
  to anon
  using (true);
