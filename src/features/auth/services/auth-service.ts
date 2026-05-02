import type { Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

import { ApiError, apiFetch } from '@shared/services/api';
import {
  getStoredSupabaseIdentity,
  setStoredSupabaseAccessToken,
  setSupabaseRealtimeToken,
  setSupabaseSession,
} from '@shared/services/supabase/client';
import { isExpoDevModeEnabled } from '@shared/utils/env';

import { getMockAuthFlowMode } from '../config/auth-config';
import {
  buildMockEmailOtpMessage,
  buildMockEmailVerifiedResponse,
  buildMockLoginCompleteResponse,
  buildMockLoginOtpMessage,
  buildMockLoginPasswordResponse,
  buildMockRegisterResponse,
  buildMockRegistrationCompleteResponse,
  buildMockWhatsappOtpMessage,
  MOCK_EMAIL_OTP,
  MOCK_LOGIN_OTP,
  MOCK_WHATSAPP_OTP,
} from '../mock/auth.mock';
import type {
  AuthNextStep,
  AuthPhase,
  AuthPremiumState,
  AuthSession,
  AuthSessionResponse,
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  AuthSuccessResponse,
  AuthSupabaseSessionPayload,
  AuthUser,
  EmailAlreadyVerifiedResponse,
  LoginOtpMessageResponse,
  LoginOtpSendPayload,
  LoginOtpVerifyPayload,
  LoginOtpVerifySuccessResponse,
  LoginPasswordSuccessResponse,
  OAuthAuthMethod,
  OtpMessageResponse,
  OtpRateLimitResponse,
  RegisterPayload,
  LinkedInAuthResult,
  VerifyEmailErrorResponse,
  VerifyEmailPayload,
  VerifyEmailSuccessResponse,
  VerifyWhatsappPayload,
  VerifyWhatsappStepErrorResponse,
  VerifyWhatsappSuccessResponse,
  VerifyWhatsappValidationErrorResponse,
  WhatsappOtpMessageResponse,
  WhatsappOtpPayload,
} from '../types/auth.types';

const mockAuthSessionResponse = require('../mock/auth-session.response.json') as AuthSessionResponse;

const TOKEN_KEY = 'connectx.auth.token';
const SESSION_KEY = 'connectx.auth.session';
const USER_KEY = 'connectx.auth.user';

export const AUTH_API = {
  EMAIL_RESEND_OTP: '/api/v1/auth/email/resend-otp',
  EMAIL_SEND_OTP: '/api/v1/auth/email/send-otp',
  FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
  GOOGLE_OAUTH_VERIFY: '/api/v1/auth/oauth/google/verify-token',
  LOGIN: '/api/v1/auth/login/password',
  LOGIN_OTP_SEND: '/api/v1/auth/login/otp/send',
  LOGIN_OTP_VERIFY: '/api/v1/auth/login/otp/verify',
  REGISTER: '/api/v1/auth/register',
  SESSION: '/api/v1/auth/session',
  VERIFY_EMAIL: '/api/v1/auth/verify-email',
  VERIFY_WHATSAPP: '/api/v1/auth/verify-whatsapp',
  WHATSAPP_RESEND_OTP: '/api/v1/auth/whatsapp/resend-otp',
  WHATSAPP_SEND_OTP: '/api/v1/auth/whatsapp/send-otp',
} as const;

const mockFCMToken = 'mock-fcm-a1b2c3d4e5f6g7h8_mock_fcm_token';
const OTP_LOCK_WINDOW_MS = 60 * 1000;
const OTP_VALIDITY_MS = 10 * 60 * 1000;
const AUTH_PHASES = new Set([
  'signed_out',
  'pending_login_otp',
  'pending_email_verification',
  'pending_whatsapp_verification',
  'pending_onboarding',
  'authenticated',
]);
const AUTH_METHODS = new Set(['email', 'google', 'linkedin', 'apple', 'developer-bypass']);
const DEFAULT_PREMIUM_STATE: AuthPremiumState = {
  boost: 0,
  spotlight: 0,
  isPremium: false,
};

type PersistedAuthState = {
  session: AuthSession | null;
  token: string | null;
  user: AuthUser | null;
};

type SessionActionResult<TResponse> = {
  response: TResponse;
  session: AuthSession;
};

type AuthSessionResponseResult = {
  response: AuthSessionResponse;
  source: 'api' | 'mock';
};

type GoogleOAuthVerifyResponse = AuthSuccessResponse & {
  data: AuthSuccessResponse['data'] & {
    oauth_provider: 'google';
  };
};

export type GoogleOAuthLoginPayload = {
  accessToken: string;
  displayName?: string | null;
  email?: string | null;
  fcmToken?: string | null;
  idToken?: string | null;
};

export type GoogleSupabaseLoginResponse = AuthSuccessResponse & {
  data: AuthSuccessResponse['data'] & {
    oauth_provider: 'google';
  };
};

export type LoginPayload = {
  email: string;
  password: string;
  fcm_token: string;
};

function isMockAuthFlowEnabled() {
  return getMockAuthFlowMode() !== null;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function buildDisplayNameFromEmail(email: string) {
  const localPart = email.split('@')[0] ?? 'connectx member';

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildDisplayNameFromSupabaseUser(user: SupabaseUser, displayName?: string | null) {
  const normalizedDisplayName =
    displayName?.trim() ||
    (typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : '') ||
    (typeof user.user_metadata?.name === 'string' ? user.user_metadata.name.trim() : '');

  if (normalizedDisplayName) {
    return normalizedDisplayName;
  }

  return buildDisplayNameFromEmail(user.email?.trim().toLowerCase() ?? 'connectx-member');
}

function isStoredUserShape(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<AuthUser>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.registration_step === 'number' &&
    typeof candidate.is_active === 'boolean'
  );
}

function isStoredSessionShape(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<AuthSession>;

  return (
    typeof candidate.displayName === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.authPhase === 'string' &&
    AUTH_PHASES.has(candidate.authPhase) &&
    typeof candidate.method === 'string' &&
    AUTH_METHODS.has(candidate.method)
  );
}

function resolveAuthPhase(user: AuthUser, nextStep?: AuthNextStep): AuthPhase {
  if (nextStep === 'LOGIN_SUCCESS' || nextStep === 'NEED_ONBOARDING') {
    return user.is_onboarded === false ? 'pending_onboarding' : 'authenticated'
  }

  if (nextStep === 'NEED_LOGIN_OTP') {
    return 'pending_login_otp';
  }

  if (nextStep === 'NEED_EMAIL_OTP' || nextStep === 'NEED_EMAIL_VERIFICATION') {
    return 'pending_email_verification';
  }

  if (nextStep === 'NEED_WHATSAPP_VERIFICATION') {
    return 'pending_whatsapp_verification';
  }

  if (nextStep === 'REGISTRATION_COMPLETE') {
    return user.is_onboarded === false ? 'pending_onboarding' : 'authenticated';
  }

  if (!user.email_verified_at) {
    return 'pending_email_verification';
  }

  if (!user.whatsapp_verified_at) {
    return 'pending_whatsapp_verification';
  }

  return user.is_onboarded === false ? 'pending_onboarding' : 'authenticated';
}

function createAuthSession({
  displayName,
  method,
  nextStep,
  user,
}: {
  displayName?: string | null;
  method: AuthSession['method'];
  nextStep?: AuthNextStep;
  user: AuthUser;
}): AuthSession {
  const normalizedEmail = normalizeEmail(user.email);
  const authPhase = resolveAuthPhase(user, nextStep);
  const normalizedDisplayName = displayName?.trim() || buildDisplayNameFromEmail(normalizedEmail);

  return {
    authPhase,
    authSessionSyncedAt: null,
    authSessionSource: null,
    defaultDiscoveryMode: null,
    displayName: normalizedDisplayName || 'ConnectX Member',
    email: normalizedEmail,
    emailOtpCode: null,
    emailOtpExpiresAt: null,
    emailOtpLastSentAt: null,
    emailOtpResendAvailableAt: null,
    method,
    loginOtpCode: null,
    loginOtpExpiresAt: null,
    loginOtpLastSentAt: null,
    loginOtpResendAvailableAt: null,
    onboardingCompletedAt:
      authPhase === 'authenticated'
        ? user.whatsapp_verified_at ?? new Date().toISOString()
        : null,
    pendingWhatsappNumber: user.whatsapp_number,
    premium: DEFAULT_PREMIUM_STATE,
    shouldAutoSendEmailOtp: nextStep === 'NEED_EMAIL_OTP',
    shouldAutoSendLoginOtp: nextStep === 'NEED_LOGIN_OTP',
    user: {
      ...user,
      email: normalizedEmail,
    },
    whatsappOtpLastSentAt: null,
    whatsappOtpResendAvailableAt: null,
  };
}

function createPendingLoginOtpSession(email: string): AuthSession {
  const normalizedEmail = normalizeEmail(email);

  return {
    authPhase: 'pending_login_otp',
    authSessionSyncedAt: null,
    authSessionSource: null,
    defaultDiscoveryMode: null,
    displayName: buildDisplayNameFromEmail(normalizedEmail) || 'ConnectX Member',
    email: normalizedEmail,
    emailOtpCode: null,
    emailOtpExpiresAt: null,
    emailOtpLastSentAt: null,
    emailOtpResendAvailableAt: null,
    loginOtpCode: null,
    loginOtpExpiresAt: null,
    loginOtpLastSentAt: null,
    loginOtpResendAvailableAt: null,
    method: 'email',
    onboardingCompletedAt: null,
    pendingWhatsappNumber: null,
    premium: DEFAULT_PREMIUM_STATE,
    shouldAutoSendEmailOtp: false,
    shouldAutoSendLoginOtp: true,
    user: null,
    whatsappOtpLastSentAt: null,
    whatsappOtpResendAvailableAt: null,
  };
}

function createOAuthFallbackUser(user: SupabaseUser): AuthUser {
  const now = new Date().toISOString();
  const normalizedEmail = normalizeEmail(user.email ?? 'connectx-member@local.dev');

  return {
    id: user.id,
    entity_type: null,
    email: normalizedEmail,
    email_verified_at: user.email_confirmed_at ?? now,
    whatsapp_number: null,
    whatsapp_verified_at: null,
    registration_step: 5,
    is_active: true,
    is_onboarded: true,
  };
}

function createLinkedInPendingWhatsappSession(): AuthSession {
  return {
    authPhase: 'pending_whatsapp_verification',
    authSessionSyncedAt: null,
    authSessionSource: null,
    defaultDiscoveryMode: null,
    displayName: 'ConnectX Member',
    email: 'connectx-member@linkedin.local',
    emailOtpCode: null,
    emailOtpExpiresAt: null,
    emailOtpLastSentAt: null,
    emailOtpResendAvailableAt: null,
    loginOtpCode: null,
    loginOtpExpiresAt: null,
    loginOtpLastSentAt: null,
    loginOtpResendAvailableAt: null,
    method: 'linkedin',
    onboardingCompletedAt: null,
    pendingWhatsappNumber: null,
    premium: DEFAULT_PREMIUM_STATE,
    shouldAutoSendEmailOtp: false,
    shouldAutoSendLoginOtp: false,
    user: null,
    whatsappOtpLastSentAt: null,
    whatsappOtpResendAvailableAt: null,
  };
}

function createLinkedInAuthenticatedUser(
  identity: Awaited<ReturnType<typeof getStoredSupabaseIdentity>>,
  isOnboarded: boolean | null = true
) {
  const now = new Date().toISOString();
  const normalizedEmail = normalizeEmail(identity?.email ?? 'connectx-member@linkedin.local');

  return {
    id: identity?.userId ?? 'linkedin-callback',
    entity_type: null,
    email: normalizedEmail,
    email_verified_at: now,
    whatsapp_number: null,
    whatsapp_verified_at: now,
    registration_step: 5,
    is_active: true,
    is_onboarded: isOnboarded,
  } satisfies AuthUser;
}

function createLinkedInAuthenticatedSession(
  identity: Awaited<ReturnType<typeof getStoredSupabaseIdentity>>,
  isOnboarded: boolean | null = true
): AuthSession {
  const user = createLinkedInAuthenticatedUser(identity, isOnboarded);

  return createAuthSession({
    displayName: identity?.displayName ?? null,
    method: 'linkedin',
    nextStep: 'LOGIN_SUCCESS',
    user,
  });
}

function withEmailOtpSession(
  session: AuthSession,
  options?: {
    otpCode?: string | null;
  }
) {
  const now = Date.now();
  const otpCode = options?.otpCode ?? null;

  return {
    ...session,
    emailOtpCode: otpCode,
    emailOtpExpiresAt: otpCode ? new Date(now + OTP_VALIDITY_MS).toISOString() : null,
    emailOtpLastSentAt: new Date(now).toISOString(),
    emailOtpResendAvailableAt: new Date(now + OTP_LOCK_WINDOW_MS).toISOString(),
    shouldAutoSendEmailOtp: false,
  } satisfies AuthSession;
}

function consumeEmailAutoSend(session: AuthSession) {
  return {
    ...session,
    shouldAutoSendEmailOtp: false,
  } satisfies AuthSession;
}

function withLoginOtpSession(
  session: AuthSession,
  options?: {
    otpCode?: string | null;
  }
) {
  const now = Date.now();
  const otpCode = options?.otpCode ?? null;

  return {
    ...session,
    loginOtpCode: otpCode,
    loginOtpExpiresAt: otpCode ? new Date(now + OTP_VALIDITY_MS).toISOString() : null,
    loginOtpLastSentAt: new Date(now).toISOString(),
    loginOtpResendAvailableAt: new Date(now + OTP_LOCK_WINDOW_MS).toISOString(),
    shouldAutoSendLoginOtp: false,
  } satisfies AuthSession;
}

function consumeLoginAutoSend(session: AuthSession) {
  return {
    ...session,
    shouldAutoSendLoginOtp: false,
  } satisfies AuthSession;
}

function withFreshWhatsappOtpSession(session: AuthSession, whatsappNumber: string) {
  const now = Date.now();

  return {
    ...session,
    pendingWhatsappNumber: whatsappNumber,
    whatsappOtpLastSentAt: new Date(now).toISOString(),
    whatsappOtpResendAvailableAt: new Date(now + OTP_LOCK_WINDOW_MS).toISOString(),
  } satisfies AuthSession;
}

function moveSessionBackToEmailVerification(session: AuthSession) {
  return {
    ...session,
    authPhase: 'pending_email_verification',
    loginOtpCode: null,
    loginOtpExpiresAt: null,
    loginOtpLastSentAt: null,
    loginOtpResendAvailableAt: null,
    pendingWhatsappNumber: null,
    shouldAutoSendEmailOtp: false,
    shouldAutoSendLoginOtp: false,
    whatsappOtpLastSentAt: null,
    whatsappOtpResendAvailableAt: null,
  } satisfies AuthSession;
}

function moveSessionToWhatsappVerification(session: AuthSession, user: AuthUser) {
  return {
    ...session,
    authPhase: 'pending_whatsapp_verification',
    emailOtpCode: null,
    emailOtpExpiresAt: null,
    emailOtpLastSentAt: session.emailOtpLastSentAt,
    emailOtpResendAvailableAt: session.emailOtpResendAvailableAt,
    loginOtpCode: null,
    loginOtpExpiresAt: null,
    loginOtpLastSentAt: null,
    loginOtpResendAvailableAt: null,
    onboardingCompletedAt: null,
    pendingWhatsappNumber: user.whatsapp_number ?? session.pendingWhatsappNumber ?? null,
    shouldAutoSendEmailOtp: false,
    shouldAutoSendLoginOtp: false,
    user,
    whatsappOtpLastSentAt: null,
    whatsappOtpResendAvailableAt: null,
  } satisfies AuthSession;
}

function isOtpRateLimitResponse(value: unknown): value is OtpRateLimitResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<OtpRateLimitResponse>;

  return typeof candidate.message === 'string' && !('status' in (value as Record<string, unknown>));
}

function isEmailAlreadyVerifiedResponse(value: unknown): value is EmailAlreadyVerifiedResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<EmailAlreadyVerifiedResponse>;

  return candidate.code === 'EMAIL_ALREADY_VERIFIED' && typeof candidate.message === 'string';
}

