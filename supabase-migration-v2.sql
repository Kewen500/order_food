alter table public.menu_items
  add column if not exists option_label text,
  add column if not exists selected_taste text,
  add column if not exists drink_temperature text;

do $$
begin
  alter table public.room_members add constraint room_members_room_id_nickname_key unique (room_id, nickname);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.menu_items drop constraint if exists menu_items_room_id_dish_id_key;
exception
  when undefined_object then null;
end $$;

do $$
begin
  alter table public.menu_items drop constraint if exists menu_items_room_id_dish_id_fkey;
exception
  when undefined_object then null;
end $$;

alter table public.menu_items
  add constraint menu_items_room_id_dish_id_fkey
  foreign key (room_id, dish_id)
  references public.dishes(room_id, id)
  on delete cascade;

update public.rooms
set owner_id = room_members.nickname
from public.room_members
where rooms.id = room_members.room_id
  and rooms.owner_id = room_members.device_id;
