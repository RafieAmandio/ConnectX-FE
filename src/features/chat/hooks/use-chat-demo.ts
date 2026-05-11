import { type InfiniteData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { useAuth } from '@features/auth';
import { supabaseData } from '@shared/services/supabase/client';
import { isExpoDevModeEnabled } from '@shared/utils/env';

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

function createEmptyMessagesCache(): InfiniteData<ChatDemoMessagesPage> {
  return {
    pageParams: [null],
    pages: [
      {
        hasMore: false,
        items: [],
        nextCursor: null,
      },
    ],
  };
}

function upsertMessageInCache(
  current: InfiniteData<ChatDemoMessagesPage> | undefined,
  nextMessage: ChatMessage
) {
  const cache = current ?? createEmptyMessagesCache();

  const hasMessage = cache.pages.some((page) =>
    page.items.some((message) => message.id === nextMessage.id)
  );

  if (hasMessage) {
    return {
      ...cache,
      pages: cache.pages.map((page) => ({
        ...page,
        items: page.items.map((message) => (message.id === nextMessage.id ? nextMessage : message)),
      })),
    };
  }

  const [latestPage, ...olderPages] = cache.pages;

  if (!latestPage) {
    return cache;
  }

  return {
    ...cache,
    pages: [
      {
        ...latestPage,
        items: upsertMessage(latestPage.items, nextMessage),
      },
      ...olderPages,
    ],
  };
}

function removeMessageFromCache(
  current: InfiniteData<ChatDemoMessagesPage> | undefined,
  messageId: string
) {
  if (!current) {
    return current;
  }

  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      items: page.items.filter((message) => message.id !== messageId),
    })),
  };
}

function updateMessageInCache(
  current: InfiniteData<ChatDemoMessagesPage> | undefined,
  messageId: string,
  updateMessage: (message: ChatMessage) => ChatMessage
) {
  if (!current) {
    return current;
  }

  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      items: page.items.map((message) =>
        message.id === messageId ? updateMessage(message) : message
      ),
    })),
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

function getRealtimeMessageConversationId(record: ChatDemoMessageResponse) {
  return record.conversation_id ?? record.room_id ?? null;
}

function getRealtimeMessageRecord(payload: unknown): ChatDemoMessageResponse | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if ('new' in payload && payload.new && typeof payload.new === 'object') {
    return payload.new as ChatDemoMessageResponse;
  }

  if ('record' in payload && payload.record && typeof payload.record === 'object') {
    return payload.record as ChatDemoMessageResponse;
  }

  const nestedData = 'data' in payload ? payload.data : null;

  if (nestedData && typeof nestedData === 'object' && 'record' in nestedData) {
    const nestedRecord = nestedData.record;

    if (nestedRecord && typeof nestedRecord === 'object') {
      return nestedRecord as ChatDemoMessageResponse;
    }
  }

  return null;
}

function getRealtimePayloadErrors(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if ('errors' in payload) {
    return payload.errors;
  }

  const nestedData = 'data' in payload ? payload.data : null;

  if (nestedData && typeof nestedData === 'object' && 'errors' in nestedData) {
    return nestedData.errors;
  }

  return null;
}

type ChatDemoConversationsOptions = {
  refetchInterval?: number | false;
};

type ChatDemoMessagesOptions = {
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

export function useChatDemoMessages(
  conversationId: string | null,
  options: ChatDemoMessagesOptions = {}
) {
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
    refetchInterval: options.refetchInterval ?? false,
    staleTime: 15_000,
  });
}

type SendChatDemoMessageContext = {
  tempMessageId: string;
};

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
    onMutate: async (body) => {
      if (!conversationId) {
        return undefined;
      }

      const messageBody = body.trim();
      const tempMessage: ChatMessage = {
        body: messageBody,
        conversationId,
        createdAt: new Date().toISOString(),
        direction: 'outgoing',
        id: `temp:${Date.now()}`,
        media: null,
        senderId: currentUserId,
        status: 'sending',
        type: 'text',
      };

      await Promise.all([
        queryClient.cancelQueries({ queryKey: chatDemoQueryKeys.messages(conversationId) }),
        queryClient.cancelQueries({ queryKey: chatDemoQueryKeys.conversations }),
      ]);

      queryClient.setQueryData<InfiniteData<ChatDemoMessagesPage>>(
        chatDemoQueryKeys.messages(conversationId),
        (current) => upsertMessageInCache(current, tempMessage)
      );
      queryClient.setQueryData<ChatConversation[]>(chatDemoQueryKeys.conversations, (current) =>
        updateConversationCacheFromMessage(current, conversationId, tempMessage)
      );

      return {
        tempMessageId: tempMessage.id,
      } satisfies SendChatDemoMessageContext;
    },
    onError: (_error, _body, context) => {
      if (!conversationId || !context?.tempMessageId) {
        return;
      }

      queryClient.setQueryData<InfiniteData<ChatDemoMessagesPage>>(
        chatDemoQueryKeys.messages(conversationId),
        (current) =>
          updateMessageInCache(current, context.tempMessageId, (message) => ({
            ...message,
            status: 'failed',
          }))
      );
    },
    onSuccess: (message, _body, context) => {
      if (!conversationId) {
        return;
      }

      queryClient.setQueryData<InfiniteData<ChatDemoMessagesPage>>(
        chatDemoQueryKeys.messages(conversationId),
        (current) =>
          upsertMessageInCache(
            context?.tempMessageId
              ? removeMessageFromCache(current, context.tempMessageId)
              : current,
            message
          )
      );
      queryClient.setQueryData<ChatConversation[]>(chatDemoQueryKeys.conversations, (current) =>
        updateConversationCacheFromMessage(current, conversationId, message)
      );
    },
    onSettled: async () => {
      if (!conversationId) {
        await queryClient.invalidateQueries({ queryKey: chatDemoQueryKeys.conversations });
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: chatDemoQueryKeys.conversations }),
        queryClient.invalidateQueries({ queryKey: chatDemoQueryKeys.messages(conversationId) }),
      ]);
    },
  });
}

