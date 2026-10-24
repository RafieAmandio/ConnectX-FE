import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { Alert, Modal, Pressable, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton, AppInput, AppText } from '@shared/components';
import { useTranslation } from '@shared/localization';
import { apiFetch } from '@shared/services/api';

const REPORT_REASONS = ['spam', 'fake_profile', 'inappropriate', 'harassment', 'other'] as const;
type ReportReason = (typeof REPORT_REASONS)[number];
type ApiMessage = { success: boolean; message?: string };

export const blockedUsersQueryKey = ['profile', 'blocks'] as const;

export function useBlockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ block, userId }: { block: boolean; userId: string }) =>
      apiFetch<ApiMessage>(`/api/v1/users/${userId}/block`, { method: block ? 'POST' : 'DELETE' }),
    // A block hides both people from each other everywhere: deck, matches, chat.
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

function useReportUser() {
  return useMutation({
    mutationFn: ({ message, reason, userId }: { message: string; reason: ReportReason; userId: string }) =>
      apiFetch<ApiMessage>(`/api/v1/users/${userId}/report`, {
        body: { message: message.trim() || undefined, reason } as unknown as BodyInit,
        method: 'POST',
      }),
  });
}

// "..." button that opens Report / Block for another user (App Store guideline 1.2).
export function UserSafetyButton({
  className = 'h-11 w-11 items-center justify-center rounded-full bg-[#2E2C2B] active:opacity-70',
  name,
  onBlocked,
  userId,
}: {
  className?: string;
  name: string;
  onBlocked?: () => void;
  userId: string | null | undefined;
}) {
  const t = useTranslation();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = React.useState<'closed' | 'menu' | 'report'>('closed');
  const [reason, setReason] = React.useState<ReportReason | null>(null);
  const [message, setMessage] = React.useState('');
  const blockUser = useBlockUser();
  const reportUser = useReportUser();

  if (!userId) {
    return null;
  }

  function close() {
    setMode('closed');
    setReason(null);
    setMessage('');
  }

  function confirmBlock() {
    close();
    Alert.alert(t('safety.blockTitle', { name }), t('safety.blockMessage'), [
      { style: 'cancel', text: t('safety.cancel') },
      {
        onPress: () => {
          blockUser.mutate(
            { block: true, userId: userId! },
            {
              onError: (error) => Alert.alert(t('safety.errorTitle'), error.message),
              onSuccess: (response) => {
                Alert.alert(t('safety.blockedTitle'), response.message ?? t('safety.blockedMessage', { name }));
                onBlocked?.();
              },
            }
          );
        },
        style: 'destructive',
        text: t('safety.block'),
      },
    ]);
  }

  function submitReport() {
    if (!reason) {
      return;
    }

    reportUser.mutate(
      { message, reason, userId: userId! },
      {
        onError: (error) => Alert.alert(t('safety.errorTitle'), error.message),
        onSuccess: (response) => {
          close();
          Alert.alert(t('safety.reportedTitle'), response.message ?? t('safety.reportedMessage'));
        },
      }
    );
  }

  return (
    <>
      <Pressable
        accessibilityLabel={t('safety.menuLabel')}
        className={className}
        hitSlop={8}
        onPress={() => setMode('menu')}>
        <Ionicons color="#F3F0EB" name="ellipsis-horizontal" size={20} />
      </Pressable>

      <Modal animationType="slide" onRequestClose={close} transparent visible={mode !== 'closed'}>
        <KeyboardAvoidingView behavior="padding" className="flex-1 justify-end" style={{ backgroundColor: 'rgba(10, 10, 14, 0.42)' }}>
          <Pressable className="flex-1" onPress={close} />
          <View
            className="gap-3 rounded-t-[28px] border border-white/10 bg-[#2C2C2C] px-4 pt-5"
            style={{ paddingBottom: Math.max(insets.bottom + 12, 24) }}>
            {mode === 'menu' ? (
              <>
                <SheetRow icon="flag-outline" label={t('safety.report', { name })} onPress={() => setMode('report')} />
                <SheetRow danger icon="ban-outline" label={t('safety.block', { name })} onPress={confirmBlock} />
                <SheetRow label={t('safety.cancel')} onPress={close} />
              </>
            ) : (
              <>
                <AppText className="px-1 text-white" variant="title">
                  {t('safety.reportTitle', { name })}
                </AppText>
                <AppText className="px-1 text-[#AFA9A2]">{t('safety.reportHint')}</AppText>
                {REPORT_REASONS.map((item) => (
                  <SheetRow
                    key={item}
                    icon={reason === item ? 'radio-button-on' : 'radio-button-off'}
                    label={t(`safety.reason.${item}`)}
                    onPress={() => setReason(item)}
                  />
                ))}
                <AppInput
                  maxLength={1000}
                  multiline
                  onChangeText={setMessage}
                  placeholder={t('safety.reportMessagePlaceholder')}
                  value={message}
                />
                <AppButton
                  disabled={!reason || reportUser.isPending}
                  label={reportUser.isPending ? t('safety.sending') : t('safety.sendReport')}
                  onPress={submitReport}
                />
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function SheetRow({
  danger = false,
  icon,
  label,
  onPress,
}: {
  danger?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const color = danger ? '#FF8A7A' : '#F3F0EB';

  return (
    <Pressable
      className={`min-h-14 flex-row items-center gap-3 rounded-[18px] bg-[#373534] px-4 active:opacity-80 ${icon ? '' : 'justify-center'}`}
      onPress={onPress}>
      {icon ? <Ionicons color={danger ? color : '#F7B05B'} name={icon} size={20} /> : null}
      <AppText style={{ color }} variant="bodyStrong">
        {label}
      </AppText>
    </Pressable>
  );
}
