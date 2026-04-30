import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';

import { ApiError } from '@shared/services/api';

import { useAuth } from '../hooks/use-auth';
import type { VerifyEmailErrorResponse } from '../types/auth.types';
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

function isHandledEmailOtpError(response: VerifyEmailErrorResponse | { message: string }) {
  return 'errors' in response;
}

function getEmailOtpMessageTone(response: unknown) {
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

export function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ status?: string | string[] }>();
  const {
    authPhase,
    isHydrated,
    resendEmailOtp,
    sendEmailOtp,
    session,
    signOut,
    verifyEmailOtp,
  } = useAuth();
  const [otpCode, setOtpCode] = React.useState('');
  const [otpError, setOtpError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [statusTone, setStatusTone] = React.useState<'danger' | 'signal'>('signal');
  const [isSendingOtp, setIsSendingOtp] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [secondsRemaining, setSecondsRemaining] = React.useState(
    getSecondsRemaining(session?.emailOtpResendAvailableAt)
  );

  React.useEffect(() => {
    setSecondsRemaining(getSecondsRemaining(session?.emailOtpResendAvailableAt));
  }, [session?.emailOtpResendAvailableAt]);

  React.useEffect(() => {
    const nextStatusMessage = Array.isArray(params.status) ? params.status[0] : params.status;

    if (!nextStatusMessage) {
      return;
    }

    setStatusTone('signal');
    setStatusMessage(nextStatusMessage);
  }, [params.status]);

  React.useEffect(() => {
    if (!session || authPhase !== 'pending_email_verification' || !session.shouldAutoSendEmailOtp) {
      return;
    }

    let isActive = true;

    const bootstrapOtp = async () => {
      setIsSendingOtp(true);
      setStatusMessage(null);
      setStatusTone('signal');

      try {
        const result = await sendEmailOtp();

        if (!isActive) {
          return;
        }

        setStatusTone(getEmailOtpMessageTone(result.response));
        setStatusMessage(result.response.message);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setStatusTone('danger');
        setStatusMessage(error instanceof Error ? error.message : 'Failed to send verification code.');
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
  }, [authPhase, sendEmailOtp, session]);

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

  if (authPhase !== 'pending_email_verification') {
    return <Redirect href={getRouteForAuthPhase(authPhase)} />;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: 'Verify Email' }} />
      <AuthVerificationShell
        actionLabel={isVerifying ? 'Verifying...' : 'Verify Email'}
        codeError={otpError}
        codeLabel="Verification Code"
        codePlaceholder="Enter 6-character code"
        description={`Enter the code sent to ${session.email} to continue to WhatsApp verification.`}
        exitLabel="Log out"
        footerNote="Next step: WhatsApp verification"
        isActionDisabled={isVerifying || otpCode.trim().length !== 6}
        onActionPress={async () => {
          setIsVerifying(true);
          setOtpError(null);
          setStatusMessage(null);
          setStatusTone('signal');

          try {
            const result = await verifyEmailOtp({ otp_code: otpCode.trim() });

            if (isHandledEmailOtpError(result.response)) {
              setOtpError(result.response.errors.otp_code[0] ?? result.response.message);
              setStatusMessage(result.response.message);
              setStatusTone('danger');
              return;
            }

            setStatusMessage(result.response.message);
            setStatusTone('signal');
            router.replace('/verify-whatsapp');
          } catch (error) {
            if (error instanceof ApiError && error.payload && typeof error.payload === 'object') {
              const payload = error.payload as { message?: string };
              setStatusMessage(payload.message ?? error.message);
            } else {
              setStatusMessage(error instanceof Error ? error.message : 'Email verification failed.');
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
          void signOut();
        }}
        onResendPress={async () => {
          setIsSendingOtp(true);
          setStatusMessage(null);
          setStatusTone('signal');

          try {
            const result = await resendEmailOtp();
            setStatusTone(getEmailOtpMessageTone(result.response));
            setStatusMessage(result.response.message);
          } catch (error) {
            setStatusTone('danger');
            setStatusMessage(
              error instanceof Error ? error.message : 'Failed to resend verification code.'
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
        title="Check Your Inbox"
        codeValue={otpCode}
      />
    </>
  );
}
