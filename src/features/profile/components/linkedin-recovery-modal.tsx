import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@features/auth';
import { useFcmToken } from '@features/auth/hooks/use-fcm-token';
import { AppInput, AppText } from '@shared/components';
import { ApiError } from '@shared/services/api';
import { getOrCreateDeviceId } from '@shared/services/device-id';
import {
  clearLinkedInRecovery,
  getLinkedInRecoveryState,
  subscribeLinkedInRecovery,
} from '@shared/services/linkedin-recovery-store';

import { profileQueryKeys } from '../hooks/use-profile';
import { syncLinkedInProfile, updateMyLinkedInProfile } from '../services/profile-service';

const LINKEDIN_PROFILE_URL_PATTERN = /^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9%_.-]+\/?$/;

function getStringProperty(value: unknown, key: string) {
  if (!value || typeof value !== 'object' || !(key in value)) {
    return null;
  }

  const property = (value as Record<string, unknown>)[key];

  return typeof property === 'string' && property.trim() ? property.trim() : null;
}

function getFirstErrorMessage(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    const firstMessage = value.find((item) => typeof item === 'string' && item.trim());

    return typeof firstMessage === 'string' ? firstMessage.trim() : null;
  }

  return null;
}

function getLinkedInApiErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : 'Unable to update LinkedIn URL.';
  }

  const payload = error.payload;

  if (payload && typeof payload === 'object') {
    if ('errors' in payload && payload.errors && typeof payload.errors === 'object') {
      const errors = payload.errors as Record<string, unknown>;
      const linkedInError =
        getFirstErrorMessage(errors.linkedin_url) ??
        getFirstErrorMessage(errors.linkedinUrl) ??
        getFirstErrorMessage(errors.linkedin);

      if (linkedInError) {
        return linkedInError;
      }
    }

    const reason = getStringProperty('data' in payload ? payload.data : null, 'error_reason');

    if (reason === 'DUPLICATE') {
      return 'URL ini sudah digunakan oleh akun lain.';
    }

    if (reason === 'INVALID_FORMAT') {
      return 'Masukkan URL LinkedIn dengan format https://linkedin.com/in/username.';
    }

    const message = getStringProperty(payload, 'message');

    if (message) {
      return message;
    }
  }

  return error.message;
}

function getRecoveryHint(reason: string | null, message: string | null) {
  if (reason === 'DUPLICATE') {
    return 'URL LinkedIn ini terdeteksi dipakai akun lain. Masukkan URL profil LinkedIn personal milikmu.';
  }

  if (reason === 'INVALID_FORMAT') {
    return 'Gunakan URL profil personal yang dimulai dengan https://linkedin.com/in/ atau https://www.linkedin.com/in/.';
  }

  return message ?? 'Perbarui URL LinkedIn agar kamu bisa lanjut menggunakan ConnectX.';
}

