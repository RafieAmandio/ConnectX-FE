import { Redirect } from 'expo-router';

import { canAccessProtectedRoutes, getRouteForAuthPhase, useAuth } from '@features/auth';
import { NotificationsScreen } from '@features/notifications';

export default function NotificationsRoute() {
  const { authPhase, isHydrated, session } = useAuth();

  if (!isHydrated) {
    return null;
  }

  if (!session || !canAccessProtectedRoutes(authPhase)) {
    return <Redirect href={getRouteForAuthPhase(authPhase)} />;
  }

  return <NotificationsScreen />;
}
