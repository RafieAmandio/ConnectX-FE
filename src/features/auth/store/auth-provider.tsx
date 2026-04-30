import React from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { supabaseChatRepository } from '@features/chat/data/supabase/SupabaseChatRepository';
import { configureApiClient } from '@shared/services/api';
import {
  clearSupabaseSession,
  debugLogSupabaseUsersProbe,
  getStoredSupabaseIdentity,
  getSupabaseSession,
  signOutSupabase,
  supabase,
  syncSupabaseRealtimeAuth,
} from '@shared/services/supabase/client';
import { isExpoDevModeEnabled } from '@shared/utils/env';

import { isAuthBypassEnabled } from '../config/auth-config';
import type { LoginPayload } from '../services/auth-service';
import {
  bootstrapLinkedInAuthSession,
  clearPersistedAuth,
  createOAuthAuthSessionFromSupabaseSession,
  enterWithDevBypassSession,
  getPersistedAuthState,
  getStoredToken,
  loginWithApi,
  loginWithGoogleApi,
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
import { signInWithGoogleToken, signOutGoogle } from '../services/google-auth-service';
import { signInWithLinkedInToken } from '../services/linkedin-auth-service';
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
  dismissWelcomeLaunchSplash: () => void;
  enterPendingOnboarding: () => Promise<void>;
  isChatEnabled: boolean;
  isHydrated: boolean;
  isAuthBypassEnabled: boolean;
  session: AuthSession | null;
  shouldShowWelcomeLaunchSplash: boolean;
  enterWithDevBypass: () => Promise<void>;
  login: (payload: LoginPayload) => ReturnType<typeof loginWithApi>;
  register: (payload: RegisterPayload) => ReturnType<typeof registerWithApi>;
  resendLoginOtp: () => ReturnType<typeof resendLoginOtpRequest>;
  resendEmailOtp: () => ReturnType<typeof resendEmailOtpRequest>;
  resendWhatsappOtp: () => ReturnType<typeof resendWhatsappOtpRequest>;
  sendLoginOtp: () => ReturnType<typeof sendLoginOtpRequest>;
  sendEmailOtp: () => ReturnType<typeof sendEmailOtpRequest>;
  sendWhatsappOtp: (payload: WhatsappOtpPayload) => ReturnType<typeof sendWhatsappOtpRequest>;
  signInWithGoogle: (payload?: { fcmToken?: string | null }) => ReturnType<typeof loginWithGoogleApi>;
  signInWithLinkedIn: (payload?: { fcmToken?: string | null }) => ReturnType<typeof bootstrapLinkedInAuthSession>;
  bootstrapLinkedInCallback: (payload: Parameters<typeof bootstrapLinkedInAuthSession>[0]) => ReturnType<typeof bootstrapLinkedInAuthSession>;
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

function isExternalOAuthMethod(method?: AuthSession['method'] | null) {
  return method === 'google' || method === 'linkedin';
}

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [isChatEnabled, setIsChatEnabled] = React.useState(false);
  const [shouldShowWelcomeLaunchSplash, setShouldShowWelcomeLaunchSplash] =
    React.useState(false);
  const [authPhase, setAuthPhase] = React.useState<AuthPhase>('signed_out');
  const [session, setSession] = React.useState<AuthSession | null>(null);
  const authBypassEnabled = React.useMemo(() => isAuthBypassEnabled(), []);
  const sessionRef = React.useRef<AuthSession | null>(null);
  const usersProbeKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  React.useEffect(() => {
    if (!isExpoDevModeEnabled()) {
      return;
    }

    if (!session) {
      usersProbeKeyRef.current = null;
      return;
    }

    const probeKey = `${session.method}:${session.user?.id ?? session.email}`;

    if (usersProbeKeyRef.current === probeKey) {
      return;
    }

    usersProbeKeyRef.current = probeKey;

    void debugLogSupabaseUsersProbe().catch((error) => {
      console.log('[supabase:probe:users:unexpected-error]', error);
    });
  }, [session]);

  React.useEffect(() => {
    let isActive = true;

    const syncChatAvailability = async () => {
      if (!session) {
        setIsChatEnabled(false);
        return;
      }

      const [supabaseSession, storedSupabaseIdentity] = await Promise.all([
        getSupabaseSession(),
        getStoredSupabaseIdentity(),
      ]);

      if (!isActive) {
        return;
      }

      setIsChatEnabled(Boolean(supabaseSession?.user || storedSupabaseIdentity));
    };

    void syncChatAvailability().catch((error) => {
      if (!isActive) {
        return;
      }

      setIsChatEnabled(false);

      if (isExpoDevModeEnabled()) {
        console.warn('[auth] failed to resolve chat availability', error);
      }
    });

    return () => {
      isActive = false;
    };
  }, [session]);

  const reconnectChatRealtime = React.useCallback(() => {
    void supabaseChatRepository.reconnectRealtime().catch((error) => {
      if (isExpoDevModeEnabled()) {
        console.warn('[chat] failed to reconnect realtime subscriptions', error);
      }
    });
  }, []);

  const signOut = React.useCallback(async () => {
    const shouldSignOutGoogle = session?.method === 'google';

    await clearPersistedAuth();

    const cleanupResults = await Promise.allSettled([
      signOutSupabase(),
      supabaseChatRepository.clearRealtimeSubscriptions(),
      syncSupabaseRealtimeAuth(null),
      ...(shouldSignOutGoogle ? [signOutGoogle()] : []),
    ]);

    if (isExpoDevModeEnabled()) {
      const rejectedCleanup = cleanupResults.find((result) => result.status === 'rejected');

      if (rejectedCleanup?.status === 'rejected') {
        console.warn('[auth] sign-out cleanup failed', rejectedCleanup.reason);
      }
    }

    setIsChatEnabled(false);
    setShouldShowWelcomeLaunchSplash(false);
    setAuthPhase('signed_out');
    setSession(null);
  }, [session?.method]);

  const dismissWelcomeLaunchSplash = React.useCallback(() => {
    setShouldShowWelcomeLaunchSplash(false);
  }, []);

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
          const persistedSession = persistedState.session;
          const persistedOAuthSession =
            persistedSession &&
            isExternalOAuthMethod(persistedSession.method) &&
              normalizedEmail &&
              persistedSession.email === normalizedEmail
              ? persistedSession
              : null;
          const oauthMethod = persistedSession && isExternalOAuthMethod(persistedSession.method)
            ? persistedSession.method
            : 'google';
          const nextSession =
            persistedOAuthSession ??
            createOAuthAuthSessionFromSupabaseSession(supabaseSession, oauthMethod);

          await Promise.all([
            replaceStoredSession(nextSession),
            syncSupabaseRealtimeAuth(supabaseSession),
          ]);

          if (!isActive) {
            return;
          }

          setIsChatEnabled(true);
          setShouldShowWelcomeLaunchSplash(false);
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
          setIsChatEnabled(false);
          setShouldShowWelcomeLaunchSplash(false);
          setSession(storedSession);
          setAuthPhase(storedSession.authPhase);
        } else {
          await clearPersistedAuth();
          setIsChatEnabled(false);
          setShouldShowWelcomeLaunchSplash(true);
          setSession(null);
          setAuthPhase('signed_out');
        }

        setIsHydrated(true);
      } catch (error) {
        if (!isRecoverableSupabaseSessionError(error)) {
          throw error;
        }

        if (isExpoDevModeEnabled()) {
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

        setIsChatEnabled(false);
        setShouldShowWelcomeLaunchSplash(true);
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
        await signOut();
      },
    });
  }, [signOut]);

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
        setIsChatEnabled(false);

        if (isExternalOAuthMethod(sessionRef.current?.method)) {
          await clearPersistedAuth();
          setSession(null);
          setShouldShowWelcomeLaunchSplash(false);
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
        const oauthMethod = currentSession && isExternalOAuthMethod(currentSession.method)
          ? currentSession.method
          : 'google';
        const nextSession =
          currentSession &&
          isExternalOAuthMethod(currentSession.method) &&
            normalizedEmail &&
            currentSession.email === normalizedEmail
            ? currentSession
            : createOAuthAuthSessionFromSupabaseSession(nextSupabaseSession, oauthMethod);

        await Promise.all([
          replaceStoredSession(nextSession),
          syncSupabaseRealtimeAuth(nextSupabaseSession),
        ]);
        setIsChatEnabled(true);
        setShouldShowWelcomeLaunchSplash(false);
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

  const signInWithGoogle = React.useCallback(async (payload?: { fcmToken?: string | null }) => {
    const googleResult = await signInWithGoogleToken();
    const result = await loginWithGoogleApi({
      accessToken: googleResult.accessToken,
      displayName: googleResult.displayName,
      email: googleResult.email,
      fcmToken: payload?.fcmToken ?? '',
      idToken: googleResult.idToken,
    });

    setSession(result.session);
    setAuthPhase(result.session.authPhase);

    return result;
  }, []);

  const bootstrapLinkedInCallback = React.useCallback(
    async (payload: Parameters<typeof bootstrapLinkedInAuthSession>[0]) => {
      const result = await bootstrapLinkedInAuthSession(payload);
      setSession(result.session);
      setAuthPhase(result.session.authPhase);

      return result;
    },
    []
  );

  const signInWithLinkedIn = React.useCallback(async (payload?: { fcmToken?: string | null }) => {
    void payload;
    const linkedInResult = await signInWithLinkedInToken();
    return bootstrapLinkedInCallback(linkedInResult);
  }, [bootstrapLinkedInCallback]);

  const register = React.useCallback(
    async (payload: RegisterPayload) => {
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
      bootstrapLinkedInCallback,
      completeOnboarding,
      dismissWelcomeLaunchSplash,
      enterWithDevBypass,
      enterPendingOnboarding,
      isChatEnabled,
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
      shouldShowWelcomeLaunchSplash,
      signInWithGoogle,
      signInWithLinkedIn,
      signOut,
      verifyLoginOtp,
      verifyEmailOtp,
      verifyWhatsappOtp,
    }),
    [
      authPhase,
      authBypassEnabled,
      bootstrapLinkedInCallback,
      completeOnboarding,
      dismissWelcomeLaunchSplash,
      enterWithDevBypass,
      enterPendingOnboarding,
      isChatEnabled,
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
      shouldShowWelcomeLaunchSplash,
      signInWithGoogle,
      signInWithLinkedIn,
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
