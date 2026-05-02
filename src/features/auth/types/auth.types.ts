import type { DiscoveryMode } from '@features/home/types/discovery.types';

export type AuthMethod = 'email' | 'google' | 'linkedin' | 'apple' | 'developer-bypass';
export type OAuthAuthMethod = Extract<AuthMethod, 'google' | 'linkedin'>;

export type AuthPhase =
  | 'signed_out'
  | 'pending_login_otp'
  | 'pending_email_verification'
  | 'pending_whatsapp_verification'
  | 'pending_onboarding'
  | 'authenticated';

export type AuthNextStep =
  | 'LOGIN_SUCCESS'
  | 'NEED_LOGIN_OTP'
  | 'NEED_ONBOARDING'
  | 'NEED_EMAIL_VERIFICATION'
  | 'NEED_WHATSAPP_VERIFICATION'
  | 'NEED_EMAIL_OTP'
  | 'REGISTRATION_COMPLETE';

export type AuthUser = {
  id: string;
  entity_type: string | null;
  email: string;
  email_verified_at: string | null;
  whatsapp_number: string | null;
  whatsapp_verified_at: string | null;
  registration_step: number;
  is_active: boolean;
  is_onboarded: boolean | null;
};

export type AuthPremiumState = {
  boost: number;
  spotlight: number;
  isPremium: boolean;
};

export type AuthSession = {
  authPhase: AuthPhase;
  authSessionSyncedAt?: string | null;
  defaultDiscoveryMode?: DiscoveryMode | null;
  displayName: string;
  email: string;
  emailOtpCode?: string | null;
  emailOtpExpiresAt?: string | null;
  emailOtpLastSentAt?: string | null;
  emailOtpResendAvailableAt?: string | null;
  isDevelopmentBypass?: boolean;
  loginOtpCode?: string | null;
  loginOtpExpiresAt?: string | null;
  loginOtpLastSentAt?: string | null;
  loginOtpResendAvailableAt?: string | null;
  method: AuthMethod;
  onboardingCompletedAt?: string | null;
  pendingWhatsappNumber?: string | null;
  premium?: AuthPremiumState;
  shouldAutoSendEmailOtp?: boolean;
  shouldAutoSendLoginOtp?: boolean;
  user: AuthUser | null;
  whatsappOtpLastSentAt?: string | null;
  whatsappOtpResendAvailableAt?: string | null;
};

export type AuthSupabaseSessionPayload = {
  supabase_access_token?: string | null;
  supabase_refresh_token?: string | null;
  supabase_token?: string | null;
};

export type AuthSuccessResponse = AuthSupabaseSessionPayload & {
  data: {
    user: AuthUser;
  };
  message: string;
  next_step: AuthNextStep;
  status: 'success';
  token: string;
  token_type: string;
};

export type AuthSessionResponse = {
  status: 'success';
  message: string;
  data: {
    user: AuthUser;
    discovery_preferences: {
      default_discovery_mode: DiscoveryMode | null;
    };
    premium: AuthPremiumState;
  };
};

export type RegisterPayload = {
  email: string;
  password: string;
  password_confirmation: string;
  entity_type: null;
  fcm_token: string;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type VerifyEmailPayload = {
  otp_code: string;
};

export type LoginOtpSendPayload = {
  email: string;
};

export type LoginOtpVerifyPayload = {
  email: string;
  otp_code: string;
};

export type WhatsappOtpPayload = {
  whatsapp_number: string;
};

export type VerifyWhatsappPayload = {
  otp_code: string;
};

export type GoogleAuthResult = {
  email: string;
  displayName: string;
  provider: 'google';
  accessToken: string;
  firebaseIdToken: string;
  googleAccessToken: string | null;
  idToken: string | null;
  fcmToken: string | null;
  userId: string;
};

export type LinkedInCallbackNextStep = Extract<
  AuthNextStep,
  'LOGIN_SUCCESS' | 'NEED_ONBOARDING' | 'NEED_WHATSAPP_VERIFICATION'
>;

export type LinkedInAuthResult = {
  provider: 'linkedin';
  token: string;
  nextStep: LinkedInCallbackNextStep;
  isOnboarded?: boolean | null;
  supabaseToken?: string | null;
};

export type OtpMessageResponse = {
  data: [];
  message: string;
  next_step: 'NEED_EMAIL_VERIFICATION';
  status: 'success';
};

export type LoginPasswordSuccessResponse = {
  data: [];
  message: string;
  next_step?: string | null;
  status: 'success';
  token?: string | null;
  token_type?: string | null;
} & AuthSupabaseSessionPayload;

export type LoginOtpMessageResponse = {
  data: [];
  message: string;
  next_step?: string | null;
  status: 'success';
};

export type ForgotPasswordResponse = {
  message: string;
  status: 'success';
};

export type OtpRateLimitResponse = {
  message: string;
};

export type EmailAlreadyVerifiedResponse = {
  code: 'EMAIL_ALREADY_VERIFIED';
  message: string;
  status: 'error';
};

export type VerifyEmailSuccessResponse = {
  data: {
    user: AuthUser;
  };
  message: string;
  next_step: 'NEED_WHATSAPP_VERIFICATION';
  status: 'success';
};

export type VerifyEmailErrorResponse = {
  errors: {
    otp_code: string[];
  };
  message: string;
};

export type WhatsappOtpMessageResponse = {
  data: [];
  message: string;
  next_step: 'NEED_WHATSAPP_VERIFICATION';
  status: 'success';
};

export type WhatsappOtpErrorResponse = {
  errors: {
    whatsapp_number: string[];
  };
  message: string;
};

export type VerifyWhatsappSuccessResponse = {
  data: {
    user: AuthUser;
  };
  message: string;
  next_step: 'REGISTRATION_COMPLETE';
  status: 'success';
  token: string;
  token_type: string;
} & AuthSupabaseSessionPayload;

export type LoginOtpVerifySuccessResponse = VerifyWhatsappSuccessResponse;

export type VerifyWhatsappValidationErrorResponse = {
  errors: {
    otp_code: string[];
  };
  message: string;
};

export type VerifyWhatsappStepErrorResponse = {
  data: {
    current_step: number;
    required_step: number;
  };
  message: string;
  next_step: 'NEED_EMAIL_OTP';
  status: 'error';
};
