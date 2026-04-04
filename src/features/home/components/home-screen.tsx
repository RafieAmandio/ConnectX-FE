import { Stack, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { AppButton, AppCard, AppPill, AppText } from '@shared/components';

import { useAuth } from '@features/auth';

const destinations = [
  {
    href: './matches',
    title: 'Matches',
    detail: 'Review new suggestions and decide who moves forward.',
  },
  {
    href: './products',
    title: 'Products',
    detail: 'Browse the React Query demo that loads a real product catalog.',
  },
  {
    href: './chat',
    title: 'Chat',
    detail: 'Open active conversations and keep momentum moving.',
  },
  {
    href: './team',
    title: 'Team',
    detail: 'See who is active, assigned, and available today.',
  },
  {
    href: './profile',
    title: 'Profile',
    detail: 'Manage the current mock session and account settings.',
  },
] as const;

export function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();

  if (!session) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Home' }} />
      <ScrollView
        className="flex-1 bg-canvas"
        contentContainerClassName="gap-6 px-5 pt-4 pb-24"
        contentInsetAdjustmentBehavior="automatic">
        <AppCard className="gap-5">
          <View className="gap-3">
            <AppPill className="self-start" label="Current View" tone="accent" />
            <AppText variant="display">Authenticated workspace</AppText>
            <AppText tone="muted">
              This is the landing view after login. It gives the signed-in user a quick read on the
              space and sends them into the key tabs.
            </AppText>
          </View>

          <AppCard tone="muted" className="gap-3">
            <AppText tone="accent" variant="label">
              Active Session
            </AppText>
            <AppText variant="title">{session.displayName}</AppText>
            <AppText tone="muted" variant="code">
              {session.phoneNumber ?? 'google-oauth-mock@connectx.local'}
            </AppText>
          </AppCard>

          <View className="gap-3">
            {destinations.map((destination) => (
              <AppButton
                key={destination.title}
                detail={destination.detail}
                label={`Open ${destination.title}`}
                onPress={() => {
                  router.push(destination.href);
                }}
                variant="secondary"
              />
            ))}
          </View>
        </AppCard>
      </ScrollView>
    </>
  );
}
