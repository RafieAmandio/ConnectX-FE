import { AntDesign, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Redirect, Stack, useRouter } from 'expo-router';
import React from 'react';
import {
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
import { getRouteForAuthPhase } from '../utils/auth-routing';
import { getEmailError, getPasswordError } from '../utils/auth-validation';

const CONNECTX_LOGO = require('../../../../assets/images/connectx-logo.png');

const CANVAS_BG = '#212121';
const HEADER_BG = '#232323';
const ACCENT = '#FF9A3E';
const FIELD_BG = '#292929';
const FIELD_BORDER = '#383838';
const TEXT_MUTED = '#98A2B3';
const TEXT_SOFT = '#667085';

type DarkFieldProps = {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  error?: string | null;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  keyboardType?: 'default' | 'email-address';
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  trailing?: React.ReactNode;
  value: string;
};

function DarkField({
  autoCapitalize = 'sentences',
  autoCorrect = true,
  error,
  icon,
  keyboardType = 'default',
  onChangeText,
  placeholder,
  secureTextEntry,
  trailing,
  value,
}: DarkFieldProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const borderColor = error ? '#F97066' : isFocused ? ACCENT : FIELD_BORDER;

  return (
    <View className="gap-1.5">
      <View
        className="flex-row items-center gap-3 rounded-[16px] border px-4"
        style={{
          backgroundColor: FIELD_BG,
          borderColor,
          borderCurve: 'continuous',
          borderWidth: isFocused || error ? 1.5 : 1,
          height: 56,
        }}>
        <Ionicons color={isFocused ? ACCENT : TEXT_MUTED} name={icon} size={18} />
        <TextInput
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          keyboardType={keyboardType}
          onBlur={() => setIsFocused(false)}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          placeholderTextColor={TEXT_SOFT}
          secureTextEntry={secureTextEntry}
          value={value}
          className="flex-1 font-body text-[15px] text-white"
          style={{ paddingVertical: 0 }}
        />
        {trailing}
      </View>
      {error ? (
        <AppText className="px-1 text-[12px]" tone="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

function AuthChrome() {
  return (
    <View
      className="flex-row items-center gap-2 px-5 pt-16 pb-5"
      style={{ backgroundColor: HEADER_BG }}>
      <View
        className="h-8 w-8 items-center justify-center overflow-hidden rounded-[9px] bg-white"
        style={{ borderCurve: 'continuous' }}>
        <Image
          source={CONNECTX_LOGO}
          style={{ width: 22, height: 22 }}
          contentFit="contain"
        />
      </View>
      <AppText variant="bodyStrong" className="text-white text-[13px]">
        ConnectX
      </AppText>
      <View
        className="rounded-full border px-2 py-[4px]"
        style={{ borderColor: ACCENT }}>
        <AppText
          variant="label"
          className="text-[9px]"
          style={{ color: ACCENT, letterSpacing: 0.5 }}>
          V1 FREE
        </AppText>
      </View>
    </View>
  );
}

function PrimaryCta({
  disabled,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={cn(
        'h-14 flex-row items-center justify-center gap-3 rounded-[18px]',
        disabled && 'opacity-50'
      )}
      style={{ backgroundColor: ACCENT, borderCurve: 'continuous' }}
      android_ripple={{ color: 'rgba(0,0,0,0.12)' }}>
      <AppText variant="subtitle" className="text-[16px] text-[#1A1208]">
        {label}
      </AppText>
      <AntDesign color="#1A1208" name="arrow-right" size={18} />
    </Pressable>
  );
}

export function RegisterScreen() {
  const router = useRouter();
  const { authPhase, isHydrated, register, session } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [passwordConfirmation, setPasswordConfirmation] = React.useState('');
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [passwordConfirmationError, setPasswordConfirmationError] =
    React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  if (!isHydrated) {
    return null;
  }

  if (session) {
    return <Redirect href={getRouteForAuthPhase(authPhase)} />;
  }

  const handleRegister = async () => {
    const nextEmailError = getEmailError(email);
    const nextPasswordError = getPasswordError(password);
    const nextPasswordConfirmationError =
      passwordConfirmation !== password
        ? 'Passwords must match.'
        : getPasswordError(passwordConfirmation);

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setPasswordConfirmationError(nextPasswordConfirmationError);
    setStatusMessage(null);

    if (nextEmailError || nextPasswordError || nextPasswordConfirmationError) {
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        email,
        password,
        password_confirmation: passwordConfirmation,
        entity_type: null,
        fcm_token: '',
      });
      router.replace('/verify-email');
    } catch (error: unknown) {
      if (error instanceof ApiError && error.payload) {
        const payload = error.payload as {
          message?: string;
          errors?: {
            email?: string[];
            password?: string[];
            password_confirmation?: string[];
          };
        };
        const fieldErrors = payload.errors;

        if (fieldErrors?.email?.[0]) setEmailError(fieldErrors.email[0]);
        if (fieldErrors?.password?.[0]) setPasswordError(fieldErrors.password[0]);
        if (fieldErrors?.password_confirmation?.[0]) {
          setPasswordConfirmationError(fieldErrors.password_confirmation[0]);
        }

        if (!fieldErrors) {
          setStatusMessage(payload.message ?? error.message);
        }
      } else {
        setStatusMessage(
          error instanceof Error ? error.message : 'Could not create your account. Try again.'
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
      <View className="flex-1" style={{ backgroundColor: CANVAS_BG }}>
        <AuthChrome />
        <Pressable className="flex-1" onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 20,
              paddingTop: 24,
              paddingBottom: 48,
              gap: 28,
            }}
            keyboardShouldPersistTaps="handled">
            <Animated.View
              entering={FadeInDown.duration(360)}
              className="gap-2">
              <AppText
                variant="hero"
                className="text-[30px] leading-[36px] text-white">
                Create your account
              </AppText>
              <AppText className="text-[15px] leading-[22px] text-text-muted">
                Join ConnectX and start meeting founders, teammates, and startups.
              </AppText>
            </Animated.View>

            <Animated.View
              entering={FadeInUp.delay(80).duration(360)}
              className="gap-4">
              <DarkField
                autoCapitalize="none"
                autoCorrect={false}
                error={emailError}
                icon="mail-outline"
                keyboardType="email-address"
                onChangeText={(value) => {
                  setEmail(value);
                  if (emailError) setEmailError(null);
                }}
                placeholder="you@company.com"
                value={email}
              />
              <DarkField
                autoCapitalize="none"
                autoCorrect={false}
                error={passwordError}
                icon="lock-closed-outline"
                onChangeText={(value) => {
                  setPassword(value);
                  if (passwordError) setPasswordError(null);
                }}
                placeholder="Use at least 8 characters"
                secureTextEntry={!showPassword}
                trailing={
                  <Pressable
                    onPress={() => setShowPassword((current) => !current)}
                    hitSlop={8}>
                    <Ionicons
                      color={TEXT_MUTED}
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                    />
                  </Pressable>
                }
                value={password}
              />
              <DarkField
                autoCapitalize="none"
                autoCorrect={false}
                error={passwordConfirmationError}
                icon="shield-checkmark-outline"
                onChangeText={(value) => {
                  setPasswordConfirmation(value);
                  if (passwordConfirmationError) setPasswordConfirmationError(null);
                }}
                placeholder="Repeat your password"
                secureTextEntry={!showConfirm}
                trailing={
                  <Pressable
                    onPress={() => setShowConfirm((current) => !current)}
                    hitSlop={8}>
                    <Ionicons
                      color={TEXT_MUTED}
                      name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                    />
                  </Pressable>
                }
                value={passwordConfirmation}
              />
            </Animated.View>

            {statusMessage ? (
              <AppText align="center" selectable tone="danger">
                {statusMessage}
              </AppText>
            ) : null}

            <Animated.View
              entering={FadeIn.delay(160).duration(360)}
              className="gap-3">
              <PrimaryCta
                disabled={isSubmitting}
                label={isSubmitting ? 'Creating account...' : 'Create account'}
                onPress={handleRegister}
              />
            </Animated.View>

            <View className="flex-row items-center justify-center gap-2 pt-2">
              <AppText className="text-[14px] text-text-muted">
                Already have an account?
              </AppText>
              <Pressable onPress={() => router.replace('/login')}>
                <AppText
                  variant="bodyStrong"
                  className="text-[14px]"
                  style={{ color: ACCENT }}>
                  Sign in
                </AppText>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
