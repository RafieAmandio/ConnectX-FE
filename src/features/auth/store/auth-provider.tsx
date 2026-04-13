import React from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { configureApiClient } from '@shared/services/api';
import {
  clearSupabaseSession,
  getSupabaseSession,
  signOutSupabase,
  supabase,
  syncSupabaseRealtimeAuth,
} from '@shared/services/supabase/client';

import { isAuthBypassEnabled } from '../config/auth-config';
import {
  clearPersistedAuth,
  createSocialAuthSessionFromSupabaseSession,
  enterWithDevBypassSession,
  getPersistedAuthState,
  getStoredSession,
  isSupabaseSocialAuthMethod,
  getStoredToken,
  loginWithGoogleSupabase,
  loginWithApi,
  registerWithApi,
  resendWhatsappOtpWithApi,
  resendEmailOtpWithMock,
  replaceStoredSession,
  sendWhatsappOtpWithApi,
  sendEmailOtpWithMock,
  verifyEmailOtpWithMock,
  verifyWhatsappOtpWithApi,
} from '../services/auth-service';
import type { LoginPayload } from '../services/auth-service';
import { signInWithGoogleToken } from '../services/google-auth-service';
import { signInWithLinkedIn as startLinkedInSignIn } from '../services/linkedin-auth-service';
import type {
  AuthPhase,
  AuthSession,
  RegisterPayload,
  SocialAuthMethod,
  VerifyEmailPayload,
  VerifyWhatsappPayload,
  WhatsappOtpPayload,
} from '../types/auth.types';

type AuthContextValue = {
  authPhase: AuthPhase;
  completeOnboarding: () => Promise<void>;
  enterPendingOnboarding: () => Promise<void>;
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
  signInWithGoogle: () => ReturnType<typeof loginWithGoogleSupabase>;
  signInWithLinkedIn: () => Promise<Awaited<ReturnType<typeof getSupabaseSession>>>;
  signOut: () => Promise<void>;
  verifyEmailOtp: (payload: VerifyEmailPayload) => ReturnType<typeof verifyEmailOtpWithMock>;
  verifyWhatsappOtp: (payload: VerifyWhatsappPayload) => ReturnType<typeof verifyWhatsappOtpWithApi>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

function isRecoverableSupabaseSessionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const normalizedName = error.name.toLowerCase();
  const normalizedMessage = error.message.toLowerCase();

  if (normalizedName === 'authsessionmissingerror') {
    return true;
  }

  return (
    normalizedName === 'authapierror' &&
    normalizedMessage.includes('refresh token') &&
    (normalizedMessage.includes('invalid') || normalizedMessage.includes('not found'))
  );
}

