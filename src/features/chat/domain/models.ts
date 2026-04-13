export type ChatRoomKind = 'direct' | 'group';

export type ChatRoom = {
  id: string;
  kind: ChatRoomKind;
  lastMessageAt: string;
  preview: string;
  photoUrl?: string | null;
  headline?: string | null;
  participantUserId?: string | null;
  title: string;
  unreadCount: number;
};

export type ChatMessageStatus = 'sending' | 'sent' | 'failed';
export type ChatMessageType = 'text' | 'image' | 'video' | 'file';

export type ChatMessage = {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  createdAt: string;
  mediaMimeType?: string | null;
  mediaName?: string | null;
  mediaSizeBytes?: number | null;
  mediaUrl?: string | null;
  messageType: ChatMessageType;
  status?: ChatMessageStatus;
  thumbnailUrl?: string | null;
  clientId?: string | null;
};

export type PaginatedMessages = {
  items: ChatMessage[];
  nextCursor: string | null;
};

export type SendMessageInput = {
  roomId: string;
  content: string;
  clientId?: string | null;
};

export type TypingState = {
  roomId: string;
  userId: string;
  displayName: string;
  isTyping: boolean;
  sentAt: string;
};

export type ChatPresenceMember = {
  userId: string;
  displayName: string;
  onlineAt: string;
};

export type RoomSubscriptionHandlers = {
  onError?: (error: Error) => void;
  onMessage?: (message: ChatMessage) => void;
  onTyping?: (typingState: TypingState) => void;
};

export type PresenceHandlers = {
  onError?: (error: Error) => void;
  onSync?: (members: ChatPresenceMember[]) => void;
};

export type ConversationSummaryHandlers = {
  onDelete?: (conversationId: string) => void;
  onError?: (error: Error) => void;
  onUpsert?: (conversation: ChatRoom) => void;
};
