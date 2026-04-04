import { Pressable, View, type PressableProps } from 'react-native';

import { cn } from '@shared/utils/cn';

import { AppText } from './app-text';

const variantStyles = {
  primary: 'bg-accent',
  secondary: 'border border-border-strong bg-surface-raised',
  ghost: 'bg-transparent',
} as const;

const sizeStyles = {
  md: 'min-h-12 px-5 py-3',
  lg: 'min-h-14 px-6 py-4',
} as const;

const labelTone = {
  primary: 'inverse',
  secondary: 'default',
  ghost: 'accent',
} as const;

export type AppButtonProps = Omit<PressableProps, 'children'> & {
  className?: string;
  detail?: string;
  label: string;
  size?: keyof typeof sizeStyles;
  variant?: keyof typeof variantStyles;
};

export function AppButton({
  className,
  detail,
  label,
  size = 'md',
  variant = 'primary',
  ...props
}: AppButtonProps) {
  return (
    <Pressable
      android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
      className={cn(
        'items-center justify-center rounded-full',
        variantStyles[variant],
        sizeStyles[size],
        props.disabled && 'opacity-50',
        className
      )}
      {...props}>
      <View className="items-center gap-0.5">
        <AppText tone={labelTone[variant]} variant="bodyStrong">
          {label}
        </AppText>
        {detail ? (
          <AppText
            className={cn(variant === 'primary' ? 'text-background/80' : 'text-text-muted')}
            variant="code">
            {detail}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}
