import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { REVENUECAT_OFFERING_IDS, useRevenueCat } from '@features/revenuecat';
import { AppCard, AppText, AppTopBar } from '@shared/components';

import { useActivateSpotlight, useMatchesList } from '../hooks/use-matches';
import { isMatchesListMockEnabled } from '../services/matches-service';
import {
  isSpotlightAlreadyActiveError,
  isSpotlightRequiresCreditError,
} from '../services/spotlight-contract';
import type { LikesYouListItem, MatchListItem } from '../types/matches.types';

type SpotlightBannerState = {
  detail: string;
  title: string;
  tone: 'default' | 'success' | 'warning';
};

function formatSpotlightTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString([], {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
}

function MatchAvatar({ match }: { match: MatchListItem }) {
  return (
    <View className="relative h-[56px] w-[56px]">
      {match.user.photoUrl ? (
        <Image
          contentFit="cover"
          source={{ uri: match.user.photoUrl }}
          style={{ borderRadius: 28, height: 56, width: 56 }}
        />
      ) : (
        <View className="h-[56px] w-[56px] items-center justify-center rounded-full bg-[#2B2F39]">
          <AppText className="text-[18px]" tone="signal" variant="title">
            {match.user.name.charAt(0).toUpperCase()}
          </AppText>
        </View>
      )}

      <View className="absolute inset-0 rounded-full border-[2px] border-[#6B4A2C]" />

      {match.isOnline ? (
        <View className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-[2px] border-[#2A2927] bg-[#4ADE80]" />
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

function LikesYouPreviewCard({
  item,
  onPress,
}: {
  item: LikesYouListItem;
  onPress: () => void;
}) {
  return (
    <Pressable
      className="h-[160px] flex-1 overflow-hidden rounded-[24px] border border-[#5E5037] bg-[#2B2B2D]"
      onPress={onPress}>
      {item.user.photoUrl ? (
        <Image
          contentFit="cover"
          source={{ uri: item.user.photoUrl }}
          style={{ height: '100%', width: '100%' }}
        />
      ) : (
        <View className="h-full w-full bg-[#34343A]" />
      )}

      <View
        className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-10"
        style={{ backgroundColor: 'rgba(24, 24, 27, 0.58)' }}>
        <AppText className="text-[15px] text-[#F6F2EB]" variant="bodyStrong">
          {item.user.name}
        </AppText>
        <AppText className="text-[12px] text-[#D8C6A5]">
          {item.user.headline}
        </AppText>
      </View>
    </Pressable>
  );
}

function formatLikesYouCount(totalNew: number) {
  if (totalNew <= 0) {
    return '0 new';
  }

  return `${totalNew} new`;
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
      className="rounded-[20px] border-[#414141] bg-[#2E2C2B] px-4 py-3.5"
      style={{ shadowColor: 'transparent' }}>
      <View className="flex-row items-center gap-3">
        <MatchAvatar match={match} />

        <View className="flex-1 gap-0.5">
          <AppText className="text-[18px] leading-[24px] text-[#F1F1F1]" variant="title">
            {match.user.name}
          </AppText>
          <AppText className="text-[13px] leading-[18px] text-[#9F9C99]">
            {match.user.headline} · {match.user.location}
          </AppText>
          <View className="mt-0.5 flex-row items-center gap-1.5">
            <Ionicons color="#FFD33D" name="time-outline" size={14} />
            <AppText className="text-[12px] font-semibold text-[#FFD33D]">{expiresLabel}</AppText>
          </View>
        </View>

        <View className="ml-1 flex-row items-center gap-1">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full"
            disabled={!canChat}
            onPress={onOpenChat}
            style={{ opacity: canChat ? 1 : 0.45 }}>
            <Ionicons color="#FF9F3F" name="chatbubble-outline" size={20} />
          </Pressable>

          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full"
            disabled={!match.actions.canViewAnalysis}
            onPress={onOpenAnalysis}
            style={{ opacity: match.actions.canViewAnalysis ? 1 : 0.45 }}>
            <Ionicons color="#8B8B8B" name="eye-outline" size={22} />
          </Pressable>
        </View>
      </View>
    </AppCard>
  );
}

export function MatchesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { presentPaywallForOffering, presentPaywallIfNeeded, supported } = useRevenueCat();
  const matchesQuery = useMatchesList({ limit: 10, page: 1, status: 'active' });
  const usingMockMatches = isMatchesListMockEnabled();
  const spotlightActivation = useActivateSpotlight();
  const [spotlightBanner, setSpotlightBanner] = React.useState<SpotlightBannerState | null>(null);
  const [spotlightEndsAt, setSpotlightEndsAt] = React.useState<string | null>(null);
  const [likesYouBanner, setLikesYouBanner] = React.useState<SpotlightBannerState | null>(null);

  const responseData = matchesQuery.data?.data;
  const matches = responseData?.items ?? [];
  const likesYou = responseData?.likesYou?.items ?? [];
  const likesYouLocked = responseData?.likesYou?.locked
  const likesYouCount = responseData?.likesYou?.totalNew ?? likesYou.length;
  const likesYouPreviewItems = Array.from({ length: 3 }, (_, index) => likesYou[index] ?? null);
  const matchCountLabel = `${matches.length} ${matches.length === 1 ? 'match' : 'matches'}`;
  const likesYouCountLabel = formatLikesYouCount(likesYouCount);
  const spotlightEndsAtLabel = formatSpotlightTimestamp(spotlightEndsAt);

  const maybePresentLikesYouPaywall = React.useCallback(async () => {
    if (!supported) {
      setLikesYouBanner({
        detail: 'Likes You unlock is available in the native iOS and Android builds with ConnectX Pro.',
        title: 'Premium unlock unavailable here',
        tone: 'warning',
      });
      return;
    }

    try {
      await presentPaywallIfNeeded();
    } catch (error) {
      setLikesYouBanner({
        detail: error instanceof Error ? error.message : 'Unable to open the premium paywall.',
        title: 'Could not open premium paywall',
        tone: 'warning',
      });
    }
  }, [presentPaywallIfNeeded, supported]);

  const maybePresentSpotlightPaywall = React.useCallback(async () => {
    if (!supported) {
      setSpotlightBanner({
        detail: 'Spotlight purchases are available in the native iOS and Android builds.',
        title: 'Spotlight credits unavailable here',
        tone: 'warning',
      });
      return;
    }

    try {
      await presentPaywallForOffering(REVENUECAT_OFFERING_IDS.discoveryBoosts);
    } catch (error) {
      setSpotlightBanner({
        detail: error instanceof Error ? error.message : 'Unable to open the spotlight paywall.',
        title: 'Could not open spotlight paywall',
        tone: 'warning',
      });
    }
  }, [presentPaywallForOffering, supported]);

  const handleActivateSpotlight = React.useCallback(async () => {
    setSpotlightBanner(null);

    try {
      const response = await spotlightActivation.mutateAsync();
      const endsAtLabel = formatSpotlightTimestamp(response.data.endsAt);

      setSpotlightEndsAt(response.data.endsAt);
      setSpotlightBanner({
        detail: endsAtLabel
          ? `You are featured until ${endsAtLabel}. ${response.data.remainingSpotlights} spotlights left.`
          : `${response.data.remainingSpotlights} spotlights left after this activation.`,
        title: 'Spotlight is live',
        tone: 'success',
      });
    } catch (error) {
      if (isSpotlightRequiresCreditError(error)) {
        setSpotlightBanner({
          detail: 'Buy a spotlight credit to activate your profile now.',
          title: 'No spotlight credits remaining',
          tone: 'warning',
        });
        await maybePresentSpotlightPaywall();
        return;
      }

      if (isSpotlightAlreadyActiveError(error)) {
        const details = error.payload.error.details;
        const nextEligibleLabel =
          formatSpotlightTimestamp(details.nextEligibleAt) ?? formatSpotlightTimestamp(details.endsAt);

        setSpotlightEndsAt(details.endsAt);
        setSpotlightBanner({
          detail: nextEligibleLabel
            ? `Your spotlight is already active until ${nextEligibleLabel}.`
            : 'Your spotlight is already active right now.',
          title: 'Spotlight already active',
          tone: 'default',
        });
        return;
      }

      setSpotlightBanner({
        detail: error instanceof Error ? error.message : 'Unable to activate spotlight right now.',
        title: 'Spotlight activation failed',
        tone: 'warning',
      });
    }
  }, [maybePresentSpotlightPaywall, spotlightActivation]);

  const handleLikesYouPress = React.useCallback(
    async (item: LikesYouListItem) => {
      setLikesYouBanner(null);

      if (likesYouLocked) {
        setLikesYouBanner({
          detail: 'Upgrade to ConnectX Pro to reveal who liked you.',
          title: 'Likes You is locked',
          tone: 'warning',
        });
        await maybePresentLikesYouPaywall();
        return;
      }

      Alert.alert(
        item.user.name,
        `${item.user.headline} · ${item.user.location}\n\nA dedicated Likes You detail route is not wired yet.`
      );
    },
    [likesYouLocked, maybePresentLikesYouPaywall]
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: '' }} />
      <View className="flex-1" style={{ backgroundColor: '#262626' }}>
        <AppTopBar />
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
                    {likesYouCountLabel}
                  </AppText>
                </View>
              </View>

              <View className="flex-row gap-4">
                {likesYouPreviewItems.map((like, index) =>
                  likesYouLocked ? (
                    <LockedConnectCard
                      key={like ? `locked-${like.likeId}` : `locked-placeholder-${index}`}
                      photoUrl={like?.user.photoUrl ?? null}
                    />
                  ) : like ? (
                    <LikesYouPreviewCard
                      key={`likes-you-${like.likeId}`}
                      item={like}
                      onPress={() => {
                        void handleLikesYouPress(like);
                      }}
                    />
                  ) : (
                    <View
                      key={`likes-you-placeholder-${index}`}
                      className="h-[160px] flex-1 rounded-[24px] border border-[#424242] bg-[#2B2B2D]"
                    />
                  )
                )}
              </View>

              <Pressable
                className="flex-row items-center justify-center gap-3 rounded-[24px] border px-6 py-5"
                onPress={() => {
                  if (likesYouLocked) {
                    void maybePresentLikesYouPaywall();
                    return;
                  }

                  const firstLike = likesYou[0];

                  if (firstLike) {
                    void handleLikesYouPress(firstLike);
                  }
                }}
                style={{ backgroundColor: '#5B4720', borderColor: '#AD8528' }}>
                <Ionicons color="#FFD33D" name="sparkles-outline" size={22} />
                <AppText className="text-[18px] text-[#FFD33D]" variant="subtitle">
                  {likesYouLocked ? 'Unlock Connects' : 'View Connects'}
                </AppText>
              </Pressable>

              {likesYouBanner ? (
                <View
                  className="mt-2 rounded-[18px] border px-4 py-3"
                  style={{
                    backgroundColor:
                      likesYouBanner.tone === 'success'
                        ? '#1F3025'
                        : likesYouBanner.tone === 'warning'
                          ? '#35281D'
                          : '#2C2C2F',
                    borderColor:
                      likesYouBanner.tone === 'success'
                        ? '#2F6E45'
                        : likesYouBanner.tone === 'warning'
                          ? '#8A6125'
                          : '#454548',
                  }}>
                  <AppText
                    className={
                      likesYouBanner.tone === 'success'
                        ? 'text-[#D8F7E3]'
                        : likesYouBanner.tone === 'warning'
                          ? 'text-[#FFD9A3]'
                          : 'text-[#F1F1F1]'
                    }
                    variant="bodyStrong">
                    {likesYouBanner.title}
                  </AppText>
                  <AppText
                    className={
                      likesYouBanner.tone === 'success'
                        ? 'text-[#A7E6BE]'
                        : likesYouBanner.tone === 'warning'
                          ? 'text-[#E9BD82]'
                          : 'text-[#B4B4B7]'
                    }>
                    {likesYouBanner.detail}
                  </AppText>
                </View>
              ) : null}

              <Pressable
                className="flex-row items-center justify-between rounded-[24px] border px-5 py-4"
                disabled={spotlightActivation.isPending}
                onPress={handleActivateSpotlight}
                style={{
                  backgroundColor: '#2E261F',
                  borderColor: spotlightEndsAtLabel ? '#FFD33D' : '#544126',
                }}>
                <View className="flex-row items-center gap-4">
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-[#4A3820]">
                    <Ionicons
                      color="#FFD33D"
                      name={spotlightEndsAtLabel ? 'star' : 'star-outline'}
                      size={22}
                    />
                  </View>
                  <View className="gap-0.5">
                    <AppText className="text-[17px] text-[#F4E3C3]" variant="bodyStrong">
                      {spotlightActivation.isPending ? 'Activating...' : 'Activate Spotlight'}
                    </AppText>
                    <AppText className="text-[13px] text-[#D2B98D]">
                      {spotlightEndsAtLabel
                        ? `Active until ${spotlightEndsAtLabel}`
                        : 'Feature your profile for 1 hour'}
                    </AppText>
                  </View>
                </View>
                <Ionicons color="#FFD33D" name="chevron-forward" size={20} />
              </Pressable>

              {spotlightBanner ? (
                <View
                  className="mt-2 rounded-[18px] border px-4 py-3"
                  style={{
                    backgroundColor:
                      spotlightBanner.tone === 'success'
                        ? '#1F3025'
                        : spotlightBanner.tone === 'warning'
                          ? '#35281D'
                          : '#2C2C2F',
                    borderColor:
                      spotlightBanner.tone === 'success'
                        ? '#2F6E45'
                        : spotlightBanner.tone === 'warning'
                          ? '#8A6125'
                          : '#454548',
                  }}>
                  <AppText
                    className={
                      spotlightBanner.tone === 'success'
                        ? 'text-[#D8F7E3]'
                        : spotlightBanner.tone === 'warning'
                          ? 'text-[#FFD9A3]'
                          : 'text-[#F1F1F1]'
                    }
                    variant="bodyStrong">
                    {spotlightBanner.title}
                  </AppText>
                  <AppText
                    className={
                      spotlightBanner.tone === 'success'
                        ? 'text-[#A7E6BE]'
                        : spotlightBanner.tone === 'warning'
                          ? 'text-[#E9BD82]'
                          : 'text-[#B4B4B7]'
                    }>
                    {spotlightBanner.detail}
                  </AppText>
                </View>
              ) : null}
            </View>

            <View className="gap-4">
              <View className="flex-row items-center justify-between">
                <AppText className="text-[24px] text-[#F1F1F1]" variant="title">
                  Your Matches
                </AppText>
                <AppText className="text-[15px] text-[#9F9C99]">{matchCountLabel}</AppText>
              </View>
            </View>
            {usingMockMatches ? (
              <AppCard
                className="rounded-[20px] border-[#5A4726] bg-[#312A1E] p-4"
                style={{ shadowColor: 'transparent' }}>
                <AppText className="text-[#F1F1F1]" variant="subtitle">
                  Using development mock matches
                </AppText>
                <AppText className="mt-1 text-[#BBA98D]">
                  Backend support is still in progress, so this screen is rendering the typed mock
                  matches response in development.
                </AppText>
              </AppCard>
            ) : null}

            {matchesQuery.isLoading && !usingMockMatches ? (
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

            {matchesQuery.isError && !usingMockMatches ? (
              <AppCard
                className="rounded-[20px] border-[#6D3A32] bg-[#332320] p-4"
                style={{ shadowColor: 'transparent' }}>
                <AppText className="text-[#F7DDD8]" variant="subtitle">
                  Could not load matches
                </AppText>
                <AppText className="mt-1 text-[#D9A49C]">
                  {matchesQuery.error instanceof Error
                    ? matchesQuery.error.message
                    : 'The matches request failed.'}
                </AppText>
              </AppCard>
            ) : null}

            {matches.length === 0 && !matchesQuery.isLoading && !matchesQuery.isError ? (
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
                      destination: `/conversation/${match.conversationId}`,
                      matchId: match.matchId,
                    });
                    router.push(`/conversation/${match.conversationId}`);
                  }}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}
