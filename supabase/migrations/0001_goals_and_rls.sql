-- Local schema for Steady (D1 / D2).
-- actual_value is computed in app code (D4), not stored or rolled up in SQL.

create table if not exists public.goals (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  period_start text not null,
  period_end text not null,
  target_value double precision not null,
  status text not null default 'active',
  parent_goal_id uuid references public.goals (id) on delete cascade,
  category text,
  allocation_percent double precision,
  created_at timestamptz not null default now()
);

create table if not exists public.entries (
  id uuid primary key,
  goal_id uuid not null references public.goals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  planned_amount double precision not null,
  actual_amount double precision not null,
  comment text,
  occurred_on text,
  logged_at timestamptz not null default now()
);

alter table public.goals enable row level security;
alter table public.entries enable row level security;

drop policy if exists "users manage own goals" on public.goals;
create policy "users manage own goals"
  on public.goals for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users manage own entries" on public.entries;
create policy "users manage own entries"
  on public.entries for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant usage on schema public to anon, authenticated, service_role;
grant all on table public.goals to anon, authenticated, service_role;
grant all on table public.entries to anon, authenticated, service_role;
