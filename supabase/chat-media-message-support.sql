-- Chat media message support
--
-- Run this after:
-- 1. supabase/chat-experiment-setup.sql
-- 2. your chat figma summary metadata migration, if you use one
--
-- This migration:
-- - expands messages beyond text-only
-- - allows image/video/file rows
-- - updates summary preview text for non-text messages

alter table public.messages
  alter column content drop not null;

alter table public.messages
  add column if not exists media_url text null,
  add column if not exists media_mime_type text null,
  add column if not exists media_name text null,
  add column if not exists media_size_bytes bigint null,
  add column if not exists thumbnail_url text null;

alter table public.messages
  drop constraint if exists messages_message_type_check;

alter table public.messages
  add constraint messages_message_type_check
  check (message_type in ('text', 'image', 'video', 'file'));

alter table public.messages
  drop constraint if exists messages_payload_check;

alter table public.messages
  add constraint messages_payload_check
  check (
    (message_type = 'text' and content is not null and btrim(content) <> '')
    or
    (message_type in ('image', 'video', 'file') and media_url is not null)
  );

create or replace function public.handle_message_insert_update_summaries()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  summary_preview text;
begin
  summary_preview := case
    when new.message_type = 'image' then coalesce(nullif(btrim(new.content), ''), 'Sent a photo')
    when new.message_type = 'video' then coalesce(nullif(btrim(new.content), ''), 'Sent a video')
    when new.message_type = 'file' then coalesce(nullif(btrim(new.content), ''), 'Sent a file')
    else coalesce(new.content, 'New message')
  end;

  update public.conversation_summaries
  set
    last_message_id = new.id,
    last_message_text = summary_preview,
    last_message_at = new.created_at,
    unread_count = case
      when user_id = new.sender_id then 0
      else unread_count + 1
    end,
    updated_at = new.created_at
  where conversation_id = new.room_id;

  return new;
end;
$$;

-- Sample image message insert
-- Replace ROOM_UUID and SENDER_UUID with real values from your project.
insert into public.messages (
  room_id,
  sender_id,
  client_id,
  content,
  message_type,
  media_url,
  media_mime_type,
  media_name,
  media_size_bytes,
  thumbnail_url
)
values (
  'ROOM_UUID',
  'SENDER_UUID',
  'seed-image-message-001',
  'Check this out',
  'image',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
  'image/jpeg',
  'sample-photo.jpg',
  245761,
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=480&q=60'
);
