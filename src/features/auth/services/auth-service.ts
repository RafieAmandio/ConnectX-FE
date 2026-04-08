import * as SecureStore from 'expo-secure-store';

import { ApiError, apiFetch } from '@shared/services/api';

import type {
  AuthNextStep,
  AuthPhase,
  AuthSession,
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

const AUTH_API = {
  REGISTER: '/api/v1/auth/register',
  LOGIN: '/api/v1/auth/login/password',
  GOOGLE_OAUTH_VERIFY: '/api/v1/auth/oauth/google/verify-token',
  WHATSAPP_SEND_OTP: '/api/v1/auth/whatsapp/send-otp',
  WHATSAPP_RESEND_OTP: '/api/v1/auth/whatsapp/resend-otp',
  VERIFY_WHATSAPP: '/api/v1/auth/verify-whatsapp',
} as const;

const mockFCMToken = 'mock-fcm-a1b2c3d4e5f6g7h8_mock_fcm_token';
const MOCK_EMAIL_OTP = '671706';
const OTP_LOCK_WINDOW_MS = 60 * 1000;
const OTP_VALIDITY_MS = 10 * 60 * 1000;
const AUTH_PHASES = new Set([
  'signed_out',
  'pending_email_verification',
  'pending_whatsapp_verification',
  'authenticated',
]);
const AUTH_METHODS = new Set(['email', 'google', 'apple', 'developer-bypass']);

type PersistedAuthState = {
  session: AuthSession | null;
  token: string | null;
};

type SessionActionResult<TResponse> = {
  response: TResponse;
  session: AuthSession;
};

type AuthSuccessResponse = {
  data: {
    user: AuthUser;
  };
  message: string;
  next_step?: AuthNextStep;
  status: string;
  token: string;
  token_type: string;
};

export type GoogleOAuthLoginPayload = {
  accessToken: string;
  displayName?: string | null;
  email?: string | null;
};

export type GoogleOAuthVerifyResponse = AuthSuccessResponse & {
  data: AuthSuccessResponse['data'] & {
    oauth_provider: 'google';
  };
};

export async function getStoredToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
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
  const [token, session] = await Promise.all([getStoredToken(), getStoredSession()]);

  return { session, token };
}

export async function persistAuthSession(session: AuthSession, token: string) {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, token),
    SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session)),
  ]);
}

export async function replaceStoredSession(session: AuthSession) {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function clearPersistedAuth() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(SESSION_KEY),
  ]);
}

