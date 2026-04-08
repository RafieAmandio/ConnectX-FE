export type AuthMethod = 'email' | 'google' | 'apple' | 'developer-bypass';

export type AuthPhase =
  | 'signed_out'
  | 'pending_email_verification'
  | 'pending_whatsapp_verification'
  | 'authenticated';

export type AuthNextStep = 'NEED_EMAIL_VERIFICATION' | 'NEED_WHATSAPP_VERIFICATION';

export type AuthUser = {
  id: string;
  entity_type: string | null;
  email: string;
  email_verified_at: string | null;
  whatsapp_number: string | null;
  whatsapp_verified_at: string | null;
  registration_step: number;
  is_active: boolean;
};

export type AuthSession = {
  authPhase: AuthPhase;
  displayName: string;
  email: string;
  emailOtpCode?: string | null;
  emailOtpExpiresAt?: string | null;
  emailOtpLastSentAt?: string | null;
  emailOtpResendAvailableAt?: string | null;
  isDevelopmentBypass?: boolean;
  method: AuthMethod;
  user: AuthUser | null;
};

export type RegisterPayload = {
  email: string;
  password: string;
  password_confirmation: string;
  entity_type: null;
  fcm_token: string;
};

export type VerifyEmailPayload = {
  otp_code: string;
};

export type GoogleAuthResult = {
  email: string;
  displayName: string;
  provider: 'google';
  providerToken: string;
  fcmToken: string | null;
  userId: string;
};

export type OtpMessageResponse = {
  data: [];
  message: string;
  next_step: 'NEED_EMAIL_VERIFICATION';
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

