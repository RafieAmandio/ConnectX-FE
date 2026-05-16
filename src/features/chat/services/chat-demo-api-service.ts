import { apiFetch } from '@shared/services/api';
import type { ViewerContext } from '@features/home/services/discovery-viewer-context';

import type { ChatConversation, ChatMessage } from '../types/chat.types';

const DEFAULT_MESSAGE_LIMIT = 50;

export const CHAT_DEMO_API = {
  CONVERSATIONS: '/api/v1/conversations',
  MESSAGES: (conversationId: string) => `/api/v1/conversations/${conversationId}/messages`,
  READ: (conversationId: string) => `/api/v1/conversations/${conversationId}/read`,
  UPLOAD: '/api/v1/upload',
} as const;

type ChatDemoOtherUserResponse = {
  avatar_url?: string | null;
  headline?: string | null;
  is_online?: boolean | null;
  name?: string | null;
  user_id?: string | null;
};

type ChatDemoMediaResponse = {
  mime_type?: string | null;
  size_bytes?: number | null;
  thumbnail_url?: string | null;
  url?: string | null;
};

export type ChatDemoMessageResponse = {
  content?: string | null;
  conversation_id?: string | null;
  created_at?: string | null;
  id: string;
  media?: ChatDemoMediaResponse | null;
  media_mime_type?: string | null;
  media_size_bytes?: number | null;
  media_url?: string | null;
  message_type?: string | null;
  read_at?: string | null;
  room_id?: string | null;
  sender_id?: string | null;
  sent_at?: string | null;
  text?: string | null;
  thumbnail_url?: string | null;
  type?: string | null;
};

type ChatDemoConversationResponse = {
  created_at?: string | null;
  id: string;
  last_message?: ChatDemoMessageResponse | null;
  match_id?: string | null;
  other_user?: ChatDemoOtherUserResponse | null;
  unread_count?: number | null;
};

type ChatDemoConversationsResponse = {
  conversations?: ChatDemoConversationResponse[];
  total?: number;
};

type ChatDemoMessagesResponse = {
  has_more?: boolean;
  messages?: ChatDemoMessageResponse[];
  next_cursor?: string | null;
};

type SendChatDemoMessageResponse =
  | ChatDemoMessageResponse
  | {
      data?: ChatDemoMessageResponse;
      message?: ChatDemoMessageResponse | string;
    };

export type ChatDemoUploadedMedia = {
  media_id: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  thumbnail_url?: string | null;
  url?: string | null;
};

type MarkChatDemoConversationReadResponse = {
  status?: string;
};

export type ChatDemoMediaAsset = {
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  uri: string;
};

export type ChatDemoMessagesPage = {
  hasMore: boolean;
  items: ChatMessage[];
  nextCursor: string | null;
};

function normalizeMessageType(value: string | null | undefined): ChatMessage['type'] {
  const normalizedValue = value?.trim().toLowerCase();

  if (normalizedValue === 'image' || normalizedValue === 'video' || normalizedValue === 'file') {
    return normalizedValue;
  }

  return 'text';
}

function getMessageText(message: ChatDemoMessageResponse) {
  return message.text ?? message.content ?? '';
}

function getMessageSentAt(message: ChatDemoMessageResponse) {
  return message.sent_at ?? message.created_at ?? new Date().toISOString();
}

function getMessageMedia(message: ChatDemoMessageResponse): ChatMessage['media'] {
  const media = message.media;
  const url = media?.url ?? message.media_url ?? null;
  const thumbnailUrl = media?.thumbnail_url ?? message.thumbnail_url ?? url;
  const mimeType = media?.mime_type ?? message.media_mime_type ?? null;
  const sizeBytes = media?.size_bytes ?? message.media_size_bytes ?? null;

  if (!url && !thumbnailUrl && !mimeType && !sizeBytes) {
    return null;
  }

  return {
    mimeType,
    sizeBytes,
    thumbnailUrl,
    url,
  };
}

function getConversationPreview(message: ChatDemoMessageResponse | null | undefined) {
  if (!message) {
    return 'No messages yet';
  }

  const text = getMessageText(message).trim();

  if (text) {
    return text;
  }

  const type = normalizeMessageType(message.type ?? message.message_type);

  if (type === 'image') {
    return 'Photo';
  }

  if (type === 'video') {
    return 'Video';
  }

  if (type === 'file') {
    return 'Attachment';
  }

  return 'Message';
}

export function mapChatDemoMessage(
  message: ChatDemoMessageResponse,
  currentUserId: string | null | undefined
): ChatMessage {
  const senderId = message.sender_id ?? null;
  const type = normalizeMessageType(message.type ?? message.message_type);

  return {
    body: getMessageText(message),
    conversationId: message.conversation_id ?? message.room_id ?? '',
    createdAt: getMessageSentAt(message),
    direction: currentUserId && senderId === currentUserId ? 'outgoing' : 'incoming',
    id: message.id,
    media: getMessageMedia(message),
    senderId,
    status: message.read_at ? 'read' : 'sent',
    type,
  };
}