function buildDisplayNameFromEmail(email: string) {
  const localPart = email.split('@')[0] ?? 'connectx member';

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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

function createPendingEmailUser(email: string): AuthUser {
  return {
    id: `mock-user-${Date.now()}`,
    entity_type: null,
    email,
    email_verified_at: null,
    whatsapp_number: null,
    whatsapp_verified_at: null,
    registration_step: 2,
    is_active: false,
  };
}

function createPendingEmailSession(email: string): AuthSession {
  return {
    authPhase: 'pending_email_verification',
    displayName: buildDisplayNameFromEmail(email) || 'ConnectX Member',
    email,
    emailOtpCode: null,
    emailOtpExpiresAt: null,
    emailOtpLastSentAt: null,
    emailOtpResendAvailableAt: null,
    method: 'email',
    pendingWhatsappNumber: null,
    user: createPendingEmailUser(email),
    whatsappOtpLastSentAt: null,
    whatsappOtpResendAvailableAt: null,
  };
}

function createOtpSuccessMessage(email: string) {
  return `Kode Verifikasi OTP telah dikirim ke ${email}. Kode ini berlaku selama 10 menit.`;
}

function resolveAuthPhase(user: AuthUser, nextStep?: AuthSuccessResponse['next_step']): AuthPhase {
  if (nextStep === 'NEED_EMAIL_VERIFICATION' || nextStep === 'NEED_EMAIL_OTP') {
    return 'pending_email_verification';
  }

  if (nextStep === 'NEED_WHATSAPP_VERIFICATION') {
    return 'pending_whatsapp_verification';
  }

  if (!user.email_verified_at) {
    return 'pending_email_verification';
  }

  if (!user.whatsapp_verified_at) {
    return 'pending_whatsapp_verification';
  }

  return 'authenticated';
}

function createAuthSession({
  displayName,
  method,
  nextStep,
  user,
}: {
  displayName?: string | null;
  method: AuthSession['method'];
  nextStep?: AuthSuccessResponse['next_step'];
  user: AuthUser;
}): AuthSession {
  const normalizedEmail = user.email.trim().toLowerCase();
  const normalizedDisplayName = displayName?.trim() || buildDisplayNameFromEmail(normalizedEmail);

  return {
    authPhase: resolveAuthPhase(user, nextStep),
    displayName: normalizedDisplayName || 'ConnectX Member',
    email: normalizedEmail,
    emailOtpCode: null,
    emailOtpExpiresAt: null,
    emailOtpLastSentAt: null,
    emailOtpResendAvailableAt: null,
    method,
    pendingWhatsappNumber: null,
    user: {
      ...user,
      email: normalizedEmail,
    },
    whatsappOtpLastSentAt: null,
    whatsappOtpResendAvailableAt: null,
  };
}

async function requireStoredAuthState() {
  const [token, session] = await Promise.all([getStoredToken(), getStoredSession()]);

  if (!token || !session) {
    throw new Error('No auth state is available for this flow.');
  }

  return { token, session };
}

function withFreshOtpSession(session: AuthSession) {
  const now = Date.now();

  return {
    ...session,
    emailOtpCode: MOCK_EMAIL_OTP,
    emailOtpExpiresAt: new Date(now + OTP_VALIDITY_MS).toISOString(),
    emailOtpLastSentAt: new Date(now).toISOString(),
    emailOtpResendAvailableAt: new Date(now + OTP_LOCK_WINDOW_MS).toISOString(),
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
    whatsappOtpLastSentAt: null,
    whatsappOtpResendAvailableAt: null,
  } satisfies AuthSession;
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

export type LoginPayload = {
  email: string;
  password: string;
  fcm_token: string;
};

export async function loginWithApi(
  payload: LoginPayload
): Promise<SessionActionResult<OtpMessageResponse>> {
  const response = await apiFetch<AuthSuccessResponse>(AUTH_API.LOGIN, {
    method: 'POST',
    body: {
      ...payload,
      fcm_token: mockFCMToken,
    } as any,
  });

  const user = response.data.user;
  const token = response.token;
  const session = createAuthSession({
    displayName: buildDisplayNameFromEmail(user.email),
    method: 'email',
    nextStep: response.next_step,
    user,
  });

  await persistAuthSession(session, token);

  return {
    response: {
      data: [],
      message: response.message,
      next_step: 'NEED_EMAIL_VERIFICATION',
      status: 'success',
    },
    session,
  };
}

export async function loginWithGoogleApi(
  payload: GoogleOAuthLoginPayload
): Promise<SessionActionResult<GoogleOAuthVerifyResponse>> {
  const response = await apiFetch<GoogleOAuthVerifyResponse>(AUTH_API.GOOGLE_OAUTH_VERIFY, {
    method: 'POST',
    body: {
      provider_token: payload.accessToken,
      fcm_token: '',
    } as any,
  });

  const session = createAuthSession({
    displayName: payload.displayName || payload.email || response.data.user.email,
    method: 'google',
    nextStep: response.next_step,
    user: response.data.user,
  });

  await persistAuthSession(session, response.token);

  return {
    response,
    session,
  };
}

export async function registerWithApi(
  payload: RegisterPayload
): Promise<SessionActionResult<OtpMessageResponse>> {
  const response = await apiFetch<{
    data: {
      user: AuthUser;
    };
    message: string;
    next_step: string;
    status: string;
    token: string;
    token_type: string;
  }>(AUTH_API.REGISTER, {
    method: 'POST',
    body: {
      ...payload,
      fcm_token: mockFCMToken,
    } as any,
  });

  const user = response.data.user;
  const token = response.token;
  const session = createPendingEmailSession(user.email);
  session.user = user;

  await persistAuthSession(session, token);

  return {
    response: {
      data: [],
      message: response.message,
      next_step: 'NEED_EMAIL_VERIFICATION',
      status: 'success',
    },
    session,
  };
}

export async function sendEmailOtpWithMock(): Promise<
  SessionActionResult<OtpMessageResponse | OtpRateLimitResponse>
> {
  const { session } = await requireStoredAuthState();
  const resendAvailableAt = session.emailOtpResendAvailableAt
    ? new Date(session.emailOtpResendAvailableAt).getTime()
    : 0;

  if (resendAvailableAt > Date.now()) {
    return {
      response: {
        message: 'Terlalu banyak permintaan OTP. Coba lagi dalam 8 menit.',
      },
      session,
    };
  }

  const nextSession = withFreshOtpSession(session);

  return persistSessionResult(nextSession, {
    data: [],
    message: createOtpSuccessMessage(nextSession.email),
    next_step: 'NEED_EMAIL_VERIFICATION',
    status: 'success',
  });
}

export async function resendEmailOtpWithMock(): Promise<
  SessionActionResult<OtpMessageResponse | OtpRateLimitResponse | EmailAlreadyVerifiedResponse>
> {
  const { session } = await requireStoredAuthState();

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

  const nextSession = withFreshOtpSession(session);

  return persistSessionResult(nextSession, {
    data: [],
    message: createOtpSuccessMessage(nextSession.email),
    next_step: 'NEED_EMAIL_VERIFICATION',
    status: 'success',
  });
}

export async function verifyEmailOtpWithMock(
  payload: VerifyEmailPayload
): Promise<SessionActionResult<VerifyEmailSuccessResponse | VerifyEmailErrorResponse>> {
  const { session } = await requireStoredAuthState();
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

  const verifiedAt = new Date().toISOString();
  const nextSession: AuthSession = {
    ...session,
    authPhase: 'pending_whatsapp_verification',
    emailOtpCode: null,
    emailOtpExpiresAt: null,
    emailOtpLastSentAt: session.emailOtpLastSentAt,
    emailOtpResendAvailableAt: session.emailOtpResendAvailableAt,
    pendingWhatsappNumber: session.user?.whatsapp_number ?? session.pendingWhatsappNumber ?? null,
    user: session.user
      ? {
        ...session.user,
        email_verified_at: verifiedAt,
        is_active: false,
        registration_step: 3,
      }
      : null,
    whatsappOtpLastSentAt: null,
    whatsappOtpResendAvailableAt: null,
  };

  return persistSessionResult(nextSession, {
    data: {
      user: nextSession.user as AuthUser,
    },
    message: 'Email berhasil diverifikasi.',
    next_step: 'NEED_WHATSAPP_VERIFICATION',
    status: 'success',
  });
}

export async function sendWhatsappOtpWithApi(
  payload: WhatsappOtpPayload
): Promise<SessionActionResult<WhatsappOtpMessageResponse>> {
  const { session } = await requireStoredAuthState();
  const response = await apiFetch<WhatsappOtpMessageResponse>(AUTH_API.WHATSAPP_SEND_OTP, {
    method: 'POST',
    body: payload as any,
  });
  const nextSession = withFreshWhatsappOtpSession(session, payload.whatsapp_number);

  console.log('[sendWhatsappOtpWithApi] success response:', response);
  return persistSessionResult(nextSession, response);
}

export async function resendWhatsappOtpWithApi(): Promise<
  SessionActionResult<WhatsappOtpMessageResponse>
> {
  const { session } = await requireStoredAuthState();
  const whatsappNumber = session.pendingWhatsappNumber ?? session.user?.whatsapp_number;

  if (!whatsappNumber) {
    throw new Error('Nomor WhatsApp belum tersedia untuk mengirim ulang OTP.');
  }

  const response = await apiFetch<WhatsappOtpMessageResponse>(AUTH_API.WHATSAPP_RESEND_OTP, {
    method: 'POST',
  });
  const nextSession = withFreshWhatsappOtpSession(session, whatsappNumber);

  console.log('[resendWhatsappOtpWithApi] success response:', response);
  return persistSessionResult(nextSession, response);
}

export async function verifyWhatsappOtpWithApi(
  payload: VerifyWhatsappPayload
): Promise<
  SessionActionResult<
    VerifyWhatsappSuccessResponse | VerifyWhatsappValidationErrorResponse | VerifyWhatsappStepErrorResponse
  >
> {
  const { session } = await requireStoredAuthState();

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

    await persistAuthSession(nextSession, response.token);

    console.log('[verifyWhatsappOtpWithApi] success response:', response);
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
    pendingWhatsappNumber: null,
    user: {
      id: 'dev-bypass-user',
      entity_type: null,
      email: 'dev-bypass@connectx.local',
      email_verified_at: verifiedAt,
      whatsapp_number: '+62 000 0000 0000',
      whatsapp_verified_at: verifiedAt,
      registration_step: 4,
      is_active: true,
    },
    whatsappOtpLastSentAt: null,
    whatsappOtpResendAvailableAt: null,
  };
  const token = 'dev-bypass-token';

  await persistAuthSession(session, token);

  return session;
}
