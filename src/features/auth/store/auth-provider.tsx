import React from 'react';

import { configureApiClient } from '@shared/services/api';

import { isAuthBypassEnabled } from '../config/auth-config';
import {
  clearPersistedAuth,
  enterWithDevBypassSession,
  getPersistedAuthState,
  getStoredToken,
  loginWithGoogleApi,
  loginWithApi,
  registerWithApi,
  resendWhatsappOtpWithApi,
  resendEmailOtpWithMock,
  sendWhatsappOtpWithApi,
  sendEmailOtpWithMock,
  verifyEmailOtpWithMock,
  verifyWhatsappOtpWithApi,
} from '../services/auth-service';
import type { LoginPayload } from '../services/auth-service';
import { signInWithGoogleToken } from '../services/google-auth-service';
import type {
  AuthPhase,
  AuthSession,
  RegisterPayload,
  VerifyEmailPayload,
  VerifyWhatsappPayload,
  WhatsappOtpPayload,
} from '../types/auth.types';

type AuthContextValue = {
  authPhase: AuthPhase;
  isHydrated: boolean;
  isAuthBypassEnabled: boolean;
  session: AuthSession | null;
  enterWithDevBypass: () => Promise<void>;
  login: (payload: LoginPayload) => ReturnType<typeof loginWithApi>;
  register: (payload: RegisterPayload) => ReturnType<typeof registerWithApi>;
  resendEmailOtp: () => ReturnType<typeof resendEmailOtpWithMock>;
  resendWhatsappOtp: () => ReturnType<typeof resendWhatsappOtpWithApi>;
  sendEmailOtp: () => ReturnType<typeof sendEmailOtpWithMock>;
  sendWhatsappOtp: (payload: WhatsappOtpPayload) => ReturnType<typeof sendWhatsappOtpWithApi>;
  signInWithGoogle: () => ReturnType<typeof loginWithGoogleApi>;
  signOut: () => Promise<void>;
  verifyEmailOtp: (payload: VerifyEmailPayload) => ReturnType<typeof verifyEmailOtpWithMock>;
  verifyWhatsappOtp: (payload: VerifyWhatsappPayload) => ReturnType<typeof verifyWhatsappOtpWithApi>;
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

  const login = React.useCallback(
    async (payload: LoginPayload) => {
      const result = await loginWithApi(payload);
      setSession(result.session);
      setAuthPhase(result.session.authPhase);
      return result;
    },
    []
  );

  const signInWithGoogle = React.useCallback(async () => {
    const googleResult = await signInWithGoogleToken();
    const result = await loginWithGoogleApi({
      accessToken: googleResult.accessToken,
      displayName: googleResult.displayName,
      email: googleResult.email,
    });

    setSession(result.session);
    setAuthPhase(result.session.authPhase);

    return result;
  }, []);

  const register = React.useCallback(
    async (payload: RegisterPayload) => {
      console.log('registering', payload);
      const result = await registerWithApi(payload);
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

  const sendWhatsappOtp = React.useCallback(async (payload: WhatsappOtpPayload) => {
    const result = await sendWhatsappOtpWithApi(payload);
    setSession(result.session);
    setAuthPhase(result.session.authPhase);
    return result;
  }, []);

  const resendWhatsappOtp = React.useCallback(async () => {
    const result = await resendWhatsappOtpWithApi();
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

  const verifyWhatsappOtp = React.useCallback(async (payload: VerifyWhatsappPayload) => {
    const result = await verifyWhatsappOtpWithApi(payload);
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
      login,
      register,
      resendEmailOtp,
      resendWhatsappOtp,
      sendEmailOtp,
      sendWhatsappOtp,
      session,
      signInWithGoogle,
      signOut,
      verifyEmailOtp,
      verifyWhatsappOtp,
    }),
    [
      authPhase,
      authBypassEnabled,
      enterWithDevBypass,
      isHydrated,
      login,
      register,
      resendEmailOtp,
      resendWhatsappOtp,
      sendEmailOtp,
      sendWhatsappOtp,
      session,
      signInWithGoogle,
      signOut,
      verifyEmailOtp,
      verifyWhatsappOtp,
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
