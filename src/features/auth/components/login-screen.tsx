import { AntDesign, Ionicons } from '@expo/vector-icons';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@shared/components';
import { ApiError } from '@shared/services/api';
import { cn } from '@shared/utils/cn';

import { useAuth } from '../hooks/use-auth';
import { useFcmToken } from '../hooks/use-fcm-token';
import { getRouteForAuthPhase } from '../utils/auth-routing';
import { getEmailError, getPasswordError } from '../utils/auth-validation';

const CANVAS_BG = '#212121';
const ACCENT = '#FF9A3E';
const FIELD_BG = '#292929';
const FIELD_BORDER = '#383838';
const TEXT_MUTED = '#98A2B3';
const TEXT_SOFT = '#667085';

function getSingleSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return getSingleSearchParam(value[0]);
  }

  return typeof value === 'string' ? value.trim() || null : null;
}

type DarkFieldProps = {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  error?: string | null;
  keyboardType?: 'default' | 'email-address';
  label: string;
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
  keyboardType = 'default',
  label,
  onChangeText,
  placeholder,
  secureTextEntry,
  trailing,
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
          secureTextEntry={secureTextEntry}
          value={value}
          className="flex-1 font-body text-[15px] text-white"
          style={{ letterSpacing: 0, paddingVertical: 0 }}
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

function SocialCta({
  disabled,
  icon,
  label,
  onPress,
}: {
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={cn(
        'h-14 flex-row items-center justify-center gap-3 rounded-[16px] border',
        disabled && 'opacity-50'
      )}
      style={{
        backgroundColor: FIELD_BG,
        borderColor: FIELD_BORDER,
        borderCurve: 'continuous',
      }}>
      {icon}
      <AppText variant="subtitle" className="text-[15px] text-white">
        {label}
      </AppText>
    </Pressable>
  );
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <View
      className="h-5 w-5 items-center justify-center rounded-[6px] border-2"
      style={{
        backgroundColor: checked ? ACCENT : 'transparent',
        borderColor: checked ? ACCENT : '#5A6074',
      }}>
      {checked ? <Ionicons color="#1A1208" name="checkmark" size={12} /> : null}
    </View>
  );
}

