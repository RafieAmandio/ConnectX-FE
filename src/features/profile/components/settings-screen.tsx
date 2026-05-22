import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@features/auth';
import { REVENUECAT_OFFERING_IDS, useRevenueCat } from '@features/revenuecat';
import { AppCard, AppText } from '@shared/components';

import {
  useActivateMyAccount,
  usePauseMyAccount,
  useRequestMyAccountDeletion,
} from '../hooks/use-profile';

const SETTINGS_LINKS = {
  privacy: 'https://getconnectx.app/privacy',
  terms: 'https://getconnectx.app/terms',
} as const;

const palette = {
  accent: '#FF9A3E',
  accentSoft: '#2A2117',
  canvas: '#262626',
  danger: '#FF5A67',
  dangerSoft: '#301016',
  field: '#292929',
  border: '#383838',
  borderSoft: 'rgba(255, 255, 255, 0.08)',
  success: '#22C55E',
  successSoft: '#0F2318',
  text: '#FFFFFF',
  textMuted: '#98A2B3',
} as const;

type SettingsRowTone = 'default' | 'accent' | 'danger' | 'success';

function getToneColors(tone: SettingsRowTone) {
  switch (tone) {
    case 'accent':
      return {
        backgroundColor: palette.accentSoft,
        borderColor: 'rgba(255, 154, 62, 0.28)',
        iconColor: palette.accent,
      };
    case 'danger':
      return {
        backgroundColor: palette.dangerSoft,
        borderColor: 'rgba(255, 90, 103, 0.28)',
        iconColor: palette.danger,
      };
    case 'success':
      return {
        backgroundColor: palette.successSoft,
        borderColor: 'rgba(34, 197, 94, 0.26)',
        iconColor: palette.success,
      };
    default:
      return {
        backgroundColor: palette.field,
        borderColor: palette.border,
        iconColor: palette.textMuted,
      };
  }
}

function Section({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <View className="gap-3">
      <AppText className="px-1 text-[11px] tracking-[1px]" tone="muted" variant="label">
        {title}
      </AppText>
      <AppCard
        className="gap-3 rounded-[24px] px-3 py-3"
        style={{ backgroundColor: palette.field, borderColor: palette.borderSoft }}
      >
        {children}
      </AppCard>
    </View>
  );
}

function SettingsRow({
  description,
  disabled,
  icon,
  isLoading,
  onPress,
  title,
  tone = 'default',
  value,
}: {
  description?: string;
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  isLoading?: boolean;
  onPress: () => void;
  title: string;
  tone?: SettingsRowTone;
  value?: string;
}) {
  const toneColors = getToneColors(tone);
  const isDisabled = disabled || isLoading;

  return (
    <Pressable
      className="min-h-[70px] flex-row items-center gap-3 rounded-[18px] border px-3.5 py-3 active:opacity-80"
      disabled={isDisabled}
      onPress={onPress}
      style={{
        backgroundColor: toneColors.backgroundColor,
        borderColor: toneColors.borderColor,
        opacity: isDisabled ? 0.58 : 1,
      }}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.18)' }}
      >
        <Ionicons color={toneColors.iconColor} name={icon} size={19} />
      </View>

      <View className="min-w-0 flex-1 gap-1">
        <AppText className="text-[15px] leading-5" numberOfLines={1} variant="bodyStrong">
          {title}
        </AppText>
        {description ? (
          <AppText className="text-[13px] leading-5" numberOfLines={2} tone="muted">
            {description}
          </AppText>
        ) : null}
      </View>

      <View className="min-w-[36px] items-end">
        {isLoading ? (
          <ActivityIndicator color={toneColors.iconColor} size="small" />
        ) : value ? (
          <AppText
            align="right"
            className="max-w-[96px] text-[12px] leading-4"
            numberOfLines={2}
            style={{ color: toneColors.iconColor }}
            variant="bodyStrong"
          >
            {value}
          </AppText>
        ) : (
          <Ionicons color="rgba(255,255,255,0.45)" name="chevron-forward" size={17} />
        )}
      </View>
    </Pressable>
  );
}

