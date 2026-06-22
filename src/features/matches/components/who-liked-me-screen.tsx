import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { chatDemoQueryKeys } from '@features/chat/hooks/use-chat-demo';
import { MatchModal } from '@features/home/components/match-modal';
import { useSwipeAction } from '@features/home/hooks/use-discovery';
import { useViewerContext } from '@features/home/hooks/use-viewer-context';
import type {
  DiscoveryProfileCard,
  SwipeActionSuccessResponse,
} from '@features/home/types/discovery.types';
import { REVENUECAT_OFFERING_IDS, useRevenueCat } from '@features/revenuecat';
import { AppCard, AppText } from '@shared/components';
import { ApiError } from '@shared/services/api';

import { matchesQueryKeys, useWhoLikedMeList } from '../hooks/use-matches';

const PAGE_LIMIT = 10;

type BannerState = {
  detail: string;
  title: string;
  tone: 'default' | 'success' | 'warning';
};

type MatchState = {
  card: DiscoveryProfileCard;
  conversationId: string | null;
  matchId: string | null;
};

function getSwipeMatchConversationId(response: SwipeActionSuccessResponse) {
  return (
    response.data.conversationId ??
    response.data.conversation_id ??
    response.data.roomId ??
    response.data.room_id ??
    null
  );
}

function getApiErrorCode(error: unknown) {
  if (!(error instanceof ApiError)) {
    return null;
  }

  const payload = error.payload;

  if (!payload || typeof payload !== 'object' || !('error' in payload)) {
    return null;
  }

  const errorPayload = payload.error;

  if (!errorPayload || typeof errorPayload !== 'object' || !('code' in errorPayload)) {
    return null;
  }

  const code = errorPayload.code;

  return typeof code === 'string' ? code : null;
}

function isPremiumRequiredError(error: unknown) {
  return getApiErrorCode(error) === 'PREMIUM_REQUIRED';
}

function LikeAvatar({ item }: { item: DiscoveryProfileCard }) {
  return (
    <View className="h-[78px] w-[78px] overflow-hidden rounded-[18px] bg-[#34343A]">
      {item.photoUrl ? (
        <Image
          contentFit="cover"
          source={{ uri: item.photoUrl }}
          style={{ height: '100%', width: '100%' }}
        />
      ) : (
        <View className="h-full w-full items-center justify-center">
          <AppText className="text-[26px] text-[#FFD33D]" variant="title">
            {item.name.charAt(0).toUpperCase()}
          </AppText>
        </View>
      )}
    </View>
  );
}

function WhoLikedMeCard({
  disabled,
  item,
  onAction,
}: {
  disabled: boolean;
  item: DiscoveryProfileCard;
  onAction: (item: DiscoveryProfileCard, action: 'like' | 'pass') => void;
}) {
  return (
    <AppCard
      className="rounded-[20px] border-[#414141] bg-[#2E2C2B] p-3.5"
      style={{ shadowColor: 'transparent' }}>
      <View className="flex-row gap-3">
        <LikeAvatar item={item} />

        <View className="min-w-0 flex-1 gap-1">
          <AppText className="text-[18px] leading-[24px] text-[#F1F1F1]" variant="title">
            {item.name}
          </AppText>
          <AppText className="text-[13px] leading-[18px] text-[#D8C6A5]">
            {item.headline}
          </AppText>
          <AppText className="text-[13px] leading-[18px] text-[#9F9C99]">
            {item.location.display}
          </AppText>

          <View className="mt-2 flex-row gap-2">
            <Pressable
              className="h-9 flex-1 flex-row items-center justify-center gap-1.5 rounded-full border border-[#55504B]"
              disabled={disabled}
              onPress={() => onAction(item, 'pass')}
              style={{ opacity: disabled ? 0.55 : 1 }}>
              <Ionicons color="#CFC8C0" name="close" size={17} />
              <AppText className="text-[13px] font-semibold text-[#CFC8C0]">Skip</AppText>
            </Pressable>

            <Pressable
              className="h-9 flex-1 flex-row items-center justify-center gap-1.5 rounded-full"
              disabled={disabled}
              onPress={() => onAction(item, 'like')}
              style={{ backgroundColor: '#6A431E', opacity: disabled ? 0.55 : 1 }}>
              <Ionicons color="#FFD33D" name="heart" size={16} />
              <AppText className="text-[13px] font-semibold text-[#FFD33D]">Connect</AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </AppCard>
  );
}

