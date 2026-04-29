export { AuthIndexRedirect } from './components/auth-index-redirect';
export { ForgotPasswordScreen } from './components/forgot-password-screen';
export { GetStartedScreen } from './components/get-started-screen';
export { LoginScreen } from './components/login-screen';
export { RegisterScreen } from './components/register-screen';
export { SplashScreen } from './components/splash-screen';
export { WelcomeScreen } from './components/welcome-screen';
export { VerifyEmailScreen } from './components/verify-email-screen';
export { VerifyLoginOtpScreen } from './components/verify-login-otp-screen';
export { VerifyOtpScreen } from './components/verify-otp-screen';
export { VerifyWhatsappScreen } from './components/verify-whatsapp-screen';
export { useAuth } from './hooks/use-auth';
export { AuthProvider } from './store/auth-provider';
export type {
  AuthPhase,
  AuthSession,
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  GoogleAuthResult,
} from './types/auth.types';
export { canAccessProtectedRoutes, getRouteForAuthPhase } from './utils/auth-routing';
