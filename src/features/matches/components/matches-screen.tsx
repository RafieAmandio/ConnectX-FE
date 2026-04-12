import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton, AppCard, AppPill, AppText } from '@shared/components';

import { useMatchesList } from '../hooks/use-matches';
import { mockMatchesListResponse } from '../mock/matches.mock';
import type { MatchListItem } from '../types/matches.types';

function getInitials(value: string) {
  return value
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function MatchAvatar({ match }: { match: MatchListItem }) {
  if (match.user.photoUrl) {
    return (
      <Image
        contentFit="cover"
        source={{ uri: match.user.photoUrl }}
        style={{ borderRadius: 18, height: 72, width: 72 }}
      />
    );
  }

  return (
    <View className="h-[72px] w-[72px] items-center justify-center rounded-[18px] bg-[#2B2F39]">
      <AppText className="text-[22px]" tone="signal" variant="title">
        {getInitials(match.user.name)}
      </AppText>
    </View>
  );
}

function MatchRow({
  match,
  onOpenAnalysis,
  onOpenChat,
}: {
  match: MatchListItem;
  onOpenAnalysis: () => void;
  onOpenChat: () => void;
}) {
  return (
    <AppCard className="gap-4 rounded-[24px] p-4">
      <View className="flex-row gap-4">
        <MatchAvatar match={match} />

        <View className="flex-1 gap-2">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 gap-1">
              <AppText className="text-[20px]" variant="title">
                {match.user.name}
              </AppText>
              <AppText tone="muted">{match.user.headline}</AppText>
              <View className="flex-row items-center gap-1.5">
                <Ionicons color="#98A2B3" name="location-outline" size={14} />
                <AppText className="text-[13px]" tone="muted">
                  {match.user.location}
                </AppText>
              </View>
            </View>

            <View className="items-end gap-2">
              <View
                className="rounded-full px-3 py-1.5"
                style={{ backgroundColor: '#2A2117', borderColor: 'rgba(255, 154, 62, 0.32)', borderWidth: 1 }}>
                <AppText className="text-[13px]" tone="signal" variant="bodyStrong">
                  {match.fitSummary.score}%
                </AppText>
              </View>
              <AppPill
                label={match.status === 'active' ? 'Active Match' : 'Expired'}
                tone={match.status === 'active' ? 'success' : 'neutral'}
              />
            </View>
          </View>

          <View className="gap-1">
            <AppText variant="bodyStrong">{match.fitSummary.label}</AppText>
            {match.fitSummary.insight ? (
              <AppText tone="muted">{match.fitSummary.insight}</AppText>
            ) : null}
          </View>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="gap-1">
          <AppText className="text-[12px]" tone="muted" variant="label">
            Expires In
          </AppText>
          <AppText variant="bodyStrong">
            {match.expiresInDays > 0 ? `${match.expiresInDays} days` : 'Today'}
          </AppText>
        </View>

        <View className="flex-row items-center gap-3">
          <Pressable
            className="h-12 w-12 items-center justify-center rounded-full border"
            disabled={!match.actions.canChat || !match.conversationId}
            onPress={onOpenChat}
            style={{
              backgroundColor: '#1A1C22',
              borderColor: 'rgba(152, 162, 179, 0.15)',
              opacity: !match.actions.canChat || !match.conversationId ? 0.45 : 1,
            }}>
            <Ionicons color="#FF9A3E" name="chatbubble-ellipses-outline" size={22} />
          </Pressable>

          <AppButton
            detail={match.hasMessaged ? 'Open fit breakdown' : 'Review before first chat'}
            label="View"
            onPress={onOpenAnalysis}
            variant="secondary"
          />
        </View>
      </View>
    </AppCard>
  );
}

export function MatchesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const matchesQuery = useMatchesList({ limit: 10, page: 1, status: 'active' });

  const usingFallback = matchesQuery.isError;
  const matches = usingFallback
    ? mockMatchesListResponse.data.items
    : (matchesQuery.data?.data.items ?? []);

  const summarySource = usingFallback ? mockMatchesListResponse.data : matchesQuery.data?.data;
  const totalMatches = summarySource?.total ?? matches.length;
  const activeMatches = matches.filter((match) => match.status === 'active').length;
  const averageScore =
    matches.length > 0
      ? Math.round(matches.reduce((sum, match) => sum + match.fitSummary.score, 0) / matches.length)
      : 0;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ gap: 20, paddingBottom: 32, paddingHorizontal: 16, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}>
        <View className="gap-3">
          <AppPill className="self-start" label="Connect" tone="accent" />
          <AppText variant="hero">Mutual matches worth a real conversation.</AppText>
          <AppText tone="muted">
            Open the chat when you are ready, or review the team-fit breakdown first.
          </AppText>
        </View>

        {usingFallback ? (
          <AppCard tone="signal" className="gap-2 rounded-[18px] p-3">
            <AppText variant="subtitle">Using fallback matches</AppText>
            <AppText tone="muted">
              The live matches API failed, so this screen is showing the contract-shaped fallback response.
            </AppText>
          </AppCard>
        ) : null}

        <View className="flex-row gap-3">
          <AppCard className="flex-1 gap-1 rounded-[20px] p-4">
            <AppText tone="muted" variant="label">
              Total
            </AppText>
            <AppText variant="title">{totalMatches}</AppText>
          </AppCard>
          <AppCard className="flex-1 gap-1 rounded-[20px] p-4">
            <AppText tone="muted" variant="label">
              Active
            </AppText>
            <AppText variant="title">{activeMatches}</AppText>
          </AppCard>
          <AppCard className="flex-1 gap-1 rounded-[20px] p-4">
            <AppText tone="muted" variant="label">
              Avg Fit
            </AppText>
            <AppText variant="title">{averageScore}%</AppText>
          </AppCard>
        </View>

        {matchesQuery.isLoading && !usingFallback ? (
          <AppCard className="gap-2 rounded-[22px] p-4">
            <AppText variant="subtitle">Loading matches...</AppText>
            <AppText tone="muted">Pulling mutual matches and fit signals for this account.</AppText>
          </AppCard>
        ) : null}

        {matches.length === 0 && !matchesQuery.isLoading ? (
          <AppCard className="gap-2 rounded-[24px] p-5">
            <AppText variant="title">No matches yet</AppText>
            <AppText tone="muted">Keep swiping. New mutual matches will show up here.</AppText>
          </AppCard>
        ) : null}

        {matches.map((match) => (
          <MatchRow
            key={match.matchId}
            match={match}
            onOpenAnalysis={() => router.push(`/match-analysis/${match.matchId}` as never)}
            onOpenChat={() => {
              if (!match.conversationId) {
                return;
              }

              router.push(`/conversation/${match.conversationId}`);
            }}
          />
        ))}
      </ScrollView>
    </View>
  );
}
