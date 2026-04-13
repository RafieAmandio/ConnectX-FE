-- Chat Figma schema migration
--
-- Run this after `supabase/chat-experiment-setup.sql`.
-- This migration assumes there is no existing `public.users` profile source.
-- If your backend already keeps `public.users` in sync, do not add `public.profiles`.
-- Instead, keep the participant columns on `conversation_summaries` and join from `public.users`.
--
-- Goal:
-- - keep the current chat message + unread summary model
-- - add a Supabase profile source for avatar/headline
-- - denormalize the other participant's metadata into conversation_summaries
--   so the chat tab can fetch everything in a single query

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  photo_url text null,
  headline text null,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "users can read their own profile" on public.profiles;
create policy "users can read their own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "chat members can read shared profiles" on public.profiles;
create policy "chat members can read shared profiles"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.chat_room_members viewer
    join public.chat_room_members other
      on other.room_id = viewer.room_id
    where viewer.user_id = auth.uid()
      and other.user_id = profiles.id
  )
);

drop policy if exists "users can insert their own profile" on public.profiles;
create policy "users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_profile_updated_at();

create or replace function public.handle_auth_user_created_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, photo_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1),
      'ConnectX Member'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists auth_user_created_profile on auth.users;
create trigger auth_user_created_profile
after insert on auth.users
for each row
execute function public.handle_auth_user_created_profile();

insert into public.profiles (id, name, photo_url)
select
  u.id,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(coalesce(u.email, ''), '@', 1),
    'ConnectX Member'
  ),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do update
set
  name = coalesce(public.profiles.name, excluded.name),
  photo_url = coalesce(public.profiles.photo_url, excluded.photo_url);

alter table public.conversation_summaries
  add column if not exists participant_user_id uuid null references auth.users(id) on delete set null,
  add column if not exists participant_name text null,
  add column if not exists participant_photo_url text null,
  add column if not exists participant_headline text null;

create index if not exists idx_conversation_summaries_user_participant
  on public.conversation_summaries(user_id, participant_user_id);

