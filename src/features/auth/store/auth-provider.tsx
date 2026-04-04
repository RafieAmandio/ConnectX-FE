import React from 'react';

import { configureApiClient } from '@shared/services/api';

import {
  clearPersistedAuth,
  getPersistedAuthState,
  getStoredToken,
  signInWithMockGoogle,
  signInWithMockPhone,
} from '../services/auth-service';
import type { AuthSession } from '../types/auth.types';

type AuthContextValue = {
  isHydrated: boolean;
  session: AuthSession | null;
  signInWithGoogle: () => Promise<void>;
  signInWithPhone: (phoneNumber: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [session, setSession] = React.useState<AuthSession | null>(null);

  const signOut = React.useCallback(async () => {
    await clearPersistedAuth();
    setSession(null);
  }, []);

  React.useEffect(() => {
    let isActive = true;

    const hydrate = async () => {
      const { token, session: storedSession } = await getPersistedAuthState();

      if (!isActive) {
        return;
      }

      if (token && storedSession) {
        setSession(storedSession);
      } else {
        await clearPersistedAuth();
        setSession(null);
      }

      setIsHydrated(true);
    };

    void hydrate();

    return () => {
      isActive = false;
    };
  }, []);

  React.useEffect(() => {
    configureApiClient({
      getAccessToken: getStoredToken,
      onUnauthorized: async () => {
        await signOut();
      },
    });
  }, [signOut]);

  const signInWithGoogle = React.useCallback(async () => {
    const nextSession = await signInWithMockGoogle();
    setSession(nextSession);
  }, []);

  const signInWithPhone = React.useCallback(async (phoneNumber: string) => {
    const nextSession = await signInWithMockPhone(phoneNumber);
    setSession(nextSession);
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      isHydrated,
      session,
      signInWithGoogle,
      signInWithPhone,
      signOut,
    }),
    [isHydrated, session, signInWithGoogle, signInWithPhone, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const value = React.use(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return value;
}