function isVerifyEmailErrorResponse(value: unknown): value is VerifyEmailErrorResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<VerifyEmailErrorResponse>;

  return (
    typeof candidate.message === 'string' &&
    !!candidate.errors &&
    typeof candidate.errors === 'object' &&
    Array.isArray(candidate.errors.otp_code)
  );
}

function isVerifyWhatsappValidationErrorResponse(
  value: unknown
): value is VerifyWhatsappValidationErrorResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<VerifyWhatsappValidationErrorResponse>;

  return (
    typeof candidate.message === 'string' &&
    !!candidate.errors &&
    typeof candidate.errors === 'object' &&
    Array.isArray(candidate.errors.otp_code)
  );
}

function isVerifyWhatsappStepErrorResponse(value: unknown): value is VerifyWhatsappStepErrorResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<VerifyWhatsappStepErrorResponse>;

  return candidate.next_step === 'NEED_EMAIL_OTP' && typeof candidate.message === 'string';
}

async function persistStoredUser(user: AuthUser | null) {
  if (!user) {
    await SecureStore.deleteItemAsync(USER_KEY);
    return;
  }

  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getStoredToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getStoredUser() {
  const rawUser = await SecureStore.getItemAsync(USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    const parsedUser = JSON.parse(rawUser) as unknown;

    if (!isStoredUserShape(parsedUser)) {
      await SecureStore.deleteItemAsync(USER_KEY);
      return null;
    }

    return parsedUser;
  } catch {
    await SecureStore.deleteItemAsync(USER_KEY);
    return null;
  }
}

export async function getStoredSession() {
  const rawSession = await SecureStore.getItemAsync(SESSION_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(rawSession) as unknown;

    if (!isStoredSessionShape(parsedSession)) {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      return null;
    }

    return parsedSession;
  } catch {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return null;
  }
}

export async function getPersistedAuthState(): Promise<PersistedAuthState> {
  const [token, session, user] = await Promise.all([
    getStoredToken(),
    getStoredSession(),
    getStoredUser(),
  ]);

  if (session && user && !session.user) {
    return {
      session: {
        ...session,
        user,
      },
      token,
      user,
    };
  }

  return {
    session,
    token,
    user: session?.user ?? user,
  };
}

export async function persistAuthSession(session: AuthSession, token: string) {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, token),
    SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session)),
    persistStoredUser(session.user),
  ]);
}

