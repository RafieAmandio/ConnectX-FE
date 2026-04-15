import { Redirect, Stack, useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { AppButton, AppInput, AppText } from '@shared/components';
import { ApiError } from '@shared/services/api';

import { useAuth } from '../hooks/use-auth';
import { useFcmToken } from '../hooks/use-fcm-token';
import { getRouteForAuthPhase } from '../utils/auth-routing';
import { getEmailError, getPasswordError } from '../utils/auth-validation';
import { AuthShell } from './auth-shell';



export function RegisterScreen() {
  const router = useRouter();
  const { authPhase, isHydrated, register, session } = useAuth();
  const fcmToken = useFcmToken();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [passwordConfirmation, setPasswordConfirmation] = React.useState('');
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [passwordConfirmationError, setPasswordConfirmationError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (!isHydrated) {
    return null;
  }

  if (session) {
    return <Redirect href={getRouteForAuthPhase(authPhase)} />;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: 'Register' }} />
      <AuthShell
        pill="Create Account"
        title="Buat akun ConnectX">
        <View className="gap-4">
          <View className="gap-2">
            <AppText variant="title">Daftar Akun</AppText>
            <AppText tone="muted">
              Masukkan email dan password untuk membuat akun baru.
            </AppText>
          </View>

          <AppInput
            autoCapitalize="none"
            autoCorrect={false}
            error={emailError ?? undefined}
            keyboardType="email-address"
            label="Email"
            onChangeText={(value) => {
              setEmail(value);

              if (emailError) {
                setEmailError(null);
              }
            }}
            placeholder="you@company.com"
            value={email}
          />

          <AppInput
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect={false}
            error={passwordError ?? undefined}
            importantForAutofill="no"
            label="Password"
            onChangeText={(value) => {
              setPassword(value);

              if (passwordError) {
                setPasswordError(null);
              }
            }}
            passwordRules={null}
            placeholder="Use at least 8 characters"
            secureTextEntry
            textContentType="oneTimeCode"
            value={password}
          />

          <AppInput
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect={false}
            error={passwordConfirmationError ?? undefined}
            importantForAutofill="no"
            label="Confirm Password"
            onChangeText={(value) => {
              setPasswordConfirmation(value);

              if (passwordConfirmationError) {
                setPasswordConfirmationError(null);
              }
            }}
            passwordRules={null}
            placeholder="Repeat your password"
            secureTextEntry
            textContentType="oneTimeCode"
            value={passwordConfirmation}
          />

          <AppButton
            disabled={isSubmitting}
            label={isSubmitting ? 'Membuat akun...' : 'Buat Akun'}
            onPress={async () => {
              const nextEmailError = getEmailError(email);
              const nextPasswordError = getPasswordError(password);
              const nextPasswordConfirmationError =
                passwordConfirmation !== password ? 'Passwords must match.' : getPasswordError(passwordConfirmation);

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
                  fcm_token: fcmToken ?? '',
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

                  if (fieldErrors?.email?.[0]) {
                    setEmailError(fieldErrors.email[0]);
                  }
                  if (fieldErrors?.password?.[0]) {
                    setPasswordError(fieldErrors.password[0]);
                  }
                  if (fieldErrors?.password_confirmation?.[0]) {
                    setPasswordConfirmationError(fieldErrors.password_confirmation[0]);
                  }

                  if (!fieldErrors) {
                    setStatusMessage(payload.message ?? error.message);
                  }
                } else {
                  setStatusMessage(
                    error instanceof Error ? error.message : 'Gagal membuat akun. Silakan coba lagi.'
                  );
                }
              } finally {
                setIsSubmitting(false);
              }
            }}
            size="lg"
          />

          {statusMessage ? (
            <AppText selectable tone="signal">
              {statusMessage}
            </AppText>
          ) : null}

          <AppButton
            label="Kembali ke Login"
            onPress={() => {
              router.replace('/login');
            }}
            variant="ghost"
          />
        </View>
      </AuthShell>
    </>
  );
}
