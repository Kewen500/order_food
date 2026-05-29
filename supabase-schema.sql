create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  display_name text not null default '今晚吃什么',
  owner_id text not null,
  max_members integer not null default 2 check (max_members between 2 and 6),
  budget numeric not null default 120,
  selected_category text not null default '全部',
  selected_status text not null default '都可以',
  note text not null default '',
  random_result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  device_id text not null,
  nickname text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (room_id, device_id),
  unique (room_id, nickname)
);

create table if not exists public.dishes (
  id text not null,
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null,
  category text not null,
  price numeric not null default 0,
  status text not null default '默认',
  spice text not null default '自定',
  emoji text not null default '🍽️',
  is_custom boolean not null default false,
  created_by text,
  created_at timestamptz not null default now(),
  primary key (room_id, id)
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  dish_id text not null,
  member_device_id text not null,
  vote_value integer not null default 1 check (vote_value in (0, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, dish_id, member_device_id),
  foreign key (room_id, dish_id) references public.dishes(room_id, id) on delete cascade
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  dish_id text not null,
  added_by text not null,
  option_label text,
  selected_taste text,
  drink_temperature text,
  created_at timestamptz not null default now(),
  foreign key (room_id, dish_id) references public.dishes(room_id, id) on delete cascade
);

create table if not exists public.room_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  actor_id text not null,
  actor_name text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.dishes enable row level security;
alter table public.votes enable row level security;
alter table public.menu_items enable row level security;
alter table public.room_events enable row level security;

drop policy if exists "anon can read rooms" on public.rooms;
drop policy if exists "anon can insert rooms" on public.rooms;
drop policy if exists "anon can update rooms" on public.rooms;
create policy "anon can read rooms" on public.rooms for select to anon using (true);
create policy "anon can insert rooms" on public.rooms for insert to anon with check (true);
create policy "anon can update rooms" on public.rooms for update to anon using (true) with check (true);

drop policy if exists "anon can read members" on public.room_members;
drop policy if exists "anon can insert members" on public.room_members;
drop policy if exists "anon can update members" on public.room_members;
drop policy if exists "anon can delete members" on public.room_members;
create policy "anon can read members" on public.room_members for select to anon using (true);
create policy "anon can insert members" on public.room_members for insert to anon with check (true);
create policy "anon can update members" on public.room_members for update to anon using (true) with check (true);
create policy "anon can delete members" on public.room_members for delete to anon using (true);

drop policy if exists "anon can read dishes" on public.dishes;
drop policy if exists "anon can insert dishes" on public.dishes;
drop policy if exists "anon can update dishes" on public.dishes;
drop policy if exists "anon can delete dishes" on public.dishes;
create policy "anon can read dishes" on public.dishes for select to anon using (true);
create policy "anon can insert dishes" on public.dishes for insert to anon with check (true);
create policy "anon can update dishes" on public.dishes for update to anon using (true) with check (true);
create policy "anon can delete dishes" on public.dishes for delete to anon using (true);

drop policy if exists "anon can read votes" on public.votes;
drop policy if exists "anon can insert votes" on public.votes;
drop policy if exists "anon can update votes" on public.votes;
drop policy if exists "anon can delete votes" on public.votes;
create policy "anon can read votes" on public.votes for select to anon using (true);
create policy "anon can insert votes" on public.votes for insert to anon with check (true);
create policy "anon can update votes" on public.votes for update to anon using (true) with check (true);
create policy "anon can delete votes" on public.votes for delete to anon using (true);

drop policy if exists "anon can read menu items" on public.menu_items;
drop policy if exists "anon can insert menu items" on public.menu_items;
drop policy if exists "anon can update menu items" on public.menu_items;
drop policy if exists "anon can delete menu items" on public.menu_items;
create policy "anon can read menu items" on public.menu_items for select to anon using (true);
create policy "anon can insert menu items" on public.menu_items for insert to anon with check (true);
create policy "anon can update menu items" on public.menu_items for update to anon using (true) with check (true);
create policy "anon can delete menu items" on public.menu_items for delete to anon using (true);

drop policy if exists "anon can read room events" on public.room_events;
drop policy if exists "anon can insert room events" on public.room_events;
drop policy if exists "anon can delete room events" on public.room_events;
create policy "anon can read room events" on public.room_events for select to anon using (true);
create policy "anon can insert room events" on public.room_events for insert to anon with check (true);
create policy "anon can delete room events" on public.room_events for delete to anon using (true);

do $$
begin
  alter publication supabase_realtime add table public.rooms;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.room_members;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.dishes;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.votes;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.menu_items;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.room_events;
exception when duplicate_object then null;
end $$;
