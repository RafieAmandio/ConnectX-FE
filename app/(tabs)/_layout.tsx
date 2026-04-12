import { Redirect, Tabs } from 'expo-router';

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
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Connect',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: '',
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: '',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '',
        }}
      />
    </Tabs>
  );
}