function mapChatDemoConversation(conversation: ChatDemoConversationResponse): ChatConversation {
  const otherUser = conversation.other_user;
  const lastMessageAt = conversation.last_message
    ? getMessageSentAt(conversation.last_message)
    : conversation.created_at ?? new Date().toISOString();

  return {
    headline: otherUser?.headline ?? null,
    id: conversation.id,
    kind: 'direct',
    lastMessageAt,
    lastMessageId: conversation.last_message?.id ?? null,
    messagesStored: 0,
    name: otherUser?.name?.trim() || 'ConnectX Member',
    participantEmail: null,
    participantUserId: otherUser?.user_id ?? null,
    photoUrl: otherUser?.avatar_url ?? null,
    preview: getConversationPreview(conversation.last_message),
    unreadCount: conversation.unread_count ?? 0,
  };
}

function buildConversationsPath(viewerContext?: ViewerContext) {
  if (!viewerContext) {
    return CHAT_DEMO_API.CONVERSATIONS;
  }

  const params = new URLSearchParams();

  params.set('viewer_context', viewerContext);

  return `${CHAT_DEMO_API.CONVERSATIONS}?${params.toString()}`;
}

function buildMessagesPath(
  conversationId: string,
  before?: string | null,
  limit = DEFAULT_MESSAGE_LIMIT,
  viewerContext?: ViewerContext
) {
  const params = new URLSearchParams();

  params.set('limit', String(limit));

  if (before) {
    params.set('before', before);
  }

  if (viewerContext) {
    params.set('viewer_context', viewerContext);
  }

  return `${CHAT_DEMO_API.MESSAGES(conversationId)}?${params.toString()}`;
}

function extractMediaFileName(media: ChatDemoMediaAsset) {
  const fallbackName = `chat-media-${Date.now()}.jpg`;
  const fileName = media.fileName?.trim();

  if (fileName) {
    return fileName;
  }

  const uriFileName = media.uri.split('/').pop()?.split('?')[0]?.trim();

  return uriFileName || fallbackName;
}

function getMessageFromSendResponse(response: SendChatDemoMessageResponse) {
  return 'data' in response && response.data
    ? response.data
    : 'message' in response && response.message && typeof response.message === 'object'
      ? response.message
      : (response as ChatDemoMessageResponse);
}

export async function fetchChatDemoConversations(viewerContext?: ViewerContext) {
  const response = await apiFetch<ChatDemoConversationsResponse>(
    buildConversationsPath(viewerContext)
  );

  return (response.conversations ?? [])
    .map(mapChatDemoConversation)
    .sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt));
}

export async function fetchChatDemoMessages({
  before,
  conversationId,
  currentUserId,
  limit = DEFAULT_MESSAGE_LIMIT,
  viewerContext,
}: {
  before?: string | null;
  conversationId: string;
  currentUserId?: string | null;
  limit?: number;
  viewerContext?: ViewerContext;
}): Promise<ChatDemoMessagesPage> {
  const response = await apiFetch<ChatDemoMessagesResponse>(
    buildMessagesPath(conversationId, before, limit, viewerContext)
  );
  const newestFirstMessages = response.messages ?? [];
  const items = [...newestFirstMessages]
    .reverse()
    .map((message) => mapChatDemoMessage(message, currentUserId));
  const fallbackNextCursor =
    response.has_more && newestFirstMessages.length > 0 ? newestFirstMessages.at(-1)?.id ?? null : null;

  return {
    hasMore: Boolean(response.has_more),
    items,
    nextCursor: response.next_cursor ?? fallbackNextCursor,
  };
}

export async function sendChatDemoTextMessage({
  body,
  conversationId,
  currentUserId,
}: {
  body: string;
  conversationId: string;
  currentUserId?: string | null;
}) {
  const response = await apiFetch<SendChatDemoMessageResponse>(CHAT_DEMO_API.MESSAGES(conversationId), {
    body: {
      type: 'text',
      text: body,
    } as any,
    method: 'POST',
  });

  return mapChatDemoMessage(getMessageFromSendResponse(response), currentUserId);
}

export async function uploadChatDemoMedia(media: ChatDemoMediaAsset) {
  const formData = new FormData();

  formData.append(
    'file',
    {
      name: extractMediaFileName(media),
      type: media.mimeType?.trim() || 'image/jpeg',
      uri: media.uri,
    } as any
  );

  return apiFetch<ChatDemoUploadedMedia>(CHAT_DEMO_API.UPLOAD, {
    body: formData,
    method: 'POST',
  });
}

export async function sendChatDemoImageMessage({
  conversationId,
  currentUserId,
  mediaId,
}: {
  conversationId: string;
  currentUserId?: string | null;
  mediaId: string;
}) {
  const response = await apiFetch<SendChatDemoMessageResponse>(CHAT_DEMO_API.MESSAGES(conversationId), {
    body: {
      media_id: mediaId,
      type: 'image',
    } as any,
    method: 'POST',
  });

  return mapChatDemoMessage(getMessageFromSendResponse(response), currentUserId);
}

export async function markChatDemoConversationRead({
  conversationId,
  lastReadMessageId,
}: {
  conversationId: string;
  lastReadMessageId: string;
}) {
  await apiFetch<MarkChatDemoConversationReadResponse>(CHAT_DEMO_API.READ(conversationId), {
    body: {
      last_read_message_id: lastReadMessageId,
    } as any,
    method: 'POST',
  });
}
