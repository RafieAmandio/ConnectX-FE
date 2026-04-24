import { Image } from 'expo-image';
import { Redirect, Stack, useRouter } from 'expo-router';
import React from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, TextInput, TouchableOpacity, View } from 'react-native';

import { AppButton, AppText } from '@shared/components';
import { ApiError } from '@shared/services/api';

import { useAuth } from '../hooks/use-auth';
import { getRouteForAuthPhase } from '../utils/auth-routing';

const CANVAS_BG = '#212121';
export const ACCENT = '#FF9A3E';
const FIELD_BG = '#292929';
const FIELD_BORDER = '#383838';
const TEXT_MUTED = '#98A2B3';
const TEXT_SOFT = '#667085';

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
      className="flex-1"
      style={{ backgroundColor: CANVAS_BG }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable className="flex-1" onPress={Keyboard.dismiss} accessible={false}>
        <View className="flex-1 px-5 pt-16 pb-8">

          <TouchableOpacity
            onPress={() => router.replace({ pathname: '/verify-whatsapp', params: { reset: 'true' } })}
            className="h-12 w-12 items-center justify-center rounded-[16px] border"
            style={{ backgroundColor: FIELD_BG, borderColor: FIELD_BORDER }}
          >
            <Image
              source="sf:arrow.left"
              style={{ width: 22, height: 22, tintColor: TEXT_MUTED }}
            />
          </TouchableOpacity>

          <View className="flex-1 pt-8">
            <View className="gap-2 shrink-0">
              <AppText
                variant="hero"
                className="text-[32px] font-bold tracking-tight"
                style={{ color: ACCENT }}>
                Verify account with OTP
              </AppText>
              <AppText className="text-base leading-6" style={{ color: TEXT_MUTED }}>
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
                      className="h-[64px] flex-1 items-center justify-center rounded-[12px] border"
                      style={{
                        backgroundColor: FIELD_BG,
                        borderColor: isActive ? ACCENT : hasValue ? FIELD_BORDER : 'transparent',
                        borderWidth: isActive ? 1.5 : 1,
                      }}
                    >
                      <AppText
                        variant="display"
                        className="mt-1 text-[28px] font-medium leading-none text-white">
                        {otpCode[index] || ''}
                      </AppText>
                    </View>
                  );
                })}
              </Pressable>

              {otpError || statusMessage ? (
                <AppText
                  className="mt-1 text-[15px]"
                  tone={statusTone === 'danger' ? 'danger' : 'accent'}>
                  {otpError || statusMessage}
                </AppText>
              ) : isVerifying ? (
                <AppText className="mt-1 text-[15px]" style={{ color: TEXT_MUTED }}>
                  Verifying your OTP...
                </AppText>
              ) : (
                <AppText className="mt-1 text-[15px] opacity-0" style={{ color: TEXT_MUTED }}>
                  Verifying your OTP...
                </AppText>
              )}
            </View>

            <View className="flex-1 justify-end shrink-0 pt-8">
              <AppButton
                disabled={isVerifying || otpCode.length !== 6}
                label={isVerifying ? 'Verifying...' : 'Continue'}
                onPress={handleVerifyOtp}
                size="lg"
                className="w-full rounded-[18px] border-none"
                style={{ backgroundColor: ACCENT }}
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
                    className="text-center font-medium"
                    style={{ color: secondsRemaining > 0 ? TEXT_SOFT : ACCENT }}
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
