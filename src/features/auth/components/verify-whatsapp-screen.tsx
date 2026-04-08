import { Redirect, Stack, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';

import { AppButton, AppCard, AppInput, AppText } from '@shared/components';
import { ApiError } from '@shared/services/api';

import { useAuth } from '../hooks/use-auth';
import { getRouteForAuthPhase } from '../utils/auth-routing';

type VerificationStep = 'collect_number' | 'enter_otp';

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

function normalizeWhatsappNumber(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '';
  }

  const hasLeadingPlus = trimmedValue.startsWith('+');
  const digitsOnly = trimmedValue.replace(/\D/g, '');

  if (!digitsOnly) {
    return '';
  }

  if (hasLeadingPlus) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.startsWith('62')) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.startsWith('0')) {
    return `+62${digitsOnly.slice(1)}`;
  }

  return `+${digitsOnly}`;
}

function getWhatsappNumberError(value: string) {
  if (!value) {
    return 'Nomor WhatsApp wajib diisi.';
  }

  if (!/^\+\d{10,15}$/.test(value)) {
    return 'Gunakan format nomor seperti +6281234567890.';
  }

  return null;
}

function maskWhatsappNumber(value: string) {
  if (value.length <= 6) {
    return value;
  }

  return `${value.slice(0, 4)} ${'*'.repeat(Math.max(0, value.length - 6))}${value.slice(-2)}`;
}

