import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Switch,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@features/auth';
import { REVENUECAT_OFFERING_IDS, useRevenueCat } from '@features/revenuecat';
import { AppCard, AppText } from '@shared/components';
import { LOCALE_LABELS, useLocale, useTranslation, type AppLocale } from '@shared/localization';

import {
  useActivateMyAccount,
  usePauseMyAccount,
  useRequestMyAccountDeletion,
} from '../hooks/use-profile';
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from '../hooks/use-settings';
import type { SupportTicketType } from '../types/settings.types';
import { ChangeAccountContactModal } from './change-account-contact-modal';
import { ChangePasswordModal } from './change-password-modal';
import { SupportTicketModal } from './support-ticket-modal';

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

function NotificationToggleRow({
  description,
  enabled,
  icon,
  isUpdating,
  onToggle,
  title,
}: {
  description: string;
  enabled: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  isUpdating: boolean;
  onToggle: (value: boolean) => void;
  title: string;
}) {
  const toneColors = getToneColors('default');

  return (
    <View
      className="min-h-[70px] flex-row items-center gap-3 rounded-[18px] border px-3.5 py-3"
      style={{
        backgroundColor: toneColors.backgroundColor,
        borderColor: toneColors.borderColor,
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
        <AppText className="text-[13px] leading-5" numberOfLines={2} tone="muted">
          {description}
        </AppText>
      </View>

      <View className="min-w-[36px] items-end">
        {isUpdating ? (
          <ActivityIndicator color={palette.accent} size="small" />
        ) : (
          <Switch
            onValueChange={onToggle}
            thumbColor={palette.text}
            trackColor={{ false: palette.border, true: palette.accent }}
            value={enabled}
          />
        )}
      </View>
    </View>
  );
}

export function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refreshSession, session, signOut } = useAuth();
  const { locale, localeLabel, setLocale } = useLocale();
  const t = useTranslation();

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
  const notificationSettingsQuery = useNotificationSettings();
  const updateNotificationsMutation = useUpdateNotificationSettings();
  const [supportTicketType, setSupportTicketType] = React.useState<SupportTicketType | null>(null);
  const [accountContactChange, setAccountContactChange] = React.useState<'email' | 'whatsapp' | null>(null);
  const [isChangePasswordVisible, setIsChangePasswordVisible] = React.useState(false);
  const notificationData = notificationSettingsQuery.data?.data;
  const sessionPremium = Boolean(session?.premium?.isPremium);
  const isProfileActive = session?.user?.is_active !== false;
  const isPremiumActive = isConnectXProActive || sessionPremium;
  const isProfileStatusPending = pauseAccountMutation.isPending || activateAccountMutation.isPending;
  const isAccountActionPending = isProfileStatusPending || deleteAccountMutation.isPending;
  const subscriptionDescription = isPremiumActive
    ? t('settings.subscriptionActiveDescription')
    : t('settings.subscriptionInactiveDescription');

  async function openExternalUrl(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('settings.linkUnavailableTitle'), t('settings.linkUnavailableMessage'));
    }
  }

  function selectLanguage(nextLocale: AppLocale) {
    if (nextLocale === locale) {
      return;
    }

    void setLocale(nextLocale);
  }

  function openLanguageSelector() {
    Alert.alert(t('settings.language.alertTitle'), t('settings.language.alertMessage'), [
      {
        onPress: () => selectLanguage('en'),
        text: LOCALE_LABELS.en,
      },
      {
        onPress: () => selectLanguage('id'),
        text: LOCALE_LABELS.id,
      },
      {
        style: 'cancel',
        text: t('settings.language.cancel'),
      },
    ]);
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

        Alert.alert(t('settings.subscriptionUnavailableTitle'), t('settings.subscriptionManagementUnavailable'));
        return;
      }

      if (!isRevenueCatSupported) {
        Alert.alert(t('settings.subscriptionUnavailableTitle'), t('settings.subscriptionCheckoutUnavailable'));
        return;
      }

      await presentPaywallForOffering(REVENUECAT_OFFERING_IDS.connectXPro);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('settings.subscriptionOpenError');
      Alert.alert(t('settings.subscriptionUnavailableTitle'), message);
    }
  }

  async function pauseAccount() {
    try {
      const response = await pauseAccountMutation.mutateAsync();
      await refreshSession();
      Alert.alert(t('settings.profilePausedTitle'), response.message || t('settings.profilePausedMessage'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('settings.pauseFailedMessage');
      Alert.alert(t('settings.pauseFailedTitle'), message);
    }
  }

  async function activateAccount() {
    try {
      const response = await activateAccountMutation.mutateAsync();
      await refreshSession();
      Alert.alert(t('settings.profileActivatedTitle'), response.message || t('settings.profileActivatedMessage'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('settings.activationFailedMessage');
      Alert.alert(t('settings.activationFailedTitle'), message);
    }
  }

  function confirmPauseAccount() {
    Alert.alert(
      t('settings.pauseConfirmTitle'),
      t('settings.pauseConfirmMessage'),
      [
        { style: 'cancel', text: t('settings.cancel') },
        {
          onPress: () => {
            void pauseAccount();
          },
          text: t('settings.pause'),
        },
      ]
    );
  }

  function confirmActivateAccount() {
    Alert.alert(
      t('settings.activateConfirmTitle'),
      t('settings.activateConfirmMessage'),
      [
        { style: 'cancel', text: t('settings.cancel') },
        {
          onPress: () => {
            void activateAccount();
          },
          text: t('settings.activate'),
        },
      ]
    );
  }

  async function requestAccountDeletion() {
    try {
      const response = await deleteAccountMutation.mutateAsync();

      Alert.alert(
        t('settings.deletionRequestedTitle'),
        response.message || t('settings.deletionRequestedMessage'),
        [
          {
            onPress: () => {
              void signOut();
            },
            text: t('settings.ok'),
          },
        ]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : t('settings.deleteFailedMessage');
      Alert.alert(t('settings.deleteFailedTitle'), message);
    }
  }

  function confirmDeleteAccount() {
    Alert.alert(
      t('settings.deleteConfirmTitle'),
      t('settings.deleteConfirmMessage'),
      [
        { style: 'cancel', text: t('settings.cancel') },
        {
          onPress: () => {
            void requestAccountDeletion();
          },
          style: 'destructive',
          text: t('settings.requestDeletion'),
        },
      ]
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: t('settings.routeTitle') }} />
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
              {t('settings.headerTitle')}
            </AppText>
            <AppText className="text-[13px]" numberOfLines={1} tone="muted">
              {t('settings.headerDescription')}
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
          <Section title={t('settings.language.section')}>
            <SettingsRow
              description={t('settings.language.description')}
              icon="language-outline"
              onPress={openLanguageSelector}
              title={t('settings.language.title')}
              value={localeLabel}
            />
          </Section>

          <Section title={t('settings.notifications.section')}>
            <NotificationToggleRow
              description={t('settings.notifications.pushDescription')}
              enabled={notificationData?.push_enabled ?? true}
              icon="notifications-outline"
              isUpdating={updateNotificationsMutation.isPending}
              onToggle={(value) => {
                updateNotificationsMutation.mutate({ push_enabled: value });
              }}
              title={t('settings.notifications.pushTitle')}
            />
            <NotificationToggleRow
              description={t('settings.notifications.emailDescription')}
              enabled={notificationData?.email_enabled ?? true}
              icon="mail-outline"
              isUpdating={updateNotificationsMutation.isPending}
              onToggle={(value) => {
                updateNotificationsMutation.mutate({ email_enabled: value });
              }}
              title={t('settings.notifications.emailTitle')}
            />
          </Section>

          <Section title={t('settings.legal.section')}>
            <SettingsRow
              description={t('settings.legal.privacyDescription')}
              icon="shield-checkmark-outline"
              onPress={() => {
                void openExternalUrl(SETTINGS_LINKS.privacy);
              }}
              title={t('settings.legal.privacyTitle')}
            />
            <SettingsRow
              description={t('settings.legal.termsDescription')}
              icon="document-text-outline"
              onPress={() => {
                void openExternalUrl(SETTINGS_LINKS.terms);
              }}
              title={t('settings.legal.termsTitle')}
            />
          </Section>

          <Section title={t('settings.help.section')}>
            <SettingsRow
              description={t('settings.help.featureDescription')}
              icon="bulb-outline"
              onPress={() => setSupportTicketType('feature_request')}
              title={t('settings.help.featureTitle')}
            />
            <SettingsRow
              description={t('settings.help.bugDescription')}
              icon="bug-outline"
              onPress={() => setSupportTicketType('bug_report')}
              title={t('settings.help.bugTitle')}
            />
            <SettingsRow
              description={t('settings.help.supportDescription')}
              icon="chatbubble-ellipses-outline"
              onPress={() => setSupportTicketType('contact_support')}
              title={t('settings.help.supportTitle')}
            />
          </Section>

          <Section title={t('settings.subscription.section')}>
            <SettingsRow
              description={subscriptionDescription}
              icon={isPremiumActive ? 'sparkles-outline' : 'card-outline'}
              isLoading={isRevenueCatLoading}
              onPress={() => {
                void handleSubscriptionPress();
              }}
              title={t('settings.subscription.title')}
              tone={isPremiumActive ? 'success' : 'accent'}
              value={isPremiumActive ? t('settings.subscription.activeValue') : t('settings.subscription.freeValue')}
            />
          </Section>

          <Section title={t('settings.profile.section')}>
            {session?.method === 'email' ? (
              <>
                <SettingsRow
                  description={t('settings.profile.changeEmailDescription')}
                  icon="mail-outline"
                  onPress={() => setAccountContactChange('email')}
                  title={t('settings.profile.changeEmailTitle')}
                  value={session.email}
                />
                <SettingsRow
                  description={t('settings.profile.changePasswordDescription')}
                  icon="key-outline"
                  onPress={() => setIsChangePasswordVisible(true)}
                  title={t('settings.profile.changePasswordTitle')}
                />
              </>
            ) : null}
            <SettingsRow
              description={t('settings.profile.changeWhatsappDescription')}
              icon="logo-whatsapp"
              onPress={() => setAccountContactChange('whatsapp')}
              title={t('settings.profile.changeWhatsappTitle')}
              value={session?.user?.whatsapp_number ?? undefined}
            />
            <SettingsRow
              description={
                isProfileActive
                  ? t('settings.profile.pauseDescription')
                  : t('settings.profile.activateDescription')
              }
              disabled={isAccountActionPending}
              icon={isProfileActive ? 'pause-circle-outline' : 'play-circle-outline'}
              isLoading={isProfileStatusPending}
              onPress={isProfileActive ? confirmPauseAccount : confirmActivateAccount}
              title={isProfileActive ? t('settings.profile.pauseTitle') : t('settings.profile.activateTitle')}
              tone={isProfileActive ? 'accent' : 'success'}
            />
            <SettingsRow
              description={t('settings.profile.deleteDescription')}
              disabled={isAccountActionPending}
              icon="trash-outline"
              isLoading={deleteAccountMutation.isPending}
              onPress={confirmDeleteAccount}
              title={t('settings.profile.deleteTitle')}
              tone="danger"
            />
            {/* <SettingsRow
              description="Sign out of your ConnectX account."
              icon="log-out-outline"
              onPress={() => void signOut()}
              title="Log Out"
              tone="danger"
            /> */}
          </Section>

          <AppText align="center" className="text-[12px] pt-2" tone="muted">
            {t('settings.version', { version: Constants.expoConfig?.version ?? '0.0.0' })}
          </AppText>
        </ScrollView>

        {supportTicketType ? (
          <SupportTicketModal
            onClose={() => setSupportTicketType(null)}
            ticketType={supportTicketType}
            visible={Boolean(supportTicketType)}
          />
        ) : null}
        <ChangePasswordModal
          onClose={() => setIsChangePasswordVisible(false)}
          visible={isChangePasswordVisible}
        />
        {accountContactChange ? (
          <ChangeAccountContactModal
            currentValue={
              accountContactChange === 'email'
                ? session?.email
                : session?.user?.whatsapp_number
            }
            kind={accountContactChange}
            onClose={() => setAccountContactChange(null)}
            onConfirmed={async () => {
              const res = await refreshSession();
              console.log('refreshSession response when changing contact:', JSON.stringify(res, null, 2));
            }}
            visible
          />
        ) : null}
      </View>
    </>
  );
}