export function LinkedInRecoveryModal() {
  const recovery = React.useSyncExternalStore(
    subscribeLinkedInRecovery,
    getLinkedInRecoveryState,
    getLinkedInRecoveryState
  );
  const { refreshSession } = useAuth();
  const fcmToken = useFcmToken(recovery.isRequired);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [linkedInUrl, setLinkedInUrl] = React.useState('');
  const [fieldError, setFieldError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [androidKeyboardOverlap, setAndroidKeyboardOverlap] = React.useState(0);
  const containerFrameRef = React.useRef({ height: 0, y: 0 });

  const updateAndroidKeyboardOverlap = React.useCallback((keyboardY?: number) => {
    if (Platform.OS !== 'android') {
      return;
    }

    if (!keyboardY) {
      setAndroidKeyboardOverlap(0);
      return;
    }

    const { height, y } = containerFrameRef.current;

    if (height <= 0) {
      return;
    }

    setAndroidKeyboardOverlap(Math.max(y + height - keyboardY, 0));
  }, []);

  const handleContainerLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      containerFrameRef.current = event.nativeEvent.layout;

      if (Platform.OS === 'android') {
        updateAndroidKeyboardOverlap(Keyboard.metrics()?.screenY);
      }
    },
    [updateAndroidKeyboardOverlap]
  );

  React.useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      updateAndroidKeyboardOverlap(event.endCoordinates.screenY);
    });
    const changeSubscription = Keyboard.addListener('keyboardDidChangeFrame', (event) => {
      updateAndroidKeyboardOverlap(event.endCoordinates.screenY);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      updateAndroidKeyboardOverlap();
    });

    updateAndroidKeyboardOverlap(Keyboard.metrics()?.screenY);

    return () => {
      showSubscription.remove();
      changeSubscription.remove();
      hideSubscription.remove();
    };
  }, [updateAndroidKeyboardOverlap]);

  React.useEffect(() => {
    if (!recovery.isRequired) {
      setLinkedInUrl('');
      setFieldError(null);
      setIsSubmitting(false);
      setAndroidKeyboardOverlap(0);
      return;
    }

    setFieldError(null);
  }, [recovery.isRequired]);

  const hint = getRecoveryHint(recovery.errorReason, recovery.message);

  async function handleSubmit() {
    const normalizedLinkedInUrl = linkedInUrl.trim();

    if (!LINKEDIN_PROFILE_URL_PATTERN.test(normalizedLinkedInUrl)) {
      setFieldError('Masukkan URL LinkedIn valid, contoh: https://linkedin.com/in/username.');
      return;
    }

    setFieldError(null);
    setIsSubmitting(true);

    try {
      await updateMyLinkedInProfile({ linkedin_url: normalizedLinkedInUrl });
      const deviceId = await getOrCreateDeviceId();
      await syncLinkedInProfile({
        device_id: deviceId,
        fcm_token: fcmToken ?? '',
        linkedin_url: normalizedLinkedInUrl,
      });
      await Promise.all([
        refreshSession(),
        queryClient.invalidateQueries({ queryKey: profileQueryKeys.me }),
      ]);
      clearLinkedInRecovery();
      router.replace('/(tabs)');
    } catch (error) {
      setFieldError(getLinkedInApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => undefined}
      transparent
      visible={recovery.isRequired}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        enabled={Platform.OS === 'ios'}
        keyboardVerticalOffset={0}
        onLayout={handleContainerLayout}
        style={{
          backgroundColor: 'rgba(0,0,0,0.68)',
        }}>
        <ScrollView
          alwaysBounceVertical={false}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'flex-end',
            paddingTop: insets.top + 24,
          }}
          keyboardShouldPersistTaps="handled">
          <View
            className="rounded-t-[28px] border px-5 pb-6 pt-5"
            style={{
              backgroundColor: '#262626',
              borderColor: '#3A3A3A',
              borderCurve: 'continuous',
              marginBottom: androidKeyboardOverlap,
              paddingBottom: Math.max(insets.bottom + 20, 28),
            }}>
            <View className="mb-5 flex-row items-center gap-3">
              <View
                className="h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: '#2A2117' }}>
                <Ionicons color="#FF9A3E" name="logo-linkedin" size={24} />
              </View>
              <View className="flex-1">
                <AppText variant="subtitle" className="text-[20px] leading-[26px] text-white">
                  Update LinkedIn
                </AppText>
                <AppText className="mt-1 text-[14px] leading-5 text-text-muted">
                  {hint}
                </AppText>
              </View>
            </View>

            <AppInput
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
              error={fieldError ?? undefined}
              keyboardType="url"
              label="LinkedIn URL"
              onChangeText={(value) => {
                setLinkedInUrl(value);
                setFieldError(null);
              }}
              placeholder="https://linkedin.com/in/username"
              returnKeyType="done"
              textContentType="URL"
              value={linkedInUrl}
            />

            <Pressable
              accessibilityRole="button"
              className="mt-5 h-14 flex-row items-center justify-center gap-2 rounded-[16px]"
              disabled={isSubmitting}
              onPress={handleSubmit}
              style={{
                backgroundColor: '#FF9A3E',
                borderCurve: 'continuous',
                opacity: isSubmitting ? 0.72 : 1,
              }}>
              {isSubmitting ? <ActivityIndicator color="#1A1208" /> : null}
              <AppText variant="bodyStrong" className="text-[#1A1208]">
                Save LinkedIn
              </AppText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
