import { Stack } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { AppCard, AppPill, AppText } from '@shared/components';

import { SwipeDeck } from './swipe-deck';

const matches = [
  {
    name: 'Maya Chen',
    role: 'Product strategist',
    score: '92%',
    status: 'Warm lead',
    bio: 'Strong async communicator with marketplace experience and a calm leadership style.',
  },
  {
    name: 'Rafi Nandha',
    role: 'Operations partner',
    score: '88%',
    status: 'Needs review',
    bio: 'Great at coordinating teams across time zones and keeping execution detail sharp.',
  },
  {
    name: 'Jess Alvarez',
    role: 'Community builder',
    score: '95%',
    status: 'Ready to chat',
    bio: 'Brings fast trust-building, crisp writing, and a strong instinct for member onboarding.',
  },
] as const;

export function MatchesScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Matches' }} />
      <ScrollView
        className="flex-1 bg-canvas"
        contentContainerClassName="gap-6 px-5 pt-4 pb-24"
        contentInsetAdjustmentBehavior="automatic">
        <AppCard className="gap-4">
          <AppPill className="self-start" label="Swipe Queue" tone="accent" />
          <AppText variant="hero">Review people with a fast left or right decision.</AppText>
          <AppText tone="muted">
            Swipe left to pass, swipe right to like, or use the X and V actions underneath the card.
          </AppText>
        </AppCard>

        <SwipeDeck items={matches} />

        <View className="gap-3">
          <AppText variant="title">How it behaves</AppText>
          <AppCard tone="muted" className="gap-2">
            <AppText tone="muted">The top card follows your finger and rotates with the gesture.</AppText>
            <AppText tone="muted">The next card scales up as the top card moves away.</AppText>
            <AppText tone="muted">The X button triggers a left swipe and the V button triggers a right swipe.</AppText>
          </AppCard>
        </View>
      </ScrollView>
    </>
  );
}
