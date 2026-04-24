import type { AuthPhase } from '../types/auth.types';

export function getRouteForAuthPhase(authPhase: AuthPhase) {
  switch (authPhase) {
    case 'authenticated':
      return '/(tabs)' as const;
    case 'pending_login_otp':
      return '/verify-login-otp' as const;
    case 'pending_onboarding':
      return '/onboarding' as const;
    case 'pending_email_verification':
      return '/verify-email' as const;
    case 'pending_whatsapp_verification':
      return '/verify-whatsapp' as const;
    case 'signed_out':
    default:
      return '/welcome' as const;
  }
}

export function canAccessProtectedRoutes(authPhase: AuthPhase) {
  return authPhase === 'authenticated';
}
