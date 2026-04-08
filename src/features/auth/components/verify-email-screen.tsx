import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { View, TouchableOpacity } from 'react-native';

import { AppButton, AppInput, AppText } from '@shared/components';

import { useAuth } from '../hooks/use-auth';
import { getRouteForAuthPhase } from '../utils/auth-routing';
import { AuthShell } from './auth-shell';

const verifyHighlights = [
  {
    description: 'The first arrival triggers the mocked OTP send automatically, just like the planned backend flow.',
    title: 'Auto-send on entry',
  },
  {
    description: 'Resend is locally locked for 60 seconds so the UX is realistic before the API exists.',
    title: 'Cooldown included',
  },
  {
    description: 'Mock code `671706` is exposed so QA and design review can complete the full happy path.',
    title: 'Testable today',
  },
] as const;

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

export function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ status?: string | string[] }>();
  const { authPhase, isHydrated, resendEmailOtp, sendEmailOtp, session, verifyEmailOtp, signOut } = useAuth();
  const [otpCode, setOtpCode] = React.useState('');
  const [otpError, setOtpError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
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

    if (nextStatusMessage) {
      setStatusMessage(nextStatusMessage);
    }
  }, [params.status]);

  React.useEffect(() => {
    if (!session || authPhase !== 'pending_email_verification' || session.emailOtpLastSentAt) {
      return;
    }

    let isActive = true;

    const bootstrapOtp = async () => {
      setIsSendingOtp(true);

      try {
        const result = await sendEmailOtp();

        if (!isActive) {
          return;
        }

        setStatusMessage(result.response.message);
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
        description={`Verify ${session.email} before the flow moves on to the WhatsApp step.`}
        highlights={verifyHighlights}
        pill="Verify Email"
        title="Enter your OTP code">
        <View className="flex-row justify-end -mt-2 mb-2">
          <TouchableOpacity onPress={() => signOut()} className="py-1 px-2">
            <AppText tone="muted" className="font-medium text-[15px]">Log out</AppText>
          </TouchableOpacity>
        </View>
        <View className="gap-4">
          <View className="gap-2">
            <AppText tone="muted" variant="label">Email OTP</AppText>
            <AppText variant="title">Check your inbox.</AppText>
            <AppText tone="muted">
              The backend message style is already preserved here, including resend rate-limit copy
              and invalid-code feedback.
            </AppText>
          </View>

          <View className="gap-2 rounded-[20px] border border-signal/25 bg-signal-tint p-4">
            <AppText variant="subtitle">Mock test code</AppText>
            <AppText selectable tone="muted">
              Use `671706` while the backend email sender is still unavailable.
            </AppText>
          </View>

          <AppInput
            error={otpError ?? undefined}
            hint="6 digits"
            keyboardType="number-pad"
            label="OTP Code"
            maxLength={6}
            onChangeText={(value) => {
              const normalizedValue = value.replace(/\D/g, '').slice(0, 6);

              setOtpCode(normalizedValue);

              if (otpError) {
                setOtpError(null);
              }
            }}
            placeholder="671706"
            value={otpCode}
          />

          <AppButton
            detail="Next step: WhatsApp verification"
            disabled={isVerifying || otpCode.length !== 6}
            label={isVerifying ? 'Verifying...' : 'Verify Email'}
            onPress={async () => {
              setIsVerifying(true);
              setOtpError(null);
              setStatusMessage(null);

              try {
                const result = await verifyEmailOtp({ otp_code: otpCode });

                if ('errors' in result.response) {
                  setOtpError(result.response.errors.otp_code[0] ?? result.response.message);
                  setStatusMessage(result.response.message);
                  return;
                }

                setStatusMessage(result.response.message);
                router.replace('/verify-whatsapp');
              } finally {
                setIsVerifying(false);
              }
            }}
            size="lg"
          />

          <AppButton
            detail={
              secondsRemaining
                ? `Try again in ${secondsRemaining}s`
                : 'Requests a fresh mock OTP'
            }
            disabled={isSendingOtp || secondsRemaining > 0}
            label={isSendingOtp ? 'Sending OTP...' : 'Resend OTP'}
            onPress={async () => {
              setIsSendingOtp(true);
              setStatusMessage(null);

              try {
                const result = await resendEmailOtp();
                setStatusMessage(result.response.message);
              } finally {
                setIsSendingOtp(false);
              }
            }}
            variant="secondary"
          />

          {statusMessage ? (
            <AppText selectable tone={otpError ? 'danger' : 'signal'}>
              {statusMessage}
            </AppText>
          ) : null}
        </View>
      </AuthShell>
    </>
  );
}
