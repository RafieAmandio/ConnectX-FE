import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppCard, AppPill, AppText } from '@shared/components';

import { useMatchAnalysis } from '../hooks/use-matches';
import { getFallbackMatchAnalysis } from '../mock/matches.mock';

function BulletList({
  color,
  items,
}: {
  color: string;
  items: string[];
}) {
  return (
    <View className="gap-3">
      {items.map((item) => (
        <View key={item} className="flex-row items-start gap-3">
          <View
            className="mt-1.5 h-3 w-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <AppText className="flex-1 text-[16px]">{item}</AppText>
        </View>
      ))}
    </View>
  );
}

function AnalysisCard({
  children,
  icon,
  title,
}: React.PropsWithChildren<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}>) {
  return (
    <AppCard className="gap-4 rounded-[26px] p-5">
      <View className="flex-row items-center gap-3">
        <Ionicons color="#FF9A3E" name={icon} size={22} />
        <AppText className="text-[18px]" variant="subtitle">
          {title}
        </AppText>
      </View>
      {children}
    </AppCard>
  );
}

export function MatchAnalysisScreen({ matchId }: { matchId: string }) {
  const router = useRouter();
  const analysisQuery = useMatchAnalysis(matchId);
  const usingFallback = analysisQuery.isError || !analysisQuery.data?.data;
  const response = analysisQuery.data?.data
    ? analysisQuery.data
    : getFallbackMatchAnalysis(matchId);
  const analysis = response.data.analysis;
  const user = response.data.user;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-background">
        <View className="border-b border-border px-4 pb-5 pt-14">
          <View className="flex-row items-center gap-4">
            <Pressable
              className="h-12 w-12 items-center justify-center rounded-full border border-border bg-surface"
              onPress={() => router.back()}>
              <Ionicons color="#F5F7FA" name="arrow-back" size={22} />
            </Pressable>
            <AppText className="flex-1 text-[22px]" variant="title">
              Startup Team Fit Analysis
            </AppText>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ gap: 18, paddingBottom: 32, paddingHorizontal: 16, paddingTop: 18 }}
          showsVerticalScrollIndicator={false}>
          {usingFallback ? (
            <AppCard tone="signal" className="gap-2 rounded-[18px] p-3">
              <AppText variant="subtitle">Using fallback analysis</AppText>
              <AppText tone="muted">
                The live analysis endpoint failed, so this detail screen is rendering the fallback contract response.
              </AppText>
            </AppCard>
          ) : null}

          {analysisQuery.isLoading && !usingFallback ? (
            <AppCard className="gap-2 rounded-[18px] p-3">
              <AppText variant="subtitle">Loading analysis...</AppText>
              <AppText tone="muted">Preparing the fit breakdown for this match.</AppText>
            </AppCard>
          ) : null}

          <View className="items-center gap-5 px-4 py-6">
            {user.photoUrl ? (
              <Image
                contentFit="cover"
                source={{ uri: user.photoUrl }}
                style={{ borderRadius: 999, height: 88, width: 88 }}
              />
            ) : null}
            <View className="h-[214px] w-[214px] items-center justify-center rounded-full border-[14px] border-[#2B2F35]">
              <View
                className="absolute inset-0 rounded-full border-[14px]"
                style={{
                  borderColor: '#FF9A3E',
                  borderTopColor: '#FF9A3E',
                  borderRightColor: '#FF9A3E',
                  borderBottomColor: '#FF9A3E',
                  borderLeftColor: '#2B2F35',
                  transform: [{ rotate: '-35deg' }],
                }}
              />
              <View className="items-center gap-2">
                <AppText className="text-[48px]" tone="signal" variant="hero">
                  {analysis.compatibilityScore}%
                </AppText>
                <AppText tone="muted">Compatibility</AppText>
              </View>
            </View>

            <View className="items-center gap-1">
              <AppText className="text-center" variant="title">
                {analysis.label}
              </AppText>
              <AppText className="text-[16px]" tone="muted">
                {analysis.subtitle}
              </AppText>
            </View>
          </View>

          {analysis.skillComplementarity ? (
            <AnalysisCard icon="construct-outline" title={analysis.skillComplementarity.title}>
              <View className="flex-row gap-6">
                <View className="flex-1 gap-3">
                  <AppText tone="muted" variant="label">
                    You Bring
                  </AppText>
                  <BulletList color="#FF9A3E" items={analysis.skillComplementarity.youBring} />
                </View>
                <View className="flex-1 gap-3">
                  <AppText tone="muted" variant="label">
                    {user.name.toUpperCase()} BRINGS
                  </AppText>
                  <BulletList color="#FFCD38" items={analysis.skillComplementarity.theyBring} />
                </View>
              </View>
              {analysis.skillComplementarity.summary ? (
                <AppText className="italic" tone="muted">
                  {analysis.skillComplementarity.summary}
                </AppText>
              ) : null}
            </AnalysisCard>
          ) : null}

          {analysis.startupVisionAlignment ? (
            <AnalysisCard icon="locate-outline" title={analysis.startupVisionAlignment.title}>
              <View className="gap-3">
                <AppText tone="muted" variant="label">
                  Shared Interests
                </AppText>
                <View className="flex-row flex-wrap gap-2">
                  {analysis.startupVisionAlignment.sharedInterests.map((interest) => (
                    <AppPill key={interest} label={interest} tone="signal" />
                  ))}
                </View>
              </View>
            </AnalysisCard>
          ) : null}

          {analysis.commitmentCompatibility ? (
            <AnalysisCard icon="time-outline" title={analysis.commitmentCompatibility.title}>
              <View className="flex-row justify-between gap-6">
                <View className="flex-1 gap-1">
                  <AppText tone="muted">You</AppText>
                  <AppText variant="title">{analysis.commitmentCompatibility.you}</AppText>
                </View>
                <View className="flex-1 items-end gap-1">
                  <AppText tone="muted">{user.name}</AppText>
                  <AppText align="right" variant="title">
                    {analysis.commitmentCompatibility.them}
                  </AppText>
                </View>
              </View>
            </AnalysisCard>
          ) : null}

          {analysis.workStyle ? (
            <AnalysisCard icon="briefcase-outline" title={analysis.workStyle.title}>
              <View className="flex-row flex-wrap gap-2">
                {analysis.workStyle.traits.map((trait) => (
                  <AppPill key={trait} label={trait} tone="neutral" />
                ))}
              </View>
            </AnalysisCard>
          ) : null}

          {analysis.potentialRisks ? (
            <AnalysisCard icon="warning-outline" title={analysis.potentialRisks.title}>
              <BulletList color="#EF4444" items={analysis.potentialRisks.items} />
            </AnalysisCard>
          ) : null}

          {analysis.suggestedRoles ? (
            <AnalysisCard icon="people-outline" title={analysis.suggestedRoles.title}>
              <View className="gap-5">
                <View className="flex-row items-center justify-between gap-4">
                  <AppText className="flex-1 text-[17px]">You</AppText>
                  <View
                    className="rounded-full border px-4 py-2"
                    style={{ backgroundColor: '#2A2117', borderColor: 'rgba(255, 154, 62, 0.28)' }}>
                    <AppText className="text-[16px]" tone="signal" variant="bodyStrong">
                      {analysis.suggestedRoles.you}
                    </AppText>
                  </View>
                </View>
                <View className="flex-row items-center justify-between gap-4">
                  <AppText className="flex-1 text-[17px]">{user.name}</AppText>
                  <View
                    className="rounded-full border px-4 py-2"
                    style={{ backgroundColor: '#2A2117', borderColor: 'rgba(255, 205, 56, 0.28)' }}>
                    <AppText className="text-[16px]" style={{ color: '#FFCD38' }} variant="bodyStrong">
                      {analysis.suggestedRoles.them}
                    </AppText>
                  </View>
                </View>
              </View>
            </AnalysisCard>
          ) : null}

          {analysis.suggestedTeamStructure ? (
            <AnalysisCard icon="grid-outline" title={analysis.suggestedTeamStructure.title}>
              <View className="flex-row flex-wrap gap-3">
                {analysis.suggestedTeamStructure.roles.map((role) => (
                  <View
                    key={role}
                    className="min-w-[46%] rounded-[18px] border px-4 py-5"
                    style={{ backgroundColor: '#1A1C22', borderColor: 'rgba(152, 162, 179, 0.16)' }}>
                    <AppText align="center" className="text-[16px]" variant="subtitle">
                      {role}
                    </AppText>
                  </View>
                ))}
              </View>
            </AnalysisCard>
          ) : null}
        </ScrollView>
      </View>
    </>
  );
}
