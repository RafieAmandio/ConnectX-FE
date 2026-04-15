import { AntDesign } from '@expo/vector-icons';
import { Redirect, Stack, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Keyboard, Pressable, TouchableOpacity, View } from 'react-native';

import { AppButton, AppInput, AppText } from '@shared/components';
import { ApiError } from '@shared/services/api';
import { cn } from '@shared/utils/cn';

import { useAuth } from '../hooks/use-auth';
import { useFcmToken } from '../hooks/use-fcm-token';
import { getRouteForAuthPhase } from '../utils/auth-routing';
import { getEmailError, getPasswordError } from '../utils/auth-validation';

export function LoginScreen() {
  const router = useRouter();
  const { authPhase, isHydrated, login, session, signInWithGoogle, signInWithLinkedIn } = useAuth();
  const fcmToken = useFcmToken();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [statusTone, setStatusTone] = React.useState<'danger' | 'signal'>('danger');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = React.useState(false);
  const [isLinkedInSubmitting, setIsLinkedInSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (fcmToken) {
      console.log('FCM token obtained:', fcmToken);
    }
  }, [fcmToken]);

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

    if (nextEmailError || nextPasswordError || isSubmitting || isGoogleSubmitting || isLinkedInSubmitting) {
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
          errors?: {
            email?: string[];
            password?: string[];
          };
        };
        const fieldErrors = payload.errors;

        if (fieldErrors?.email?.[0]) {
          setEmailError(fieldErrors.email[0]);
        }
        if (fieldErrors?.password?.[0]) {
          setPasswordError(fieldErrors.password[0]);
        }
        if (!fieldErrors) {
          setStatusTone('danger');
          setStatusMessage(payload.message ?? error.message);
        }
      } else {
        setStatusTone('danger');
        setStatusMessage(
          error instanceof Error ? error.message : 'Login gagal. Silakan coba lagi.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isGoogleSubmitting || isSubmitting || isLinkedInSubmitting) {
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
      console.info('Google OAuth backend login successful.', {
        authPhase: result.session.authPhase,
        email: result.session.email,
        nextStep: result.response.next_step ?? null,
      });

      router.replace(getRouteForAuthPhase(result.session.authPhase));
    } catch (error) {
      setStatusTone('danger');

      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Google Sign-In failed. Please try again.'
      );
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleLinkedInLogin = async () => {
    if (isLinkedInSubmitting || isSubmitting || isGoogleSubmitting) {
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

      console.info('LinkedIn OAuth backend login successful.', {
        authPhase: result.session.authPhase,
        email: result.session.email,
        nextStep: result.response.next_step ?? null,
      });

      router.replace(getRouteForAuthPhase(result.session.authPhase));
    } catch (error) {
      setStatusTone('danger');
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'LinkedIn Sign-In failed. Please try again.'
      );
    } finally {
      setIsLinkedInSubmitting(false);
    }
  };

  return (
    <View
      className="flex-1 bg-canvas"
    >
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable className="flex-1" onPress={Keyboard.dismiss} accessible={false}>
        <View className="flex-1 px-5 pt-20 pb-8">

          <View className="flex-1 pt-8">
            <View className="gap-2 shrink-0">
              <AppText variant="hero" className="text-[32px] font-bold tracking-tight">
                Welcome back
              </AppText>
              <AppText tone="muted" className="text-base">
                Sign in to continue
              </AppText>
            </View>

            <View className="mt-12 gap-6 shrink-0">
              <AppInput
                autoCapitalize="none"
                autoCorrect={false}
                error={emailError ?? undefined}
                keyboardType="email-address"
                onChangeText={(value) => {
                  setEmail(value);
                  if (emailError) setEmailError(null);
                }}
                placeholder="Email address"
                value={email}
                className="bg-transparent border-0 border-b border-border rounded-none px-0 text-lg h-14 min-h-14 font-medium"
                placeholderTextColor="#64748B"
              />

              <View>
                <AppInput
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect={false}
                  error={passwordError ?? undefined}
                  importantForAutofill="no"
                  onChangeText={(value) => {
                    setPassword(value);
                    if (passwordError) setPasswordError(null);
                  }}
                  passwordRules={null}
                  placeholder="Password"
                  secureTextEntry={!showPassword}
                  textContentType="none"
                  value={password}
                  className="bg-transparent border-0 border-b border-border rounded-none px-0 text-lg h-14 min-h-14 font-medium"
                  placeholderTextColor="#64748B"
                />
                <TouchableOpacity
                  className="absolute right-0 top-3 p-2"
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <AppText tone="muted" variant="label">{showPassword ? 'HIDE' : 'SHOW'}</AppText>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                className="self-end"
                onPress={() => {
                  setStatusTone('signal');
                  setStatusMessage('Forgot password flow is not connected yet.');
                }}>
                <AppText className="text-[#0066FF] font-medium">
                  Forgot password?
                </AppText>
              </TouchableOpacity>
            </View>

            {statusMessage && (
              <AppText tone={statusTone} className="mt-4">{statusMessage}</AppText>
            )}

            <View className="flex-1 justify-end shrink-0 pt-8 gap-4">
              <AppButton
                disabled={isSubmitting || isGoogleSubmitting || isLinkedInSubmitting}
                label={isSubmitting ? 'Signing in...' : 'Sign In'}
                onPress={handleLogin}
                size="lg"
                className="w-full bg-[#0066FF] rounded-[16px] border-none"
              />

              {process.env.EXPO_OS !== 'web' && (
                <>
                  <View className="flex-row items-center gap-4 py-2 opacity-50">
                    <View className="h-[1px] flex-1 bg-border-strong" />
                    <AppText tone="muted" variant="label" className="tracking-widest">OR</AppText>
                    <View className="h-[1px] flex-1 bg-border-strong" />
                  </View>

                  <TouchableOpacity
                    disabled={isSubmitting || isGoogleSubmitting || isLinkedInSubmitting}
                    onPress={handleGoogleLogin}
                    className={cn(
                      "flex-row items-center justify-center gap-3 w-full h-[56px] rounded-[16px]",
                      "border border-border-strong bg-surface",
                      (isSubmitting || isGoogleSubmitting || isLinkedInSubmitting) && "opacity-50"
                    )}
                  >
                    {isGoogleSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <AntDesign color="#FFFFFF" name="google" size={20} />
                        <AppText variant="bodyStrong">Continue with Google</AppText>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={isSubmitting || isGoogleSubmitting || isLinkedInSubmitting}
                    onPress={handleLinkedInLogin}
                    className={cn(
                      "flex-row items-center justify-center gap-3 w-full h-[56px] rounded-[16px]",
                      "border border-border-strong bg-surface",
                      (isSubmitting || isGoogleSubmitting || isLinkedInSubmitting) && "opacity-50"
                    )}
                  >
                    {isLinkedInSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <AntDesign color="#0A66C2" name="linkedin" size={20} />
                        <AppText variant="bodyStrong">Continue with LinkedIn</AppText>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

              <View className="flex-row items-center justify-center gap-2 mt-4">
                <AppText tone="muted">Don&apos;t have an account?</AppText>
                <TouchableOpacity onPress={() => router.push('/register')}>
                  <AppText className="text-[#0066FF] font-medium">Sign up</AppText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
}
