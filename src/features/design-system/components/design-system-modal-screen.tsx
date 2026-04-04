import { ScrollView, View } from 'react-native';

import { AppCard, AppText } from '@shared/components';
import { DesignPrinciples } from '@shared/theme';

const implementationNotes = [
  'Use semantic token names in product code so future palette changes do not require component rewrites.',
  'Keep route files focused on composition; reusable UI primitives should live outside the `app` directory.',
  'Expo Router API routes can adopt these tokens for docs or previews later, but the token source itself remains client-safe and shared.',
] as const;

export function DesignSystemModalScreen() {
  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerClassName="gap-4 px-5 pt-4 pb-16"
      contentInsetAdjustmentBehavior="automatic">
      <AppCard className="gap-3">
        <AppText tone="accent" variant="label">
          System Summary
        </AppText>
        <AppText variant="hero">Design rules to keep the app cohesive as it grows.</AppText>
        <AppText tone="muted">
          This sheet is the quick reference for future screens, feature spikes, and any shared UI
          work we add later.
        </AppText>
      </AppCard>

      <View className="gap-3">
        {DesignPrinciples.map((principle) => (
          <AppCard key={principle.title} className="gap-2">
            <AppText variant="subtitle">{principle.title}</AppText>
            <AppText tone="muted">{principle.description}</AppText>
          </AppCard>
        ))}
      </View>

      <AppCard tone="muted" className="gap-3">
        <AppText variant="subtitle">Implementation Notes</AppText>
        {implementationNotes.map((note) => (
          <AppText key={note} tone="muted">
            - {note}
          </AppText>
        ))}
      </AppCard>
    </ScrollView>
  );
}
