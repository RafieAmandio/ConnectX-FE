import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { useAuth } from '@features/auth';

import {
  getConversationSummaries,
  getChatMessages,
  markConversationRead,
  sendChatMessage,
  setRoomTyping,
  subscribeToConversationSummaries,
  subscribeToChatRoom,
  subscribeToRoomPresence,
} from '../../domain/usecases';
import type {
  ChatMessage,
  ChatRoom,
  ChatPresenceMember,
  PaginatedMessages,
  TypingState,
} from '../../domain/models';
import { supabaseChatRepository } from '../../data/supabase/SupabaseChatRepository';

const chatQueryKeys = {
  messages: (roomId: string) => ['chat', 'messages', roomId] as const,
  rooms: ['chat', 'rooms'] as const,
};

function upsertMessage(items: ChatMessage[], nextMessage: ChatMessage) {
  const nextItems = [...items];
  const matchingIndex = nextItems.findIndex(
    (message) =>
      message.id === nextMessage.id ||
      (message.clientId && nextMessage.clientId && message.clientId === nextMessage.clientId)
  );

  if (matchingIndex >= 0) {
    nextItems[matchingIndex] = {
      ...nextItems[matchingIndex],
      ...nextMessage,
      status: nextMessage.status ?? 'sent',
    };
  } else {
    nextItems.push(nextMessage);
  }

  return nextItems.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

function upsertRoom(rooms: ChatRoom[], nextRoom: ChatRoom) {
  const nextRooms = [...rooms];
  const index = nextRooms.findIndex((room) => room.id === nextRoom.id);

  if (index >= 0) {
    nextRooms[index] = nextRoom;
  } else {
    nextRooms.push(nextRoom);
  }

  return nextRooms.sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt));
}

function markRoomRead(
  rooms: ChatRoom[],
  conversationId: string
) {
  return rooms.map((room) =>
    room.id === conversationId ? { ...room, unreadCount: 0 } : room
  );
}

export function useChatRooms(enabled = true) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const query = useQuery({
    enabled,
    queryKey: chatQueryKeys.rooms,
    queryFn: () => getConversationSummaries(supabaseChatRepository),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
  });

  React.useEffect(() => {
    if (!enabled || !session?.user?.id) {
      return;
    }

    const unsubscribe = subscribeToConversationSummaries(supabaseChatRepository, {
      onDelete: (conversationId) => {
        queryClient.setQueryData(chatQueryKeys.rooms, (current: ChatRoom[] | undefined) =>
          (current ?? []).filter((room) => room.id !== conversationId)
        );
      },
      onError: (error) => {
        console.warn('Conversation summaries subscription error:', error.message);
      },
      onUpsert: (conversation) => {
        queryClient.setQueryData(chatQueryKeys.rooms, (current: ChatRoom[] | undefined) =>
          upsertRoom(current ?? [], conversation)
        );
      },
    });

    return unsubscribe;
  }, [enabled, queryClient, session?.user?.id]);

  return query;
}

export function useRoomMessages(roomId: string | null, enabled = true) {
  return useQuery({
    enabled: enabled && Boolean(roomId),
    queryKey: roomId ? chatQueryKeys.messages(roomId) : ['chat', 'messages', 'idle'],
    queryFn: () => getChatMessages(supabaseChatRepository, roomId ?? ''),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
  });
}

export function useSendChatMessage(roomId: string | null) {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async ({
      clientId,
      content,
    }: {
      clientId: string;
      content: string;
    }) => {
      if (!roomId) {
        throw new Error('Pick a room before sending a message.');
      }

      if (!session?.user?.id) {
        throw new Error('A signed-in chat user is required to send messages.');
      }

      return sendChatMessage(supabaseChatRepository, {
        roomId,
        content,
        clientId,
      });
    },
    onMutate: async ({
      clientId,
      content,
    }: {
      clientId: string;
      content: string;
    }) => {
      if (!roomId || !session?.user?.id) {
        return null;
      }

      const optimisticMessage: ChatMessage = {
        id: `optimistic:${clientId}`,
        roomId,
        senderId: session.user.id,
        content: content.trim(),
        createdAt: new Date().toISOString(),
        messageType: 'text',
        status: 'sending',
        clientId,
      };

      await queryClient.cancelQueries({ queryKey: chatQueryKeys.messages(roomId) });

      const previousMessages = queryClient.getQueryData<PaginatedMessages>(
        chatQueryKeys.messages(roomId)
      );

      queryClient.setQueryData<PaginatedMessages>(chatQueryKeys.messages(roomId), (current) => ({
        items: upsertMessage(current?.items ?? [], optimisticMessage),
        nextCursor: current?.nextCursor ?? null,
      }));

      return {
        optimisticMessage,
        previousMessages,
      };
    },
    onError: (_error, _content, context) => {
      if (!roomId || !context?.optimisticMessage) {
        return;
      }

      queryClient.setQueryData<PaginatedMessages>(chatQueryKeys.messages(roomId), (current) => {
        const items = (current?.items ?? []).map((message) =>
          message.id === context.optimisticMessage.id
            ? { ...message, status: 'failed' as const }
            : message
        );

        return {
          items,
          nextCursor: current?.nextCursor ?? null,
        };
      });
    },
    onSuccess: (savedMessage, _content, context) => {
      if (!roomId) {
        return;
      }

      queryClient.setQueryData<PaginatedMessages>(chatQueryKeys.messages(roomId), (current) => {
        const messages = current?.items ?? [];
        const optimisticId = context?.optimisticMessage?.id;
        const optimisticClientId = context?.optimisticMessage?.clientId;
        const filteredMessages = messages.filter(
          (message) =>
            message.id !== optimisticId &&
            !(message.clientId && optimisticClientId && message.clientId === optimisticClientId)
        );

        return {
          items: upsertMessage(filteredMessages, savedMessage),
          nextCursor: current?.nextCursor ?? null,
        };
      });
    },
  });
}

