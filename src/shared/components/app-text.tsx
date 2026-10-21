import { Text, type TextProps } from 'react-native';

import { cn } from '@shared/utils/cn';

const variantStyles = {
  display: 'font-display text-[40px] leading-[44px] tracking-[-1.4px] font-bold',
  hero: 'font-display text-[32px] leading-[38px] tracking-[-1px] font-bold',
  title: 'font-display text-2xl leading-[30px] tracking-[-0.7px] font-bold',
  subtitle: 'font-body text-lg font-semibold leading-6',
  body: 'font-body text-[15px] leading-[22px]',
  bodyStrong: 'font-body text-[15px] leading-[22px] font-semibold',
  label: 'font-body text-xs font-semibold uppercase tracking-[0.9px]',
  code: 'font-body text-[13px] leading-5',
} as const;

const toneStyles = {
  default: 'text-text',
  muted: 'text-text-muted',
  soft: 'text-text-soft',
  accent: 'text-accent',
  inverse: 'text-text',
  onAccent: 'text-[#1A1208]',
  signal: 'text-signal',
  success: 'text-success',
  danger: 'text-danger',
} as const;

const alignStyles = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const;

export type AppTextProps = TextProps & {
  align?: keyof typeof alignStyles;
  className?: string;
  tone?: keyof typeof toneStyles;
  variant?: keyof typeof variantStyles;
};

export function AppText({
  align = 'left',
  className,
  tone = 'default',
  variant = 'body',
  ...props
}: AppTextProps) {
  return (
    <Text
      className={cn(variantStyles[variant], toneStyles[tone], alignStyles[align], className)}
      {...props}
    />
  );
}
