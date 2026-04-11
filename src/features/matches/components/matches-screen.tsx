import { Stack } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { AppCard, AppPill, AppStatCard, AppText } from '@shared/components';

import { SwipeDeck } from './swipe-deck';

const matchBlueprints = [
  ['Maya Chen', 'Product strategist', '92%', 'Warm lead', 'Strong async communicator with marketplace experience and a calm leadership style.'],
  ['Rafi Nandha', 'Operations partner', '88%', 'Needs review', 'Great at coordinating teams across time zones and keeping execution detail sharp.'],
  ['Jess Alvarez', 'Community builder', '95%', 'Ready to chat', 'Brings fast trust-building, crisp writing, and a strong instinct for member onboarding.'],
  ['Nina Patel', 'Growth operator', '91%', 'Warm lead', 'Balances creative experiments with disciplined reporting and fast weekly iteration.'],
  ['Owen Brooks', 'Technical founder', '86%', 'Needs review', 'Sharp product instincts with a bias toward shipping practical features over theory.'],
  ['Lina Gomez', 'Partnership lead', '94%', 'Ready to chat', 'Builds trust quickly and keeps multi-party deals moving with calm follow-through.'],
  ['Haruto Sato', 'Marketplace analyst', '89%', 'Warm lead', 'Strong on funnel diagnosis, pricing signals, and opportunity sizing.'],
  ['Ava Johnson', 'Member success lead', '93%', 'Ready to chat', 'Customer-centric operator with a knack for reducing churn and sharpening onboarding.'],
  ['Theo Martin', 'Design systems lead', '87%', 'Needs review', 'Creates clean interaction systems and keeps teams aligned on product quality.'],
  ['Farah Rahman', 'Community host', '90%', 'Warm lead', 'Makes new members feel seen fast and turns loose interest into active participation.'],
  ['Diego Silva', 'Sales advisor', '84%', 'Needs review', 'Good outbound instincts and consistent follow-up with a clear handoff style.'],
  ['Chloe Bennett', 'People operator', '96%', 'Ready to chat', 'Brings empathy, crisp communication, and excellent cross-functional judgment.'],
  ['Imran Yusuf', 'Revenue strategist', '85%', 'Warm lead', 'Comfortable with monetization tests, pricing ladders, and retention levers.'],
  ['Grace Lee', 'Brand builder', '91%', 'Warm lead', 'Blends community storytelling with disciplined execution and clear campaign thinking.'],
  ['Noah Kim', 'Product marketer', '88%', 'Needs review', 'Strong positioning instincts with clean launch planning and sharp messaging.'],
  ['Sara Costa', 'Customer researcher', '94%', 'Ready to chat', 'Pulls clear insights from interviews and turns them into action for product teams.'],
  ['Ethan Walker', 'Operations chief', '83%', 'Needs review', 'Solid operator who thrives in ambiguity and tidies messy systems quickly.'],
  ['Priya Menon', 'Growth PM', '92%', 'Warm lead', 'Connects product bets to revenue outcomes and keeps experiments grounded in user behavior.'],
  ['Lucas Reed', 'Community strategist', '89%', 'Warm lead', 'Builds repeatable engagement loops without losing the human feel of the experience.'],
  ['Amara Okafor', 'Founder associate', '97%', 'Ready to chat', 'High-trust generalist who can turn direction into thoughtful execution immediately.'],
] as const;

const matches = matchBlueprints.map(([name, role, score, status, bio]) => ({
  bio,
  name,
  role,
  score,
  status,
}));

export function MatchesScreen() {
  const readyCount = matches.filter((match) => match.status === 'Ready to chat').length;
  const averageScore = Math.round(
    matches.reduce((sum, match) => sum + Number.parseInt(match.score, 10), 0) / matches.length
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Pipeline' }} />
      <ScrollView
        className="flex-1 bg-canvas"
        contentContainerClassName="gap-6 px-5 pt-4 pb-24"
        contentInsetAdjustmentBehavior="automatic">
        <View className="gap-3">
          <AppPill className="self-start" label="Pipeline" tone="accent" />
          <AppText variant="hero">Review high-fit members without losing context.</AppText>
          <AppText tone="muted">
            This queue is built to answer one question fast: who deserves the next step right now?
          </AppText>
        </View>

        <View className="flex-row gap-3">
          <AppStatCard
            className="flex-1"
            detail="Average fit"
            label="Score"
            tone="accent"
            value={`${averageScore}%`}
          />
          <AppStatCard
            className="flex-1"
            detail="Ready now"
            label="Hot Leads"
            tone="success"
            value={String(readyCount)}
          />
        </View>

        <SwipeDeck items={matches} />

        <AppCard tone="muted" className="gap-2">
          <AppText variant="subtitle">Decision rule</AppText>
          <AppText tone="muted">Pass when the timing is wrong. Advance when the fit is clear.</AppText>
        </AppCard>
      </ScrollView>
    </>
  );
}
