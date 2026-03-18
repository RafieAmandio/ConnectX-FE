import { Stack } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { AppCard } from '@/components/ui/app-card';
import { AppPill } from '@/components/ui/app-pill';
import { AppText } from '@/components/ui/app-text';

const threads = [
  {
    name: 'Maya Chen',
    preview: 'Love the direction. Want to jump into a quick intro tomorrow?',
    time: '2m ago',
    unread: '2 unread',
  },
  {
    name: 'Ops Squad',
    preview: 'We can cover onboarding copy once the OTP flow is real.',
    time: '18m ago',
    unread: 'team thread',
  },
  {
    name: 'Jess Alvarez',
    preview: 'I sent over the deck notes and a quick summary.',
    time: '1h ago',
    unread: 'caught up',
  },
] as const;

export default function ChatScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Chat' }} />
      <ScrollView
        className="flex-1 bg-canvas"
        contentContainerClassName="gap-6 px-5 pt-4 pb-24"
        contentInsetAdjustmentBehavior="automatic">
        <AppCard className="gap-4">
          <AppPill className="self-start" label="Conversation Hub" tone="accent" />
          <AppText variant="hero">A focused inbox for active threads.</AppText>
          <AppText tone="muted">
            This mock layout gives you a strong starting point for messages, unread counts, typing
            indicators, or chat categories later.
          </AppText>
        </AppCard>

        <View className="gap-3">
          {threads.map((thread) => (
            <AppCard key={thread.name} className="gap-3">
              <View className="flex-row items-center justify-between gap-3">
                <AppText variant="subtitle">{thread.name}</AppText>
                <AppText tone="soft" variant="code">
                  {thread.time}
                </AppText>
              </View>
              <AppText tone="muted">{thread.preview}</AppText>
              <AppPill
                className="self-start"
                label={thread.unread}
                tone={thread.unread === 'caught up' ? 'neutral' : 'accent'}
              />
            </AppCard>
          ))}
        </View>
      </ScrollView>
    </>
  );
}
