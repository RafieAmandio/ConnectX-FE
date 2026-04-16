import { Redirect } from 'expo-router';

import { useAuth } from '../hooks/use-auth';
import { getRouteForAuthPhase } from '../utils/auth-routing';
import { SplashScreen } from './splash-screen';

export function AuthIndexRedirect() {
  const { authPhase, isHydrated } = useAuth();

  if (!isHydrated) {
    return <SplashScreen />;
  }

  return <Redirect href={getRouteForAuthPhase(authPhase)} />;
}
