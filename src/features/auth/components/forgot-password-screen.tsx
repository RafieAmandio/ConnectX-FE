import { AntDesign, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Redirect, Stack, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';

import { AppText } from '@shared/components';
import { ApiError } from '@shared/services/api';
import { cn } from '@shared/utils/cn';

import { useAuth } from '../hooks/use-auth';
import { forgotPassword } from '../services/auth-service';
import { getRouteForAuthPhase } from '../utils/auth-routing';
import { getEmailError } from '../utils/auth-validation';

const CONNECTX_LOGO = require('../../../../assets/images/connectx-logo.png');

const CANVAS_BG = '#212121';
const ACCENT = '#FF9A3E';
const ACCENT_SOFT = '#2A2117';
const FIELD_BG = '#292929';
const FIELD_BORDER = '#383838';
const TEXT_MUTED = '#98A2B3';
const TEXT_SOFT = '#667085';

type DarkFieldProps = {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  error?: string | null;
  keyboardType?: 'default' | 'email-address';
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
};

function DarkField({
  autoCapitalize = 'sentences',
  autoCorrect = true,
  error,
  keyboardType = 'default',
  label,
  onChangeText,
  placeholder,
  value,
}: DarkFieldProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const borderColor = error ? '#F97066' : isFocused ? ACCENT : FIELD_BORDER;

  return (
    <View className="gap-2">
      <AppText
        className="text-[12px] uppercase"
        style={{
          color: isFocused ? ACCENT : TEXT_MUTED,
          letterSpacing: 1,
        }}>
        {label}
      </AppText>
      <View
        className="flex-row items-center gap-3 rounded-[16px] border px-4"
        style={{
          backgroundColor: FIELD_BG,
          borderColor,
          borderCurve: 'continuous',
          borderWidth: isFocused || error ? 1.5 : 1,
          height: 56,
        }}>
        <TextInput
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          keyboardType={keyboardType}
          onBlur={() => setIsFocused(false)}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          placeholderTextColor={TEXT_SOFT}
          value={value}
          className="flex-1 font-body text-[15px] text-white"
          style={{ letterSpacing: 0, paddingVertical: 0 }}
        />
      </View>
      {error ? (
        <AppText className="px-1 text-[12px]" tone="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

function LogoHero() {
  return (
    <View className="items-center gap-3">
      <View
        className="h-16 w-16 items-center justify-center rounded-[20px]"
        style={{
          backgroundColor: ACCENT_SOFT,
          borderCurve: 'continuous',
        }}>
        <View
          className="h-12 w-12 items-center justify-center overflow-hidden rounded-[14px] bg-white"
          style={{ borderCurve: 'continuous' }}>
          <Image
            source={CONNECTX_LOGO}
            style={{ width: 34, height: 34 }}
            contentFit="contain"
          />
        </View>
      </View>
      <AppText variant="bodyStrong" className="text-[16px] text-white">
        ConnectX
      </AppText>
    </View>
  );
}

type BackToLoginButtonProps = {
  className?: string;
  label: string;
  onPress: () => void;
};

function BackToLoginButton({ className, label, onPress }: BackToLoginButtonProps) {
  return (
    <Pressable onPress={onPress} className={cn('flex-row items-center justify-center gap-2', className)}>
      <Ionicons color={ACCENT} name="arrow-back" size={16} />
      <AppText variant="bodyStrong" className="text-[14px]" style={{ color: ACCENT }}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function ForgotPasswordScreen() {
  const router = useRouter();
  const { authPhase, isHydrated, session } = useAuth();
  const [email, setEmail] = React.useState('');
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (!isHydrated) {
    return null;
  }

  if (session) {
    return <Redirect href={getRouteForAuthPhase(authPhase)} />;
  }

  const handleBackToLogin = () => {
    router.replace('/login');
  };

  const handleSubmit = async () => {
    const nextEmailError = getEmailError(email);

    setEmailError(nextEmailError);
    setStatusMessage(null);

    if (nextEmailError || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await forgotPassword({ email });
      setSuccessMessage(response.message);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.payload) {
        const payload = error.payload as {
          message?: string;
          errors?: { email?: string[] };
        };
        const fieldErrors = payload.errors;

        if (fieldErrors?.email?.[0]) {
          setEmailError(fieldErrors.email[0]);
        }

        if (!fieldErrors) {
          setStatusMessage(payload.message ?? error.message);
        }
      } else {
        setStatusMessage(
          error instanceof Error ? error.message : 'Could not send reset link. Please try again.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
      style={{ backgroundColor: CANVAS_BG }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable className="flex-1" onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 72,
            paddingBottom: 40,
            gap: 24,
          }}
          keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeIn.duration(360)}>
            <LogoHero />
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(80).duration(360)}
            className="items-center gap-2 pt-2">
            <AppText
              align="center"
              variant="hero"
              className="text-[32px] leading-[38px]"
              style={{ color: ACCENT }}>
              {successMessage ? 'Check your email' : 'Forgot password'}
            </AppText>
            <AppText
              align="center"
              className="text-[14px] leading-[20px] text-text-muted">
              {successMessage
                ? 'Use the reset link from your email to continue on the website.'
                : 'Enter your email and we will send a reset password link.'}
            </AppText>
          </Animated.View>

          {successMessage ? (
            <Animated.View
              entering={FadeInUp.delay(140).duration(360)}
              className="gap-6 rounded-[24px] border px-5 py-6"
              style={{
                backgroundColor: FIELD_BG,
                borderColor: FIELD_BORDER,
                borderCurve: 'continuous',
              }}>
              <View className="items-center gap-4">
                <View
                  className="h-14 w-14 items-center justify-center rounded-full"
                  style={{ backgroundColor: ACCENT_SOFT }}>
                  <Ionicons color={ACCENT} name="mail-open-outline" size={26} />
                </View>
                <AppText align="center" className="text-[15px] leading-[22px] text-white">
                  {successMessage}
                </AppText>
              </View>

              <Pressable
                onPress={handleBackToLogin}
                className="h-14 flex-row items-center justify-center gap-3 rounded-[18px]"
                style={{ backgroundColor: ACCENT, borderCurve: 'continuous' }}
                android_ripple={{ color: 'rgba(0,0,0,0.12)' }}>
                <AppText variant="subtitle" className="text-[16px] text-[#1A1208]">
                  Back to login
                </AppText>
                <AntDesign color="#1A1208" name="arrow-right" size={18} />
              </Pressable>
            </Animated.View>
          ) : (
            <>
              <Animated.View
                entering={FadeInUp.delay(140).duration(360)}
                className="gap-3">
                <DarkField
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={emailError}
                  keyboardType="email-address"
                  label="Email"
                  onChangeText={(value) => {
                    setEmail(value);
                    if (emailError) setEmailError(null);
                  }}
                  placeholder="you@company.com"
                  value={email}
                />
              </Animated.View>

              {statusMessage ? (
                <AppText align="center" selectable tone="danger">
                  {statusMessage}
                </AppText>
              ) : null}

              <Animated.View entering={FadeIn.delay(220).duration(360)} className="gap-5">
                <Pressable
                  disabled={isSubmitting}
                  onPress={handleSubmit}
                  className={cn(
                    'h-14 flex-row items-center justify-center gap-3 rounded-[18px]',
                    isSubmitting && 'opacity-50'
                  )}
                  style={{ backgroundColor: ACCENT, borderCurve: 'continuous' }}
                  android_ripple={{ color: 'rgba(0,0,0,0.12)' }}>
                  {isSubmitting ? (
                    <ActivityIndicator color="#1A1208" />
                  ) : (
                    <>
                      <AppText variant="subtitle" className="text-[16px] text-[#1A1208]">
                        Send reset link
                      </AppText>
                      <AntDesign color="#1A1208" name="arrow-right" size={18} />
                    </>
                  )}
                </Pressable>

                <BackToLoginButton label="Back to login" onPress={handleBackToLogin} />
              </Animated.View>
            </>
          )}
        </ScrollView>
      </Pressable>
    </KeyboardAvoidingView>
  );
}
