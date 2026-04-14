import type { MockAuthFlowMode } from '../config/auth-config';
import type {
  AuthSupabaseSessionPayload,
  AuthSuccessResponse,
  AuthUser,
  OtpMessageResponse,
  VerifyEmailSuccessResponse,
  VerifyWhatsappSuccessResponse,
  WhatsappOtpMessageResponse,
} from '../types/auth.types';

export const MOCK_EMAIL_OTP = '671706';
export const MOCK_WHATSAPP_OTP = '671706';

function createMockToken(prefix: string, suffix: string) {
  return `${prefix}-${suffix}-${Date.now()}`;
}

function buildMockSupabaseTokens(user: AuthUser): AuthSupabaseSessionPayload {
  return {
    supabase_access_token: createMockToken('mock-supabase-access', user.id),
    supabase_refresh_token: createMockToken('mock-supabase-refresh', user.id),
    supabase_token: createMockToken('mock-supabase-jwt', user.id),
  };
}

export function buildMockPendingEmailUser(email: string): AuthUser {
  return {
    id: `mock-user-${Date.now()}`,
    entity_type: null,
    email,
    email_verified_at: null,
    whatsapp_number: null,
    whatsapp_verified_at: null,
    registration_step: 1,
    is_active: false,
    is_onboarded: null,
  };
}

export function buildMockRegisterResponse(email: string): AuthSuccessResponse {
  return {
    data: {
      user: buildMockPendingEmailUser(email),
    },
    message: 'Registration successful. Please verify your email.',
    next_step: 'NEED_EMAIL_OTP',
    status: 'success',
    token: createMockToken('mock-bearer', 'register'),
    token_type: 'Bearer',
  };
}

export function buildMockEmailOtpMessage(email: string): OtpMessageResponse {
  return {
    data: [],
    message: `OTP Verification Code has been sent to ${email}. This code is valid for 10 minutes.`,
    next_step: 'NEED_EMAIL_VERIFICATION',
    status: 'success',
  };
}

export function buildMockEmailVerifiedResponse(user: AuthUser): VerifyEmailSuccessResponse {
  return {
    data: {
      user,
    },
    message: 'Email berhasil diverifikasi.',
    next_step: 'NEED_WHATSAPP_VERIFICATION',
    status: 'success',
  };
}

export function buildMockWhatsappOtpMessage(whatsappNumber: string): WhatsappOtpMessageResponse {
  return {
    data: [],
    message: `Kode Verifikasi OTP telah dikirim ke ${whatsappNumber}. Kode ini berlaku selama 10 menit.`,
    next_step: 'NEED_WHATSAPP_VERIFICATION',
    status: 'success',
  };
}

export function buildMockRegistrationCompleteResponse(
  user: AuthUser,
  mode: MockAuthFlowMode
): VerifyWhatsappSuccessResponse {
  const hydratedUser: AuthUser = {
    ...user,
    is_active: true,
    is_onboarded: mode === 'authenticated',
    registration_step: 5,
  };

  return {
    ...buildMockSupabaseTokens(hydratedUser),
    data: {
      user: hydratedUser,
    },
    message: 'Selamat! Registrasi kamu selesai! Selamat bergabung di ConnectX.',
    next_step: 'REGISTRATION_COMPLETE',
    status: 'success',
    token: createMockToken('mock-bearer', 'registration-complete'),
    token_type: 'Bearer',
  };
}
