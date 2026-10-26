import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, TextInput, View, type TextInputProps, type ViewProps } from 'react-native';

import { cn } from '@shared/utils/cn';

import { AppText } from './app-text';

export type AppInputProps = TextInputProps & {
  className?: string;
  error?: string;
  hint?: string;
  label?: string;
  prefix?: string;
  shellClassName?: string;
  suffix?: string;
  shellProps?: ViewProps;
};

export function AppInput({
  className,
  error,
  hint,
  label,
  placeholderTextColor = '#667085',
  prefix,
  secureTextEntry,
  shellClassName,
  shellProps,
  style,
  suffix,
  ...props
}: AppInputProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const [isSecretVisible, setIsSecretVisible] = React.useState(false);
  const inputStateClassName = error
    ? 'border-danger bg-surface-raised'
    : isFocused
      ? 'border-accent bg-surface-raised'
      : 'border-border bg-surface-raised';

  return (
    <View className={cn('gap-2', shellClassName)} {...shellProps}>
      {label ? (
        <AppText tone={isFocused ? 'accent' : 'muted'} variant="label">
          {label}
        </AppText>
      ) : null}
      {prefix || suffix ? (
        <View
          className={cn(
            'min-h-14 flex-row items-center rounded-[16px] border pl-3',
            inputStateClassName,
            className
          )}>
          {prefix ? (
            <AppText className="text-[15px] leading-5 text-text-muted" numberOfLines={1}>
              {prefix}
            </AppText>
          ) : null}
          <TextInput
            className="min-w-0 flex-1 py-3 pr-4 font-body text-[15px] text-text"
            onBlur={(event) => {
              setIsFocused(false);
              props.onBlur?.(event);
            }}
            onFocus={(event) => {
              setIsFocused(true);
              props.onFocus?.(event);
            }}
            placeholderTextColor={placeholderTextColor}
            style={[{ letterSpacing: 0 }, style]}
            {...props}
          />
          {suffix ? (
            <AppText className="pr-4 text-[15px] leading-5 text-text-muted" numberOfLines={1}>
              {suffix}
            </AppText>
          ) : null}
        </View>
      ) : (
        <View className="justify-center">
        <TextInput
          className={cn(
            'min-h-14 rounded-[16px] border py-3 pl-3 pr-4 font-body text-[15px] text-text',
            secureTextEntry && 'pr-12',
            inputStateClassName,
            className
          )}
          onBlur={(event) => {
            setIsFocused(false);
            props.onBlur?.(event);
          }}
          onFocus={(event) => {
            setIsFocused(true);
            props.onFocus?.(event);
          }}
          placeholderTextColor={placeholderTextColor}
          secureTextEntry={secureTextEntry && !isSecretVisible}
          style={[{ letterSpacing: 0 }, style]}
          {...props}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityLabel={isSecretVisible ? 'Hide password' : 'Show password'}
            className="absolute right-3 h-9 w-9 items-center justify-center"
            hitSlop={8}
            onPress={() => setIsSecretVisible((visible) => !visible)}
          >
            <Ionicons color="#98A2B3" name={isSecretVisible ? 'eye-off-outline' : 'eye-outline'} size={20} />
          </Pressable>
        ) : null}
        </View>
      )}
      {error ? (
        <AppText className="px-1" selectable tone="danger" variant="code">
          {error}
        </AppText>
      ) : hint ? (
        <AppText className="px-1" tone="muted" variant="code">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