export function useChatDemoRoomRealtime(conversationId: string | null) {
  const { isChatEnabled, session } = useAuth();
  const currentUserId = session?.user?.id ?? null;
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!conversationId || !isChatEnabled) {
      return;
    }

    let isActive = true;
    const refetchRoom = () => {
      if (!isActive) {
        return Promise.resolve();
      }

      return Promise.all([
        queryClient.invalidateQueries({ queryKey: chatDemoQueryKeys.messages(conversationId) }),
        queryClient.invalidateQueries({ queryKey: chatDemoQueryKeys.conversations }),
      ]);
    };

    const debugAllMessagesChannel = isExpoDevModeEnabled()
      ? supabaseData
          .channel(`chat_room_debug_all_messages:${conversationId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
            },
            (payload) => {
              console.log('[chat-demo:realtime-debug] unfiltered messages insert payload', {
                conversationId,
                payload,
              });
            }
          )
          .subscribe((status, error) => {
            console.log('[chat-demo:realtime-debug] unfiltered subscription status', {
              conversationId,
              error:
                error instanceof Error
                  ? error.message
                  : typeof error === 'string'
                    ? error
                    : null,
              status,
            });
          })
      : null;

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
          console.log('[chat-demo:realtime] raw postgres payload', {
            conversationId,
            payload,
          });

          const record = getRealtimeMessageRecord(payload);

          if (!record) {
            console.log('[chat-demo:realtime] message insert missing record', {
              conversationId,
              errors: getRealtimePayloadErrors(payload),
              payloadKeys: payload && typeof payload === 'object' ? Object.keys(payload) : [],
            });

            void refetchRoom();
            return;
          }

          const realtimeConversationId = getRealtimeMessageConversationId(record);

          console.log('[chat-demo:realtime] message insert received', {
            conversationId,
            errors: getRealtimePayloadErrors(payload),
            eventType: payload.eventType,
            realtimeConversationId,
            record,
          });

          if (!record.id || !realtimeConversationId) {
            void refetchRoom();
            return;
          }

          if (realtimeConversationId !== conversationId) {
            return;
          }

          void Promise.all([
            queryClient.cancelQueries({ queryKey: chatDemoQueryKeys.messages(conversationId) }),
            queryClient.cancelQueries({ queryKey: chatDemoQueryKeys.conversations }),
          ]).then(() => {
            if (!isActive) {
              return;
            }

            const message = mapChatDemoMessage(record, currentUserId);

            console.log('[chat-demo:realtime] applying message to cache', {
              conversationId,
              message,
            });

            queryClient.setQueryData<InfiniteData<ChatDemoMessagesPage>>(
              chatDemoQueryKeys.messages(conversationId),
              (current) => upsertMessageInCache(current, message)
            );
            queryClient.setQueryData<ChatConversation[]>(
              chatDemoQueryKeys.conversations,
              (current) => updateConversationCacheFromMessage(current, conversationId, message)
            );
          });
        }
      )
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          void refetchRoom();
        }

        if (!isExpoDevModeEnabled()) {
          return;
        }

        console.log('[chat-demo:realtime] subscription status', {
          conversationId,
          error:
            error instanceof Error
              ? error.message
              : typeof error === 'string'
                ? error
                : null,
          status,
        });
      });

    return () => {
      isActive = false;
      if (debugAllMessagesChannel) {
        void supabaseData.removeChannel(debugAllMessagesChannel);
      }
      void supabaseData.removeChannel(channel);
    };
  }, [conversationId, currentUserId, isChatEnabled, queryClient]);
}
