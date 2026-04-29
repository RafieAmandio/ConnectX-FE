import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppCard, AppPill, AppText } from '@shared/components';

import { useMatchAnalysis } from '../hooks/use-matches';
import { getFallbackMatchAnalysis } from '../mock/matches.mock';

const APP_BACKGROUND = '#262626';
const PANEL_BACKGROUND = '#2E2C2B';
const PANEL_BACKGROUND_STRONG = '#332E29';
const PANEL_BORDER = '#414141';
const TEXT_PRIMARY = '#F1F1F1';

type AnalysisPalette = {
  accent: string;
  accentSoft: string;
  border: string;
  label: string;
  ringTrack: string;
};

function getAnalysisPalette(score: number, label: string): AnalysisPalette {
  const normalizedLabel = label.toLowerCase();

  if (score >= 85 || normalizedLabel.includes('strong') || normalizedLabel.includes('perfect')) {
    return {
      accent: '#FF9A3E',
      accentSoft: '#3A2A1D',
      border: '#6B4A2C',
      label: 'High fit',
      ringTrack: '#3A3027',
    };
  }

  if (score >= 70 || normalizedLabel.includes('warm')) {
    return {
      accent: '#FFD33D',
      accentSoft: '#3A321C',
      border: '#6A5928',
      label: 'Promising fit',
      ringTrack: '#39342A',
    };
  }

  if (score >= 55) {
    return {
      accent: '#60A5FA',
      accentSoft: '#223244',
      border: '#355B86',
      label: 'Needs alignment',
      ringTrack: '#2B3340',
    };
  }

  return {
    accent: '#F87171',
    accentSoft: '#3A2424',
    border: '#763A3A',
    label: 'Review fit',
    ringTrack: '#382C2C',
  };
}

