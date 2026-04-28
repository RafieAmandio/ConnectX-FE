import { useLocalSearchParams } from 'expo-router';

import { ChatDemoConversationScreen } from '@features/chat-demo';

export default function ChatDemoConversationRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <ChatDemoConversationScreen conversationId={id} />;
}
