import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DiscoveryOnboardingRequiredSheet } from '@features/home/components/discovery-onboarding-required-sheet';
import { useDiscoveryOnboardingRequiredHandler } from '@features/home/hooks/use-discovery-onboarding-required-handler';
import { REVENUECAT_OFFERING_IDS, useRevenueCat } from '@features/revenuecat';
import { AppCard, AppText, AppTopBar } from '@shared/components';

import { useActivateSpotlight, useMatchesList } from '../hooks/use-matches';
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

function withAlpha(hexColor: string, alpha: number) {
  const normalized = hexColor.replace('#', '');

  if (normalized.length !== 6) {
    return hexColor;
  }

  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function SkeletonBlock({
  className,
  style,
}: {
  className?: string;
  style?: React.ComponentProps<typeof Animated.View>['style'];
}) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 920 }), -1, true);
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.42, 0.86]),
  }));

  return (
    <Animated.View
      className={className}
      style={[{ backgroundColor: withAlpha('#FFFFFF', 0.12) }, animatedStyle, style]}
    />
  );
}

function LikesYouSkeletonCard({ highlighted = false }: { highlighted?: boolean }) {
  return (
    <View
      className="h-[160px] flex-1 overflow-hidden rounded-[24px] border p-3"
      style={{
        backgroundColor: highlighted ? '#30291F' : '#2B2B2D',
        borderColor: highlighted ? '#5E5037' : '#3F3D3A',
      }}>
      <SkeletonBlock
        className="flex-1 rounded-[18px]"
        style={{ backgroundColor: highlighted ? withAlpha('#FF9A3E', 0.2) : withAlpha('#FFFFFF', 0.1) }}
      />
      <View className="mt-3 gap-2">
        <SkeletonBlock className="h-3.5 w-[72%] rounded-full" />
        <SkeletonBlock className="h-3 w-[90%] rounded-full" />
      </View>
    </View>
  );
}

function MatchRowSkeleton() {
  return (
    <AppCard
      className="rounded-[20px] border-[#414141] bg-[#2E2C2B] px-4 py-3.5"
      style={{ shadowColor: 'transparent' }}>
      <View className="flex-row items-center gap-3">
        <SkeletonBlock
          className="h-[56px] w-[56px] rounded-full"
          style={{ backgroundColor: withAlpha('#FF9A3E', 0.18) }}
        />

        <View className="flex-1 gap-2">
          <SkeletonBlock className="h-5 w-[48%] rounded-full" />
          <SkeletonBlock className="h-3.5 w-[88%] rounded-full" />
          <SkeletonBlock className="h-3.5 w-24 rounded-full" style={{ backgroundColor: withAlpha('#FFD33D', 0.2) }} />
        </View>

        <View className="ml-1 flex-row items-center gap-2">
          <SkeletonBlock className="h-10 w-10 rounded-full" />
          <SkeletonBlock className="h-10 w-10 rounded-full" />
        </View>
      </View>
    </AppCard>
  );
}

function MatchesSkeleton() {
  return (
    <View className="gap-8" accessibilityLabel="Loading connects">
      <View className="gap-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <SkeletonBlock
              className="h-8 w-8 rounded-full"
              style={{ backgroundColor: withAlpha('#FF9F3F', 0.2) }}
            />
            <SkeletonBlock className="h-5 w-44 rounded-full" />
          </View>

          <SkeletonBlock
            className="h-9 w-24 rounded-full"
            style={{ backgroundColor: withAlpha('#FF9A3E', 0.2) }}
          />
        </View>

        <View className="flex-row gap-4">
          <LikesYouSkeletonCard highlighted />
          <LikesYouSkeletonCard />
          <LikesYouSkeletonCard />
        </View>

        <View
          className="flex-row items-center justify-center gap-3 rounded-[24px] border px-6 py-5"
          style={{ backgroundColor: '#352D1F', borderColor: '#6F5525' }}>
          <SkeletonBlock
            className="h-6 w-6 rounded-full"
            style={{ backgroundColor: withAlpha('#FFD33D', 0.24) }}
          />
          <SkeletonBlock className="h-5 w-52 rounded-full" style={{ backgroundColor: withAlpha('#FFD33D', 0.2) }} />
        </View>
      </View>

      <View className="gap-4">
        <View className="flex-row items-center justify-between">
          <SkeletonBlock className="h-7 w-40 rounded-full" />
          <SkeletonBlock className="h-4 w-24 rounded-full" />
        </View>

        <View className="gap-4">
          <MatchRowSkeleton />
          <MatchRowSkeleton />
          <MatchRowSkeleton />
        </View>
      </View>
    </View>
  );
}

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
        className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-2"
        style={{ backgroundColor: 'rgba(24, 24, 27, 0.58)' }}>
        <AppText className="text-[15px] text-[#F6F2EB]" variant="bodyStrong" numberOfLines={1}>
          {item.user.name}
        </AppText>
        <AppText className="text-[12px] text-[#D8C6A5]" numberOfLines={1}>
          {item.user.headline}
        </AppText>
      </View>
    </Pressable>
  );
}