async function persistPendingAuthSession(session: AuthSession) {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session)),
    persistStoredUser(session.user),
  ]);
}

export async function replaceStoredSession(session: AuthSession) {
  await Promise.all([
    SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session)),
    persistStoredUser(session.user),
  ]);
}

export async function clearPersistedAuth() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(SESSION_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
    setStoredSupabaseAccessToken(null),
  ]);
}

export function createOAuthAuthSessionFromSupabaseUser(
  user: SupabaseUser,
  method: OAuthAuthMethod,
  displayName?: string | null,
  backendUser?: AuthUser | null,
  nextStep?: AuthNextStep
): AuthSession {
  const resolvedUser = backendUser ?? createOAuthFallbackUser(user);

  return createAuthSession({
    displayName: buildDisplayNameFromSupabaseUser(user, displayName),
    method,
    nextStep: nextStep ?? 'REGISTRATION_COMPLETE',
    user: resolvedUser,
  });
}

export function createOAuthAuthSessionFromSupabaseSession(
  session: SupabaseSession,
  method: OAuthAuthMethod,
  displayName?: string | null,
  backendUser?: AuthUser | null,
  nextStep?: AuthNextStep
) {
  return createOAuthAuthSessionFromSupabaseUser(
    session.user,
    method,
    displayName,
    backendUser,
    nextStep
  );
}

