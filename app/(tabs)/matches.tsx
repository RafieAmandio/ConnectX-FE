import { Stack } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { AppCard } from '@/components/ui/app-card';
import { AppPill } from '@/components/ui/app-pill';
import { AppText } from '@/components/ui/app-text';

const matches = [
  {
    name: 'Maya Chen',
    note: '92% fit for product strategy and async collaboration.',
    tone: 'accent',
    status: 'Warm lead',
  },
  {
    name: 'Rafi Nandha',
    note: 'Strong operations background and very active this week.',
    tone: 'signal',
    status: 'Needs review',
  },
  {
    name: 'Jess Alvarez',
    note: 'Excellent communication score and available for quick intro.',
    tone: 'accent',
    status: 'Ready to chat',
  },
] as const;

export default function MatchesScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Matches' }} />
      <ScrollView
        className="flex-1 bg-canvas"
        contentContainerClassName="gap-6 px-5 pt-4 pb-24"
        contentInsetAdjustmentBehavior="automatic">
        <AppCard className="gap-4">
          <AppPill className="self-start" label="Discovery Queue" tone="accent" />
          <AppText variant="hero">Fresh connections worth reviewing.</AppText>
          <AppText tone="muted">
            This mock tab can become your swipe queue, recommendation feed, or shortlist screen
            once real data is connected.
          </AppText>
        </AppCard>

        <View className="gap-3">
          {matches.map((match) => (
            <AppCard key={match.name} className="gap-3">
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1 gap-1">
                  <AppText variant="subtitle">{match.name}</AppText>
                  <AppText tone="muted">{match.note}</AppText>
                </View>
                <AppPill label={match.status} tone={match.tone} />
              </View>
            </AppCard>
          ))}
        </View>
      </ScrollView>
    </>
  );
}