export function WhoLikedMeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { presentPaywallForOffering, supported } = useRevenueCat();
  const [page, setPage] = React.useState(1);
  const [items, setItems] = React.useState<DiscoveryProfileCard[]>([]);
  const [banner, setBanner] = React.useState<BannerState | null>(null);
  const [matchState, setMatchState] = React.useState<MatchState | null>(null);
  const [presentedPremiumError, setPresentedPremiumError] = React.useState(false);
  const whoLikedMeQuery = useWhoLikedMeList({ limit: PAGE_LIMIT, page });
  const swipeAction = useSwipeAction();
  const viewerContext = useViewerContext();

  const data = whoLikedMeQuery.data?.data;
  const hasMore = Boolean(data?.hasMore);
  const total = data?.total ?? items.length;

  React.useEffect(() => {
    if (!data) {
      return;
    }

    setBanner(null);
    setPresentedPremiumError(false);
    setItems((currentItems) => {
      const nextItems = page === 1 ? [] : currentItems;
      const seenIds = new Set(nextItems.map((item) => item.id));

      for (const item of data.items) {
        if (!seenIds.has(item.id)) {
          nextItems.push(item);
          seenIds.add(item.id);
        }
      }

      return [...nextItems];
    });
  }, [data, page]);

  React.useEffect(() => {
    if (!whoLikedMeQuery.isError || !isPremiumRequiredError(whoLikedMeQuery.error) || presentedPremiumError) {
      return;
    }

    setPresentedPremiumError(true);
    setBanner({
      detail: whoLikedMeQuery.error instanceof Error
        ? whoLikedMeQuery.error.message
        : 'ConnectX Pro is required to see who wants to connect with you.',
      title: 'ConnectX Pro required',
      tone: 'warning',
    });

    if (!supported) {
      return;
    }

    void presentPaywallForOffering(REVENUECAT_OFFERING_IDS.connectXPro).catch((error) => {
      setBanner({
        detail: error instanceof Error ? error.message : 'Unable to open the premium paywall.',
        title: 'Could not open premium paywall',
        tone: 'warning',
      });
    });
  }, [
    presentPaywallForOffering,
    presentedPremiumError,
    supported,
    whoLikedMeQuery.error,
    whoLikedMeQuery.isError,
  ]);

  const handleRefresh = React.useCallback(() => {
    setPage(1);
    setItems([]);
    setPresentedPremiumError(false);
    void queryClient.invalidateQueries({ queryKey: matchesQueryKeys.whoLikedMe({ limit: PAGE_LIMIT, page: 1 }) });
  }, [queryClient]);

  const handleAction = React.useCallback(
    async (item: DiscoveryProfileCard, action: 'like' | 'pass') => {
      setBanner(null);

      try {
        const response = await swipeAction.mutateAsync({
          card: item,
          cardId: item.id,
          payload: { action, viewer_context: viewerContext },
          targetId: item.profileId,
        });

        setItems((currentItems) => currentItems.filter((currentItem) => currentItem.id !== item.id));

        if (action === 'like' && response.data.isMatch) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setMatchState({
            card: item,
            conversationId: getSwipeMatchConversationId(response),
            matchId: response.data.matchId,
          });
          void queryClient.invalidateQueries({ queryKey: chatDemoQueryKeys.conversationsRoot });
        } else {
          setBanner({
            detail: action === 'like' ? 'We saved your connect.' : 'We skipped on this connect.',
            title: action === 'like' ? 'Connected' : 'Skipped',
            tone: 'success',
          });
        }

        void queryClient.invalidateQueries({ queryKey: matchesQueryKeys.all });
      } catch (error) {
        setBanner({
          detail: error instanceof Error ? error.message : 'Unable to update this connect right now.',
          title: 'Action failed',
          tone: 'warning',
        });
      }
    },
    [queryClient, swipeAction, viewerContext]
  );

  const handleOpenMatchChat = React.useCallback(() => {
    const conversationId = matchState?.conversationId;

    setMatchState(null);

    if (conversationId) {
      router.push(`/chat_demo/${conversationId}` as never);
      return;
    }

    router.push('/chat_demo' as never);
  }, [matchState?.conversationId, router]);

  const handleOpenMatchReport = React.useCallback(() => {
    const matchId = matchState?.matchId;

    setMatchState(null);

    if (matchId) {
      router.push(`/match-analysis/${matchId}` as never);
    }
  }, [matchState?.matchId, router]);

  const handleLoadMore = React.useCallback(() => {
    if (!hasMore || whoLikedMeQuery.isFetching) {
      return;
    }

    setPage((currentPage) => currentPage + 1);
  }, [hasMore, whoLikedMeQuery.isFetching]);

  const showInitialLoading = whoLikedMeQuery.isLoading && items.length === 0;
  const showEmpty = !showInitialLoading && !whoLikedMeQuery.isError && items.length === 0;
  const actionDisabled = swipeAction.isPending;

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: '' }} />
      <View className="flex-1" style={{ backgroundColor: '#262626' }}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingBottom: insets.bottom + 36,
            paddingHorizontal: 16,
            paddingTop: insets.top + 12,
          }}
          refreshControl={
            <RefreshControl
              onRefresh={handleRefresh}
              refreshing={whoLikedMeQuery.isRefetching && page === 1}
              tintColor="#FF9F3F"
            />
          }
          showsVerticalScrollIndicator={false}>
          <View className="gap-5">
            <View className="flex-row items-center justify-between">
              <Pressable
                className="h-11 w-11 items-center justify-center rounded-full bg-[#33302E]"
                onPress={() => router.back()}>
                <Ionicons color="#F1F1F1" name="chevron-back" size={22} />
              </Pressable>

              <View className="items-end">
                <AppText className="text-[24px] text-[#F1F1F1]" variant="title">
                  View Connects
                </AppText>
                <AppText className="text-[13px] text-[#9F9C99]">
                  {total} {total === 1 ? 'person' : 'people'} want to connect
                </AppText>
              </View>
            </View>

            {banner ? (
              <View
                className="rounded-[18px] border px-4 py-3"
                style={{
                  backgroundColor:
                    banner.tone === 'success'
                      ? '#1F3025'
                      : banner.tone === 'warning'
                        ? '#35281D'
                        : '#2C2C2F',
                  borderColor:
                    banner.tone === 'success'
                      ? '#2F6E45'
                      : banner.tone === 'warning'
                        ? '#8A6125'
                        : '#454548',
                }}>
                <AppText
                  className={
                    banner.tone === 'success'
                      ? 'text-[#D8F7E3]'
                      : banner.tone === 'warning'
                        ? 'text-[#FFD9A3]'
                        : 'text-[#F1F1F1]'
                  }
                  variant="bodyStrong">
                  {banner.title}
                </AppText>
                <AppText
                  className={
                    banner.tone === 'success'
                      ? 'text-[#A7E6BE]'
                      : banner.tone === 'warning'
                        ? 'text-[#E9BD82]'
                        : 'text-[#B4B4B7]'
                  }>
                  {banner.detail}
                </AppText>
              </View>
            ) : null}

            {showInitialLoading ? (
              <AppCard
                className="rounded-[20px] border-[#414141] bg-[#2E2C2B] p-4"
                style={{ shadowColor: 'transparent' }}>
                <AppText className="text-[#F1F1F1]" variant="subtitle">
                  Loading connects...
                </AppText>
                <AppText className="mt-1 text-[#9F9C99]">
                  Pulling everyone who wants to connect.
                </AppText>
              </AppCard>
            ) : null}

            {whoLikedMeQuery.isError && !isPremiumRequiredError(whoLikedMeQuery.error) ? (
              <AppCard
                className="rounded-[20px] border-[#6D3A32] bg-[#332320] p-4"
                style={{ shadowColor: 'transparent' }}>
                <AppText className="text-[#F7DDD8]" variant="subtitle">
                  Could not load connects
                </AppText>
                <AppText className="mt-1 text-[#D9A49C]">
                  {whoLikedMeQuery.error instanceof Error
                    ? whoLikedMeQuery.error.message
                    : 'The who liked me request failed.'}
                </AppText>
              </AppCard>
            ) : null}

            {showEmpty ? (
              <AppCard
                className="rounded-[24px] border-[#414141] bg-[#2E2C2B] p-5"
                style={{ shadowColor: 'transparent' }}>
                <AppText className="text-[#F1F1F1]" variant="title">
                  No new interest yet
                </AppText>
                <AppText className="mt-1 text-[#9F9C99]">
                  When someone is interested in connecting, their profile will appear here.
                </AppText>
              </AppCard>
            ) : null}

            <View className="gap-3">
              {items.map((item) => (
                <WhoLikedMeCard
                  key={item.id}
                  disabled={actionDisabled}
                  item={item}
                  onAction={(selectedItem, action) => {
                    void handleAction(selectedItem, action);
                  }}
                />
              ))}
            </View>

            {hasMore ? (
              <Pressable
                className="h-12 flex-row items-center justify-center gap-2 rounded-full border border-[#544126] bg-[#2E261F]"
                disabled={whoLikedMeQuery.isFetching}
                onPress={handleLoadMore}
                style={{ opacity: whoLikedMeQuery.isFetching ? 0.65 : 1 }}>
                <AppText className="text-[15px] font-semibold text-[#FFD33D]">
                  {whoLikedMeQuery.isFetching ? 'Loading...' : 'Load more'}
                </AppText>
                <Ionicons color="#FFD33D" name="chevron-down" size={18} />
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
        <MatchModal
          card={matchState?.card ?? null}
          onChat={handleOpenMatchChat}
          onClose={() => setMatchState(null)}
          onReport={handleOpenMatchReport}
        />
      </View>
    </>
  );
}