async function requireStoredAuthState() {
  return requireStoredAuthStateWithOptions();
}

async function requireStoredAuthStateWithOptions(options?: { requireToken?: boolean }) {
  const { session, token, user } = await getPersistedAuthState();
  const requireToken = options?.requireToken ?? true;

  if (!session || (requireToken && !token)) {
    throw new Error('No auth state is available for this flow.');
  }

  return {
    session: session.user ? session : { ...session, user },
    token: token ?? null,
  };
}

async function persistSessionResult<TResponse>(
  session: AuthSession,
  response: TResponse
): Promise<SessionActionResult<TResponse>> {
  await replaceStoredSession(session);

  return {
    response,
    session,
  };
}

function normalizePremiumState(value: AuthPremiumState | null | undefined): AuthPremiumState {
  return {
    boost: typeof value?.boost === 'number' ? value.boost : DEFAULT_PREMIUM_STATE.boost,
    spotlight: typeof value?.spotlight === 'number' ? value.spotlight : DEFAULT_PREMIUM_STATE.spotlight,
    isPremium: typeof value?.isPremium === 'boolean' ? value.isPremium : DEFAULT_PREMIUM_STATE.isPremium,
  };
}

function mergeAuthSessionResponse(
  session: AuthSession,
  response: AuthSessionResponse,
  source: AuthSessionResponseResult['source']
): AuthSession {
  const responseUser = response.data.user;
  const normalizedEmail = normalizeEmail(responseUser.email || session.email);
  const authPhase = resolveAuthPhase(responseUser);

  return {
    ...session,
    authPhase,
    authSessionSyncedAt: new Date().toISOString(),
    authSessionSource: source,
    defaultDiscoveryMode: response.data.discovery_preferences.default_discovery_mode,
    email: normalizedEmail,
    onboardingCompletedAt:
      authPhase === 'authenticated'
        ? responseUser.whatsapp_verified_at ?? session.onboardingCompletedAt ?? new Date().toISOString()
        : null,
    pendingWhatsappNumber: responseUser.whatsapp_number ?? session.pendingWhatsappNumber ?? null,
    premium: normalizePremiumState(response.data.premium),
    user: {
      ...responseUser,
      email: normalizedEmail,
    },
  };
}

async function fetchAuthSessionWithSource(): Promise<AuthSessionResponseResult> {
  if (isMockAuthFlowEnabled()) {
    return {
      response: mockAuthSessionResponse,
      source: 'mock',
    };
  }

  try {
    return {
      response: await apiFetch<AuthSessionResponse>(AUTH_API.SESSION),
      source: 'api',
    };
  } catch (error) {
    if (isExpoDevModeEnabled()) {
      console.warn('[auth:session] falling back to mock session response', error);
      return {
        response: mockAuthSessionResponse,
        source: 'mock',
      };
    }

    throw error;
  }
}

export async function fetchAuthSession() {
  return (await fetchAuthSessionWithSource()).response;
}

export async function refreshAuthSession(baseSession?: AuthSession): Promise<SessionActionResult<AuthSessionResponse>> {
  const { session } = baseSession
    ? { session: baseSession }
    : await requireStoredAuthStateWithOptions({ requireToken: true });
  const { response, source } = await fetchAuthSessionWithSource();
  const nextSession = mergeAuthSessionResponse(session, response, source);

  await replaceStoredSession(nextSession);

  return {
    response,
    session: nextSession,
  };
}

