import React from 'react';

import { configureApiClient } from '@shared/services/api';

import {
  clearPersistedAuth,
  enterWithDevBypassSession,
  getPersistedAuthState,
  getStoredToken,
  registerWithMock,
  resendEmailOtpWithMock,
  sendEmailOtpWithMock,
  submitMockLoginPlaceholder,
  verifyEmailOtpWithMock,
} from '../services/auth-service';
import { signInWithGoogleToken } from '../services/google-auth-service';
import { isAuthBypassEnabled } from '../config/auth-config';
import type {
  AuthPhase,
  AuthSession,
  GoogleAuthResult,
  LoginPlaceholderResponse,
  RegisterPayload,
  VerifyEmailPayload,
} from '../types/auth.types';

type AuthContextValue = {
  authPhase: AuthPhase;
  isHydrated: boolean;
  isAuthBypassEnabled: boolean;
  session: AuthSession | null;
  enterWithDevBypass: () => Promise<void>;
  register: (payload: RegisterPayload) => ReturnType<typeof registerWithMock>;
  resendEmailOtp: () => ReturnType<typeof resendEmailOtpWithMock>;
  sendEmailOtp: () => ReturnType<typeof sendEmailOtpWithMock>;
  signInWithGoogle: () => Promise<GoogleAuthResult>;
  submitEmailLogin: () => Promise<LoginPlaceholderResponse>;
  signOut: () => Promise<void>;
  verifyEmailOtp: (payload: VerifyEmailPayload) => ReturnType<typeof verifyEmailOtpWithMock>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [authPhase, setAuthPhase] = React.useState<AuthPhase>('signed_out');
  const [session, setSession] = React.useState<AuthSession | null>(null);
  const authBypassEnabled = React.useMemo(() => isAuthBypassEnabled(), []);

  const signOut = React.useCallback(async () => {
    await clearPersistedAuth();
    setAuthPhase('signed_out');
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
        setAuthPhase(storedSession.authPhase);
      } else {
        await clearPersistedAuth();
        setSession(null);
        setAuthPhase('signed_out');
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

  const submitEmailLogin = React.useCallback(async () => {
    return submitMockLoginPlaceholder();
  }, []);

  const signInWithGoogle = React.useCallback(async () => {
    return signInWithGoogleToken();
  }, []);

  const register = React.useCallback(
    async (payload: RegisterPayload) => {
      const result = await registerWithMock(payload);
      setSession(result.session);
      setAuthPhase(result.session.authPhase);
      return result;
    },
    []
  );

  const sendEmailOtp = React.useCallback(async () => {
    const result = await sendEmailOtpWithMock();
    setSession(result.session);
    setAuthPhase(result.session.authPhase);
    return result;
  }, []);

  const resendEmailOtp = React.useCallback(async () => {
    const result = await resendEmailOtpWithMock();
    setSession(result.session);
    setAuthPhase(result.session.authPhase);
    return result;
  }, []);

  const verifyEmailOtp = React.useCallback(async (payload: VerifyEmailPayload) => {
    const result = await verifyEmailOtpWithMock(payload);
    setSession(result.session);
    setAuthPhase(result.session.authPhase);
    return result;
  }, []);

  const enterWithDevBypass = React.useCallback(async () => {
    const nextSession = await enterWithDevBypassSession();
    setSession(nextSession);
    setAuthPhase(nextSession.authPhase);
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      authPhase,
      enterWithDevBypass,
      isHydrated,
      isAuthBypassEnabled: authBypassEnabled,
      register,
      resendEmailOtp,
      sendEmailOtp,
      session,
      signInWithGoogle,
      submitEmailLogin,
      signOut,
      verifyEmailOtp,
    }),
    [
      authPhase,
      authBypassEnabled,
      enterWithDevBypass,
      isHydrated,
      register,
      resendEmailOtp,
      sendEmailOtp,
      session,
      signInWithGoogle,
      submitEmailLogin,
      signOut,
      verifyEmailOtp,
    ]
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
