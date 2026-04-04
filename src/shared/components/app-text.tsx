import { Text, type TextProps } from 'react-native';

import { cn } from '@shared/utils/cn';

const variantStyles = {
  display: 'font-display text-5xl leading-[52px] tracking-[-1.25px]',
  hero: 'font-display text-4xl leading-10 tracking-[-0.9px]',
  title: 'font-display text-[26px] leading-8 tracking-[-0.45px]',
  subtitle: 'font-body text-lg font-semibold leading-7',
  body: 'font-body text-base leading-6',
  bodyStrong: 'font-body text-base font-semibold leading-6',
  label: 'font-body text-xs font-bold uppercase tracking-[1.8px]',
  code: 'font-code text-[13px] leading-5',
} as const;

const toneStyles = {
  default: 'text-text',
  muted: 'text-text-muted',
  soft: 'text-text-soft',
  accent: 'text-accent',
  inverse: 'text-background',
  signal: 'text-signal',
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
