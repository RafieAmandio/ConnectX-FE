import { TextInput, View, type TextInputProps, type ViewProps } from 'react-native';

import { cn } from '@shared/utils/cn';

import { AppText } from './app-text';

export type AppInputProps = TextInputProps & {
  className?: string;
  hint?: string;
  label?: string;
  shellClassName?: string;
  shellProps?: ViewProps;
};

export function AppInput({
  className,
  hint,
  label,
  placeholderTextColor = '#7B868E',
  shellClassName,
  shellProps,
  ...props
}: AppInputProps) {
  return (
    <View className={cn('gap-2', shellClassName)} {...shellProps}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <TextInput
        className={cn(
          'min-h-14 rounded-[22px] border border-border bg-surface-raised px-4 font-body text-base text-text',
          className
        )}
        placeholderTextColor={placeholderTextColor}
        {...props}
      />
      {hint ? (
        <AppText className="px-1" tone="muted" variant="code">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