export function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { authPhase, isHydrated, login, session, signInWithGoogle, signInWithLinkedIn } =
    useAuth();
  const searchParams = useLocalSearchParams<{
    linkedin_error?: string | string[];
    linkedin_message?: string | string[];
  }>();
  const fcmToken = useFcmToken();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = React.useState(false);
  const [isLinkedInSubmitting, setIsLinkedInSubmitting] = React.useState(false);
  const linkedInErrorMessage = React.useMemo(
    () =>
      getSingleSearchParam(searchParams.linkedin_message) ??
      (getSingleSearchParam(searchParams.linkedin_error)
        ? 'LinkedIn sign-in failed. Please try again.'
        : null),
    [searchParams.linkedin_error, searchParams.linkedin_message]
  );
  const hasAppliedLinkedInCallback = React.useRef(false);

  React.useEffect(() => {
    if (!linkedInErrorMessage || hasAppliedLinkedInCallback.current) {
      return;
    }

    hasAppliedLinkedInCallback.current = true;
    setStatusMessage(linkedInErrorMessage);
    router.setParams({
      linkedin_error: undefined,
      linkedin_message: undefined,
    });
  }, [linkedInErrorMessage, router]);

  if (!isHydrated) {
    return null;
  }

  if (session) {
    return <Redirect href={getRouteForAuthPhase(authPhase)} />;
  }

  const handleLogin = async () => {
    const nextEmailError = getEmailError(email);
    const nextPasswordError = getPasswordError(password);

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setStatusMessage(null);

    if (nextEmailError || nextPasswordError || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login({
        email,
        password,
        fcm_token: fcmToken ?? '',
      });

      router.replace(getRouteForAuthPhase(result.session.authPhase));
    } catch (error: unknown) {
      if (error instanceof ApiError && error.payload) {
        const payload = error.payload as {
          message?: string;
          errors?: { email?: string[]; password?: string[] };
        };
        const fieldErrors = payload.errors;

        if (fieldErrors?.email?.[0]) setEmailError(fieldErrors.email[0]);
        if (fieldErrors?.password?.[0]) setPasswordError(fieldErrors.password[0]);
        if (!fieldErrors) {
          setStatusMessage(payload.message ?? error.message);
        }
      } else {
        setStatusMessage(
          error instanceof Error ? error.message : 'Login failed. Please try again.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isGoogleSubmitting || isLinkedInSubmitting || isSubmitting) {
      return;
    }

    setEmailError(null);
    setPasswordError(null);
    setStatusMessage(null);
    setIsGoogleSubmitting(true);

    try {
      const result = await signInWithGoogle({
        fcmToken,
      });
      router.replace(getRouteForAuthPhase(result.session.authPhase));
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Google Sign-In failed. Please try again.'
      );
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleLinkedInLogin = async () => {
    if (isLinkedInSubmitting || isGoogleSubmitting || isSubmitting) {
      return;
    }

    setEmailError(null);
    setPasswordError(null);
    setStatusMessage(null);
    setIsLinkedInSubmitting(true);

    try {
      const result = await signInWithLinkedIn({
        fcmToken,
      });
      router.replace(getRouteForAuthPhase(result.session.authPhase));
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'LinkedIn Sign-In failed. Please try again.'
      );
    } finally {
      setIsLinkedInSubmitting(false);
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
            justifyContent: 'space-between',
            paddingHorizontal: 24,
            paddingTop: 88,
            paddingBottom: Math.max(insets.bottom + 24, 40),
            gap: 32,
          }}
          keyboardShouldPersistTaps="handled">
          <View className="gap-8">
            <Animated.View
              entering={FadeInDown.delay(80).duration(360)}
              className="gap-2">
              <AppText
                variant="hero"
                className="text-[34px] leading-[40px]"
                style={{ color: ACCENT }}>
                Get Started now
              </AppText>
              <AppText className="text-[14px] leading-[20px] text-text-muted">
                Create an account or log in to continue.
              </AppText>
            </Animated.View>

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
              <DarkField
                autoCapitalize="none"
                autoCorrect={false}
                error={passwordError}
                label="Password"
                onChangeText={(value) => {
                  setPassword(value);
                  if (passwordError) setPasswordError(null);
                }}
                placeholder="Enter your password"
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

              <View className="flex-row items-center justify-between pt-1">
                <Pressable
                  className="flex-row items-center gap-2"
                  onPress={() => setRememberMe((current) => !current)}
                  hitSlop={8}>
                  <CheckBox checked={rememberMe} />
                  <AppText className="text-[13px] text-text-muted">
                    Remember me
                  </AppText>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/forgot-password')}>
                  <AppText
                    variant="bodyStrong"
                    className="text-[13px]"
                    style={{ color: ACCENT }}>
                    Forgot Password?
                  </AppText>
                </Pressable>
              </View>

              {Platform.OS !== 'web' ? (
                <>
                  <View className="flex-row items-center gap-3 py-1">
                    <View
                      className="h-[1px] flex-1"
                      style={{ backgroundColor: FIELD_BORDER }}
                    />
                    <AppText
                      className="text-[11px] uppercase text-text-soft"
                      style={{ letterSpacing: 1.2 }}>
                      or continue with
                    </AppText>
                    <View
                      className="h-[1px] flex-1"
                      style={{ backgroundColor: FIELD_BORDER }}
                    />
                  </View>
                  <SocialCta
                    disabled={isSubmitting || isGoogleSubmitting || isLinkedInSubmitting}
                    icon={
                      isGoogleSubmitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <AntDesign color="#FFFFFF" name="google" size={18} />
                      )
                    }
                    label="Sign in with Google"
                    onPress={handleGoogleLogin}
                  />
                  <SocialCta
                    disabled={isSubmitting || isGoogleSubmitting || isLinkedInSubmitting}
                    icon={
                      isLinkedInSubmitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Ionicons color="#FFFFFF" name="logo-linkedin" size={18} />
                      )
                    }
                    label="Sign in with LinkedIn"
                    onPress={handleLinkedInLogin}
                  />
                </>
              ) : null}
            </Animated.View>
          </View>

          <Animated.View entering={FadeIn.delay(220).duration(360)} className="gap-4">
            {statusMessage ? (
              <AppText align="center" selectable tone="danger">
                {statusMessage}
              </AppText>
            ) : null}

            <Pressable
              disabled={isSubmitting || isGoogleSubmitting || isLinkedInSubmitting}
              onPress={handleLogin}
              className={cn(
                'h-14 flex-row items-center justify-center gap-3 rounded-[18px]',
                (isSubmitting || isGoogleSubmitting || isLinkedInSubmitting) && 'opacity-50'
              )}
              style={{ backgroundColor: ACCENT, borderCurve: 'continuous' }}
              android_ripple={{ color: 'rgba(0,0,0,0.12)' }}>
              <AppText variant="subtitle" className="text-[16px] text-[#1A1208]">
                {isSubmitting ? 'Signing in...' : 'Log In'}
              </AppText>
              <AntDesign color="#1A1208" name="arrow-right" size={18} />
            </Pressable>

            <View className="flex-row items-center justify-center gap-2">
              <AppText className="text-[14px] text-text-muted">
                Don&apos;t have an account?
              </AppText>
              <Pressable onPress={() => router.push('/register')}>
                <AppText
                  variant="bodyStrong"
                  className="text-[14px]"
                  style={{ color: ACCENT }}>
                  Sign Up
                </AppText>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </Pressable>
    </KeyboardAvoidingView>
  );
}
