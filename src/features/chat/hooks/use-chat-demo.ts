import { type InfiniteData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { useAuth } from '@features/auth';
import { supabaseData } from '@shared/services/supabase/client';

import {
  fetchChatDemoConversations,
  fetchChatDemoMessages,
  mapChatDemoMessage,
  sendChatDemoTextMessage,
  type ChatDemoMessageResponse,
  type ChatDemoMessagesPage,
} from '../services/chat-demo-api-service';
import type { ChatConversation, ChatMessage } from '../types/chat.types';

export const chatDemoQueryKeys = {
  conversations: ['chat-demo', 'api', 'conversations'] as const,
  messages: (conversationId: string) => ['chat-demo', 'api', 'messages', conversationId] as const,
};

function getMessagePreview(message: ChatMessage) {
  if (message.body.trim()) {
    return message.body.trim();
  }

  if (message.type === 'image') {
    return 'Photo';
  }

  if (message.type === 'video') {
    return 'Video';
  }

  if (message.type === 'file') {
    return 'Attachment';
  }

  return 'Message';
}

function upsertMessage(messages: ChatMessage[], nextMessage: ChatMessage) {
  const existingIndex = messages.findIndex((message) => message.id === nextMessage.id);

  if (existingIndex >= 0) {
    return messages.map((message, index) => (index === existingIndex ? nextMessage : message));
  }

  return [...messages, nextMessage].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

function upsertMessageInCache(
  current: InfiniteData<ChatDemoMessagesPage> | undefined,
  nextMessage: ChatMessage
) {
  if (!current) {
    return current;
  }

  const hasMessage = current.pages.some((page) =>
    page.items.some((message) => message.id === nextMessage.id)
  );

  if (hasMessage) {
    return {
      ...current,
      pages: current.pages.map((page) => ({
        ...page,
        items: page.items.map((message) => (message.id === nextMessage.id ? nextMessage : message)),
      })),
    };
  }

  const [latestPage, ...olderPages] = current.pages;

  if (!latestPage) {
    return current;
  }

  return {
    ...current,
    pages: [
      {
        ...latestPage,
        items: upsertMessage(latestPage.items, nextMessage),
      },
      ...olderPages,
    ],
  };
}

function updateConversationCacheFromMessage(
  conversations: ChatConversation[] | undefined,
  conversationId: string,
  message: ChatMessage
) {
  if (!conversations) {
    return conversations;
  }

  return conversations
    .map((conversation) => {
      if (conversation.id !== conversationId) {
        return conversation;
      }

      return {
        ...conversation,
        lastMessageAt: message.createdAt,
        preview: getMessagePreview(message),
        unreadCount:
          message.direction === 'incoming' ? conversation.unreadCount + 1 : conversation.unreadCount,
      };
    })
    .sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt));
}

function useCurrentUserId() {
  const { session } = useAuth();

  return session?.user?.id ?? null;
}

type ChatDemoConversationsOptions = {
  refetchInterval?: number | false;
};

export function useChatDemoConversations(options: ChatDemoConversationsOptions = {}) {
  return useQuery({
    queryKey: chatDemoQueryKeys.conversations,
    queryFn: fetchChatDemoConversations,
    refetchInterval: options.refetchInterval ?? false,
    staleTime: 30_000,
  });
}

export function useChatDemoMessages(conversationId: string | null) {
  const currentUserId = useCurrentUserId();

  return useInfiniteQuery({
    enabled: Boolean(conversationId),
    initialPageParam: null as string | null,
    queryKey: conversationId
      ? chatDemoQueryKeys.messages(conversationId)
      : ['chat-demo', 'api', 'messages', 'idle'],
    queryFn: ({ pageParam }) =>
      fetchChatDemoMessages({
        before: pageParam,
        conversationId: conversationId ?? '',
        currentUserId,
      }),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    staleTime: 15_000,
  });
}

export function useSendChatDemoMessage(conversationId: string | null) {
  const currentUserId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: string) => {
      if (!conversationId) {
        throw new Error('Pick a conversation before sending a message.');
      }

      return sendChatDemoTextMessage({
        body,
        conversationId,
        currentUserId,
      });
    },
    onSuccess: (message) => {
      if (!conversationId) {
        return;
      }

      queryClient.setQueryData<InfiniteData<ChatDemoMessagesPage>>(
        chatDemoQueryKeys.messages(conversationId),
        (current) => upsertMessageInCache(current, message)
      );
      queryClient.setQueryData<ChatConversation[]>(chatDemoQueryKeys.conversations, (current) =>
        updateConversationCacheFromMessage(current, conversationId, message)
      );
    },
  });
}

export function useChatDemoRoomRealtime(conversationId: string | null) {
  const currentUserId = useCurrentUserId();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!conversationId) {
      return;
    }

    const channel = supabaseData
      .channel(`chat_room:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          filter: `conversation_id=eq.${conversationId}`,
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const message = mapChatDemoMessage(payload.new as ChatDemoMessageResponse, currentUserId);

          queryClient.setQueryData<InfiniteData<ChatDemoMessagesPage>>(
            chatDemoQueryKeys.messages(conversationId),
            (current) => upsertMessageInCache(current, message)
          );
          queryClient.setQueryData<ChatConversation[]>(chatDemoQueryKeys.conversations, (current) =>
            updateConversationCacheFromMessage(current, conversationId, message)
          );
        }
      )
      .subscribe();

    return () => {
      void supabaseData.removeChannel(channel);
    };
  }, [conversationId, currentUserId, queryClient]);
}
