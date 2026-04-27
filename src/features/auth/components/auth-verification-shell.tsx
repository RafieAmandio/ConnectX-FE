import { AntDesign } from '@expo/vector-icons';
import React from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@shared/components';
import { cn } from '@shared/utils/cn';

const CANVAS_BG = '#212121';
const ACCENT = '#FF9A3E';
const FIELD_BORDER = '#383838';
const TEXT_MUTED = '#98A2B3';
const TEXT_SOFT = '#667085';
const TEXT_INVERSE = '#1A1208';
const ERROR = '#F97066';

type VerificationCodeFieldProps = {
  error?: string | null;
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
};

function VerificationCodeField({
  error,
  label,
  onChangeText,
  placeholder,
  value,
}: VerificationCodeFieldProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const borderColor = error ? ERROR : isFocused ? ACCENT : FIELD_BORDER;

  return (
    <View className="gap-3">
      <AppText
        className="text-[12px] uppercase"
        style={{
          color: isFocused ? ACCENT : TEXT_MUTED,
          letterSpacing: 1,
        }}>
        {label}
      </AppText>

      <View
        className="border-b pb-3"
        style={{
          borderColor,
          borderWidth: 0,
          borderBottomWidth: isFocused || error ? 1.5 : 1,
        }}>
        <TextInput
          autoCapitalize="characters"
          autoComplete="one-time-code"
          autoCorrect={false}
          className="font-body text-[30px] text-white"
          maxLength={6}
          onBlur={() => setIsFocused(false)}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          placeholderTextColor={TEXT_SOFT}
          selectionColor={ACCENT}
          style={{
            letterSpacing: value.length > 0 ? 8 : 2,
            paddingVertical: 0,
          }}
          textContentType="oneTimeCode"
          value={value}
        />
      </View>

      {error ? (
        <AppText className="px-1 text-[12px]" tone="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

type AuthVerificationShellProps = {
  actionLabel: string;
  codeError?: string | null;
  codeLabel: string;
  codePlaceholder?: string;
  codeValue: string;
  description: string;
  exitLabel: string;
  footerNote?: string;
  isActionDisabled?: boolean;
  onActionPress: () => void;
  onCodeChange: (value: string) => void;
  onExitPress: () => void;
  onResendPress: () => void;
  resendDisabled?: boolean;
  resendLabel: string;
  statusMessage?: string | null;
  statusTone?: 'danger' | 'signal';
  title: string;
};

export function AuthVerificationShell({
  actionLabel,
  codeError,
  codeLabel,
  codePlaceholder = 'Enter code',
  codeValue,
  description,
  exitLabel,
  footerNote,
  isActionDisabled,
  onActionPress,
  onCodeChange,
  onExitPress,
  onResendPress,
  resendDisabled,
  resendLabel,
  statusMessage,
  statusTone = 'signal',
  title,
}: AuthVerificationShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
      style={{ backgroundColor: CANVAS_BG }}>
      <Pressable className="flex-1" onPress={Keyboard.dismiss} accessible={false}>
        <View
          className="flex-1 px-5 pt-16"
          style={{ paddingBottom: Math.max(insets.bottom + 24, 32) }}>
          <View className="h-12 flex-row items-center justify-end">
            <Pressable className="py-2" hitSlop={8} onPress={onExitPress}>
              <AppText className="text-[15px] font-medium" style={{ color: TEXT_MUTED }}>
                {exitLabel}
              </AppText>
            </Pressable>
          </View>

          <View className="flex-1 pt-8">
            <View className="shrink-0 gap-2">
              <AppText
                variant="hero"
                className="text-[32px] leading-[38px]"
                style={{ color: ACCENT }}>
                {title}
              </AppText>
              <AppText className="text-base leading-6" style={{ color: TEXT_MUTED }}>
                {description}
              </AppText>
            </View>

            <View className="mt-10 shrink-0 gap-4">
              <VerificationCodeField
                error={codeError}
                label={codeLabel}
                onChangeText={onCodeChange}
                placeholder={codePlaceholder}
                value={codeValue}
              />

              {statusMessage ? (
                <AppText className="px-1" selectable tone={statusTone}>
                  {statusMessage}
                </AppText>
              ) : null}

              <View className="flex-row items-center justify-between gap-4 px-1">
                <AppText className="text-[13px]" style={{ color: TEXT_SOFT }}>
                  Need a new code?
                </AppText>
                <Pressable
                  disabled={resendDisabled}
                  hitSlop={8}
                  onPress={onResendPress}>
                  <AppText
                    variant="bodyStrong"
                    className={cn('text-[13px]', resendDisabled && 'opacity-60')}
                    style={{ color: resendDisabled ? TEXT_SOFT : ACCENT }}>
                    {resendLabel}
                  </AppText>
                </Pressable>
              </View>
            </View>

            <View className="flex-1 justify-end pt-8">
              <Pressable
                android_ripple={{ color: 'rgba(0,0,0,0.12)' }}
                className={cn(
                  'h-14 flex-row items-center justify-center gap-3 rounded-[18px]',
                  isActionDisabled && 'opacity-50'
                )}
                disabled={isActionDisabled}
                onPress={onActionPress}
                style={{ backgroundColor: ACCENT, borderCurve: 'continuous' }}>
                <AppText variant="subtitle" className="text-[16px]" style={{ color: TEXT_INVERSE }}>
                  {actionLabel}
                </AppText>
                <AntDesign color={TEXT_INVERSE} name="arrow-right" size={18} />
              </Pressable>

              {footerNote ? (
                <AppText
                  align="center"
                  className="mt-4 text-[13px]"
                  style={{ color: TEXT_SOFT }}>
                  {footerNote}
                </AppText>
              ) : null}
            </View>
          </View>
        </View>
      </Pressable>
    </KeyboardAvoidingView>
  );
}
