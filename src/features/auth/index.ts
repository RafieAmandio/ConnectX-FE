export { AuthIndexRedirect } from './components/auth-index-redirect';
export { LoginScreen } from './components/login-screen';
export { RegisterScreen } from './components/register-screen';
export { SplashScreen } from './components/splash-screen';
export { VerifyEmailScreen } from './components/verify-email-screen';
export { VerifyOtpScreen } from './components/verify-otp-screen';
export { VerifyWhatsappScreen } from './components/verify-whatsapp-screen';
export { useAuth } from './hooks/use-auth';
export { AuthProvider } from './store/auth-provider';
export type { AuthPhase, AuthSession, GoogleAuthResult } from './types/auth.types';
export { canAccessProtectedRoutes, getRouteForAuthPhase } from './utils/auth-routing';

