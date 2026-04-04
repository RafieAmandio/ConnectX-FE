import { Redirect } from 'expo-router';

import { useAuth } from '../hooks/use-auth';

export function AuthIndexRedirect() {
  const { isHydrated, session } = useAuth();

  if (!isHydrated) {
    return null;
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}