async function applySupabaseAuthResponse(response: AuthSupabaseSessionPayload) {
  const accessToken = response.supabase_access_token?.trim() || null;
  const refreshToken = response.supabase_refresh_token?.trim() || null;
  const realtimeToken =
    response.supabase_token?.trim() || accessToken || refreshToken || null;
  const usesMockTokens =
    isExpoDevModeEnabled() &&
    [accessToken, refreshToken, realtimeToken].some((token) => token?.startsWith('mock-supabase'));

  if (accessToken && refreshToken) {
    if (usesMockTokens) {
      await setSupabaseRealtimeToken(accessToken);
      return;
    }

    await setSupabaseSession({
      accessToken,
      refreshToken,
    });
    return;
  }

  if (realtimeToken) {
    await setSupabaseRealtimeToken(realtimeToken);
  }
}

async function verifyGoogleOAuthWithApi(
  payload: GoogleOAuthLoginPayload
): Promise<GoogleOAuthVerifyResponse> {
  return apiFetch<GoogleOAuthVerifyResponse>(AUTH_API.GOOGLE_OAUTH_VERIFY, {
    method: 'POST',
    body: {
      fcm_token: payload.fcmToken ?? '',
      provider_token: payload.accessToken,
    } as any,
  });
}

export async function loginWithGoogleApi(
  payload: GoogleOAuthLoginPayload
): Promise<SessionActionResult<GoogleOAuthVerifyResponse>> {
  const response = await verifyGoogleOAuthWithApi(payload);
  const token = response.token.trim();

  if (!token) {
    throw new Error('Google login succeeded, but no API token was returned.');
  }

  const session = createAuthSession({
    displayName: payload.displayName,
    method: 'google',
    nextStep: response.next_step,
    user: response.data.user,
  });

  await Promise.all([
    persistAuthSession(session, token),
    applySupabaseAuthResponse(response),
  ]);
  const refreshedSessionResult = await refreshAuthSession(session);

  return {
    response,
    session: refreshedSessionResult.session,
  };
}

export async function bootstrapLinkedInAuthSession(
  payload: LinkedInAuthResult
): Promise<SessionActionResult<LinkedInAuthResult>> {
  const token = payload.token.trim();

  if (!token) {
    throw new Error('LinkedIn sign-in completed, but no backend token was returned.');
  }

  await SecureStore.setItemAsync(TOKEN_KEY, token);

  try {
    if (payload.nextStep === 'NEED_WHATSAPP_VERIFICATION') {
      const session = createLinkedInPendingWhatsappSession();

      await persistAuthSession(session, token);

      return {
        response: payload,
        session,
      };
    }

    const supabaseToken = payload.supabaseToken?.trim() || null;

    if (!supabaseToken) {
      throw new Error('LinkedIn sign-in completed, but no Supabase token was returned.');
    }

    await setSupabaseRealtimeToken(supabaseToken);

    const storedSupabaseIdentity = await getStoredSupabaseIdentity();
    const session = createLinkedInAuthenticatedSession(
      storedSupabaseIdentity,
      payload.nextStep === 'NEED_ONBOARDING' ? false : payload.isOnboarded ?? true
    );
    const response: LinkedInAuthResult = {
      ...payload,
      supabaseToken,
    };

    await persistAuthSession(session, token);
    const refreshedSessionResult = await refreshAuthSession(session);

    return {
      response,
      session: refreshedSessionResult.session,
    };
  } catch (error) {
    await Promise.allSettled([
      clearPersistedAuth(),
      setSupabaseRealtimeToken(null),
    ]);

    throw error;
  }
}

export async function loginWithApi(
  payload: LoginPayload
): Promise<SessionActionResult<LoginPasswordSuccessResponse>> {
  const response = isMockAuthFlowEnabled()
    ? buildMockLoginPasswordResponse()
    : await apiFetch<LoginPasswordSuccessResponse>(AUTH_API.LOGIN, {
      method: 'POST',
      body: {
        ...payload,
        fcm_token: payload.fcm_token || mockFCMToken,
      } as any,
    });
  const session = createPendingLoginOtpSession(payload.email);

  if (response.token?.trim()) {
    await persistAuthSession(session, response.token.trim());
  } else {
    await persistPendingAuthSession(session);
  }

  return {
    response,
    session,
  };
}

export async function forgotPassword(
  payload: ForgotPasswordPayload
): Promise<ForgotPasswordResponse> {
  if (isMockAuthFlowEnabled()) {
    return {
      status: 'success',
      message: 'Link reset password telah dikirim ke email Anda. Berlaku selama 60 menit.',
    };
  }

  return apiFetch<ForgotPasswordResponse>(AUTH_API.FORGOT_PASSWORD, {
    method: 'POST',
    body: {
      email: normalizeEmail(payload.email),
    } as ForgotPasswordPayload as any,
  });
}

export async function sendLoginOtp(): Promise<
  SessionActionResult<LoginOtpMessageResponse | OtpRateLimitResponse>
> {
  const { session } = await requireStoredAuthStateWithOptions({ requireToken: false });
  const baseSession = consumeLoginAutoSend(session);
  const resendAvailableAt = session.loginOtpResendAvailableAt
    ? new Date(session.loginOtpResendAvailableAt).getTime()
    : 0;

  if (resendAvailableAt > Date.now()) {
    return persistSessionResult(baseSession, {
      message: 'Upsss... Terlalu banyak permintaan OTP. Coba lagi dalam 8 menit.',
    });
  }

  if (isMockAuthFlowEnabled()) {
    const nextSession = withLoginOtpSession(baseSession, {
      otpCode: MOCK_LOGIN_OTP,
    });

    if (isExpoDevModeEnabled()) {
      console.log('[auth:mock] login otp', MOCK_LOGIN_OTP);
    }

    return persistSessionResult(nextSession, buildMockLoginOtpMessage(nextSession.email));
  }

  try {
    const response = await apiFetch<LoginOtpMessageResponse>(AUTH_API.LOGIN_OTP_SEND, {
      method: 'POST',
      body: {
        email: session.email,
      } as LoginOtpSendPayload as any,
    });
    const nextSession = withLoginOtpSession(baseSession);

    return persistSessionResult(nextSession, response);
  } catch (error) {
    if (error instanceof ApiError && isOtpRateLimitResponse(error.payload)) {
      return persistSessionResult(baseSession, error.payload);
    }

    throw error;
  }
}