create or replace function public.sync_conversation_summary_for_member(
  member_room_id uuid,
  member_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  room_record public.chat_rooms%rowtype;
  latest_message_record record;
  other_member_id uuid;
  other_profile_name text;
  other_profile_photo_url text;
  other_profile_headline text;
begin
  select *
  into room_record
  from public.chat_rooms
  where id = member_room_id;

  if not found then
    return;
  end if;

  select
    m.id,
    m.content,
    m.created_at
  into latest_message_record
  from public.messages m
  where m.room_id = member_room_id
  order by m.created_at desc
  limit 1;

  other_member_id := null;
  other_profile_name := null;
  other_profile_photo_url := null;
  other_profile_headline := null;

  if room_record.type = 'direct' then
    select crm.user_id
    into other_member_id
    from public.chat_room_members crm
    where crm.room_id = member_room_id
      and crm.user_id <> member_user_id
    order by crm.joined_at asc
    limit 1;

    if other_member_id is not null then
      select
        p.name,
        p.photo_url,
        p.headline
      into
        other_profile_name,
        other_profile_photo_url,
        other_profile_headline
      from public.profiles p
      where p.id = other_member_id;
    end if;
  end if;

  insert into public.conversation_summaries (
    conversation_id,
    user_id,
    title,
    kind,
    last_message_id,
    last_message_text,
    last_message_at,
    unread_count,
    updated_at,
    participant_user_id,
    participant_name,
    participant_photo_url,
    participant_headline
  )
  values (
    member_room_id,
    member_user_id,
    room_record.title,
    room_record.type,
    latest_message_record.id,
    latest_message_record.content,
    latest_message_record.created_at,
    0,
    coalesce(latest_message_record.created_at, now()),
    other_member_id,
    coalesce(other_profile_name, case when room_record.type = 'direct' then room_record.title else null end),
    other_profile_photo_url,
    other_profile_headline
  )
  on conflict (user_id, conversation_id) do update
  set
    title = excluded.title,
    kind = excluded.kind,
    last_message_id = excluded.last_message_id,
    last_message_text = excluded.last_message_text,
    last_message_at = excluded.last_message_at,
    updated_at = greatest(public.conversation_summaries.updated_at, excluded.updated_at),
    participant_user_id = excluded.participant_user_id,
    participant_name = excluded.participant_name,
    participant_photo_url = excluded.participant_photo_url,
    participant_headline = excluded.participant_headline;
end;
$$;

create or replace function public.handle_chat_room_member_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member_record record;
begin
  for member_record in
    select crm.user_id
    from public.chat_room_members crm
    where crm.room_id = new.room_id
  loop
    perform public.sync_conversation_summary_for_member(new.room_id, member_record.user_id);
  end loop;

  return new;
end;
$$;

create or replace function public.handle_chat_room_member_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member_record record;
begin
  delete from public.conversation_summaries
  where conversation_id = old.room_id
    and user_id = old.user_id;

  for member_record in
    select crm.user_id
    from public.chat_room_members crm
    where crm.room_id = old.room_id
  loop
    perform public.sync_conversation_summary_for_member(old.room_id, member_record.user_id);
  end loop;

  return old;
end;
$$;

create or replace function public.handle_chat_room_update_sync_summaries()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member_record record;
begin
  for member_record in
    select crm.user_id
    from public.chat_room_members crm
    where crm.room_id = new.id
  loop
    perform public.sync_conversation_summary_for_member(new.id, member_record.user_id);
  end loop;

  return new;
end;
$$;

create or replace function public.handle_profile_update_sync_conversation_summaries()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversation_summaries cs
  set
    participant_name = new.name,
    participant_photo_url = new.photo_url,
    participant_headline = new.headline,
    updated_at = greatest(cs.updated_at, now())
  from public.chat_room_members viewer
  join public.chat_room_members participant
    on participant.room_id = viewer.room_id
   and participant.user_id = new.id
   and participant.user_id <> viewer.user_id
  join public.chat_rooms cr
    on cr.id = viewer.room_id
  where cr.type = 'direct'
    and cs.conversation_id = viewer.room_id
    and cs.user_id = viewer.user_id;

  return new;
end;
$$;

drop trigger if exists profiles_after_change_sync_conversation_summaries on public.profiles;
create trigger profiles_after_change_sync_conversation_summaries
after insert or update on public.profiles
for each row
execute function public.handle_profile_update_sync_conversation_summaries();

insert into public.conversation_summaries (
  conversation_id,
  user_id,
  title,
  kind,
  last_message_id,
  last_message_text,
  last_message_at,
  unread_count,
  updated_at,
  participant_user_id,
  participant_name,
  participant_photo_url,
  participant_headline
)
select
  crm.room_id,
  crm.user_id,
  cr.title,
  cr.type,
  latest_message.id,
  latest_message.content,
  latest_message.created_at,
  coalesce(existing.unread_count, 0),
  coalesce(latest_message.created_at, existing.updated_at, now()),
  other_member.user_id,
  coalesce(p.name, case when cr.type = 'direct' then cr.title else null end),
  p.photo_url,
  p.headline
from public.chat_room_members crm
join public.chat_rooms cr
  on cr.id = crm.room_id
left join lateral (
  select
    m.id,
    m.content,
    m.created_at
  from public.messages m
  where m.room_id = crm.room_id
  order by m.created_at desc
  limit 1
) latest_message on true
left join lateral (
  select other.user_id
  from public.chat_room_members other
  where other.room_id = crm.room_id
    and other.user_id <> crm.user_id
  order by other.joined_at asc
  limit 1
) other_member on cr.type = 'direct'
left join public.profiles p
  on p.id = other_member.user_id
left join public.conversation_summaries existing
  on existing.user_id = crm.user_id
 and existing.conversation_id = crm.room_id
on conflict (user_id, conversation_id) do update
set
  title = excluded.title,
  kind = excluded.kind,
  last_message_id = excluded.last_message_id,
  last_message_text = excluded.last_message_text,
  last_message_at = excluded.last_message_at,
  updated_at = greatest(public.conversation_summaries.updated_at, excluded.updated_at),
  participant_user_id = excluded.participant_user_id,
  participant_name = excluded.participant_name,
  participant_photo_url = excluded.participant_photo_url,
  participant_headline = excluded.participant_headline;
