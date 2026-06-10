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

import { getEmailError } from '@features/auth/utils/auth-validation';
import {
  getWhatsappNumberError,
  normalizeWhatsappNumber,
} from '@features/auth/utils/whatsapp-validation';
import { AppButton, AppInput, AppText } from '@shared/components';
import { getApiDisplayMessage, getApiFieldError } from '@shared/services/api';

import {
  useRequestEmailChange,
  useRequestWhatsappChange,
  useVerifyEmailChange,
  useVerifyWhatsappChange,
} from '../hooks/use-settings';

const palette = {
  accent: '#FF9A3E',
  border: '#383838',
  canvas: '#262626',
  field: '#292929',
  text: '#FFFFFF',
} as const;

type ContactKind = 'email' | 'whatsapp';
type Step = 'value' | 'otp';

type ChangeAccountContactModalProps = {
  currentValue?: string | null;
  kind: ContactKind;
  onClose: () => void;
  onConfirmed: () => Promise<void> | void;
  visible: boolean;
};

function getSecondsRemaining(timestamp: string | null) {
  if (!timestamp) return 0;
  return Math.max(0, Math.ceil((new Date(timestamp).getTime() - Date.now()) / 1000));
}

export function ChangeAccountContactModal({
  currentValue,
  kind,
  onClose,
  onConfirmed,
  visible,
}: ChangeAccountContactModalProps) {
  const insets = useSafeAreaInsets();
  const requestEmailMutation = useRequestEmailChange();
  const verifyEmailMutation = useVerifyEmailChange();
  const requestWhatsappMutation = useRequestWhatsappChange();
  const verifyWhatsappMutation = useVerifyWhatsappChange();
  const [step, setStep] = React.useState<Step>('value');
  const [value, setValue] = React.useState('');
  const [valueError, setValueError] = React.useState<string | null>(null);
  const [otpCode, setOtpCode] = React.useState('');
  const [otpError, setOtpError] = React.useState<string | null>(null);
  const [verificationId, setVerificationId] = React.useState<string | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = React.useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = React.useState(0);

  const isEmail = kind === 'email';
  const isRequesting = isEmail ? requestEmailMutation.isPending : requestWhatsappMutation.isPending;
  const isVerifying = isEmail ? verifyEmailMutation.isPending : verifyWhatsappMutation.isPending;
  const title = isEmail ? 'Change Email' : 'Change WhatsApp Number';
  const normalizedValue = isEmail ? value.trim().toLowerCase() : normalizeWhatsappNumber(value);

  React.useEffect(() => {
    setSecondsRemaining(getSecondsRemaining(resendAvailableAt));
  }, [resendAvailableAt]);

  React.useEffect(() => {
    if (!secondsRemaining) return;

    const timer = setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining]);

  function resetForm() {
    requestEmailMutation.reset();
    verifyEmailMutation.reset();
    requestWhatsappMutation.reset();
    verifyWhatsappMutation.reset();
    setStep('value');
    setValue('');
    setValueError(null);
    setOtpCode('');
    setOtpError(null);
    setVerificationId(null);
    setResendAvailableAt(null);
    setSecondsRemaining(0);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function requestOtp() {
    const nextError = isEmail
      ? getEmailError(normalizedValue)
      : getWhatsappNumberError(normalizedValue);

    if (nextError) {
      setValueError(nextError);
      return;
    }

    if (normalizedValue === currentValue?.trim().toLowerCase()) {
      setValueError(`Enter a different ${isEmail ? 'email address' : 'WhatsApp number'}.`);
      return;
    }

    setValue(normalizedValue);
    setValueError(null);

    try {
      const response = isEmail
        ? await requestEmailMutation.mutateAsync({ email: normalizedValue })
        : await requestWhatsappMutation.mutateAsync({ whatsapp_number: normalizedValue });

      setVerificationId(response.data.verification_id);
      setResendAvailableAt(response.data.resend_available_at);
      setOtpCode('');
      setOtpError(null);
      setStep('otp');
    } catch (error) {
      const field = isEmail ? 'email' : 'whatsapp_number';
      const fieldError = getApiFieldError(error, field);
      setValueError(fieldError ?? null);
      Alert.alert(
        'Unable to send code',
        fieldError ?? getApiDisplayMessage(error, 'Please try again.')
      );
    }
  }

  async function verifyOtp() {
    if (!verificationId) return;

    if (otpCode.length !== 6) {
      setOtpError('Enter the 6-character verification code.');
      return;
    }

    setOtpError(null);

    try {
      const payload = { otp_code: otpCode, verification_id: verificationId };
      const response = isEmail
        ? await verifyEmailMutation.mutateAsync(payload)
        : await verifyWhatsappMutation.mutateAsync(payload);

      await onConfirmed();
      handleClose();
      Alert.alert(
        isEmail ? 'Email changed' : 'WhatsApp number changed',
        response.message || `${isEmail ? 'Email' : 'WhatsApp number'} updated successfully.`
      );
    } catch (error) {
      const otpFieldError = getApiFieldError(error, 'otp_code');
      setOtpError(otpFieldError ?? null);
      Alert.alert(
        'Unable to verify code',
        otpFieldError ?? getApiDisplayMessage(error, 'Please try again.')
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
          style={{ borderBottomColor: palette.border, paddingTop: Math.max(insets.top + 14, 24) }}
        >
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full border active:opacity-80"
            hitSlop={12}
            onPress={step === 'otp' ? () => setStep('value') : handleClose}
            style={{ backgroundColor: palette.field, borderColor: palette.border }}
          >
            <Ionicons color={palette.text} name={step === 'otp' ? 'chevron-back' : 'close'} size={22} />
          </Pressable>
          <View className="min-w-0 flex-1 px-4">
            <AppText className="text-[21px]" numberOfLines={1} variant="title">
              {title}
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
          {step === 'value' ? (
            <>
              <AppText tone="muted">
                {isEmail
                  ? 'Enter your new email address. We will send a verification code before updating your account.'
                  : 'Enter your new WhatsApp number. We will send an OTP before updating your account.'}
              </AppText>
              <AppInput
                autoCapitalize="none"
                autoComplete={isEmail ? 'email' : 'tel'}
                autoCorrect={false}
                error={valueError ?? undefined}
                keyboardType={isEmail ? 'email-address' : 'phone-pad'}
                label={isEmail ? 'New email address' : 'New WhatsApp number'}
                onChangeText={(nextValue) => {
                  setValue(isEmail ? nextValue : normalizeWhatsappNumber(nextValue));
                  if (valueError) setValueError(null);
                }}
                onSubmitEditing={() => void requestOtp()}
                placeholder={isEmail ? 'you@example.com' : '+6281234567890'}
                value={value}
              />
            </>
          ) : (
            <>
              <AppText tone="muted">
                Enter the code sent to {normalizedValue}.
              </AppText>
              <AppInput
                autoCapitalize={isEmail ? 'characters' : 'none'}
                autoComplete="one-time-code"
                autoCorrect={false}
                error={otpError ?? undefined}
                keyboardType={isEmail ? 'default' : 'number-pad'}
                label="Verification code"
                maxLength={6}
                onChangeText={(nextValue) => {
                  const normalizedOtp = isEmail
                    ? nextValue.toUpperCase().replace(/\s/g, '')
                    : nextValue.replace(/\D/g, '');
                  setOtpCode(normalizedOtp.slice(0, 6));
                  if (otpError) setOtpError(null);
                }}
                onSubmitEditing={() => void verifyOtp()}
                placeholder={isEmail ? 'ABC123' : '123456'}
                value={otpCode}
              />
              <View className="flex-row items-center justify-between gap-4">
                <AppText className="text-[13px]" tone="muted">
                  Need a new code?
                </AppText>
                <Pressable
                  disabled={isRequesting || secondsRemaining > 0}
                  hitSlop={8}
                  onPress={() => void requestOtp()}
                >
                  <AppText
                    className="text-[13px]"
                    style={{ color: secondsRemaining > 0 ? '#667085' : palette.accent }}
                    variant="bodyStrong"
                  >
                    {isRequesting
                      ? 'Sending...'
                      : secondsRemaining > 0
                        ? `Resend in ${secondsRemaining}s`
                        : 'Resend code'}
                  </AppText>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>

        <View
          className="border-t px-5 pt-4"
          style={{ borderTopColor: palette.border, paddingBottom: Math.max(insets.bottom + 8, 20) }}
        >
          <AppButton
            disabled={isRequesting || isVerifying}
            label={
              step === 'value'
                ? isRequesting
                  ? 'Sending...'
                  : 'Send verification code'
                : isVerifying
                  ? 'Verifying...'
                  : 'Confirm change'
            }
            onPress={() => void (step === 'value' ? requestOtp() : verifyOtp())}
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
