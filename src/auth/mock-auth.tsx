import React from 'react';

import { subscribeToAuthInvalidation } from './events';
import {
  clearStoredAuth,
  getSession,
  getToken,
  setSession as setStoredSession,
  setToken,
} from './storage';
import type { AuthSession } from './types';

type MockAuthContextValue = {
  isHydrated: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithPhone: (phoneNumber: string) => Promise<void>;
  signOut: () => Promise<void>;
  session: AuthSession | null;
};

const MockAuthContext = React.createContext<MockAuthContextValue | null>(null);

export function MockAuthProvider({ children }: React.PropsWithChildren) {
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [session, setSession] = React.useState<AuthSession | null>(null);

  React.useEffect(() => {
    let isActive = true;

    const hydrate = async () => {
      const [storedToken, storedSession] = await Promise.all([getToken(), getSession()]);

      if (!isActive) {
        return;
      }

      if (storedToken && storedSession) {
        setSession(storedSession);
      } else {
        await clearStoredAuth();
        setSession(null);
      }

      setIsHydrated(true);
    };

    hydrate();

    return () => {
      isActive = false;
    };
  }, []);

  React.useEffect(() => {
    return subscribeToAuthInvalidation(() => {
      setSession(null);
    });
  }, []);

  const signInWithGoogle = React.useCallback(async () => {
    const nextSession: AuthSession = {
      displayName: 'Alya Hartono',
      method: 'google',
    };

    await Promise.all([
      setToken(`mock-google-token-${Date.now()}`),
      setStoredSession(nextSession),
    ]);
    setSession(nextSession);
  }, []);

  const signInWithPhone = React.useCallback(async (phoneNumber: string) => {
    const nextSession: AuthSession = {
      displayName: 'Phone Member',
      method: 'phone',
      phoneNumber,
    };

    await Promise.all([
      setToken(`mock-phone-token-${Date.now()}`),
      setStoredSession(nextSession),
    ]);
    setSession(nextSession);
  }, []);

  const signOut = React.useCallback(async () => {
    await clearStoredAuth();
    setSession(null);
  }, []);

  const value = React.useMemo<MockAuthContextValue>(
    () => ({
      isHydrated,
      session,
      signInWithGoogle,
      signInWithPhone,
      signOut,
    }),
    [isHydrated, session, signInWithGoogle, signInWithPhone, signOut]
  );

  return <MockAuthContext value={value}>{children}</MockAuthContext>;
}

export function useMockAuth() {
  const value = React.use(MockAuthContext);

  if (!value) {
    throw new Error('useMockAuth must be used inside MockAuthProvider');
  }

  return value;
}
