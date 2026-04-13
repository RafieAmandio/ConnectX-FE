import type { ChatMessage, ChatRoom, ChatRoomKind } from '../../domain/models';

export type MessageRow = {
  id: string;
  room_id: string;
  sender_id: string;
  client_id: string | null;
  content: string | null;
  created_at: string;
  media_mime_type: string | null;
  media_name: string | null;
  media_size_bytes: number | null;
  media_url: string | null;
  message_type: 'text' | 'image' | 'video' | 'file';
  thumbnail_url: string | null;
};

export type ConversationSummaryRow = {
  conversation_id: string;
  kind: ChatRoomKind;
  last_message_at: string | null;
  last_message_text: string | null;
  participant_headline: string | null;
  participant_name: string | null;
  participant_photo_url: string | null;
  participant_user_id: string | null;
  title: string;
  unread_count: number;
  updated_at: string;
};

export function mapMessageRow(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    roomId: row.room_id,
    senderId: row.sender_id,
    content: row.content ?? '',
    createdAt: row.created_at,
    mediaMimeType: row.media_mime_type,
    mediaName: row.media_name,
    mediaSizeBytes: row.media_size_bytes,
    mediaUrl: row.media_url,
    messageType: row.message_type ?? 'text',
    status: 'sent',
    thumbnailUrl: row.thumbnail_url,
    clientId: row.client_id,
  };
}

export function mapConversationSummaryRow(row: ConversationSummaryRow): ChatRoom {
  return {
    id: row.conversation_id,
    kind: row.kind,
    headline: row.participant_headline,
    lastMessageAt: row.last_message_at ?? row.updated_at,
    participantUserId: row.participant_user_id,
    photoUrl: row.participant_photo_url,
    preview: row.last_message_text ?? 'No messages yet',
    title: row.participant_name ?? row.title,
    unreadCount: row.unread_count,
  };
}