export function useMarkConversationRead(conversationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!conversationId) {
        throw new Error('Pick a conversation before marking it as read.');
      }

      await markConversationRead(supabaseChatRepository, conversationId);
    },
    onSuccess: () => {
      if (!conversationId) {
        return;
      }

      queryClient.setQueryData(chatQueryKeys.rooms, (current: import('../../domain/models').ChatRoom[] | undefined) =>
        markRoomRead(current ?? [], conversationId)
      );
    },
  });
}

export function markConversationAsReadInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string
) {
  queryClient.setQueryData(chatQueryKeys.rooms, (current: ChatRoom[] | undefined) =>
        markRoomRead(current ?? [], conversationId)
      );
}

export function useRoomRealtime(roomId: string | null, enabled = true) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [typingState, setTypingState] = React.useState<TypingState | null>(null);
  const typingTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!roomId) {
      return;
    }

    if (!enabled) {
      return;
    }

    const unsubscribe = subscribeToChatRoom(supabaseChatRepository, roomId, {
      onError: (error) => {
        console.warn('Chat room subscription error:', error.message);
      },
      onMessage: (message) => {
        queryClient.setQueryData<PaginatedMessages>(chatQueryKeys.messages(roomId), (current) => ({
          items: upsertMessage(current?.items ?? [], message),
          nextCursor: current?.nextCursor ?? null,
        }));
      },
      onTyping: (nextTypingState) => {
        if (nextTypingState.userId === session?.user?.id) {
          return;
        }

        if (!nextTypingState.isTyping) {
          setTypingState((current) =>
            current?.userId === nextTypingState.userId ? null : current
          );
          return;
        }

        setTypingState(nextTypingState);

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
          setTypingState((current) =>
            current?.userId === nextTypingState.userId ? null : current
          );
        }, 3000);
      },
    });

    return () => {
      unsubscribe();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [enabled, queryClient, roomId, session?.user?.id]);

  return { typingState };
}

export function useRoomPresence(roomId: string | null, enabled = true) {
  const [error, setError] = React.useState<Error | null>(null);
  const [members, setMembers] = React.useState<ChatPresenceMember[]>([]);

  React.useEffect(() => {
    if (!roomId) {
      return;
    }

    if (!enabled) {
      return;
    }

    const unsubscribe = subscribeToRoomPresence(supabaseChatRepository, roomId, {
      onError: (nextError) => {
        setError(nextError);
      },
      onSync: (nextMembers) => {
        setError(null);
        setMembers(nextMembers);
      },
    });

    return unsubscribe;
  }, [enabled, roomId]);

  return { error, members };
}

export function useRoomTyping(roomId: string | null, draftMessage: string, enabled = true) {
  const lastTypingStateRef = React.useRef(false);

  React.useEffect(() => {
    if (!roomId) {
      return;
    }

    if (!enabled) {
      return;
    }

    const nextIsTyping = draftMessage.trim().length > 0;

    if (lastTypingStateRef.current === nextIsTyping) {
      return;
    }

    const timeout = setTimeout(() => {
      lastTypingStateRef.current = nextIsTyping;
      void setRoomTyping(supabaseChatRepository, roomId, nextIsTyping).catch((error) => {
        console.warn('Failed to update typing state:', error);
      });
    }, 200);

    return () => {
      clearTimeout(timeout);
    };
  }, [draftMessage, enabled, roomId]);

  React.useEffect(() => {
    return () => {
      if (enabled && roomId && lastTypingStateRef.current) {
        lastTypingStateRef.current = false;
        void setRoomTyping(supabaseChatRepository, roomId, false).catch((error) => {
          console.warn('Failed to clear typing state:', error);
        });
      }
    };
  }, [enabled, roomId]);
}
