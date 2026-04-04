import { View, type ViewProps } from 'react-native';

import { Shadows } from '@shared/theme';
import { cn } from '@shared/utils/cn';

const toneStyles = {
  default: 'border-border bg-surface-raised',
  muted: 'border-border bg-surface',
  accent: 'border-accent/20 bg-accent-tint',
  signal: 'border-signal/25 bg-signal-tint',
} as const;

export type AppCardProps = ViewProps & {
  className?: string;
  tone?: keyof typeof toneStyles;
};

export function AppCard({ className, style, tone = 'default', ...props }: AppCardProps) {
  return (
    <View
      className={cn('rounded-[28px] border p-5', toneStyles[tone], className)}
      style={[Shadows.card, style]}
      {...props}
    />
  );
}
