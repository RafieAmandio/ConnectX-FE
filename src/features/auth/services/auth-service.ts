import type { Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

import { supabaseChatRepository } from '@features/chat/data/supabase/SupabaseChatRepository';
import { ApiError, apiFetch } from '@shared/services/api';
import {
  clearSupabaseSession,
  setSupabaseRealtimeToken,
  setSupabaseSession,
  supabase,
  syncSupabaseRealtimeAuth,
} from '@shared/services/supabase/client';

import { getMockAuthFlowMode } from '../config/auth-config';
import {
  buildMockEmailOtpMessage,
  buildMockEmailVerifiedResponse,
  buildMockRegisterResponse,
  buildMockRegistrationCompleteResponse,
  buildMockWhatsappOtpMessage,
  MOCK_EMAIL_OTP,
  MOCK_WHATSAPP_OTP,
} from '../mock/auth.mock';
import type {
  AuthNextStep,
  AuthPhase,
  AuthSession,
  AuthSuccessResponse,
  AuthSupabaseSessionPayload,
  AuthUser,
  EmailAlreadyVerifiedResponse,
  OtpMessageResponse,
  OtpRateLimitResponse,
  RegisterPayload,
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

const TOKEN_KEY = 'connectx.auth.token';
const SESSION_KEY = 'connectx.auth.session';
const USER_KEY = 'connectx.auth.user';

const AUTH_API = {
  EMAIL_RESEND_OTP: '/api/v1/auth/email/resend-otp',
  EMAIL_SEND_OTP: '/api/v1/auth/email/send-otp',
  GOOGLE_OAUTH_VERIFY: '/api/v1/auth/oauth/google/verify-token',
  LOGIN: '/api/v1/auth/login/password',
  REGISTER: '/api/v1/auth/register',
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
  'pending_email_verification',
  'pending_whatsapp_verification',
  'pending_onboarding',
  'authenticated',
]);
const AUTH_METHODS = new Set(['email', 'google', 'apple', 'developer-bypass']);

type PersistedAuthState = {
  session: AuthSession | null;
  token: string | null;
  user: AuthUser | null;
};

type SessionActionResult<TResponse> = {
  response: TResponse;
  session: AuthSession;
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
  idToken: string;
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
    displayName: normalizedDisplayName || 'ConnectX Member',
    email: normalizedEmail,
    emailOtpCode: null,
    emailOtpExpiresAt: null,
    emailOtpLastSentAt: null,
    emailOtpResendAvailableAt: null,
    method,
    onboardingCompletedAt:
      authPhase === 'authenticated'
        ? user.whatsapp_verified_at ?? new Date().toISOString()
        : null,
    pendingWhatsappNumber: user.whatsapp_number,
    shouldAutoSendEmailOtp: nextStep === 'NEED_EMAIL_OTP',
    user: {
      ...user,
      email: normalizedEmail,
    },
    whatsappOtpLastSentAt: null,
    whatsappOtpResendAvailableAt: null,
  };
}

function createGoogleFallbackUser(user: SupabaseUser): AuthUser {
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
    pendingWhatsappNumber: null,
    shouldAutoSendEmailOtp: false,
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
    onboardingCompletedAt: null,
    pendingWhatsappNumber: user.whatsapp_number ?? session.pendingWhatsappNumber ?? null,
    shouldAutoSendEmailOtp: false,
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
  ]);
}

export function createGoogleAuthSessionFromSupabaseUser(
  user: SupabaseUser,
  displayName?: string | null,
  backendUser?: AuthUser | null,
  nextStep?: AuthNextStep
): AuthSession {
  const resolvedUser = backendUser ?? createGoogleFallbackUser(user);

  return createAuthSession({
    displayName: buildDisplayNameFromSupabaseUser(user, displayName),
    method: 'google',
    nextStep: nextStep ?? 'REGISTRATION_COMPLETE',
    user: resolvedUser,
  });
}

export function createGoogleAuthSessionFromSupabaseSession(
  session: SupabaseSession,
  displayName?: string | null,
  backendUser?: AuthUser | null,
  nextStep?: AuthNextStep
) {
  return createGoogleAuthSessionFromSupabaseUser(
    session.user,
    displayName,
    backendUser,
    nextStep
  );
}

async function requireStoredAuthState() {
  const { session, token, user } = await getPersistedAuthState();

  if (!token || !session) {
    throw new Error('No auth state is available for this flow.');
  }

  return {
    session: session.user ? session : { ...session, user },
    token,
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

async function applySupabaseAuthResponse(response: AuthSupabaseSessionPayload) {
  const accessToken = response.supabase_access_token?.trim() || null;
  const refreshToken = response.supabase_refresh_token?.trim() || null;
  const realtimeToken = response.supabase_token?.trim() || accessToken;
  const usesMockTokens =
    __DEV__ &&
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
      fcm_token: payload.fcmToken ?? mockFCMToken,
      provider_token: payload.accessToken,
    } as any,
  });
}

export async function loginWithApi(
  payload: LoginPayload
): Promise<SessionActionResult<AuthSuccessResponse>> {
  const response = await apiFetch<AuthSuccessResponse>(AUTH_API.LOGIN, {
    method: 'POST',
    body: {
      ...payload,
      fcm_token: payload.fcm_token || mockFCMToken,
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

export async function loginWithGoogleSupabase(
  payload: GoogleOAuthLoginPayload
): Promise<SessionActionResult<GoogleSupabaseLoginResponse>> {
  try {
    const googleVerifyResponse = await verifyGoogleOAuthWithApi(payload);
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: payload.idToken,
    });

    if (error) {
      throw error;
    }

    if (data.session) {
      await syncSupabaseRealtimeAuth(data.session);
    }

    const supabaseUser = data.session?.user ?? data.user ?? null;

    if (!supabaseUser) {
      throw new Error('Supabase Google sign-in succeeded, but no user profile was returned.');
    }

    const session = data.session
      ? createGoogleAuthSessionFromSupabaseSession(
        data.session,
        payload.displayName,
        googleVerifyResponse.data.user,
        googleVerifyResponse.next_step
      )
      : createGoogleAuthSessionFromSupabaseUser(
        supabaseUser,
        payload.displayName,
        googleVerifyResponse.data.user,
        googleVerifyResponse.next_step
      );

    await persistAuthSession(session, googleVerifyResponse.token);

    return {
      response: {
        ...googleVerifyResponse,
        data: {
          ...googleVerifyResponse.data,
          oauth_provider: 'google',
        },
      },
      session,
    };
  } catch (verifyError) {
    await Promise.allSettled([
      clearSupabaseSession(),
      clearPersistedAuth(),
      supabaseChatRepository.clearRealtimeSubscriptions(),
    ]);

    if (verifyError instanceof ApiError) {
      throw verifyError;
    }

    throw verifyError instanceof Error
      ? verifyError
      : new Error('Google sign-in failed.');
  }
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
        fcm_token: payload.fcm_token || mockFCMToken,
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

    if (__DEV__) {
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

    if (__DEV__) {
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

    if (__DEV__) {
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

    if (__DEV__) {
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

    return {
      response,
      session: nextSession,
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

    return {
      response,
      session: nextSession,
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
    displayName: 'Dev Explorer',
    email: 'dev-bypass@connectx.local',
    emailOtpCode: null,
    emailOtpExpiresAt: null,
    emailOtpLastSentAt: null,
    emailOtpResendAvailableAt: null,
    isDevelopmentBypass: true,
    method: 'developer-bypass',
    onboardingCompletedAt: verifiedAt,
    pendingWhatsappNumber: null,
    shouldAutoSendEmailOtp: false,
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
