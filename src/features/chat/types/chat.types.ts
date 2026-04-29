export type ChatConversationKind = 'direct' | 'group';

export type ChatConversation = {
  id: string;
  kind: ChatConversationKind;
  lastMessageAt: string;
  messagesStored: number;
  name: string;
  participantEmail: string;
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
  status: ChatMessageStatus;
};
