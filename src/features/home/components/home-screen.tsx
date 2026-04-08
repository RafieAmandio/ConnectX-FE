import { Stack, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { AppCard, AppListItem, AppPill, AppStatCard, AppText } from '@shared/components';

import { useAuth } from '@features/auth';

const destinations = [
  {
    href: './matches',
    title: 'Pipeline',
    detail: 'Review high-intent matches and decide who moves forward next.',
    value: '12',
  },
  {
    href: './products',
    title: 'Market',
    detail: 'Scan curated offers, inventory signals, and pricing in one view.',
    value: '24',
  },
  {
    href: './chat',
    title: 'Inbox',
    detail: 'Respond to the conversations with the highest conversion potential.',
    value: '08',
  },
  {
    href: './team',
    title: 'Team',
    detail: 'See who is online, reviewing, and available to support execution.',
    value: '03',
  },
  {
    href: './profile',
    title: 'Account',
    detail: 'Manage secure access, identity details, and session preferences.',
    value: '01',
  },
] as const;

const briefing = [
  'Two conversations need a same-day reply.',
  'Pipeline quality is up versus last week.',
  'Team coverage is healthy across the current queue.',
] as const;

export function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();

  if (!session) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Overview' }} />
      <ScrollView
        className="flex-1 bg-canvas"
        contentContainerClassName="gap-6 px-5 pt-4 pb-24"
        contentInsetAdjustmentBehavior="automatic">
        <View className="gap-3">
          <AppPill className="self-start" label="Overview" tone="accent" />
          <AppText variant="hero">Hi, {session.displayName.split(' ')[0]}.</AppText>
          <AppText tone="muted">
            Your highest-signal actions, metrics, and work queues are all visible from here.
          </AppText>
        </View>

        <View className="flex-row gap-3">
          <AppStatCard
            className="flex-1"
            detail="Ready for review"
            label="Active Matches"
            tone="accent"
            value="24"
          />
          <AppStatCard
            className="flex-1"
            detail="Today"
            label="Pending Replies"
            tone="signal"
            value="08"
          />
        </View>

        <AppCard className="gap-3">
          <View className="gap-1">
            <AppText variant="subtitle">Priority actions</AppText>
            <AppText tone="muted">
              Start with the screens that move conversations and decisions forward fastest.
            </AppText>
          </View>

          {destinations.map((destination) => (
            <AppListItem
              key={destination.title}
              description={destination.detail}
              leading={<AppText variant="bodyStrong">{destination.title.slice(0, 2)}</AppText>}
              meta="Open"
              onPress={() => {
                router.push(destination.href);
              }}
              title={destination.title}
              value={destination.value}
            />
          ))}
        </AppCard>

        <AppCard tone="muted" className="gap-3">
          <AppText variant="subtitle">Daily briefing</AppText>
          {briefing.map((item) => (
            <AppListItem
              key={item}
              description={item}
              leading={<AppText tone="accent" variant="bodyStrong">•</AppText>}
              title="Insight"
            />
          ))}
        </AppCard>
      </ScrollView>
    </>
  );
}