export function VerifyWhatsappScreen() {
  const router = useRouter();
  const {
    authPhase,
    isHydrated,
    resendWhatsappOtp,
    session,
    sendWhatsappOtp,
    verifyWhatsappOtp,
  } = useAuth();
  const persistedWhatsappNumber = session?.user?.whatsapp_number ?? session?.pendingWhatsappNumber ?? '';
  const hasPersistedOtpState = Boolean(
    persistedWhatsappNumber && session?.whatsappOtpLastSentAt
  );
  const [step, setStep] = React.useState<VerificationStep>(
    hasPersistedOtpState ? 'enter_otp' : 'collect_number'
  );
  const [whatsappNumber, setWhatsappNumber] = React.useState(persistedWhatsappNumber);
  const [otpCode, setOtpCode] = React.useState('');
  const [whatsappError, setWhatsappError] = React.useState<string | null>(null);
  const [otpError, setOtpError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [statusTone, setStatusTone] = React.useState<'danger' | 'signal'>('signal');
  const [isSendingOtp, setIsSendingOtp] = React.useState(false);
  const [isResendingOtp, setIsResendingOtp] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [secondsRemaining, setSecondsRemaining] = React.useState(
    getSecondsRemaining(session?.whatsappOtpResendAvailableAt)
  );

  React.useEffect(() => {
    setWhatsappNumber(persistedWhatsappNumber);
  }, [persistedWhatsappNumber]);

  React.useEffect(() => {
    setSecondsRemaining(getSecondsRemaining(session?.whatsappOtpResendAvailableAt));
  }, [session?.whatsappOtpResendAvailableAt]);

  React.useEffect(() => {
    if (hasPersistedOtpState) {
      setStep('enter_otp');
    }
  }, [hasPersistedOtpState]);

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

  if (authPhase !== 'pending_whatsapp_verification') {
    return <Redirect href={getRouteForAuthPhase(authPhase)} />;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: 'Verify WhatsApp' }} />
      <ScrollView
        className="flex-1 bg-canvas"
        contentContainerClassName="gap-6 px-5 pt-6 pb-24"
        contentInsetAdjustmentBehavior="automatic">
        <AppCard
          className="gap-5 overflow-hidden border-accent/10 bg-[#081223] px-5 py-6"
          style={{ boxShadow: '0 24px 60px rgba(0, 36, 102, 0.28)' }}>
          <View className="gap-3">
            <AppText className="text-[#8FB9FF]" variant="label">
              Verifikasi WhatsApp
            </AppText>
            <AppText className="text-white" variant="display">
              Satu langkah lagi untuk masuk ke ConnectX.
            </AppText>
            <AppText className="text-[#AFC4E8]">
              Email kamu sudah terverifikasi. Sekarang hubungkan nomor WhatsApp aktif untuk
              menerima kode OTP dan menyelesaikan registrasi.
            </AppText>
          </View>

          <View className="gap-3 rounded-[24px] border border-white/10 bg-white/5 p-4">
            <AppText className="text-white" variant="subtitle">
              Status akun
            </AppText>
            <AppText selectable className="text-[#C9DAF6]">
              {session.email}
            </AppText>
            <View className="flex-row flex-wrap gap-3">
              <View className="rounded-full border border-success/25 bg-success-tint px-3 py-2">
                <AppText tone="success" variant="code">
                  Email siap
                </AppText>
              </View>
              <View className="rounded-full border border-signal/25 bg-signal-tint px-3 py-2">
                <AppText tone="signal" variant="code">
                  Menunggu OTP WhatsApp
                </AppText>
              </View>
            </View>
          </View>
        </AppCard>

        <AppCard className="gap-5 p-5">
          {step === 'collect_number' ? (
            <>
              <View className="gap-2">
                <AppText variant="title">Masukkan nomor WhatsApp</AppText>
                <AppText tone="muted">
                  Gunakan nomor yang aktif menerima pesan WhatsApp. Kode OTP berlaku selama 10
                  menit setelah terkirim.
                </AppText>
              </View>

              <AppInput
                autoCapitalize="none"
                autoCorrect={false}
                error={whatsappError ?? undefined}
                keyboardType="phone-pad"
                label="Nomor WhatsApp"
                onChangeText={(value) => {
                  setWhatsappNumber(normalizeWhatsappNumber(value));

                  if (whatsappError) {
                    setWhatsappError(null);
                  }
                }}
                placeholder="+6281234567890"
                value={whatsappNumber}
              />

              <View className="gap-3 rounded-[20px] border border-border bg-background p-4">
                <AppText variant="subtitle">Format yang disarankan</AppText>
                <AppText selectable tone="muted">
                  Mulai dengan kode negara, misalnya `+6281234567890`.
                </AppText>
              </View>

              <AppButton
                detail="Kami akan kirim OTP ke WhatsApp kamu"
                disabled={isSendingOtp}
                label={isSendingOtp ? 'Mengirim OTP...' : 'Kirim Kode OTP'}
                onPress={async () => {
                  const normalizedNumber = normalizeWhatsappNumber(whatsappNumber);
                  const nextWhatsappError = getWhatsappNumberError(normalizedNumber);

                  setWhatsappError(nextWhatsappError);
                  setOtpError(null);
                  setStatusMessage(null);
                  setStatusTone('signal');
                  setWhatsappNumber(normalizedNumber);

                  if (nextWhatsappError) {
                    setStatusTone('danger');
                    return;
                  }

                  setIsSendingOtp(true);

                  try {
                    const result = await sendWhatsappOtp({ whatsapp_number: normalizedNumber });

                    setWhatsappNumber(result.session.pendingWhatsappNumber ?? normalizedNumber);
                    setStatusTone('signal');
                    setStatusMessage(result.response.message);
                    setStep('enter_otp');
                  } catch (error: unknown) {
                    setStatusTone('danger');

                    if (error instanceof ApiError && error.payload) {
                      const payload = error.payload as {
                        errors?: {
                          whatsapp_number?: string[];
                        };
                        message?: string;
                      };

                      if (payload.errors?.whatsapp_number?.[0]) {
                        setWhatsappError(payload.errors.whatsapp_number[0]);
                      }

                      setStatusMessage(payload.message ?? error.message);
                    } else {
                      setStatusMessage(
                        error instanceof Error ? error.message : 'Gagal mengirim OTP WhatsApp.'
                      );
                    }
                  } finally {
                    setIsSendingOtp(false);
                  }
                }}
                size="lg"
              />
            </>
          ) : (
            <>
              <View className="gap-2">
                <AppText variant="title">Masukkan kode OTP</AppText>
                <AppText tone="muted">
                  OTP sudah dikirim ke WhatsApp {maskWhatsappNumber(whatsappNumber)}. Masukkan 6
                  digit kodenya untuk menyelesaikan registrasi.
                </AppText>
              </View>

              <View className="gap-3 rounded-[24px] border border-success/25 bg-success-tint p-4">
                <AppText variant="subtitle">Nomor tujuan</AppText>
                <AppText selectable tone="success" variant="bodyStrong">
                  {whatsappNumber}
                </AppText>
                <AppText tone="muted" variant="code">
                  Perlu ganti nomor? Kembali ke langkah sebelumnya lalu kirim OTP baru.
                </AppText>
              </View>

              <AppInput
                error={otpError ?? undefined}
                hint="6 digit kode OTP"
                keyboardType="number-pad"
                label="Kode OTP"
                maxLength={6}
                onChangeText={(value) => {
                  const normalizedValue = value.replace(/\D/g, '').slice(0, 6);

                  setOtpCode(normalizedValue);

                  if (otpError) {
                    setOtpError(null);
                  }
                }}
                placeholder="396507"
                value={otpCode}
              />

              <AppButton
                detail="Akses aplikasi akan dibuka setelah verifikasi berhasil"
                disabled={isVerifying || otpCode.length !== 6}
                label={isVerifying ? 'Memverifikasi...' : 'Verifikasi WhatsApp'}
                onPress={async () => {
                  setIsVerifying(true);
                  setOtpError(null);
                  setStatusMessage(null);
                  setStatusTone('signal');

                  try {
                    const result = await verifyWhatsappOtp({ otp_code: otpCode });

                    if ('errors' in result.response) {
                      setStatusTone('danger');
                      setOtpError(result.response.errors.otp_code[0] ?? result.response.message);
                      setStatusMessage(result.response.message);
                      return;
                    }

                    if (result.response.next_step === 'NEED_EMAIL_OTP') {
                      setStatusTone('danger');
                      router.replace({
                        pathname: '/verify-email',
                        params: { status: result.response.message },
                      });
                      return;
                    }

                    setStatusMessage(result.response.message);
                    router.replace('/(tabs)');
                  } catch (error: unknown) {
                    setStatusTone('danger');

                    if (error instanceof ApiError && error.payload) {
                      const payload = error.payload as { message?: string };
                      setStatusMessage(payload.message ?? error.message);
                    } else {
                      setStatusMessage(
                        error instanceof Error ? error.message : 'Verifikasi WhatsApp gagal.'
                      );
                    }
                  } finally {
                    setIsVerifying(false);
                  }
                }}
                size="lg"
              />

              <AppButton
                detail={
                  secondsRemaining
                    ? `Coba lagi dalam ${secondsRemaining} detik`
                    : 'Kirim ulang OTP ke nomor yang sama'
                }
                disabled={isResendingOtp || secondsRemaining > 0}
                label={isResendingOtp ? 'Mengirim ulang...' : 'Kirim Ulang OTP'}
                onPress={async () => {
                  setIsResendingOtp(true);
                  setStatusMessage(null);
                  setStatusTone('signal');

                  try {
                    const result = await resendWhatsappOtp();

                    setWhatsappNumber(result.session.pendingWhatsappNumber ?? whatsappNumber);
                    setStatusTone('signal');
                    setStatusMessage(result.response.message);
                  } catch (error: unknown) {
                    setStatusTone('danger');

                    if (error instanceof ApiError && error.payload) {
                      const payload = error.payload as { message?: string };
                      setStatusMessage(payload.message ?? error.message);
                    } else {
                      setStatusMessage(
                        error instanceof Error ? error.message : 'Gagal mengirim ulang OTP.'
                      );
                    }
                  } finally {
                    setIsResendingOtp(false);
                  }
                }}
                variant="secondary"
              />

              <AppButton
                detail="Masukkan nomor baru lalu kirim OTP lagi"
                label="Ganti Nomor WhatsApp"
                onPress={() => {
                  setStep('collect_number');
                  setOtpCode('');
                  setOtpError(null);
                  setStatusMessage(null);
                  setStatusTone('signal');
                }}
                variant="ghost"
              />
            </>
          )}

          {statusMessage ? (
            <AppText selectable tone={statusTone}>
              {statusMessage}
            </AppText>
          ) : null}
        </AppCard>
      </ScrollView>
    </>
  );
}
