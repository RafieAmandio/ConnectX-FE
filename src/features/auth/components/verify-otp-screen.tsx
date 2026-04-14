import { Redirect, Stack, useRouter } from 'expo-router';
import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, TouchableOpacity, View, Keyboard } from 'react-native';
import { Image } from 'expo-image';

import { AppButton, AppText } from '@shared/components';
import { ApiError } from '@shared/services/api';
import { cn } from '@shared/utils/cn';

import { useAuth } from '../hooks/use-auth';
import { getRouteForAuthPhase } from '../utils/auth-routing';

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

function maskWhatsappNumber(value: string) {
  if (value.length <= 6) {
    return value;
  }

  return `${value.slice(0, 4)} ${'*'.repeat(Math.max(0, value.length - 6))}${value.slice(-2)}`;
}

export function VerifyOtpScreen() {
  const router = useRouter();
  const {
    authPhase,
    isHydrated,
    resendWhatsappOtp,
    session,
    verifyWhatsappOtp,
  } = useAuth();
  const whatsappNumber = session?.user?.whatsapp_number ?? session?.pendingWhatsappNumber ?? '';

  const [otpCode, setOtpCode] = React.useState('');
  const [otpError, setOtpError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [statusTone, setStatusTone] = React.useState<'danger' | 'signal'>('signal');
  const [isResendingOtp, setIsResendingOtp] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [secondsRemaining, setSecondsRemaining] = React.useState(
    getSecondsRemaining(session?.whatsappOtpResendAvailableAt)
  );

  const otpInputRef = React.useRef<TextInput>(null);

  React.useEffect(() => {
    setSecondsRemaining(getSecondsRemaining(session?.whatsappOtpResendAvailableAt));
  }, [session?.whatsappOtpResendAvailableAt]);

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

  const handleVerifyOtp = React.useCallback(async () => {
    setIsVerifying(true);
    setOtpError(null);
    setStatusMessage(null);
    setStatusTone('signal');

    try {
      const result = await verifyWhatsappOtp({ otp_code: otpCode });

      if ('errors' in result.response) {
        setStatusTone('danger');
        setOtpError(result.response.errors.otp_code?.[0] ?? result.response.message);
        setStatusMessage(result.response.message);
        return;
      }

      if (result.response.next_step === 'NEED_EMAIL_OTP') {
        router.replace({
          pathname: '/verify-email',
          params: { status: result.response.message },
        });
        return;
      }

      router.replace(getRouteForAuthPhase(result.session.authPhase));
    } catch (error: unknown) {
      setStatusTone('danger');

      if (error instanceof ApiError && error.payload) {
        const payload = error.payload as { message?: string };
        setStatusMessage(payload.message ?? error.message);
      } else {
        setStatusMessage(error instanceof Error ? error.message : 'WhatsApp verification failed.');
      }
    } finally {
      setIsVerifying(false);
    }
  }, [otpCode, router, verifyWhatsappOtp]);

  React.useEffect(() => {
    if (otpCode.length === 6 && !isVerifying) {
      void handleVerifyOtp();
    }
  }, [handleVerifyOtp, isVerifying, otpCode]);

  if (!isHydrated) {
    return null;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (authPhase !== 'pending_whatsapp_verification') {
    return <Redirect href={getRouteForAuthPhase(authPhase)} />;
  }

  if (!whatsappNumber) {
    return <Redirect href="/verify-whatsapp" />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-canvas"
    >
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable className="flex-1" onPress={Keyboard.dismiss} accessible={false}>
      <View className="flex-1 px-5 pt-16 pb-8">

        <TouchableOpacity 
          onPress={() => router.replace({ pathname: '/verify-whatsapp', params: { reset: 'true' } })}
          className="h-12 w-12 items-center justify-center rounded-[16px] bg-surface-soft border border-border"
        >
          <Image
            source="sf:arrow.left"
            style={{ width: 22, height: 22, tintColor: '#fff' }}
          />
        </TouchableOpacity>

        <View className="flex-1 pt-8">
          <View className="gap-2 shrink-0">
            <AppText variant="hero" className="text-[32px] font-bold tracking-tight">
              Verify account with OTP
            </AppText>
            <AppText tone="muted" className="text-base">
              We&apos;ve sent a 6-digit code to {maskWhatsappNumber(whatsappNumber)}
            </AppText>
          </View>

          <View className="mt-8 gap-4 shrink-0">
            <TextInput
              ref={otpInputRef}
              value={otpCode}
              onChangeText={(text) => {
                setOtpCode(text.replace(/\D/g, '').slice(0, 6));
                if (otpError) setOtpError(null);
              }}
              maxLength={6}
              keyboardType="number-pad"
              className="absolute w-[1px] h-[1px] opacity-0"
              autoFocus
            />
            <Pressable
              onPress={() => otpInputRef.current?.focus()}
              className="flex-row gap-2 justify-between"
            >
              {Array.from({ length: 6 }).map((_, index) => {
                const isActive = otpCode.length === index;
                const hasValue = index < otpCode.length;
                return (
                  <View
                    key={index}
                    className={cn(
                      "h-[64px] flex-1 rounded-[12px] items-center justify-center bg-surface",
                      isActive ? "border-[1.5px] border-accent" :
                        hasValue ? "border-[1px] border-border-strong" : "border-[1px] border-transparent"
                    )}
                  >
                    <AppText variant="display" className="text-[28px] font-medium leading-none mt-1">
                      {otpCode[index] || ''}
                    </AppText>
                  </View>
                );
              })}
            </Pressable>

            {otpError || statusMessage ? (
              <AppText tone={statusTone === 'danger' ? 'danger' : 'accent'} className="text-[15px] mt-1">
                {otpError || statusMessage}
              </AppText>
            ) : isVerifying ? (
              <AppText tone="muted" className="text-[15px] mt-1">Verifying your OTP...</AppText>
            ) : (
              <AppText tone="muted" className="text-[15px] mt-1 opacity-0">Verifying your OTP...</AppText>
            )}
          </View>

          <View className="flex-1 justify-end shrink-0 pt-8">
            <AppButton
              disabled={isVerifying || otpCode.length !== 6}
              label={isVerifying ? 'Verifying...' : 'Continue'}
              onPress={handleVerifyOtp}
              size="lg"
              className="w-full bg-[#0066FF] rounded-[16px] border-none"
            />

            <View className="mt-4 flex-row justify-center">
              <TouchableOpacity
                disabled={isResendingOtp || secondsRemaining > 0}
                onPress={async () => {
                  setIsResendingOtp(true);
                  setStatusMessage(null);
                  setStatusTone('signal');

                  try {
                    await resendWhatsappOtp();
                    setStatusTone('signal');
                  } catch (error: unknown) {
                    setStatusTone('danger');
                    if (error instanceof ApiError && error.payload) {
                      const payload = error.payload as { message?: string };
                      setStatusMessage(payload.message ?? error.message);
                    } else {
                      setStatusMessage(error instanceof Error ? error.message : 'Failed to resend OTP.');
                    }
                  } finally {
                    setIsResendingOtp(false);
                  }
                }}
              >
                <AppText
                  tone={secondsRemaining > 0 ? 'muted' : 'accent'}
                  className="text-center font-medium"
                >
                  {secondsRemaining > 0
                    ? `Resend code in ${secondsRemaining}s`
                    : 'Resend code'}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
      </Pressable>
    </KeyboardAvoidingView>
  );
}
