# Chat Figma Backend Handoff

This document describes the full backend data flow for chat using:

- `public.chat_rooms`
- `public.chat_room_members`
- `public.messages`
- `public.conversation_summaries`
- `public.users` as the app profile source

It assumes:

- `auth.users` is managed by Supabase Auth
- `public.users` already exists and is kept in sync by your backend auth/profile flow
- chat is implemented on Supabase with database triggers and Realtime

## Summary

Yes, your understanding is basically correct.

For a new match, backend only needs to:

1. create a `chat_rooms` row
2. insert both users into `chat_room_members`

After that:

- `conversation_summaries` can be created automatically from DB trigger logic
- new `messages` rows can update summaries automatically from DB trigger logic
- message delivery and summary updates can be pushed to clients through Supabase Realtime
- typing and presence can be handled through Realtime broadcast/presence channels

So the core backend responsibility is mostly:

- create the room
- add the members
- make sure participant metadata from `public.users` is copied into `conversation_summaries`

The frontend should not manually create summary rows.

## Source Of Truth

Use:

- `auth.users` for authentication
- `public.users` for app profile data

Do **not** create a separate `profiles` table if `public.users` already exists.

The chat system should read these fields from `public.users`:

- `id`
- `name`
- `photo_url`
- `headline`

If your column names differ, map them accordingly.

## Table Responsibilities

### `chat_rooms`

Purpose:

- one record per conversation

Suggested shape:

```sql
id uuid primary key,
type text check (type in ('direct', 'group')),
title text not null,
created_at timestamptz not null default now()
```

Meaning:

- `type = 'direct'` for 1:1 match chat
- `title` is the fallback display label
- for direct chat, the frontend may show participant name instead of `title`

Backend creates this row when:

- a match becomes chat-enabled
- or the first user action requires opening a chat room

### `chat_room_members`

Purpose:

- membership table linking users to rooms

Suggested shape:

```sql
room_id uuid not null references public.chat_rooms(id) on delete cascade,
user_id uuid not null references auth.users(id) on delete cascade,
joined_at timestamptz not null default now(),
primary key (room_id, user_id)
```

Meaning:

- every chat participant gets one row
- for a direct chat there should be exactly two rows

Backend creates these rows when:

- a room is created for a match

Recommended invariant for direct chat:

- one room per matched pair
- two members only

### `messages`

Purpose:

- stores durable chat history

Suggested shape:

```sql
id uuid primary key,
room_id uuid not null references public.chat_rooms(id) on delete cascade,
sender_id uuid not null references auth.users(id) on delete restrict,
client_id text null,
content text not null,
message_type text not null default 'text',
created_at timestamptz not null default now()
```

Meaning:

- each message is a stored row
- `client_id` can be used for deduplication of optimistic sends

Writes happen when:

- a client sends a message to a room it belongs to

What happens next:

- trigger updates `conversation_summaries`
- Realtime publishes the insert to subscribed clients

### `conversation_summaries`

Purpose:

- one summary row per user per conversation
- optimized for inbox/chat-list UI

Current base shape:

```sql
conversation_id uuid not null references public.chat_rooms(id) on delete cascade,
user_id uuid not null references auth.users(id) on delete cascade,
title text not null,
kind text not null check (kind in ('direct', 'group')),
last_message_id uuid null references public.messages(id) on delete set null,
last_message_text text null,
last_message_at timestamptz null,
unread_count integer not null default 0,
last_read_message_id uuid null references public.messages(id) on delete set null,
last_read_at timestamptz null,
updated_at timestamptz not null default now(),
primary key (user_id, conversation_id)
```

For the Figma chat UI, backend should extend it with:

```sql
participant_user_id uuid null references auth.users(id) on delete set null,
participant_name text null,
participant_photo_url text null,
participant_headline text null
```

Meaning:

- for direct chat, each user gets a summary row describing the other participant
- this lets the frontend render the horizontal chat cards without extra joins

## Why `conversation_summaries` Exists

The frontend inbox should not compute everything from raw messages every time.

`conversation_summaries` exists so the client can query:

- who the conversation is with
- latest message preview
- latest message time
- unread count

in one fast list query.

## Required `public.users` Contract

The backend should confirm `public.users` provides at least:

```sql
id uuid primary key,
name text,
photo_url text,
headline text
```

This is the participant metadata source for chat.

If the backend already updates `public.users` during registration, login bootstrap, or profile editing, that is enough.

The frontend should not insert photo URLs manually for chat.

## Direct Chat Lifecycle

### 1. Users match

Business event:

- two users are matched by the app

Backend action:

- decide whether chat room is created immediately or lazily

Recommended options:

- create immediately on match
- or create when one side taps "Chat" the first time

### 2. Backend creates room

Backend inserts:

```sql
insert into public.chat_rooms (type, title)
values ('direct', :fallback_title)
returning id;
```

Notes:

- `title` can be a fallback only
- frontend will usually display `participant_name` instead for direct chat

### 3. Backend adds both users as members

Backend inserts:

```sql
insert into public.chat_room_members (room_id, user_id)
values
  (:room_id, :user_a),
  (:room_id, :user_b);
```

Expected DB behavior:

- membership insert trigger creates or refreshes each user's summary row

### 4. DB creates conversation summaries

For each member:

1. load room metadata from `chat_rooms`
2. find the other participant from `chat_room_members`
3. load participant metadata from `public.users`
4. upsert one summary row into `conversation_summaries`

