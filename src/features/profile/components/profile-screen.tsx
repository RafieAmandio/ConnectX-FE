import { Stack, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { AppButton, AppCard, AppPill, AppText } from '@shared/components';

import { useAuth } from '@features/auth';

export function ProfileScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();

  if (!session) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Profile' }} />
      <ScrollView
        className="flex-1 bg-canvas"
        contentContainerClassName="gap-6 px-5 pt-4 pb-24"
        contentInsetAdjustmentBehavior="automatic">
        <AppCard className="gap-5">
          <View className="gap-3">
            <AppPill className="self-start" label="Account" tone="accent" />
            <AppText variant="display">{session.displayName}</AppText>
            <AppText tone="muted">
              A compact profile tab for session details, settings, and eventual account management.
            </AppText>
          </View>

          <AppCard tone="muted" className="gap-3">
            <AppText tone="accent" variant="label">
              Login Method
            </AppText>
            <AppText variant="subtitle">
              {session.method === 'google' ? 'Google' : 'Phone number'}
            </AppText>
            <AppText tone="muted" variant="code">
              {session.phoneNumber ?? 'google-oauth-mock@connectx.local'}
            </AppText>
          </AppCard>

          <View className="gap-3">
            <AppButton
              detail="Return to the mock authentication screen"
              label="Sign Out"
              onPress={async () => {
                await signOut();
                router.replace('/login');
              }}
              variant="secondary"
            />
          </View>
        </AppCard>
      </ScrollView>
    </>
  );
}
