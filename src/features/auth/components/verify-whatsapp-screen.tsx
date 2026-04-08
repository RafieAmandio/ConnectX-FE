import { Redirect, Stack, useRouter, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View, KeyboardAvoidingView, Platform, TouchableOpacity, Keyboard, Pressable } from 'react-native';

import { AppButton, AppInput, AppText } from '@shared/components';
import { ApiError } from '@shared/services/api';

import { useAuth } from '../hooks/use-auth';
import { getRouteForAuthPhase } from '../utils/auth-routing';

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
    return 'WhatsApp number is required.';
  }

  if (!/^\+\d{10,15}$/.test(value)) {
    return 'Use a format like +6281234567890.';
  }

  return null;
}

export function VerifyWhatsappScreen() {
  const router = useRouter();
  const {
    authPhase,
    isHydrated,
    session,
    sendWhatsappOtp,
    signOut,
  } = useAuth();
  
  const persistedWhatsappNumber = session?.user?.whatsapp_number ?? session?.pendingWhatsappNumber ?? '';
  const hasPersistedOtpState = Boolean(
    persistedWhatsappNumber && session?.whatsappOtpLastSentAt
  );
  
  const [whatsappNumber, setWhatsappNumber] = React.useState(persistedWhatsappNumber);
  const [whatsappError, setWhatsappError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [statusTone, setStatusTone] = React.useState<'danger' | 'signal'>('signal');
  const [isSendingOtp, setIsSendingOtp] = React.useState(false);

  React.useEffect(() => {
    setWhatsappNumber(persistedWhatsappNumber);
  }, [persistedWhatsappNumber]);

  const params = useLocalSearchParams<{ reset?: string }>();

  React.useEffect(() => {
    if (hasPersistedOtpState && params.reset !== 'true') {
        // Automatically route to otp screen if we already had a pending otp
        router.replace('/verify-otp');
    }
  }, [hasPersistedOtpState, params.reset]);

  if (!isHydrated) {
    return null;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (authPhase !== 'pending_whatsapp_verification') {
    return <Redirect href={getRouteForAuthPhase(authPhase)} />;
  }

  const handleSendOtp = async () => {
    const normalizedNumber = normalizeWhatsappNumber(whatsappNumber);
    const nextWhatsappError = getWhatsappNumberError(normalizedNumber);

    setWhatsappError(nextWhatsappError);
    setStatusMessage(null);
    setStatusTone('signal');
    setWhatsappNumber(normalizedNumber);

    if (nextWhatsappError) {
      setStatusTone('danger');
      return;
    }

    setIsSendingOtp(true);

    try {
      await sendWhatsappOtp({ whatsapp_number: normalizedNumber });
      setStatusTone('signal');
      router.push('/verify-otp');
    } catch (error: unknown) {
      setStatusTone('danger');

      if (error instanceof ApiError && error.payload) {
        const payload = error.payload as { errors?: { whatsapp_number?: string[] }; message?: string; };
        if (payload.errors?.whatsapp_number?.[0]) setWhatsappError(payload.errors.whatsapp_number[0]);
        setStatusMessage(payload.message ?? error.message);
      } else {
        setStatusMessage(error instanceof Error ? error.message : 'Failed to send WhatsApp OTP.');
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-canvas"
    >
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable className="flex-1" onPress={Keyboard.dismiss} accessible={false}>
      <View className="flex-1 px-5 pt-16 pb-8">
        
        <View className="flex-row justify-end items-center h-12">
          <TouchableOpacity onPress={() => signOut()} className="py-2">
            <AppText tone="muted" className="font-medium text-[15px]">Log out</AppText>
          </TouchableOpacity>
        </View>

        <View className="flex-1 pt-8">
          <View className="gap-2 shrink-0">
            <AppText variant="hero" className="text-[32px] font-bold tracking-tight">
              Enter WhatsApp Number
            </AppText>
            <AppText tone="muted" className="text-base">
              We'll send a 6-digit code to verify your identity.
            </AppText>
          </View>

          <View className="mt-8 shrink-0">
            <AppInput
              autoCapitalize="none"
              autoCorrect={false}
              error={whatsappError ?? undefined}
              keyboardType="phone-pad"
              onChangeText={(value) => {
                setWhatsappNumber(normalizeWhatsappNumber(value));
                if (whatsappError) setWhatsappError(null);
              }}
              placeholder="+62 812 3456 7890"
              value={whatsappNumber}
              className="bg-transparent border-0 border-b border-border rounded-none px-0 text-2xl h-16 min-h-16"
              placeholderTextColor="#64748B"
            />
          </View>

          {statusMessage && statusTone === 'danger' && (
            <AppText tone="danger" className="mt-4">{statusMessage}</AppText>
          )}

          <View className="flex-1 justify-end shrink-0 pt-8">
            <AppButton
              disabled={isSendingOtp || !whatsappNumber}
              label={isSendingOtp ? 'Sending...' : 'Continue'}
              onPress={handleSendOtp}
              size="lg"
              className="w-full bg-[#0066FF] rounded-[16px] border-none"
            />
            <AppText align="center" tone="muted" className="mt-4 text-[13px]">
              By entering your number you agree to our Terms & Privacy Policy
            </AppText>
          </View>
        </View>
      </View>
      </Pressable>
    </KeyboardAvoidingView>
  );
}