export function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refreshSession, session, signOut } = useAuth();
  const {
    isConnectXProActive,
    isLoading: isRevenueCatLoading,
    managementUrl,
    presentCustomerCenter,
    presentPaywallForOffering,
    supported: isRevenueCatSupported,
  } = useRevenueCat();
  const pauseAccountMutation = usePauseMyAccount();
  const activateAccountMutation = useActivateMyAccount();
  const deleteAccountMutation = useRequestMyAccountDeletion();
  const sessionPremium = Boolean(session?.premium?.isPremium);
  const isProfileActive = session?.user?.is_active !== false;
  const isPremiumActive = isConnectXProActive || sessionPremium;
  const isProfileStatusPending = pauseAccountMutation.isPending || activateAccountMutation.isPending;
  const isAccountActionPending = isProfileStatusPending || deleteAccountMutation.isPending;
  const subscriptionDescription = isPremiumActive
    ? 'Your premium access is active for this account.'
    : 'Review available ConnectX Pro plans and restore purchases.';

  async function openExternalUrl(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Link unavailable', 'This link could not be opened right now.');
    }
  }

  async function handleSubscriptionPress() {
    try {
      if (isPremiumActive) {
        if (isRevenueCatSupported) {
          await presentCustomerCenter();
          return;
        }

        if (managementUrl) {
          await Linking.openURL(managementUrl);
          return;
        }

        Alert.alert('Subscription unavailable', 'Subscription management is not available on this build.');
        return;
      }

      if (!isRevenueCatSupported) {
        Alert.alert('Subscription unavailable', 'Premium checkout is not available on this build.');
        return;
      }

      await presentPaywallForOffering(REVENUECAT_OFFERING_IDS.connectXPro);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to open subscription settings.';
      Alert.alert('Subscription unavailable', message);
    }
  }

  async function pauseAccount() {
    try {
      const response = await pauseAccountMutation.mutateAsync();
      await refreshSession();
      Alert.alert('Profile paused', response.message || 'Your profile has been paused.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to pause your profile.';
      Alert.alert('Pause failed', message);
    }
  }

  async function activateAccount() {
    try {
      const response = await activateAccountMutation.mutateAsync();
      await refreshSession();
      Alert.alert('Profile activated', response.message || 'Your profile is active again.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to activate your profile.';
      Alert.alert('Activation failed', message);
    }
  }

  function confirmPauseAccount() {
    Alert.alert(
      'Pause profile?',
      'Your profile will be hidden or deactivated.',
      [
        { style: 'cancel', text: 'Cancel' },
        {
          onPress: () => {
            void pauseAccount();
          },
          text: 'Pause',
        },
      ]
    );
  }

  function confirmActivateAccount() {
    Alert.alert(
      'Activate profile?',
      'Your profile will become visible again according to backend account rules.',
      [
        { style: 'cancel', text: 'Cancel' },
        {
          onPress: () => {
            void activateAccount();
          },
          text: 'Activate',
        },
      ]
    );
  }

  async function requestAccountDeletion() {
    try {
      const response = await deleteAccountMutation.mutateAsync();

      Alert.alert(
        'Deletion requested',
        response.message || 'Your account deletion request has been scheduled.',
        [
          {
            onPress: () => {
              void signOut();
            },
            text: 'OK',
          },
        ]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to request account deletion.';
      Alert.alert('Delete failed', message);
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete account?',
      'This will request account deletion and sign you out after the request is accepted.',
      [
        { style: 'cancel', text: 'Cancel' },
        {
          onPress: () => {
            void requestAccountDeletion();
          },
          style: 'destructive',
          text: 'Request deletion',
        },
      ]
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: 'Settings' }} />
      <View className="flex-1" style={{ backgroundColor: palette.canvas }}>
        <View
          className="flex-row items-center justify-between border-b px-5 pb-4"
          style={{
            backgroundColor: palette.canvas,
            borderBottomColor: palette.border,
            paddingTop: Math.max(insets.top + 14, 24),
          }}
        >
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full border active:opacity-80"
            hitSlop={12}
            onPress={() => router.back()}
            style={{ backgroundColor: palette.field, borderColor: palette.border }}
          >
            <Ionicons color={palette.text} name="chevron-back" size={22} />
          </Pressable>

          <View className="min-w-0 flex-1 px-4">
            <AppText className="text-[21px]" numberOfLines={1} variant="title">
              Settings
            </AppText>
            <AppText className="text-[13px]" numberOfLines={1} tone="muted">
              Account, profile, and subscription controls.
            </AppText>
          </View>

          <View className="h-11 w-11 items-center justify-center">
            {isAccountActionPending ? (
              <ActivityIndicator color={palette.accent} size="small" />
            ) : null}
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            gap: 20,
            paddingBottom: Math.max(insets.bottom + 28, 36),
            paddingHorizontal: 16,
            paddingTop: 18,
          }}
          contentInsetAdjustmentBehavior="automatic"
        >
          <Section title="Legal">
            <SettingsRow
              description="Read how ConnectX handles your data."
              icon="shield-checkmark-outline"
              onPress={() => {
                void openExternalUrl(SETTINGS_LINKS.privacy);
              }}
              title="Privacy Policy"
            />
            <SettingsRow
              description="Review the terms that govern ConnectX usage."
              icon="document-text-outline"
              onPress={() => {
                void openExternalUrl(SETTINGS_LINKS.terms);
              }}
              title="Terms & Policy"
            />
          </Section>

          <Section title="Subscription">
            <SettingsRow
              description={subscriptionDescription}
              icon={isPremiumActive ? 'sparkles-outline' : 'card-outline'}
              isLoading={isRevenueCatLoading}
              onPress={() => {
                void handleSubscriptionPress();
              }}
              title="ConnectX Premium"
              tone={isPremiumActive ? 'success' : 'accent'}
              value={isPremiumActive ? 'Premium active' : 'Free'}
            />
          </Section>

          <Section title="Profile">
            <SettingsRow
              description={
                isProfileActive
                  ? 'Hide or deactivate your profile without signing out.'
                  : 'Make your profile active and visible again.'
              }
              disabled={isAccountActionPending}
              icon={isProfileActive ? 'pause-circle-outline' : 'play-circle-outline'}
              isLoading={isProfileStatusPending}
              onPress={isProfileActive ? confirmPauseAccount : confirmActivateAccount}
              title={isProfileActive ? 'Pause profile' : 'Activate profile'}
              tone={isProfileActive ? 'accent' : 'success'}
            />
            <SettingsRow
              description="Request scheduled account deletion from ConnectX."
              disabled={isAccountActionPending}
              icon="trash-outline"
              isLoading={deleteAccountMutation.isPending}
              onPress={confirmDeleteAccount}
              title="Delete account"
              tone="danger"
            />
          </Section>
        </ScrollView>
      </View>
    </>
  );
}
