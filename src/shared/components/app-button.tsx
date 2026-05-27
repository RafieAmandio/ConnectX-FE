import { Pressable, View, type PressableProps } from 'react-native';

import { cn } from '@shared/utils/cn';

import { AppText } from './app-text';

const variantStyles = {
  primary: 'bg-accent',
  secondary: 'border border-border-strong bg-surface',
  danger: 'border border-danger/25 bg-danger-tint',
  ghost: 'bg-transparent',
} as const;

const sizeStyles = {
  md: 'min-h-12 px-4 py-3',
  lg: 'min-h-14 px-5 py-4',
} as const;

const labelTone = {
  primary: 'inverse',
  secondary: 'default',
  danger: 'danger',
  ghost: 'accent',
} as const;

export type AppButtonProps = Omit<PressableProps, 'children'> & {
  className?: string;
  detail?: string;
  label: string;
  size?: keyof typeof sizeStyles;
  variant?: keyof typeof variantStyles;
  labelClassName?: string;
};

export function AppButton({
  className,
  detail,
  label,
  size = 'md',
  variant = 'primary',
  labelClassName,
  ...props
}: AppButtonProps) {
  return (
    <Pressable
      android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
      className={cn(
        'items-center justify-center rounded-[16px]',
        variantStyles[variant],
        sizeStyles[size],
        props.disabled && 'opacity-50',
        className
      )}
      {...props}>
      <View className="items-center gap-1">
        <AppText
          className={labelClassName}
          tone={labelClassName ? undefined : labelTone[variant]}
          variant="bodyStrong">
          {label}
        </AppText>
        {detail ? (
          <AppText
            className={cn(
              variant === 'primary'
                ? 'text-text/70'
                : variant === 'danger'
                  ? 'text-danger/70'
                  : 'text-text-soft'
            )}
            variant="code">
            {detail}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}
