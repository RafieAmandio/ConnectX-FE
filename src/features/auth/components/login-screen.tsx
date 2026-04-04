import { Redirect, Stack, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';

import { AppButton, AppCard, AppInput, AppPill, AppText } from '@shared/components';

import { useAuth } from '../hooks/use-auth';

const trustPoints = [
  'Single hero screen for mock onboarding',
  'Google and phone both route into the same protected flow',
  'No backend yet, just visual and navigation behavior',
] as const;

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 13);

  if (!digits) {
    return '';
  }

  if (digits.length <= 2) {
    return `+${digits}`;
  }

  if (digits.length <= 5) {
    return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
  }

  if (digits.length <= 9) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  }

  return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)} ${digits.slice(9)}`;
}

export function LoginScreen() {
  const router = useRouter();
  const { isHydrated, session, signInWithGoogle, signInWithPhone } = useAuth();
  const [phoneNumber, setPhoneNumber] = React.useState('+62 ');

  if (!isHydrated) {
    return null;
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: 'Login' }} />
      <ScrollView
        className="flex-1 bg-canvas"
        contentContainerClassName="gap-6 px-5 pt-12 pb-24"
        contentInsetAdjustmentBehavior="automatic">
        <View className="gap-4">
          <AppPill className="self-start" label="Mock Auth Flow" tone="accent" />
          <View className="gap-3">
            <AppText variant="display">Welcome to ConnectX</AppText>
            <AppText tone="muted">
              This mock login flow uses the design system we just created, so future auth work can
              plug into the same visual language.
            </AppText>
          </View>
        </View>

        <AppCard className="gap-5 overflow-hidden p-0">
          <View className="gap-4 border-b border-border px-5 pt-5 pb-4">
            <AppText tone="accent" variant="label">
              Login Methods
            </AppText>
            <AppText variant="hero">Choose the quickest way to enter the app.</AppText>
            <AppText tone="muted">
              Both buttons are mock actions for now. They set local in-memory state and continue to
              the protected experience.
            </AppText>
          </View>

          <View className="gap-4 px-5 pb-5">
            <AppButton
              detail="Mock OAuth sign-in"
              label="Continue with Google"
              onPress={async () => {
                await signInWithGoogle();
                router.replace('/(tabs)');
              }}
              size="lg"
            />

            <AppCard tone="muted" className="gap-4">
              <View className="gap-1">
                <AppText variant="subtitle">Continue with phone number</AppText>
                <AppText tone="muted">
                  Enter any valid-looking number. This is only a mock UI for now, so no SMS is sent.
                </AppText>
              </View>

              <AppInput
                keyboardType="phone-pad"
                label="Phone Number"
                onChangeText={(value) => {
                  setPhoneNumber(formatPhoneNumber(value));
                }}
                placeholder="+62 812 3456 7890"
                value={phoneNumber}
              />

              <AppButton
                detail="Mock OTP entry"
                disabled={phoneNumber.replace(/\D/g, '').length < 8}
                label="Continue with Phone"
                onPress={async () => {
                  await signInWithPhone(phoneNumber);
                  router.replace('/(tabs)');
                }}
                variant="secondary"
              />
            </AppCard>
          </View>
        </AppCard>

        <View className="gap-3">
          {trustPoints.map((point) => (
            <View key={point} className="rounded-[24px] border border-border bg-surface px-4 py-4">
              <AppText tone="muted">{point}</AppText>
            </View>
          ))}
        </View>
      </ScrollView>
    </>
  );
}
