import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  LOCAL_MESSAGE_LIMIT,
  appendMockMessage,
  listMockConversations,
  listMockMessages,
  resetMockChatData,
} from '../services/chat-sqlite-service';

const chatQueryKeys = {
  conversations: ['chat-demo', 'conversations'] as const,
  messages: (conversationId: string) => ['chat-demo', 'messages', conversationId] as const,
};

export function useChatConversations() {
  return useQuery({
    queryKey: chatQueryKeys.conversations,
    queryFn: listMockConversations,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    enabled: Boolean(conversationId),
    queryKey: conversationId ? chatQueryKeys.messages(conversationId) : ['chat-demo', 'messages', 'idle'],
    queryFn: async () => listMockMessages(conversationId ?? ''),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useAppendMockMessage(conversationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: string) => {
      if (!conversationId) {
        throw new Error('Pick a conversation before sending a message.');
      }

      return appendMockMessage(conversationId, body);
    },
    onSuccess: async () => {
      if (!conversationId) {
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations }),
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(conversationId) }),
      ]);
    },
  });
}

export function useResetMockChatData(activeConversationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resetMockChatData,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversations });

      if (activeConversationId) {
        await queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(activeConversationId) });
      }
    },
  });
}

export { LOCAL_MESSAGE_LIMIT };
