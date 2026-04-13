import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppCard, AppText } from '@shared/components';

import { useMatchesList } from '../hooks/use-matches';
import { mockMatchesListResponse } from '../mock/matches.mock';
import type { MatchListItem } from '../types/matches.types';

function MatchAvatar({ match }: { match: MatchListItem }) {
  return (
    <View className="relative h-[76px] w-[76px]">
      {match.user.photoUrl ? (
        <Image
          contentFit="cover"
          source={{ uri: match.user.photoUrl }}
          style={{ borderRadius: 38, height: 76, width: 76 }}
        />
      ) : (
        <View className="h-[76px] w-[76px] items-center justify-center rounded-full bg-[#2B2F39]">
          <AppText className="text-[24px]" tone="signal" variant="title">
            {match.user.name.charAt(0).toUpperCase()}
          </AppText>
        </View>
      )}

      <View className="absolute inset-0 rounded-full border-[3px] border-[#6B4A2C]" />

      {match.isOnline ? (
        <View className="absolute bottom-0 right-0 h-5 w-5 rounded-full border-[3px] border-[#2A2927] bg-[#4ADE80]" />
      ) : null}
    </View>
  );
}

function LockedConnectCard({ photoUrl }: { photoUrl: string | null }) {
  return (
    <View className="h-[160px] flex-1 overflow-hidden rounded-[24px] border border-[#424242] bg-[#2B2B2D]">
      {photoUrl ? (
        <Image
          blurRadius={26}
          contentFit="cover"
          source={{ uri: photoUrl }}
          style={{ height: '100%', opacity: 0.8, width: '100%' }}
        />
      ) : (
        <View className="h-full w-full bg-[#34343A]" />
      )}

      <View
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(24, 24, 27, 0.4)' }}
      />

      <View className="absolute inset-0 items-center justify-center">
        <Ionicons color="#D8D1CB" name="lock-closed-outline" size={34} />
      </View>
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
  const canChat = match.actions.canChat && Boolean(match.conversationId);
  const expiresLabel = match.expiresInDays > 0 ? `Expires in ${match.expiresInDays} days` : 'Expires today';

  return (
    <AppCard
      className="rounded-[26px] border-[#414141] bg-[#2E2C2B] px-5 py-5"
      style={{ shadowColor: 'transparent' }}>
      <View className="flex-row items-center gap-4">
        <MatchAvatar match={match} />

        <View className="flex-1 gap-1">
          <AppText className="text-[22px] leading-[28px] text-[#F1F1F1]" variant="title">
            {match.user.name}
          </AppText>
          <AppText className="text-[15px] leading-[22px] text-[#9F9C99]">
            {match.user.headline} · {match.user.location}
          </AppText>
          <View className="mt-1 flex-row items-center gap-2">
            <Ionicons color="#FFD33D" name="time-outline" size={17} />
            <AppText className="text-[14px] font-semibold text-[#FFD33D]">{expiresLabel}</AppText>
          </View>
        </View>

        <View className="ml-2 flex-row items-center gap-4">
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full"
            disabled={!canChat}
            onPress={onOpenChat}
            style={{ opacity: canChat ? 1 : 0.45 }}>
            <Ionicons color="#FF9F3F" name="chatbubble-outline" size={25} />
          </Pressable>

          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full"
            disabled={!match.actions.canViewAnalysis}
            onPress={onOpenAnalysis}
            style={{ opacity: match.actions.canViewAnalysis ? 1 : 0.45 }}>
            <Ionicons color="#8B8B8B" name="eye-outline" size={26} />
          </Pressable>
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

  const lockedConnects = Array.from({ length: 3 }, (_, index) => matches[index] ?? null);
  const matchCountLabel = `${matches.length} ${matches.length === 1 ? 'match' : 'matches'}`;

  return (
    <View className="flex-1 bg-[#242322]" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 36, paddingHorizontal: 16, paddingTop: 10 }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}>
        <View className="gap-8">
          <View className="gap-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <Ionicons color="#FF9F3F" name="heart" size={24} />
                <AppText className="text-[18px] text-[#F1F1F1]" variant="title">
                  Your Connects
                </AppText>
              </View>

              <View className="rounded-full bg-[#5A3C23] px-4 py-2">
                <AppText className="text-[14px] font-semibold uppercase tracking-[0.3px] text-[#FFB35E]">
                  12 new
                </AppText>
              </View>
            </View>

            <View className="flex-row gap-4">
              {lockedConnects.map((match, index) => (
                <LockedConnectCard
                  key={match ? `locked-${match.matchId}` : `locked-placeholder-${index}`}
                  photoUrl={match?.user.photoUrl ?? null}
                />
              ))}
            </View>

            <Pressable
              className="flex-row items-center justify-center gap-3 rounded-[24px] border px-6 py-5"
              style={{ backgroundColor: '#5B4720', borderColor: '#AD8528' }}>
              <Ionicons color="#FFD33D" name="sparkles-outline" size={22} />
              <AppText className="text-[18px] text-[#FFD33D]" variant="subtitle">
                Unlock Connects
              </AppText>
            </Pressable>
          </View>

          <View className="gap-4">
            <View className="flex-row items-center justify-between">
              <AppText className="text-[24px] text-[#F1F1F1]" variant="title">
                Your Matches
              </AppText>
              <AppText className="text-[15px] text-[#9F9C99]">{matchCountLabel}</AppText>
            </View>

            {usingFallback ? (
              <AppCard
                className="rounded-[20px] border-[#5A4726] bg-[#312A1E] p-4"
                style={{ shadowColor: 'transparent' }}>
                <AppText className="text-[#F1F1F1]" variant="subtitle">
                  Showing fallback matches
                </AppText>
                <AppText className="mt-1 text-[#BBA98D]">
                  The live matches request failed, so this screen is using local mock data.
                </AppText>
              </AppCard>
            ) : null}

            {matchesQuery.isLoading && !usingFallback ? (
              <AppCard
                className="rounded-[20px] border-[#414141] bg-[#2E2C2B] p-4"
                style={{ shadowColor: 'transparent' }}>
                <AppText className="text-[#F1F1F1]" variant="subtitle">
                  Loading matches...
                </AppText>
                <AppText className="mt-1 text-[#9F9C99]">
                  Pulling your latest mutual matches now.
                </AppText>
              </AppCard>
            ) : null}

            {matches.length === 0 && !matchesQuery.isLoading ? (
              <AppCard
                className="rounded-[24px] border-[#414141] bg-[#2E2C2B] p-5"
                style={{ shadowColor: 'transparent' }}>
                <AppText className="text-[#F1F1F1]" variant="title">
                  No matches yet
                </AppText>
                <AppText className="mt-1 text-[#9F9C99]">
                  New mutual matches will show up here once they’re available.
                </AppText>
              </AppCard>
            ) : null}

            <View className="gap-4">
              {matches.map((match) => (
                <MatchRow
                  key={match.matchId}
                  match={match}
                  onOpenAnalysis={() => router.push(`/match-analysis/${match.matchId}` as never)}
                  onOpenChat={() => {
                    if (!match.conversationId) {
                      console.log('[Connects] Chat tapped', {
                        conversationId: null,
                        destination: '/chat',
                        matchId: match.matchId,
                      });
                      router.push('/chat');
                      return;
                    }

                    console.log('[Connects] Chat tapped', {
                      conversationId: match.conversationId,
                      destination: `/chat?conversationId=${match.conversationId}`,
                      matchId: match.matchId,
                    });
                    router.push(`/chat?conversationId=${match.conversationId}`);
                  }}
                />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
