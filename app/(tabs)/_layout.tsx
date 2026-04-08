import { Redirect, Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { canAccessProtectedRoutes, getRouteForAuthPhase, useAuth } from '@features/auth';
import { AppTabBar } from '@shared/components';

export default function TabLayout() {
  const { authPhase, isHydrated, session } = useAuth();

  if (!isHydrated) {
    return null;
  }

  if (!session || !canAccessProtectedRoutes(authPhase)) {
    return <Redirect href={getRouteForAuthPhase(authPhase)} />;
  }

  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Overview',
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Pipeline',
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Market',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Inbox',
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: 'Team',
          href: Platform.OS === 'android' ? null : '/(tabs)/team',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Account',
        }}
      />
    </Tabs>
  );
}
