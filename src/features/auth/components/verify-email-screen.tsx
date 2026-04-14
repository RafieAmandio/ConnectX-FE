import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';

import { AppButton, AppInput, AppText } from '@shared/components';
import { ApiError } from '@shared/services/api';

import { useAuth } from '../hooks/use-auth';
import type { VerifyEmailErrorResponse } from '../types/auth.types';
import { getRouteForAuthPhase } from '../utils/auth-routing';
import { AuthShell } from './auth-shell';

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
      <AuthShell
        description={`Enter the code sent to ${session.email} to continue to WhatsApp verification.`}
        pill="Verify Email"
        title="Check your inbox">
        <View className="flex-row justify-end -mt-2 mb-2">
          <TouchableOpacity className="py-1 px-2" onPress={() => signOut()}>
            <AppText className="font-medium text-[15px]" tone="muted">
              Log out
            </AppText>
          </TouchableOpacity>
        </View>

        <View className="gap-4">
          <AppInput
            autoCapitalize="none"
            autoCorrect={false}
            error={otpError ?? undefined}
            hint="Enter the 6-character verification code"
            label="Verification Code"
            maxLength={6}
            onChangeText={(value) => {
              setOtpCode(value.slice(0, 6));

              if (otpError) {
                setOtpError(null);
              }
            }}
            placeholder="Enter code"
            value={otpCode}
          />

          <AppButton
            detail="Next step: WhatsApp verification"
            disabled={isVerifying || otpCode.trim().length !== 6}
            label={isVerifying ? 'Verifying...' : 'Verify Email'}
            onPress={async () => {
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
                  setStatusMessage(
                    error instanceof Error ? error.message : 'Email verification failed.'
                  );
                }
                setStatusTone('danger');
              } finally {
                setIsVerifying(false);
              }
            }}
            size="lg"
          />

          <AppButton
            detail={secondsRemaining ? `Try again in ${secondsRemaining}s` : 'Request a new code'}
            disabled={isSendingOtp || secondsRemaining > 0}
            label={isSendingOtp ? 'Sending code...' : 'Resend Code'}
            onPress={async () => {
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
            variant="secondary"
          />

          {statusMessage ? (
            <AppText selectable tone={statusTone}>
              {statusMessage}
            </AppText>
          ) : null}
        </View>
      </AuthShell>
    </>
  );
}