For direct chat, each user should get:

- same `conversation_id`
- their own `user_id`
- other user's profile info in:
  - `participant_user_id`
  - `participant_name`
  - `participant_photo_url`
  - `participant_headline`

### 5. Client subscribes

Client reads:

- `conversation_summaries` for inbox cards
- `messages` for room history

Client subscribes to:

- Realtime changes on `conversation_summaries`
- Realtime changes on `messages`
- Realtime broadcast/presence on `room:<conversation_id>`

## Message Send Flow

### 1. User sends a message

Client inserts into:

```sql
public.messages
```

Required rule:

- sender must be a room member

### 2. DB updates summaries

After message insert, trigger should update all summaries for that room:

- `last_message_id = new.id`
- `last_message_text = new.content`
- `last_message_at = new.created_at`
- sender's `unread_count = 0`
- other members' `unread_count += 1`
- `updated_at = new.created_at`

This is exactly the right place for unread state.

### 3. Realtime pushes updates

Supabase Realtime should publish:

- inserted `messages` row
- updated `conversation_summaries` rows

So yes: after the room and membership setup is correct, message insert + broadcast flow is mostly handled by Supabase infrastructure plus DB triggers.

## Read / Open Conversation Flow

### 1. User opens a conversation

Client calls:

```sql
rpc mark_conversation_read(conversation_uuid)
```

### 2. DB marks summary as read

The RPC should:

- verify the caller is a room member
- find latest message in the room
- set:
  - `unread_count = 0`
  - `last_read_message_id = latest_message_id`
  - `last_read_at = now()`

### 3. Realtime publishes summary update

Client receives the updated summary and unread badge clears.

## Typing And Presence Flow

Typing and presence do not need to be stored in `messages`.

Recommended handling:

- message history stays in `public.messages`
- typing and presence use Realtime broadcast/presence on topic:
  - `room:<conversation_id>`

So:

- typing indicator is ephemeral
- online presence is ephemeral
- only actual message content is durable

## Media Attachment Flow

If the app uploads media through a separate backend endpoint that returns a URL, the recommended flow is:

1. client uploads the file to your upload endpoint
2. upload endpoint returns a permanent URL
3. client inserts one `messages` row with:
   - `message_type = 'image'`, `'video'`, or `'file'`
   - `media_url`
   - optional `thumbnail_url`
   - optional caption in `content`
4. DB trigger updates `conversation_summaries`
5. Realtime pushes the new message and updated summary

Recommended message fields for media support:

```sql
media_url text null,
media_mime_type text null,
media_name text null,
media_size_bytes bigint null,
thumbnail_url text null
```

Recommended `message_type` values:

```sql
'text', 'image', 'video', 'file'
```

For summary preview text, backend/DB should not copy a raw media URL into `last_message_text`.

Recommended preview values:

- `Sent a photo`
- `Sent a video`
- `Sent a file`

If there is also a caption, using the caption as preview is also acceptable.

## Backend Responsibilities Vs Supabase Responsibilities

### Backend responsibilities

- maintain `public.users`
- create `chat_rooms`
- insert `chat_room_members`
- ensure direct rooms follow business rules
- extend and maintain summary sync logic for participant metadata

### DB trigger responsibilities

- create/update `conversation_summaries`
- update unread counts on new messages
- keep room metadata synced into summaries
- refresh participant metadata in summaries when needed

### Supabase Realtime responsibilities

- deliver `messages` inserts
- deliver `conversation_summaries` updates
- handle typing/presence events on room topics

## What Should Trigger Summary Refresh

`conversation_summaries` should be refreshed when:

1. a member is inserted into `chat_room_members`
2. a member is removed from `chat_room_members`
3. a room row changes in `chat_rooms`
4. a message row is inserted into `messages`
5. the participant's `name`, `photo_url`, or `headline` changes in `public.users`

## Recommended Trigger Logic

For direct chat summary generation, the logic should conceptually do:

```sql
select
  other.user_id as participant_user_id,
  u.name as participant_name,
  u.photo_url as participant_photo_url,
  u.headline as participant_headline
from public.chat_room_members viewer
join public.chat_room_members other
  on other.room_id = viewer.room_id
 and other.user_id <> viewer.user_id
left join public.users u
  on u.id = other.user_id
where viewer.room_id = :room_id
  and viewer.user_id = :member_user_id;
```

Then upsert into `conversation_summaries`.

## Frontend Data Contract

The frontend expects `conversation_summaries` to eventually expose:

```sql
conversation_id,
user_id,
title,
kind,
last_message_text,
last_message_at,
unread_count,
participant_user_id,
participant_name,
participant_photo_url,
participant_headline,
updated_at
```

Frontend usage:

- horizontal top cards use:
  - `participant_name`
  - `participant_photo_url`
  - `participant_headline`
  - `unread_count`
- message screen uses:
  - `messages`
  - typing/presence from Realtime

## Decision

For your setup, the recommended architecture is:

- backend keeps `public.users` up to date
- backend creates direct `chat_rooms` for matched users
- backend inserts both users into `chat_room_members`
- DB trigger logic creates and maintains `conversation_summaries`
- client writes actual chat messages into `messages`
- Supabase Realtime pushes message + summary changes to clients
- typing/presence stays ephemeral in Realtime channels

That is the correct full model for the Figma-style chat.
