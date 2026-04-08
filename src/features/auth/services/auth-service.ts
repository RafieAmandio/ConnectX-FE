import * as SecureStore from 'expo-secure-store';

import { apiFetch } from '@shared/services/api';

import type {
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
} from '../types/auth.types';

const TOKEN_KEY = 'connectx.auth.token';
const SESSION_KEY = 'connectx.auth.session';

const AUTH_API = {
  REGISTER: '/api/v1/auth/register',
  LOGIN: '/api/v1/auth/login/password',
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
    user: createPendingEmailUser(email),
  };
}

function createOtpSuccessMessage(email: string) {
  return `Kode Verifikasi OTP telah dikirim ke ${email}. Kode ini berlaku selama 10 menit.`;
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
  const response = await apiFetch<{
    data: {
      user: AuthUser;
    };
    message: string;
    next_step?: string;
    status: string;
    token: string;
    token_type: string;
  }>(AUTH_API.LOGIN, {
    method: 'POST',
    body: {
      ...payload,
      fcm_token: mockFCMToken,
    } as any,
  });

  const user = response.data.user;
  const token = response.token;

  const needsEmailVerification = !user.email_verified_at || response.next_step === 'NEED_EMAIL_OTP';
  const needsWhatsappVerification = !user.whatsapp_verified_at && user.email_verified_at;

  let authPhase: AuthPhase = 'authenticated';
  if (needsEmailVerification) {
    authPhase = 'pending_email_verification';
  } else if (needsWhatsappVerification) {
    authPhase = 'pending_whatsapp_verification';
  }

  const session: AuthSession = {
    authPhase,
    displayName: buildDisplayNameFromEmail(user.email),
    email: user.email,
    emailOtpCode: null,
    emailOtpExpiresAt: null,
    emailOtpLastSentAt: null,
    emailOtpResendAvailableAt: null,
    method: 'email',
    user,
  };

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
    user: session.user
      ? {
        ...session.user,
        email_verified_at: verifiedAt,
        is_active: false,
        registration_step: 3,
      }
      : null,
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
  };
  const token = 'dev-bypass-token';

  await persistAuthSession(session, token);

  return session;
}
