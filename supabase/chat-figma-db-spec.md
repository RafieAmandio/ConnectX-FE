# Chat Figma DB Spec

This document describes the database shape needed to support the Figma-style chat screen.

If your backend already has `public.users` as the app profile table, prefer
[supabase/chat-figma-backend-handoff.md](/Users/dwiki/Development/connectx/supabase/chat-figma-backend-handoff.md)
and do not add a duplicate `profiles` table.

The Figma screen needs:

- a horizontal row of conversation cards
- avatar and headline on each card
- unread count badge per conversation
- selected conversation header with participant metadata
- existing realtime message list and composer

It is a planning doc only. No schema changes are applied by this file.

## Current State

The current chat experiment stores and reads:

- `chat_rooms`
- `chat_room_members`
- `messages`
- `conversation_summaries`

`conversation_summaries` currently supports:

- `conversation_id`
- `user_id`
- `title`
- `kind`
- `last_message_text`
- `last_message_at`
- `unread_count`
- read tracking fields

This is enough for the current inbox UI, but not enough for the Figma design because the Figma cards also need:

- participant photo
- participant headline / role
- participant display name
- a stable selected conversation header model

## Figma Data Requirements

For each conversation card in the horizontal list, the client needs:

- `conversation_id`
- `display_name`
- `photo_url`
- `headline`
- `unread_count`
- `last_message_text`
- `last_message_at`
- `is_online` or a presence-derived status

For the selected conversation header, the client needs:

- `conversation_id`
- `display_name`
- `photo_url`
- `headline`
- optional action metadata such as whether the user can add this person to a team

For the message thread, the current `messages` table is already sufficient.

## Recommended Approach

Keep `conversation_summaries` for message summary state and add a separate profile-oriented projection for the other participant.

Recommended model:

1. Keep `conversation_summaries` responsible for unread count and latest message data.
2. Add a view for direct-message participant metadata.
3. Join that view from the app when rendering the Figma chat cards and header.

This keeps responsibilities clear:

- summary state stays in one table
- profile data stays owned by profile-related tables
- the app avoids duplicating profile fields into every summary row unless that becomes a performance issue later

## Proposed DB Contract

### Option A: Preferred for now

Create a view named `direct_conversation_participants` with one row per:

- `viewer_user_id`
- `conversation_id`

Suggested columns:

```sql
viewer_user_id uuid not null,
conversation_id uuid not null,
participant_user_id uuid not null,
participant_name text not null,
participant_photo_url text null,
participant_headline text null
```

Behavior:

- only applies to `chat_rooms.type = 'direct'`
- resolves the "other member" of the direct conversation
- exposes profile fields for that other member

Then the client reads:

- `conversation_summaries`
- `direct_conversation_participants`

and merges them on:

- `conversation_id`
- current user as `viewer_user_id`

### Option B: Denormalized summary table

Add these columns directly to `conversation_summaries`:

```sql
participant_user_id uuid null,
participant_name text null,
participant_photo_url text null,
participant_headline text null
```

This is simpler to query, but it duplicates profile data and requires more trigger logic when a user updates their profile.

Use this only if:

- you want a single query for the chat tab
- profile changes are infrequent
- you are comfortable maintaining sync triggers

## Source Of Truth For Profile Data

This doc assumes there is, or will be, a user profile source that can provide:

- `user_id`
- `name`
- `photo_url`
- `headline`

Examples:

- a `profiles` table
- an existing app profile table
- a Supabase-backed user profile table

If there is no Supabase-side profile table yet, create one before implementing the Figma chat DB join.

Suggested minimum profile table shape:

```sql
id uuid primary key references auth.users(id) on delete cascade,
name text not null,
photo_url text null,
headline text null,
updated_at timestamptz not null default now()
```

## Suggested View Definition

If a `profiles` table exists, the view can look conceptually like this:

```sql
create or replace view public.direct_conversation_participants as
select
  viewer.user_id as viewer_user_id,
  viewer.room_id as conversation_id,
  other.user_id as participant_user_id,
  p.name as participant_name,
  p.photo_url as participant_photo_url,
  p.headline as participant_headline
from public.chat_room_members viewer
join public.chat_rooms r
  on r.id = viewer.room_id
join public.chat_room_members other
  on other.room_id = viewer.room_id
 and other.user_id <> viewer.user_id
left join public.profiles p
  on p.id = other.user_id
where r.type = 'direct';
```

Notes:

- if direct rooms can accidentally have more than two members, add a constraint or cleanup plan first
- if profile rows are optional, keep the `left join`
- if the app needs location later, add it to the view instead of `conversation_summaries`

## RLS Expectations

If using a view, users must only be able to read rows where:

- `viewer_user_id = auth.uid()`

If you switch from a view to a materialized table later, keep the same policy shape.

For a concrete table implementation, add a select policy such as:

```sql
using (viewer_user_id = auth.uid())
```

If a plain Postgres view is used, confirm that the underlying table policies on:

- `chat_room_members`
- `chat_rooms`
- `profiles`

already enforce equivalent visibility.

## Conversation Summary Changes

`conversation_summaries` should continue to own:

- unread count
- last message text
- last message timestamp
- read tracking

No Figma-driven change is required to:

- `messages`
- `mark_conversation_read`
- realtime message subscription model

Optional additions that may help later:

- `last_message_sender_id`
- `last_message_type`

Those are not required for the current Figma screenshot.

## App Query Shape After DB Work

The chat tab should be able to resolve a card model like:

```ts
type ChatCard = {
  conversationId: string;
  title: string;
  photoUrl: string | null;
  headline: string | null;
  unreadCount: number;
  preview: string;
  lastMessageAt: string;
};
```

Recommended client merge:

1. read `conversation_summaries` for summary state
2. read `direct_conversation_participants` for display metadata
3. merge by `conversation_id`
4. fall back to `conversation_summaries.title` if participant profile data is missing

## Migration Plan

1. Confirm the Supabase-side profile source table.
2. Create `direct_conversation_participants` view.
3. Verify RLS behavior for the view inputs.
4. Update the chat repository query layer to read the new view.
5. Extend the chat domain model with `photoUrl` and `headline`.
6. Build the Figma-style chat tab UI.

## Open Questions

These should be answered before implementation:

1. What is the canonical Supabase profile table name?
2. Are direct chat rooms guaranteed to have exactly two members?
3. Should group chats use group avatar/title only, or also expose member previews?
4. Should online state come from Realtime Presence only, or should it be persisted?
5. Does "Add to Team" require new backend state, or is it only a UI action for now?

## Recommendation Summary

For the Figma chat screen, do not move avatar/headline into `messages`.

Use:

- `conversation_summaries` for unread and latest-message state
- a `profiles` source for user identity fields
- a new `direct_conversation_participants` view to connect them cleanly

That gives the app the exact data needed for the horizontal chat cards without overloading the summary table.
