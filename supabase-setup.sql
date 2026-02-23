create table if not exists public.attendance_state (
  app_id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.attendance_state enable row level security;

drop policy if exists "allow read attendance_state" on public.attendance_state;
drop policy if exists "allow write attendance_state" on public.attendance_state;
drop policy if exists "allow update attendance_state" on public.attendance_state;

create policy "allow read attendance_state"
on public.attendance_state
for select
using (true);

create policy "allow write attendance_state"
on public.attendance_state
for insert
with check (true);

create policy "allow update attendance_state"
on public.attendance_state
for update
using (true)
with check (true);
