import React from 'react';
import { TextInput, View, type TextInputProps, type ViewProps } from 'react-native';

import { cn } from '@shared/utils/cn';

import { AppText } from './app-text';

export type AppInputProps = TextInputProps & {
  className?: string;
  error?: string;
  hint?: string;
  label?: string;
  prefix?: string;
  shellClassName?: string;
  shellProps?: ViewProps;
};

export function AppInput({
  className,
  error,
  hint,
  label,
  placeholderTextColor = '#667085',
  prefix,
  shellClassName,
  shellProps,
  style,
  ...props
}: AppInputProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const inputStateClassName = error
    ? 'border-danger bg-background'
    : isFocused
      ? 'border-accent bg-background'
      : 'border-border bg-background';

  return (
    <View className={cn('gap-2', shellClassName)} {...shellProps}>
      {label ? (
        <AppText tone={isFocused ? 'accent' : 'muted'} variant="label">
          {label}
        </AppText>
      ) : null}
      {prefix ? (
        <View
          className={cn(
            'min-h-14 flex-row items-center rounded-[16px] border pl-3',
            inputStateClassName,
            className
          )}>
          <AppText className="text-[15px] leading-5 text-text-muted" numberOfLines={1}>
            {prefix}
          </AppText>
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
        </View>
      ) : (
        <TextInput
          className={cn(
            'min-h-14 rounded-[16px] border py-3 pl-3 pr-4 font-body text-[15px] text-text',
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
          style={[{ letterSpacing: 0 }, style]}
          {...props}
        />
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