export async function resendLoginOtp(): Promise<
  SessionActionResult<LoginOtpMessageResponse | OtpRateLimitResponse>
> {
  const { session } = await requireStoredAuthStateWithOptions({ requireToken: false });
  const resendAvailableAt = session.loginOtpResendAvailableAt
    ? new Date(session.loginOtpResendAvailableAt).getTime()
    : 0;

  if (resendAvailableAt > Date.now()) {
    return {
      response: {
        message: 'Upsss... Terlalu banyak permintaan OTP. Coba lagi dalam 8 menit.',
      },
      session,
    };
  }

  if (isMockAuthFlowEnabled()) {
    const nextSession = withLoginOtpSession(session, {
      otpCode: MOCK_LOGIN_OTP,
    });

    if (isExpoDevModeEnabled()) {
      console.log('[auth:mock] login otp', MOCK_LOGIN_OTP);
    }

    return persistSessionResult(nextSession, buildMockLoginOtpMessage(nextSession.email));
  }

  try {
    const response = await apiFetch<LoginOtpMessageResponse>(AUTH_API.LOGIN_OTP_SEND, {
      method: 'POST',
      body: {
        email: session.email,
      } as LoginOtpSendPayload as any,
    });
    const nextSession = withLoginOtpSession(session);

    return persistSessionResult(nextSession, response);
  } catch (error) {
    if (error instanceof ApiError && isOtpRateLimitResponse(error.payload)) {
      return {
        response: error.payload,
        session,
      };
    }

    throw error;
  }
}

export async function verifyLoginOtp(
  payload: LoginOtpVerifyPayload
): Promise<
  SessionActionResult<LoginOtpVerifySuccessResponse | VerifyWhatsappValidationErrorResponse>
> {
  const { session } = await requireStoredAuthStateWithOptions({ requireToken: false });

  if (isMockAuthFlowEnabled()) {
    const otpExpiresAt = session.loginOtpExpiresAt ? new Date(session.loginOtpExpiresAt).getTime() : 0;
    const normalizedOtp = payload.otp_code.trim();

    if (
      !session.loginOtpCode ||
      !otpExpiresAt ||
      otpExpiresAt < Date.now() ||
      normalizedOtp !== session.loginOtpCode
    ) {
      return {
        response: {
          errors: {
            otp_code: ['Upsss... OTP tidak ditemukan atau sudah kadaluarsa. Silahkan minta OTP baru.'],
          },
          message: 'Terjadi kesalahan pada isian form. Silakan periksa kembali kolom yang diisi.',
        },
        session,
      };
    }

    const mockMode = getMockAuthFlowMode() ?? 'pending_onboarding';
    const now = new Date().toISOString();
    const response = buildMockLoginCompleteResponse(
      {
        id: `mock-login-user-${Date.now()}`,
        entity_type: null,
        email: normalizeEmail(payload.email),
        email_verified_at: now,
        whatsapp_number: '+6280000000000',
        whatsapp_verified_at: now,
        registration_step: 5,
        is_active: true,
        is_onboarded: mockMode === 'authenticated',
      },
      mockMode
    );
    const nextSession = createAuthSession({
      displayName: session.displayName,
      method: session.method,
      nextStep: response.next_step,
      user: response.data.user,
    });

    await Promise.all([
      persistAuthSession(nextSession, response.token),
      applySupabaseAuthResponse(response),
    ]);
    const refreshedSessionResult = await refreshAuthSession(nextSession);

    return {
      response,
      session: refreshedSessionResult.session,
    };
  }

  try {
    const response = await apiFetch<LoginOtpVerifySuccessResponse>(AUTH_API.LOGIN_OTP_VERIFY, {
      method: 'POST',
      body: payload as any,
    });
    const nextSession = createAuthSession({
      displayName: session.displayName,
      method: session.method,
      nextStep: response.next_step,
      user: response.data.user,
    });

    await Promise.all([
      persistAuthSession(nextSession, response.token),
      applySupabaseAuthResponse(response),
    ]);
    const refreshedSessionResult = await refreshAuthSession(nextSession);

    return {
      response,
      session: refreshedSessionResult.session,
    };
  } catch (error) {
    if (error instanceof ApiError && isVerifyWhatsappValidationErrorResponse(error.payload)) {
      return {
        response: error.payload,
        session,
      };
    }

    throw error;
  }
}

export async function loginWithGoogleSupabase(
  payload: GoogleOAuthLoginPayload
): Promise<SessionActionResult<GoogleSupabaseLoginResponse>> {
  return loginWithGoogleApi(payload);
}

export async function registerWithApi(
  payload: RegisterPayload
): Promise<SessionActionResult<AuthSuccessResponse>> {
  const response = isMockAuthFlowEnabled()
    ? buildMockRegisterResponse(normalizeEmail(payload.email))
    : await apiFetch<AuthSuccessResponse>(AUTH_API.REGISTER, {
      method: 'POST',
      body: {
        ...payload,
        fcm_token: payload.fcm_token,
      } as any,
    });

  const session = createAuthSession({
    displayName: buildDisplayNameFromEmail(response.data.user.email),
    method: 'email',
    nextStep: response.next_step,
    user: response.data.user,
  });

  await Promise.all([
    persistAuthSession(session, response.token),
    applySupabaseAuthResponse(response),
  ]);

  return {
    response,
    session,
  };
}

export async function sendEmailOtp(): Promise<
  SessionActionResult<OtpMessageResponse | OtpRateLimitResponse | EmailAlreadyVerifiedResponse>
