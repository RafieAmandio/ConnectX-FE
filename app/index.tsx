import { Redirect } from 'expo-router';

import { useMockAuth } from '@/src/auth/mock-auth';

export default function IndexScreen() {
  const { isHydrated, session } = useMockAuth();

  if (!isHydrated) {
    return null;
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}
