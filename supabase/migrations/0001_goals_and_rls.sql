-- Run after `npm run db:push`, or apply through the Supabase SQL editor.
-- Goals and entries are scoped to auth.users (ASR-F08 / D2).

alter table goals
  drop constraint if exists goals_user_id_fkey;
alter table goals
  add constraint goals_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

alter table entries
  drop constraint if exists entries_user_id_fkey;
alter table entries
  add constraint entries_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

alter table goals enable row level security;
alter table entries enable row level security;

drop policy if exists "users manage own goals" on goals;
create policy "users manage own goals"
  on goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users manage own entries" on entries;
create policy "users manage own entries"
  on entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