function LockedLikesYouPreviewCard({ item }: { item: LikesYouListItem }) {
  return (
    <View className="h-[160px] flex-1 overflow-hidden rounded-[24px] border border-[#424242] bg-[#2B2B2D]">
      {item.user.photoUrl ? (
        <Image
          blurRadius={26}
          contentFit="cover"
          source={{ uri: item.user.photoUrl }}
          style={{ height: '100%', opacity: 0.82, width: '100%' }}
        />
      ) : (
        <View className="h-full w-full bg-[#34343A]" />
      )}

      <View
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(24, 24, 27, 0.48)' }}
      />

      <View className="absolute inset-0 items-center justify-center">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-[#242424]/80">
          <Ionicons color="#D8D1CB" name="lock-closed-outline" size={26} />
        </View>
      </View>
    </View>
  );
}

function MysteryLikesYouPreviewCard() {
  return (
    <View className="h-[160px] flex-1 items-center justify-center overflow-hidden rounded-[24px] border border-[#3F3D3A] bg-[#2A2927]">
      <View className="h-14 w-14 items-center justify-center rounded-full border border-[#5A554E] bg-[#33302E]">
        <AppText className="text-[30px] leading-[36px] text-[#9F9C99]" variant="title">
          ?
        </AppText>
      </View>
    </View>
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
  const {
    presentPaywallForOffering,
    supported,
  } = useRevenueCat();
  const matchesQuery = useMatchesList({ limit: 10, page: 1, status: 'active' });
  const { handleOnboardingRequired, onboardingRequiredSheetProps } =
    useDiscoveryOnboardingRequiredHandler();
  const spotlightActivation = useActivateSpotlight();
  const [spotlightBanner, setSpotlightBanner] = React.useState<SpotlightBannerState | null>(null);
  const [spotlightEndsAt, setSpotlightEndsAt] = React.useState<string | null>(null);

  const responseData = matchesQuery.data?.data;
  const matches = responseData?.items ?? [];
  const likesYou = responseData?.likesYou?.items ?? [];
  const likesYouLocked = Boolean(responseData?.likesYou?.locked);
  const likesYouCount = responseData?.likesYou?.totalNew ?? likesYou.length;
  const likesYouPreviewItems = Array.from({ length: 3 }, (_, index) => likesYou[index] ?? null);
  const matchCountLabel = `${matches.length} ${matches.length === 1 ? 'connect' : 'connections'}`;
  const likesYouCountLabel = formatLikesYouCount(likesYouCount);
  const spotlightEndsAtLabel = formatSpotlightTimestamp(spotlightEndsAt);

  React.useEffect(() => {
    if (matchesQuery.isError) {
      handleOnboardingRequired(matchesQuery.error);
    }
  }, [handleOnboardingRequired, matchesQuery.error, matchesQuery.isError]);

  const maybePresentSpotlightPaywall = React.useCallback(async () => {
    if (!supported) {
      setSpotlightBanner({
        detail: 'Boost purchases are available in the native iOS and Android builds.',
        title: 'Boost credits unavailable here',
        tone: 'warning',
      });
      return;
    }

    try {
      await presentPaywallForOffering(REVENUECAT_OFFERING_IDS.discoveryBoosts);
    } catch (error) {
      setSpotlightBanner({
        detail: error instanceof Error ? error.message : 'Unable to open the boost paywall.',
        title: 'Could not open boost paywall',
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
          ? `Your profile is boosted until ${endsAtLabel}. ${response.data.remainingSpotlights} boosts left.`
          : `${response.data.remainingSpotlights} boosts left after this activation.`,
        title: 'Boost is live',
        tone: 'success',
      });
    } catch (error) {
      if (isSpotlightRequiresCreditError(error)) {
        setSpotlightBanner({
          detail: 'Buy a boost credit to activate your profile now.',
          title: 'No boost credits remaining',
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
            ? `Your boost is already active until ${nextEligibleLabel}.`
            : 'Your boost is already active right now.',
          title: 'Boost already active',
          tone: 'default',
        });
        return;
      }

      setSpotlightBanner({
        detail: error instanceof Error ? error.message : 'Unable to activate boost right now.',
        title: 'Boost activation failed',
        tone: 'warning',
      });
    }
  }, [maybePresentSpotlightPaywall, spotlightActivation]);

  const handleViewConnects = React.useCallback(() => {
    router.push('/who-liked-me' as never);
  }, [router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: '' }} />
      <View className="flex-1" style={{ backgroundColor: '#262626' }}>
        <AppTopBar />
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: insets.bottom + 36, paddingHorizontal: 16, paddingTop: 10 }}
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            <RefreshControl
              onRefresh={matchesQuery.refetch}
              refreshing={matchesQuery.isRefetching}
              tintColor="#FF9F3F"
            />
          }
          showsVerticalScrollIndicator={false}>
          {matchesQuery.isLoading ? (
            <MatchesSkeleton />
          ) : (
          <View className="gap-8">
            <View className="gap-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <Ionicons color="#FF9F3F" name="heart" size={24} />
                  <AppText className="text-[18px] text-[#F1F1F1]" variant="title">
                    Connection Request
                  </AppText>
                </View>

                <View className="rounded-full bg-[#5A3C23] px-4 py-2">
                  <AppText className="text-[14px] font-semibold uppercase tracking-[0.3px] text-[#FFB35E]">
                    {likesYouCountLabel}
                  </AppText>
                </View>
              </View>

              <View className="flex-row gap-4">
                {likesYouPreviewItems.map((like, index) => {
                  if (!like) {
                    return likesYou.length > 0 ? (
                      <MysteryLikesYouPreviewCard key={`mystery-likes-you-${index}`} />
                    ) : null;
                  }

                  return likesYouLocked && index > 0 ? (
                    <LockedLikesYouPreviewCard key={`locked-likes-you-${like.likeId}`} item={like} />
                  ) : (
                    <LikesYouPreviewCard
                      key={`likes-you-${like.likeId}`}
                      item={like}
                      onPress={handleViewConnects}
                    />
                  );
                })}
              </View>

              <Pressable
                className="flex-row items-center justify-center gap-3 rounded-[24px] border px-6 py-5"
                onPress={handleViewConnects}
                style={{ backgroundColor: '#5B4720', borderColor: '#AD8528' }}>
                <Ionicons color="#FFD33D" name="sparkles-outline" size={22} />
                <AppText className="text-[18px] text-[#FFD33D]" variant="subtitle">
                  View Connection Request
                </AppText>
              </Pressable>

              {/* <Pressable
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
                      {spotlightActivation.isPending ? 'Activating...' : 'Activate Boost'}
                    </AppText>
                    <AppText className="text-[13px] text-[#D2B98D]">
                      {spotlightEndsAtLabel
                        ? `Active until ${spotlightEndsAtLabel}`
                        : 'Boost your profile for 12 hours'}
                    </AppText>
                  </View>
                </View>
                <Ionicons color="#FFD33D" name="chevron-forward" size={20} />
              </Pressable> */}

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
                  Your Connects
                </AppText>
                <AppText className="text-[15px] text-[#9F9C99]">{matchCountLabel}</AppText>
              </View>
            </View>

            {matchesQuery.isError ? (
              <AppCard
                className="rounded-[20px] border-[#6D3A32] bg-[#332320] p-4"
                style={{ shadowColor: 'transparent' }}>
                <AppText className="text-[#F7DDD8]" variant="subtitle">
                  Could not load connects
                </AppText>
                <AppText className="mt-1 text-[#D9A49C]">
                  {matchesQuery.error instanceof Error
                    ? matchesQuery.error.message
                    : 'The connects request failed.'}
                </AppText>
              </AppCard>
            ) : null}

            {matches.length === 0 && !matchesQuery.isLoading && !matchesQuery.isError ? (
              <AppCard
                className="rounded-[24px] border-[#414141] bg-[#2E2C2B] p-5"
                style={{ shadowColor: 'transparent' }}>
                <AppText className="text-[#F1F1F1]" variant="title">
                  No connects yet
                </AppText>
                <AppText className="mt-1 text-[#9F9C99]">
                  New mutual connects will show up here once they’re available.
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
                        destination: '/chat_demo',
                        matchId: match.matchId,
                      });
                      router.push('/chat_demo' as never);
                      return;
                    }

                    console.log('[Connects] Chat tapped', {
                      conversationId: match.conversationId,
                      destination: `/chat_demo/${match.conversationId}`,
                      matchId: match.matchId,
                    });
                    router.push(`/chat_demo/${match.conversationId}` as never);
                  }}
                />
              ))}
            </View>
          </View>
          )}
        </ScrollView>
      </View>
      <DiscoveryOnboardingRequiredSheet {...onboardingRequiredSheetProps} />
    </>
  );
}
