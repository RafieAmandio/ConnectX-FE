import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@features/auth';
import { loadOnboardingDiscoveryPreference } from '@features/home/services/onboarding-discovery-preference';

import {
  LOCAL_MESSAGE_LIMIT,
  appendMockMessage,
  listMockConversations,
  listMockMessages,
  resetMockChatData,
  type MockChatSeedVariant,
} from '../services/chat-sqlite-service';

export const chatQueryKeys = {
  conversationsRoot: ['chat-demo', 'conversations'] as const,
  conversations: (seedVariant: MockChatSeedVariant) =>
    ['chat-demo', 'conversations', seedVariant] as const,
  messages: (conversationId: string) => ['chat-demo', 'messages', conversationId] as const,
};

function resolveMockChatSeedVariant(
  session: ReturnType<typeof useAuth>['session']
): MockChatSeedVariant {
  const localOnboardingMode = loadOnboardingDiscoveryPreference()?.mode ?? null;
  const apiDiscoveryMode =
    session?.authSessionSource === 'api' ? session.defaultDiscoveryMode ?? null : null;
  const defaultMode =
    apiDiscoveryMode ?? localOnboardingMode ?? session?.defaultDiscoveryMode ?? null;

  return defaultMode === 'joining_startups' ? 'startup' : 'individual';
}

export function useChatConversations() {
  const { session } = useAuth();
  const seedVariant = resolveMockChatSeedVariant(session);

  return useQuery({
    queryKey: chatQueryKeys.conversations(seedVariant),
    queryFn: () => listMockConversations(seedVariant),
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
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversationsRoot }),
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(conversationId) }),
      ]);
    },
  });
}

export function useResetMockChatData(activeConversationId: string | null) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const seedVariant = resolveMockChatSeedVariant(session);

  return useMutation({
    mutationFn: () => resetMockChatData(seedVariant),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversationsRoot });

      if (activeConversationId) {
        await queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(activeConversationId) });
      }
    },
  });
}

export { LOCAL_MESSAGE_LIMIT };
