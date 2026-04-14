import React from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { supabaseChatRepository } from '@features/chat/data/supabase/SupabaseChatRepository';
import { configureApiClient } from '@shared/services/api';
import {
  clearSupabaseSession,
  getSupabaseSession,
  signOutSupabase,
  supabase,
  syncSupabaseRealtimeAuth,
} from '@shared/services/supabase/client';

import { isAuthBypassEnabled } from '../config/auth-config';
import type { LoginPayload } from '../services/auth-service';
import {
  clearPersistedAuth,
  createGoogleAuthSessionFromSupabaseSession,
  enterWithDevBypassSession,
  getPersistedAuthState,
  getStoredToken,
  loginWithApi,
  loginWithGoogleSupabase,
  registerWithApi,
  replaceStoredSession,
  resendEmailOtp as resendEmailOtpRequest,
  resendLoginOtp as resendLoginOtpRequest,
  resendWhatsappOtp as resendWhatsappOtpRequest,
  sendEmailOtp as sendEmailOtpRequest,
  sendLoginOtp as sendLoginOtpRequest,
  sendWhatsappOtp as sendWhatsappOtpRequest,
  verifyEmailOtp as verifyEmailOtpRequest,
  verifyLoginOtp as verifyLoginOtpRequest,
  verifyWhatsappOtp as verifyWhatsappOtpRequest,
} from '../services/auth-service';
import { signInWithGoogleToken } from '../services/google-auth-service';
import type {
  AuthPhase,
  AuthSession,
  LoginOtpVerifyPayload,
  RegisterPayload,
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
  resendLoginOtp: () => ReturnType<typeof resendLoginOtpRequest>;
  resendEmailOtp: () => ReturnType<typeof resendEmailOtpRequest>;
  resendWhatsappOtp: () => ReturnType<typeof resendWhatsappOtpRequest>;
  sendLoginOtp: () => ReturnType<typeof sendLoginOtpRequest>;
  sendEmailOtp: () => ReturnType<typeof sendEmailOtpRequest>;
  sendWhatsappOtp: (payload: WhatsappOtpPayload) => ReturnType<typeof sendWhatsappOtpRequest>;
  signInWithGoogle: () => ReturnType<typeof loginWithGoogleSupabase>;
  signOut: () => Promise<void>;
  verifyLoginOtp: (payload: LoginOtpVerifyPayload) => ReturnType<typeof verifyLoginOtpRequest>;
  verifyEmailOtp: (payload: VerifyEmailPayload) => ReturnType<typeof verifyEmailOtpRequest>;
  verifyWhatsappOtp: (payload: VerifyWhatsappPayload) => ReturnType<typeof verifyWhatsappOtpRequest>;
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

function canRestoreWithoutToken(authPhase: AuthPhase) {
  return authPhase === 'pending_login_otp';
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

  const reconnectChatRealtime = React.useCallback(() => {
    void supabaseChatRepository.reconnectRealtime().catch((error) => {
      if (__DEV__) {
        console.warn('[chat] failed to reconnect realtime subscriptions', error);
      }
    });
  }, []);

  const signOut = React.useCallback(async () => {
    const shouldSignOutSupabase = session?.method === 'google';

    await clearPersistedAuth();

    if (shouldSignOutSupabase) {
      await signOutSupabase();
    }

    await supabaseChatRepository.clearRealtimeSubscriptions();

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
          is_onboarded: false,
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
          is_onboarded: true,
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
        const persistedState = await getPersistedAuthState();

        if (!isActive) {
          return;
        }

        if (supabaseSession?.user) {
          const normalizedEmail = supabaseSession.user.email?.trim().toLowerCase() ?? null;
          const persistedGoogleSession =
            persistedState.session?.method === 'google' &&
              normalizedEmail &&
              persistedState.session.email === normalizedEmail
              ? persistedState.session
              : null;
          const nextSession =
            persistedGoogleSession ?? createGoogleAuthSessionFromSupabaseSession(supabaseSession);

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
        const { token, session: storedSession } = persistedState;

        if (!isActive) {
          return;
        }

        if ((token && storedSession) || (storedSession && canRestoreWithoutToken(storedSession.authPhase))) {
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
          supabaseChatRepository.clearRealtimeSubscriptions(),
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
        if (session?.method === 'google') {
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
        reconnectChatRealtime();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    };

    syncAutoRefresh(AppState.currentState);
    const subscription = AppState.addEventListener('change', syncAutoRefresh);

    return () => {
      subscription.remove();
    };
  }, [reconnectChatRealtime]);

  React.useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSupabaseSession) => {
      if (event === 'SIGNED_OUT') {
        await supabaseChatRepository.clearRealtimeSubscriptions();

        if (sessionRef.current?.method === 'google') {
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
        const normalizedEmail = nextSupabaseSession.user.email?.trim().toLowerCase() ?? null;
        const currentSession = sessionRef.current;
        const nextSession =
          currentSession?.method === 'google' &&
            normalizedEmail &&
            currentSession.email === normalizedEmail
            ? currentSession
            : createGoogleAuthSessionFromSupabaseSession(nextSupabaseSession);

        await Promise.all([
          replaceStoredSession(nextSession),
          syncSupabaseRealtimeAuth(nextSupabaseSession),
        ]);
        setSession(nextSession);
        setAuthPhase(nextSession.authPhase);
        reconnectChatRealtime();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [reconnectChatRealtime]);

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
    console.log('signing in with google');
    const googleResult = await signInWithGoogleToken();
    console.log('googleResult', googleResult);
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
    const result = await sendEmailOtpRequest();
    setSession(result.session);
    setAuthPhase(result.session.authPhase);
    return result;
  }, []);

  const sendLoginOtp = React.useCallback(async () => {
    const result = await sendLoginOtpRequest();
    setSession(result.session);
    setAuthPhase(result.session.authPhase);
    return result;
  }, []);

  const resendEmailOtp = React.useCallback(async () => {
    const result = await resendEmailOtpRequest();
    setSession(result.session);
    setAuthPhase(result.session.authPhase);
    return result;
  }, []);

  const resendLoginOtp = React.useCallback(async () => {
    const result = await resendLoginOtpRequest();
    setSession(result.session);
    setAuthPhase(result.session.authPhase);
    return result;
  }, []);

  const sendWhatsappOtp = React.useCallback(async (payload: WhatsappOtpPayload) => {
    const result = await sendWhatsappOtpRequest(payload);
    setSession(result.session);
    setAuthPhase(result.session.authPhase);
    return result;
  }, []);

  const resendWhatsappOtp = React.useCallback(async () => {
    const result = await resendWhatsappOtpRequest();
    setSession(result.session);
    setAuthPhase(result.session.authPhase);
    return result;
  }, []);

  const verifyEmailOtp = React.useCallback(async (payload: VerifyEmailPayload) => {
    const result = await verifyEmailOtpRequest(payload);
    setSession(result.session);
    setAuthPhase(result.session.authPhase);
    return result;
  }, []);

  const verifyLoginOtp = React.useCallback(async (payload: LoginOtpVerifyPayload) => {
    const result = await verifyLoginOtpRequest(payload);
    setSession(result.session);
    setAuthPhase(result.session.authPhase);
    return result;
  }, []);

  const verifyWhatsappOtp = React.useCallback(async (payload: VerifyWhatsappPayload) => {
    const result = await verifyWhatsappOtpRequest(payload);
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
      resendLoginOtp,
      resendEmailOtp,
      resendWhatsappOtp,
      sendLoginOtp,
      sendEmailOtp,
      sendWhatsappOtp,
      session,
      signInWithGoogle,
      signOut,
      verifyLoginOtp,
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
      resendLoginOtp,
      resendEmailOtp,
      resendWhatsappOtp,
      sendLoginOtp,
      sendEmailOtp,
      sendWhatsappOtp,
      session,
      signInWithGoogle,
      signOut,
      verifyLoginOtp,
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
