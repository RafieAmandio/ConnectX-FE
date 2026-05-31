import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getPasswordError } from '@features/auth/utils/auth-validation';
import { ApiError } from '@shared/services/api';
import { AppButton, AppInput, AppText } from '@shared/components';

import { useChangePassword } from '../hooks/use-settings';

const palette = {
  canvas: '#262626',
  field: '#292929',
  border: '#383838',
  text: '#FFFFFF',
} as const;

type ChangePasswordModalProps = {
  onClose: () => void;
  visible: boolean;
};

type FieldErrors = {
  currentPassword?: string;
  password?: string;
  passwordConfirmation?: string;
};

function getApiFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ApiError) || !error.payload || typeof error.payload !== 'object') {
    return {};
  }

  const errors = 'errors' in error.payload ? error.payload.errors : null;

  if (!errors || typeof errors !== 'object') {
    return {};
  }

  const fields = errors as Record<string, unknown>;
  const firstMessage = (key: string) => {
    const value = fields[key];
    return Array.isArray(value) && typeof value[0] === 'string' ? value[0] : undefined;
  };

  return {
    currentPassword: firstMessage('current_password'),
    password: firstMessage('password'),
    passwordConfirmation: firstMessage('password_confirmation'),
  };
}

export function ChangePasswordModal({ onClose, visible }: ChangePasswordModalProps) {
  const insets = useSafeAreaInsets();
  const changePasswordMutation = useChangePassword();
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [passwordConfirmation, setPasswordConfirmation] = React.useState('');
  const [errors, setErrors] = React.useState<FieldErrors>({});

  function resetForm() {
    setCurrentPassword('');
    setPassword('');
    setPasswordConfirmation('');
    setErrors({});
    changePasswordMutation.reset();
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit() {
    const nextErrors: FieldErrors = {
      currentPassword: currentPassword ? undefined : 'Current password is required.',
      password: getPasswordError(password) ?? undefined,
      passwordConfirmation:
        passwordConfirmation !== password
          ? 'Passwords do not match.'
          : getPasswordError(passwordConfirmation) ?? undefined,
    };

    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }

    try {
      const response = await changePasswordMutation.mutateAsync({
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      });

      Alert.alert('Password changed', response.message || 'Your password has been updated.', [
        { onPress: handleClose, text: 'OK' },
      ]);
    } catch (error) {
      const apiErrors = getApiFieldErrors(error);

      if (Object.values(apiErrors).some(Boolean)) {
        setErrors(apiErrors);
      }

      Alert.alert(
        'Unable to change password',
        error instanceof Error ? error.message : 'Please try again.'
      );
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
              Change Password
            </AppText>
          </View>

          <View className="h-11 w-11" />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ gap: 18, padding: 20 }}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
        >
          <AppText tone="muted">
            Enter your current password, then choose a new password with at least 8 characters.
          </AppText>
          <AppInput
            autoCapitalize="none"
            autoComplete="current-password"
            error={errors.currentPassword}
            label="Current password"
            onChangeText={(value) => {
              setCurrentPassword(value);
              if (errors.currentPassword) setErrors((current) => ({ ...current, currentPassword: undefined }));
            }}
            placeholder="Enter your current password"
            secureTextEntry
            value={currentPassword}
          />
          <AppInput
            autoCapitalize="none"
            autoComplete="new-password"
            error={errors.password}
            label="New password"
            onChangeText={(value) => {
              setPassword(value);
              if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
            }}
            placeholder="Enter your new password"
            secureTextEntry
            value={password}
          />
          <AppInput
            autoCapitalize="none"
            autoComplete="new-password"
            error={errors.passwordConfirmation}
            label="Confirm new password"
            onChangeText={(value) => {
              setPasswordConfirmation(value);
              if (errors.passwordConfirmation) {
                setErrors((current) => ({ ...current, passwordConfirmation: undefined }));
              }
            }}
            onSubmitEditing={() => void handleSubmit()}
            placeholder="Repeat your new password"
            secureTextEntry
            value={passwordConfirmation}
          />
        </ScrollView>

        <View
          className="border-t px-5 pt-4"
          style={{
            borderTopColor: palette.border,
            paddingBottom: Math.max(insets.bottom + 8, 20),
          }}
        >
          <AppButton
            disabled={changePasswordMutation.isPending}
            label={changePasswordMutation.isPending ? 'Updating...' : 'Update password'}
            onPress={() => void handleSubmit()}
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