> {
  const { session } = await requireStoredAuthState();
  const baseSession = consumeEmailAutoSend(session);

  if (isMockAuthFlowEnabled()) {
    const resendAvailableAt = session.emailOtpResendAvailableAt
      ? new Date(session.emailOtpResendAvailableAt).getTime()
      : 0;

    if (resendAvailableAt > Date.now()) {
      return persistSessionResult(baseSession, {
        message: 'Upsss... Terlalu banyak permintaan OTP. Coba lagi dalam 8 menit.',
      });
    }

    const nextSession = withEmailOtpSession(baseSession, {
      otpCode: MOCK_EMAIL_OTP,
    });

    if (isExpoDevModeEnabled()) {
      console.log('[auth:mock] email otp', MOCK_EMAIL_OTP);
    }

    return persistSessionResult(nextSession, buildMockEmailOtpMessage(nextSession.email));
  }

  try {
    const response = await apiFetch<OtpMessageResponse>(AUTH_API.EMAIL_SEND_OTP, {
      method: 'POST',
      body: {} as any,
    });
    const nextSession = withEmailOtpSession(baseSession);

    return persistSessionResult(nextSession, response);
  } catch (error) {
    if (error instanceof ApiError && isOtpRateLimitResponse(error.payload)) {
      return persistSessionResult(baseSession, error.payload);
    }

    if (error instanceof ApiError && isEmailAlreadyVerifiedResponse(error.payload)) {
      return persistSessionResult(baseSession, error.payload);
    }

    throw error;
  }
}

export async function resendEmailOtp(): Promise<
  SessionActionResult<OtpMessageResponse | OtpRateLimitResponse | EmailAlreadyVerifiedResponse>
> {
  const { session } = await requireStoredAuthState();

  if (isMockAuthFlowEnabled()) {
    if (session.user?.email_verified_at) {
      return {
        response: {
          code: 'EMAIL_ALREADY_VERIFIED',
          message: 'Email telah terverifikasi sebelumnya.',
          status: 'error',
        },
        session,
      };
    }

    const resendAvailableAt = session.emailOtpResendAvailableAt
      ? new Date(session.emailOtpResendAvailableAt).getTime()
      : 0;

    if (resendAvailableAt > Date.now()) {
      return {
        response: {
          message: 'Upsss... Terlalu banyak permintaan OTP. Coba lagi dalam 8 menit.',
        },
        session,
      };
    }

    const nextSession = withEmailOtpSession(session, {
      otpCode: MOCK_EMAIL_OTP,
    });

    if (isExpoDevModeEnabled()) {
      console.log('[auth:mock] email otp', MOCK_EMAIL_OTP);
    }

    return persistSessionResult(nextSession, buildMockEmailOtpMessage(nextSession.email));
  }

  try {
    const response = await apiFetch<OtpMessageResponse>(AUTH_API.EMAIL_RESEND_OTP, {
      method: 'POST',
      body: {} as any,
    });
    const nextSession = withEmailOtpSession(session);

    return persistSessionResult(nextSession, response);
  } catch (error) {
    if (error instanceof ApiError && isEmailAlreadyVerifiedResponse(error.payload)) {
      return {
        response: error.payload,
        session,
      };
    }

    if (error instanceof ApiError && isOtpRateLimitResponse(error.payload)) {
      return {
        response: error.payload,
        session,
      };
    }

    throw error;
  }
}

export async function verifyEmailOtp(
  payload: VerifyEmailPayload
): Promise<SessionActionResult<VerifyEmailSuccessResponse | VerifyEmailErrorResponse>> {
  const { session } = await requireStoredAuthState();

  if (isMockAuthFlowEnabled()) {
    const otpExpiresAt = session.emailOtpExpiresAt ? new Date(session.emailOtpExpiresAt).getTime() : 0;
    const normalizedOtp = payload.otp_code.trim();

    if (
      !session.emailOtpCode ||
      !otpExpiresAt ||
      otpExpiresAt < Date.now() ||
      normalizedOtp !== session.emailOtpCode
    ) {
      return {
        response: {
          errors: {
            otp_code: ['Upsss... OTP tidak ditemukan atau sudah kadaluarsa. Silahkan minta OTP baru.'],
          },
          message: 'Terjadi kesalahan pada isian form. Silakan periksa kembali kolom yang diisi.',
        },
        session,
      };
    }

    const user: AuthUser = {
      ...(session.user as AuthUser),
      email_verified_at: new Date().toISOString(),
      is_active: false,
      is_onboarded: session.user?.is_onboarded ?? null,
      registration_step: 3,
    };
    const nextSession = moveSessionToWhatsappVerification(session, user);

    return persistSessionResult(nextSession, buildMockEmailVerifiedResponse(user));
  }

  try {
    const response = await apiFetch<VerifyEmailSuccessResponse>(AUTH_API.VERIFY_EMAIL, {
      method: 'POST',
      body: payload as any,
    });
    const nextSession = moveSessionToWhatsappVerification(session, response.data.user);

    return persistSessionResult(nextSession, response);
  } catch (error) {
    if (error instanceof ApiError && isVerifyEmailErrorResponse(error.payload)) {
      return {
        response: error.payload,
        session,
      };
    }

    throw error;
  }
}

export async function sendWhatsappOtp(
  payload: WhatsappOtpPayload
): Promise<SessionActionResult<WhatsappOtpMessageResponse>> {
  const { session } = await requireStoredAuthState();

  if (isMockAuthFlowEnabled()) {
    const nextSession = withFreshWhatsappOtpSession(session, payload.whatsapp_number);

    if (isExpoDevModeEnabled()) {
      console.log('[auth:mock] whatsapp otp', MOCK_WHATSAPP_OTP);
    }

    return persistSessionResult(nextSession, buildMockWhatsappOtpMessage(payload.whatsapp_number));
  }
  const response = await apiFetch<WhatsappOtpMessageResponse>(AUTH_API.WHATSAPP_SEND_OTP, {
    method: 'POST',
    body: payload as any,
  });

  const nextSession = withFreshWhatsappOtpSession(session, payload.whatsapp_number);

  return persistSessionResult(nextSession, response);
}

