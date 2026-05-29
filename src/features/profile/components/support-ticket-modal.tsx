import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton, AppText } from '@shared/components';

import { useSubmitSupportTicket } from '../hooks/use-settings';
import type { SupportTicketType } from '../types/settings.types';

const palette = {
  accent: '#FF9A3E',
  canvas: '#262626',
  field: '#292929',
  border: '#383838',
  borderSoft: 'rgba(255, 255, 255, 0.08)',
  text: '#FFFFFF',
  textMuted: '#98A2B3',
} as const;

const TICKET_CONFIG: Record<SupportTicketType, { title: string; placeholder: string }> = {
  feature_request: {
    title: 'Feature Request',
    placeholder: 'Share an idea, feature, or enhancement...',
  },
  bug_report: {
    title: 'Bug Report',
    placeholder: 'Describe the bug and steps to reproduce...',
  },
  contact_support: {
    title: 'Contact Support',
    placeholder: 'How can we help you?',
  },
};

type SupportTicketModalProps = {
  onClose: () => void;
  ticketType: SupportTicketType;
  visible: boolean;
};

export function SupportTicketModal({ onClose, ticketType, visible }: SupportTicketModalProps) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = React.useState('');
  const submitMutation = useSubmitSupportTicket();
  const config = TICKET_CONFIG[ticketType];
  const canSubmit = message.trim().length > 0 && !submitMutation.isPending;

  function handleClose() {
    setMessage('');
    submitMutation.reset();
    onClose();
  }

  async function handleSend() {
    if (!canSubmit) return;

    try {
      const response = await submitMutation.mutateAsync({
        type: ticketType,
        message: message.trim(),
      });

      Alert.alert('Sent', response.message || 'Your message has been sent. Thank you!', [
        { text: 'OK', onPress: handleClose },
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send your message. Please try again.';
      Alert.alert('Error', errorMessage);
    }
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={handleClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        style={{ backgroundColor: palette.canvas }}
      >
        <View
          className="flex-row items-center justify-between border-b px-5 pb-4"
          style={{
            borderBottomColor: palette.border,
            paddingTop: Math.max(insets.top + 14, 24),
          }}
        >
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full border active:opacity-80"
            hitSlop={12}
            onPress={handleClose}
            style={{ backgroundColor: palette.field, borderColor: palette.border }}
          >
            <Ionicons color={palette.text} name="close" size={22} />
          </Pressable>

          <View className="min-w-0 flex-1 px-4">
            <AppText className="text-[21px]" numberOfLines={1} variant="title">
              {config.title}
            </AppText>
          </View>

          <View className="h-11 w-11" />
        </View>

        <View className="flex-1 px-5 pt-5">
          <TextInput
            autoFocus
            className="flex-1 text-[16px] leading-6"
            editable={!submitMutation.isPending}
            multiline
            onChangeText={setMessage}
            placeholder={config.placeholder}
            placeholderTextColor={palette.textMuted}
            style={{ color: palette.text, textAlignVertical: 'top' }}
            value={message}
          />
        </View>

        <View
          className="border-t px-5 pt-4"
          style={{
            borderTopColor: palette.border,
            paddingBottom: Math.max(insets.bottom + 8, 20),
          }}
        >
          <AppButton
            disabled={!canSubmit}
            label={submitMutation.isPending ? 'Sending...' : 'Send'}
            onPress={() => void handleSend()}
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
