export type ChatConversationKind = 'direct' | 'group';

export type ChatConversation = {
  headline?: string | null;
  id: string;
  kind: ChatConversationKind;
  lastMessageAt: string;
  messagesStored: number;
  name: string;
  participantEmail?: string | null;
  participantUserId?: string | null;
  photoUrl: string | null;
  preview: string;
  unreadCount: number;
};

export type ChatMessageDirection = 'incoming' | 'outgoing';

export type ChatMessageStatus = 'sent' | 'read';

export type ChatMessage = {
  body: string;
  conversationId: string;
  createdAt: string;
  direction: ChatMessageDirection;
  id: string;
  media?: {
    mimeType: string | null;
    sizeBytes: number | null;
    thumbnailUrl: string | null;
    url: string | null;
  } | null;
  senderId?: string | null;
  status: ChatMessageStatus;
  type?: 'text' | 'image' | 'video' | 'file';
};