export async function resendWhatsappOtp(): Promise<SessionActionResult<WhatsappOtpMessageResponse>> {
  const { session } = await requireStoredAuthState();
  const whatsappNumber = session.pendingWhatsappNumber ?? session.user?.whatsapp_number;

  if (!whatsappNumber) {
    throw new Error('Nomor WhatsApp belum tersedia untuk mengirim ulang OTP.');
  }

  if (isMockAuthFlowEnabled()) {
    const nextSession = withFreshWhatsappOtpSession(session, whatsappNumber);

    if (isExpoDevModeEnabled()) {
      console.log('[auth:mock] whatsapp otp', MOCK_WHATSAPP_OTP);
    }

    return persistSessionResult(nextSession, buildMockWhatsappOtpMessage(whatsappNumber));
  }

  const response = await apiFetch<WhatsappOtpMessageResponse>(AUTH_API.WHATSAPP_RESEND_OTP, {
    method: 'POST',
    body: {} as any,
  });
  const nextSession = withFreshWhatsappOtpSession(session, whatsappNumber);

  return persistSessionResult(nextSession, response);
}

export async function verifyWhatsappOtp(
  payload: VerifyWhatsappPayload
): Promise<
  SessionActionResult<
    VerifyWhatsappSuccessResponse | VerifyWhatsappValidationErrorResponse | VerifyWhatsappStepErrorResponse
  >
> {
  const { session } = await requireStoredAuthState();

  if (isMockAuthFlowEnabled()) {
    if (!session.user?.email_verified_at) {
      const nextSession = moveSessionBackToEmailVerification(session);

      return persistSessionResult(nextSession, {
        data: {
          current_step: 1,
          required_step: 3,
        },
        message: 'Silakan verifikasi email terlebih dahulu.',
        next_step: 'NEED_EMAIL_OTP',
        status: 'error',
      });
    }

    if (payload.otp_code.trim() !== MOCK_WHATSAPP_OTP) {
      return {
        response: {
          errors: {
            otp_code: ['Upsss... OTP tidak ditemukan atau sudah kadaluarsa. Silahkan minta OTP baru.'],
          },
          message: 'Terjadi kesalahan pada isian form. Silakan periksa kembali kolom yang diisi.',
        },
        session,
      };
    }

    const mockMode = getMockAuthFlowMode() ?? 'pending_onboarding';
    const user: AuthUser = {
      ...(session.user as AuthUser),
      is_active: true,
      is_onboarded: mockMode === 'authenticated',
      registration_step: 5,
      whatsapp_number: session.pendingWhatsappNumber ?? session.user?.whatsapp_number ?? null,
      whatsapp_verified_at: new Date().toISOString(),
    };
    const response = buildMockRegistrationCompleteResponse(user, mockMode);
    const nextSession = createAuthSession({
      displayName: session.displayName,
      method: session.method,
      nextStep: response.next_step,
      user: response.data.user,
    });

    await Promise.all([
      persistAuthSession(nextSession, response.token),
      applySupabaseAuthResponse(response),
    ]);
    const refreshedSessionResult = await refreshAuthSession(nextSession);

    return {
      response,
      session: refreshedSessionResult.session,
    };
  }

  try {
    const response = await apiFetch<VerifyWhatsappSuccessResponse>(AUTH_API.VERIFY_WHATSAPP, {
      method: 'POST',
      body: payload as any,
    });
    const nextSession = createAuthSession({
      displayName: session.displayName,
      method: session.method,
      nextStep: response.next_step,
      user: response.data.user,
    });

    await Promise.all([
      persistAuthSession(nextSession, response.token),
      applySupabaseAuthResponse(response),
    ]);
    const refreshedSessionResult = await refreshAuthSession(nextSession);

    return {
      response,
      session: refreshedSessionResult.session,
    };
  } catch (error) {
    if (error instanceof ApiError && isVerifyWhatsappValidationErrorResponse(error.payload)) {
      return {
        response: error.payload,
        session,
      };
    }

    if (error instanceof ApiError && isVerifyWhatsappStepErrorResponse(error.payload)) {
      const nextSession = moveSessionBackToEmailVerification(session);

      return persistSessionResult(nextSession, error.payload);
    }

    throw error;
  }
}

export async function enterWithDevBypassSession() {
  const verifiedAt = new Date().toISOString();
  const session: AuthSession = {
    authPhase: 'authenticated',
    authSessionSyncedAt: verifiedAt,
    authSessionSource: 'mock',
    defaultDiscoveryMode: mockAuthSessionResponse.data.discovery_preferences.default_discovery_mode,
    displayName: 'Dev Explorer',
    email: 'dev-bypass@connectx.local',
    emailOtpCode: null,
    emailOtpExpiresAt: null,
    emailOtpLastSentAt: null,
    emailOtpResendAvailableAt: null,
    isDevelopmentBypass: true,
    loginOtpCode: null,
    loginOtpExpiresAt: null,
    loginOtpLastSentAt: null,
    loginOtpResendAvailableAt: null,
    method: 'developer-bypass',
    onboardingCompletedAt: verifiedAt,
    pendingWhatsappNumber: null,
    premium: mockAuthSessionResponse.data.premium,
    shouldAutoSendEmailOtp: false,
    shouldAutoSendLoginOtp: false,
    user: {
      id: 'dev-bypass-user',
      entity_type: null,
      email: 'dev-bypass@connectx.local',
      email_verified_at: verifiedAt,
      whatsapp_number: '+62 000 0000 0000',
      whatsapp_verified_at: verifiedAt,
      registration_step: 5,
      is_active: true,
      is_onboarded: true,
    },
    whatsappOtpLastSentAt: null,
    whatsappOtpResendAvailableAt: null,
  };
  const token = 'dev-bypass-token';

  await persistAuthSession(session, token);

  return session;
}