function resolvePreferredSocialMethod(
  userId: string,
  session?: AuthSession | null
): SocialAuthMethod | undefined {
  if (!session?.user || session.user.id !== userId || !isSupabaseSocialAuthMethod(session.method)) {
    return undefined;
  }

  return session.method;
}

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [authPhase, setAuthPhase] = React.useState<AuthPhase>('signed_out');
  const [session, setSession] = React.useState<AuthSession | null>(null);
  const authBypassEnabled = React.useMemo(() => isAuthBypassEnabled(), []);
  const sessionRef = React.useRef<AuthSession | null>(null);

  React.useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const signOut = React.useCallback(async () => {
    const shouldSignOutSupabase = isSupabaseSocialAuthMethod(session?.method);

    await clearPersistedAuth();

    if (shouldSignOutSupabase) {
      await signOutSupabase();
    }

    setAuthPhase('signed_out');
    setSession(null);
  }, [session?.method]);

  const enterPendingOnboarding = React.useCallback(async () => {
    if (!session) {
      throw new Error('No auth session is available for onboarding.');
    }

    const nextSession: AuthSession = {
      ...session,
      authPhase: 'pending_onboarding',
      onboardingCompletedAt: session.onboardingCompletedAt ?? null,
      user: session.user
        ? {
            ...session.user,
            is_active: false,
            registration_step: Math.max(session.user.registration_step, 4),
          }
        : null,
    };

    await replaceStoredSession(nextSession);
    setSession(nextSession);
    setAuthPhase(nextSession.authPhase);
  }, [session]);

  const completeOnboarding = React.useCallback(async () => {
    if (!session) {
      return;
    }

    const completedAt = new Date().toISOString();
    const nextSession: AuthSession = {
      ...session,
      authPhase: 'authenticated',
      onboardingCompletedAt: completedAt,
      user: session.user
        ? {
            ...session.user,
            is_active: true,
            registration_step: Math.max(session.user.registration_step, 5),
          }
        : null,
    };

    await replaceStoredSession(nextSession);
    setSession(nextSession);
    setAuthPhase(nextSession.authPhase);
  }, [session]);

  React.useEffect(() => {
    let isActive = true;

    const hydrate = async () => {
      try {
        const supabaseSession = await getSupabaseSession();

        if (!isActive) {
          return;
        }

        if (supabaseSession?.user) {
          const storedSession = await getStoredSession();
          const preferredMethod = resolvePreferredSocialMethod(
            supabaseSession.user.id,
            storedSession
          );
          const nextSession = createSocialAuthSessionFromSupabaseSession(
            supabaseSession,
            preferredMethod
          );

          await Promise.all([
            replaceStoredSession(nextSession),
            syncSupabaseRealtimeAuth(supabaseSession),
          ]);

          if (!isActive) {
            return;
          }

          setSession(nextSession);
          setAuthPhase(nextSession.authPhase);
          setIsHydrated(true);
          return;
        }

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
      } catch (error) {
        if (!isRecoverableSupabaseSessionError(error)) {
          throw error;
        }

        if (__DEV__) {
          console.warn('[auth] cleared stale Supabase session during hydrate', error);
        }

        await Promise.allSettled([
          clearPersistedAuth(),
          clearSupabaseSession(),
          syncSupabaseRealtimeAuth(null),
        ]);

        if (!isActive) {
          return;
        }

        setSession(null);
        setAuthPhase('signed_out');
        setIsHydrated(true);
      }
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
        if (isSupabaseSocialAuthMethod(session?.method)) {
          return;
        }

        await signOut();
      },
    });
  }, [session?.method, signOut]);

  React.useEffect(() => {
    const syncAutoRefresh = (state: AppStateStatus) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    };

    syncAutoRefresh(AppState.currentState);
    const subscription = AppState.addEventListener('change', syncAutoRefresh);

    return () => {
      subscription.remove();
    };
  }, []);

  React.useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSupabaseSession) => {
      if (event === 'SIGNED_OUT') {
        if (isSupabaseSocialAuthMethod(sessionRef.current?.method)) {
          await clearPersistedAuth();
          setSession(null);
          setAuthPhase('signed_out');
        }

        return;
      }

      if (
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') &&
        nextSupabaseSession?.user
      ) {
        if (__DEV__ && event === 'SIGNED_IN') {
          console.log('[auth:linkedin] onAuthStateChange received session', {
            providerRefreshTokenPresent: Boolean(nextSupabaseSession.provider_refresh_token),
            providerTokenLength: nextSupabaseSession.provider_token?.length ?? 0,
            providerTokenPresent: Boolean(nextSupabaseSession.provider_token),
            supabaseAccessTokenPresent: Boolean(nextSupabaseSession.access_token),
          });
        }

        const preferredMethod = resolvePreferredSocialMethod(
          nextSupabaseSession.user.id,
          sessionRef.current
        );
        const nextSession = createSocialAuthSessionFromSupabaseSession(
          nextSupabaseSession,
          preferredMethod
        );

        await Promise.all([
          replaceStoredSession(nextSession),
          syncSupabaseRealtimeAuth(nextSupabaseSession),
        ]);
        setSession(nextSession);
        setAuthPhase(nextSession.authPhase);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = React.useCallback(
    async (payload: LoginPayload) => {
      const result = await loginWithApi(payload);
      setSession(result.session);
      setAuthPhase(result.session.authPhase);
      return result;
    },
    []
  );

  const refreshSocialSession = React.useCallback(async (preferredMethod?: SocialAuthMethod) => {
    const nextSupabaseSession = await getSupabaseSession();

    if (!nextSupabaseSession?.user) {
      throw new Error('Social sign-in finished, but no Supabase session was created.');
    }

    if (__DEV__) {
      console.log('[auth:linkedin] received Supabase session after OAuth', {
        accessTokenPresent: Boolean(nextSupabaseSession.access_token),
        providerRefreshTokenPresent: Boolean(nextSupabaseSession.provider_refresh_token),
        providerTokenLength: nextSupabaseSession.provider_token?.length ?? 0,
        providerTokenPresent: Boolean(nextSupabaseSession.provider_token),
        provider: nextSupabaseSession.user.app_metadata?.provider ?? null,
        userEmail: nextSupabaseSession.user.email ?? null,
        userId: nextSupabaseSession.user.id,
      });
    }

    const nextSession = createSocialAuthSessionFromSupabaseSession(
      nextSupabaseSession,
      preferredMethod
    );
    await Promise.all([
      replaceStoredSession(nextSession),
      syncSupabaseRealtimeAuth(nextSupabaseSession),
    ]);

    if (__DEV__) {
      console.log('[auth:linkedin] persisted social auth session', {
        authPhase: nextSession.authPhase,
        email: nextSession.email,
        method: nextSession.method,
      });
    }

    setSession(nextSession);
    setAuthPhase(nextSession.authPhase);

    return nextSupabaseSession;
  }, []);

  const signInWithGoogle = React.useCallback(async () => {
    const googleResult = await signInWithGoogleToken();
    const result = await loginWithGoogleSupabase({
      accessToken: googleResult.accessToken,
      displayName: googleResult.displayName,
      email: googleResult.email,
      idToken: googleResult.idToken,
    });

    setSession(result.session);
    setAuthPhase(result.session.authPhase);

    return result;
  }, []);

  const signInWithLinkedIn = React.useCallback(async () => {
    if (__DEV__) {
      console.log('[auth:linkedin] starting LinkedIn login from auth provider');
    }

    await startLinkedInSignIn();
    return refreshSocialSession('linkedin');
  }, [refreshSocialSession]);

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
      completeOnboarding,
      enterWithDevBypass,
      enterPendingOnboarding,
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
      signInWithLinkedIn,
      signOut,
      verifyEmailOtp,
      verifyWhatsappOtp,
    }),
    [
      authPhase,
      authBypassEnabled,
      completeOnboarding,
      enterWithDevBypass,
      enterPendingOnboarding,
      isHydrated,
      login,
      register,
      resendEmailOtp,
      resendWhatsappOtp,
      sendEmailOtp,
      sendWhatsappOtp,
      session,
      signInWithGoogle,
      signInWithLinkedIn,
      signOut,
      verifyEmailOtp,
      verifyWhatsappOtp,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const value = React.useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return value;
}