function BulletList({
  color,
  items,
}: {
  color: string;
  items: string[];
}) {
  return (
    <View className="gap-2">
      {items.map((item) => (
        <View key={item} className="flex-row items-start gap-2">
          <View
            className="mt-1.5 h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          <AppText className="flex-1 text-[13px] leading-[18px] text-[#DAD7D2]">{item}</AppText>
        </View>
      ))}
    </View>
  );
}

function AnalysisCard({
  children,
  palette,
  icon,
  title,
}: React.PropsWithChildren<{
  palette: AnalysisPalette;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}>) {
  return (
    <AppCard
      className="gap-3 rounded-[20px] border px-4 py-4"
      style={{
        backgroundColor: PANEL_BACKGROUND,
        borderColor: PANEL_BORDER,
        shadowColor: 'transparent',
      }}>
      <View className="flex-row items-center gap-2">
        <View
          className="h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: palette.accentSoft }}>
          <Ionicons color={palette.accent} name={icon} size={17} />
        </View>
        <AppText className="flex-1 text-[15px] text-[#F1F1F1]" variant="subtitle">
          {title}
        </AppText>
      </View>
      {children}
    </AppCard>
  );
}

export function MatchAnalysisScreen({ matchId }: { matchId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const analysisQuery = useMatchAnalysis(matchId);
  const usingFallback = analysisQuery.isError || !analysisQuery.data?.data;
  const response = analysisQuery.data?.data
    ? analysisQuery.data
    : getFallbackMatchAnalysis(matchId);
  const analysis = response.data.analysis;
  const user = response.data.user;
  const palette = getAnalysisPalette(analysis.compatibilityScore, analysis.label);
  const dynamicPanelStyle: ViewStyle = {
    backgroundColor: PANEL_BACKGROUND_STRONG,
    borderColor: palette.border,
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1" style={{ backgroundColor: APP_BACKGROUND }}>
        <View
          className="border-b px-4 pb-3 pt-14"
          style={{ backgroundColor: APP_BACKGROUND, borderColor: PANEL_BORDER }}>
          <View className="flex-row items-center gap-3">
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-full border"
              style={{ backgroundColor: PANEL_BACKGROUND, borderColor: PANEL_BORDER }}
              onPress={() => router.back()}>
              <Ionicons color={TEXT_PRIMARY} name="arrow-back" size={18} />
            </Pressable>
            <AppText className="flex-1 text-[17px] text-[#F1F1F1]" variant="title">
              Startup Team Fit Analysis
            </AppText>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            gap: 12,
            paddingBottom: Math.max(insets.bottom + 24, 24),
            paddingHorizontal: 14,
            paddingTop: 14,
          }}
          showsVerticalScrollIndicator={false}>
          {usingFallback ? (
            <AppCard
              className="gap-2 rounded-[18px] border p-3"
              style={{
                backgroundColor: palette.accentSoft,
                borderColor: palette.border,
                shadowColor: 'transparent',
              }}>
              <AppText className="text-[#F1F1F1]" variant="subtitle">Using fallback analysis</AppText>
              <AppText className="text-[#D8C6A5]">
                The live analysis endpoint failed, so this detail screen is rendering the fallback contract response.
              </AppText>
            </AppCard>
          ) : null}

          {analysisQuery.isLoading && !usingFallback ? (
            <AppCard
              className="gap-2 rounded-[18px] border p-3"
              style={{
                backgroundColor: PANEL_BACKGROUND,
                borderColor: PANEL_BORDER,
                shadowColor: 'transparent',
              }}>
              <AppText className="text-[#F1F1F1]" variant="subtitle">Loading analysis...</AppText>
              <AppText className="text-[#A7A29E]">Preparing the fit breakdown for this match.</AppText>
            </AppCard>
          ) : null}

          <View
            className="items-center gap-3 rounded-[28px] px-4 py-5"
          >
            <View className="relative h-[172px] w-[172px] items-center justify-center">
              {/* Track ring */}
              <View
                className="absolute rounded-full border-[12px]"
                style={{
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderColor: palette.ringTrack,
                }}
              />
              {/* Accent arc */}
              <View
                className="absolute rounded-full border-[12px]"
                style={{
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderColor: palette.accent,
                  borderLeftColor: palette.ringTrack,
                  transform: [{ rotate: '-35deg' }],
                }}
              />
              <View className="items-center gap-1">
                <AppText className="text-[38px]" style={{ color: palette.accent }} variant="hero">
                  {analysis.compatibilityScore}%
                </AppText>
                <AppText className="text-[12px] text-[#A7A29E]">Compatibility</AppText>
              </View>
            </View>

            <View className="items-center gap-0.5">
              <View
                className="rounded-full border px-3 py-1"
                style={{ backgroundColor: palette.accentSoft, borderColor: palette.border }}>
                <AppText className="text-[11px] uppercase" style={{ color: palette.accent }} variant="label">
                  {palette.label}
                </AppText>
              </View>
              <AppText className="mt-1 text-center text-[16px] text-[#F1F1F1]" variant="title">
                {analysis.label}
              </AppText>
              <AppText className="text-center text-[13px] text-[#A7A29E]">
                {analysis.subtitle}
              </AppText>
            </View>
          </View>

          {analysis.skillComplementarity ? (
            <AnalysisCard icon="construct-outline" palette={palette} title={analysis.skillComplementarity.title}>
              <View className="flex-row gap-4">
                <View className="flex-1 gap-2">
                  <AppText className="text-[11px] text-[#A7A29E]" variant="label">
                    You Bring
                  </AppText>
                  <BulletList color={palette.accent} items={analysis.skillComplementarity.youBring} />
                </View>
                <View className="flex-1 gap-2">
                  <AppText className="text-[11px] text-[#A7A29E]" variant="label">
                    {user.name.toUpperCase()} BRINGS
                  </AppText>
                  <BulletList color="#FFCD38" items={analysis.skillComplementarity.theyBring} />
                </View>
              </View>
              {analysis.skillComplementarity.summary ? (
                <AppText className="text-[12px] italic text-[#A7A29E]">
                  {analysis.skillComplementarity.summary}
                </AppText>
              ) : null}
            </AnalysisCard>
          ) : null}

          {analysis.startupVisionAlignment ? (
            <AnalysisCard icon="locate-outline" palette={palette} title={analysis.startupVisionAlignment.title}>
              <View className="gap-3">
                <AppText className="text-[#A7A29E]" variant="label">
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
            <AnalysisCard icon="time-outline" palette={palette} title={analysis.commitmentCompatibility.title}>
              <View className="flex-row justify-between gap-4">
                <View className="flex-1 gap-0.5">
                  <AppText className="text-[12px] text-[#A7A29E]">You</AppText>
                  <AppText className="text-[14px] text-[#F1F1F1]" variant="title">{analysis.commitmentCompatibility.you}</AppText>
                </View>
                <View className="flex-1 items-end gap-0.5">
                  <AppText className="text-[12px] text-[#A7A29E]">{user.name}</AppText>
                  <AppText className="text-[14px] text-[#F1F1F1]" align="right" variant="title">
                    {analysis.commitmentCompatibility.them}
                  </AppText>
                </View>
              </View>
            </AnalysisCard>
          ) : null}

          {analysis.workStyle ? (
            <AnalysisCard icon="briefcase-outline" palette={palette} title={analysis.workStyle.title}>
              <View className="flex-row flex-wrap gap-2">
                {analysis.workStyle.traits.map((trait) => (
                  <AppPill key={trait} label={trait} tone="neutral" />
                ))}
              </View>
            </AnalysisCard>
          ) : null}

          {analysis.potentialRisks ? (
            <AnalysisCard icon="warning-outline" palette={palette} title={analysis.potentialRisks.title}>
              <BulletList color="#EF4444" items={analysis.potentialRisks.items} />
            </AnalysisCard>
          ) : null}

          {analysis.suggestedRoles ? (
            <AnalysisCard icon="people-outline" palette={palette} title={analysis.suggestedRoles.title}>
              <View className="gap-3">
                <View className="flex-row items-center justify-between gap-3">
                  <AppText className="flex-1 text-[13px] text-[#DAD7D2]">You</AppText>
                  <View
                    className="rounded-full border px-3 py-1"
                    style={{ backgroundColor: palette.accentSoft, borderColor: palette.border }}>
                    <AppText className="text-[13px]" style={{ color: palette.accent }} variant="bodyStrong">
                      {analysis.suggestedRoles.you}
                    </AppText>
                  </View>
                </View>
                <View className="flex-row items-center justify-between gap-3">
                  <AppText className="flex-1 text-[13px] text-[#DAD7D2]">{user.name}</AppText>
                  <View
                    className="rounded-full border px-3 py-1"
                    style={{ backgroundColor: '#2A2117', borderColor: 'rgba(255, 205, 56, 0.28)' }}>
                    <AppText className="text-[13px]" style={{ color: '#FFCD38' }} variant="bodyStrong">
                      {analysis.suggestedRoles.them}
                    </AppText>
                  </View>
                </View>
              </View>
            </AnalysisCard>
          ) : null}

          {analysis.suggestedTeamStructure ? (
            <AnalysisCard icon="grid-outline" palette={palette} title={analysis.suggestedTeamStructure.title}>
              <View className="flex-row flex-wrap justify-center gap-2">
                {analysis.suggestedTeamStructure.roles.map((role) => (
                  <View
                    key={role}
                    className="w-[46%] rounded-[14px] border px-3 py-3"
                    style={{ backgroundColor: '#33302D', borderColor: 'rgba(152, 162, 179, 0.16)' }}>
                    <AppText align="center" className="text-[13px] text-[#F1F1F1]" variant="subtitle">
                      {role}
                    </AppText>
                  </View>
                ))}
              </View>
            </AnalysisCard>
          ) : null}
        </ScrollView >
      </View >
    </>
  );
}
