import React from 'react';
import { TextInput, View, type TextInputProps, type ViewProps } from 'react-native';

import { cn } from '@shared/utils/cn';

import { AppText } from './app-text';

export type AppInputProps = TextInputProps & {
  className?: string;
  error?: string;
  hint?: string;
  label?: string;
  shellClassName?: string;
  shellProps?: ViewProps;
};

export function AppInput({
  className,
  error,
  hint,
  label,
  placeholderTextColor = '#667085',
  shellClassName,
  shellProps,
  style,
  ...props
}: AppInputProps) {
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <View className={cn('gap-2', shellClassName)} {...shellProps}>
      {label ? (
        <AppText tone={isFocused ? 'accent' : 'muted'} variant="label">
          {label}
        </AppText>
      ) : null}
      <TextInput
        className={cn(
          'min-h-14 rounded-[16px] border px-4 font-body text-[15px] text-text',
          error
            ? 'border-danger bg-background'
            : isFocused
              ? 'border-accent bg-background'
              : 'border-border bg-background',
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
        style={[{ letterSpacing: 0 }, style]}
        {...props}
      />
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
