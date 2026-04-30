import { Redirect, Stack, useRouter } from 'expo-router';
import React from 'react';

import { ApiError } from '@shared/services/api';

import { useAuth } from '../hooks/use-auth';
import { getRouteForAuthPhase } from '../utils/auth-routing';
import { AuthVerificationShell } from './auth-verification-shell';

function getSecondsRemaining(timestamp: string | null | undefined) {
  if (!timestamp) {
    return 0;
  }

  const remainingMs = new Date(timestamp).getTime() - Date.now();

  if (remainingMs <= 0) {
    return 0;
  }

  return Math.ceil(remainingMs / 1000);
}

function isValidationError(response: unknown): response is { errors: { otp_code: string[] }; message: string } {
  if (!response || typeof response !== 'object' || !('errors' in response)) {
    return false;
  }

  const errors = response.errors;

  return Boolean(
    errors &&
    typeof errors === 'object' &&
    'otp_code' in errors &&
    Array.isArray(errors.otp_code)
  );
}

function getOtpMessageTone(response: unknown) {
  if (
    response &&
    typeof response === 'object' &&
    'status' in response &&
    response.status === 'success'
  ) {
    return 'signal';
  }

  return 'danger';
}

export function VerifyLoginOtpScreen() {
  const router = useRouter();
  const {
    authPhase,
    isHydrated,
    resendLoginOtp,
    sendLoginOtp,
    session,
    signOut,
    verifyLoginOtp,
  } = useAuth();
  const [otpCode, setOtpCode] = React.useState('');
  const [otpError, setOtpError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [statusTone, setStatusTone] = React.useState<'danger' | 'signal'>('signal');
  const [isSendingOtp, setIsSendingOtp] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [secondsRemaining, setSecondsRemaining] = React.useState(
    getSecondsRemaining(session?.loginOtpResendAvailableAt)
  );

  React.useEffect(() => {
    setSecondsRemaining(getSecondsRemaining(session?.loginOtpResendAvailableAt));
  }, [session?.loginOtpResendAvailableAt]);

  React.useEffect(() => {
    if (!session || authPhase !== 'pending_login_otp' || !session.shouldAutoSendLoginOtp) {
      return;
    }

    let isActive = true;

    const bootstrapOtp = async () => {
      setIsSendingOtp(true);
      setStatusMessage(null);
      setStatusTone('signal');

      try {
        const result = await sendLoginOtp();

        if (!isActive) {
          return;
        }

        setStatusTone(getOtpMessageTone(result.response));
        setStatusMessage(result.response.message);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setStatusTone('danger');
        setStatusMessage(error instanceof Error ? error.message : 'Failed to send login code.');
      } finally {
        if (isActive) {
          setIsSendingOtp(false);
        }
      }
    };

    void bootstrapOtp();

    return () => {
      isActive = false;
    };
  }, [authPhase, sendLoginOtp, session]);

  React.useEffect(() => {
    if (!secondsRemaining) {
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((current) => {
        if (current <= 1) {
          clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [secondsRemaining]);

  if (!isHydrated) {
    return null;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (authPhase !== 'pending_login_otp') {
    return <Redirect href={getRouteForAuthPhase(authPhase)} />;
  }

  const handleExitToLogin = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: 'Verify Login OTP' }} />
      <AuthVerificationShell
        actionLabel={isVerifying ? 'Verifying...' : 'Verify Login'}
        codeError={otpError}
        codeLabel="Login Code"
        codePlaceholder="Enter 6-character code"
        description={`Enter the code sent to ${session.email} to finish signing in.`}
        exitLabel="Back to login"
        footerNote="You'll be signed in after verification."
        isActionDisabled={isVerifying || otpCode.trim().length !== 6}
        onActionPress={async () => {
          setIsVerifying(true);
          setOtpError(null);
          setStatusMessage(null);
          setStatusTone('signal');

          try {
            const result = await verifyLoginOtp({
              email: session.email,
              otp_code: otpCode.trim(),
            });

            if (isValidationError(result.response)) {
              setOtpError(result.response.errors.otp_code[0] ?? result.response.message);
              setStatusMessage(result.response.message);
              setStatusTone('danger');
              return;
            }

            setStatusMessage(result.response.message);
            setStatusTone('signal');
            router.replace(getRouteForAuthPhase(result.session.authPhase));
          } catch (error) {
            if (error instanceof ApiError && error.payload && typeof error.payload === 'object') {
              const payload = error.payload as { message?: string };
              setStatusMessage(payload.message ?? error.message);
            } else {
              setStatusMessage(error instanceof Error ? error.message : 'Login verification failed.');
            }
            setStatusTone('danger');
          } finally {
            setIsVerifying(false);
          }
        }}
        onCodeChange={(value) => {
          setOtpCode(value.slice(0, 6));

          if (otpError) {
            setOtpError(null);
          }
        }}
        onExitPress={() => {
          void handleExitToLogin();
        }}
        onResendPress={async () => {
          setIsSendingOtp(true);
          setStatusMessage(null);
          setStatusTone('signal');

          try {
            const result = await resendLoginOtp();
            setStatusTone(getOtpMessageTone(result.response));
            setStatusMessage(result.response.message);
          } catch (error) {
            setStatusTone('danger');
            setStatusMessage(
              error instanceof Error ? error.message : 'Failed to resend login code.'
            );
          } finally {
            setIsSendingOtp(false);
          }
        }}
        resendDisabled={isSendingOtp || secondsRemaining > 0}
        resendLabel={
          isSendingOtp
            ? 'Sending...'
            : secondsRemaining > 0
              ? `Resend in ${secondsRemaining}s`
              : 'Resend code'
        }
        statusMessage={statusMessage}
        statusTone={statusTone}
        title="Verify Your Login"
        codeValue={otpCode}
      />
    </>
  );
}
