import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppCard, AppText } from '@shared/components';
import { Shadows } from '@shared/theme';

import { useDiscoveryCards, useSwipeAction } from '../hooks/use-discovery';
import { mockDiscoveryCardsResponse } from '../mock/discovery.mock';
import type { DiscoveryCard, DiscoveryCardsResponse, SwipeActionRequest } from '../types/discovery.types';

type SwipeDirection = 'left' | 'right';

const SWIPE_THRESHOLD = 120;
const PRELOAD_THRESHOLD = 3;
const DISCOVERY_PAGE_LIMIT = 10;

function hasUsableCards(items: DiscoveryCard[]) {
  return items.length > 0;
}

function triggerSwipeHaptic(direction: SwipeDirection) {
  if (process.env.EXPO_OS === 'ios') {
    void Haptics.impactAsync(
      direction === 'right' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    );
  }
}

function flattenUniqueCards(response?: { pages: DiscoveryCardsResponse[] }) {
  const seen = new Set<string>();

  return (
    response?.pages.flatMap((page) =>
      page.data.items.filter((item) => {
        if (seen.has(item.id)) {
          return false;
        }

        seen.add(item.id);
        return true;
      })
    ) ?? []
  );
}

function getBadgeIcon(icon?: string): keyof typeof Ionicons.glyphMap {
  switch (icon) {
    case 'rocket':
      return 'rocket-outline';
    case 'sparkles':
      return 'sparkles-outline';
    case 'briefcase':
      return 'briefcase-outline';
    case 'people':
      return 'people-outline';
    case 'trending-up':
      return 'trending-up-outline';
    case 'construct':
      return 'construct-outline';
    case 'git-network':
      return 'git-network-outline';
    case 'analytics':
      return 'analytics-outline';
    case 'shield-checkmark':
      return 'shield-checkmark-outline';
    default:
      return 'star-outline';
  }
}

function DiscoveryTag({
  item,
  tone = 'default',
}: {
  item: { name: string; type?: string };
  tone?: 'default' | 'availability';
}) {
  const borderColor =
    tone === 'availability' ? 'rgba(152, 162, 179, 0.18)' : 'rgba(215, 148, 87, 0.4)';
  const backgroundColor = tone === 'availability' ? '#2B2D34' : '#2A2117';
  const textColor = tone === 'availability' ? '#98A2B3' : '#FF9A3E';
  const iconColor = tone === 'availability' ? '#98A2B3' : '#FF9A3E';

  return (
    <View
      className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5"
      style={{ backgroundColor, borderColor }}>
      {tone === 'availability' ? <Ionicons color={iconColor} name="time-outline" size={14} /> : null}
      <AppText className="text-[12px] font-medium" style={{ color: textColor }}>
        {item.name}
      </AppText>
    </View>
  );
}

function SectionLabel({
  icon,
  title,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <View className="flex-row items-center gap-2">
      {icon ? <Ionicons color="#FF9A3E" name={icon} size={18} /> : null}
      <AppText className="text-[11px] font-bold tracking-[1px] uppercase" tone="muted" variant="label">
        {title}
      </AppText>
    </View>
  );
}

function DeckActionButton({
  color,
  disabled,
  icon,
  onPress,
  size = 'medium',
  variant = 'outline',
}: {
  color: string;
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
  variant?: 'outline' | 'filled';
}) {
  const diameter = size === 'large' ? 54 : size === 'medium' ? 48 : 40;
  const iconSize = size === 'large' ? 24 : size === 'medium' ? 20 : 16;

  return (
    <View style={Shadows.card}>
      <Pressable
        className="items-center justify-center rounded-full border"
        disabled={disabled}
        onPress={onPress}
        style={{
          backgroundColor: variant === 'filled' ? color : 'transparent',
          borderColor: variant === 'filled' ? color : 'rgba(152, 162, 179, 0.15)',
          height: diameter,
          opacity: disabled ? 0.4 : 1,
          width: diameter,
        }}>
        <Ionicons color={variant === 'filled' ? '#11131A' : color} name={icon} size={iconSize} />
      </Pressable>
    </View>
  );
}

function EmptyState({
  isLoadingMore,
  onResetFallback,
  usingFallback,
}: {
  isLoadingMore: boolean;
  onResetFallback: () => void;
  usingFallback: boolean;
}) {
  return (
    <AppCard className="gap-3 rounded-[24px] p-4">
      <AppText variant="title">
        {isLoadingMore ? 'Loading more founders...' : 'No more discovery cards right now.'}
      </AppText>
      <AppText tone="muted">
        {isLoadingMore
          ? 'Hang tight while the next page of profiles loads into the deck.'
          : 'You reached the end of the current stack. Check back later for fresh profiles.'}
      </AppText>
      {usingFallback ? (
        <Pressable
          className="self-start rounded-full border px-3 py-1.5"
          onPress={onResetFallback}
          style={{ backgroundColor: '#2A2117', borderColor: 'rgba(245, 158, 11, 0.28)' }}>
          <AppText tone="signal" variant="bodyStrong">
            Reload Mock Deck
          </AppText>
        </Pressable>
      ) : null}
    </AppCard>
  );
}

export function DiscoveryDeck() {
  const insets = useSafeAreaInsets();
  const discoveryQuery = useDiscoveryCards(DISCOVERY_PAGE_LIMIT);
  const swipeAction = useSwipeAction();
  const { width } = useWindowDimensions();
  const [fallbackCards, setFallbackCards] = React.useState(mockDiscoveryCardsResponse.data.items);
  const [restoredCards, setRestoredCards] = React.useState<DiscoveryCard[]>([]);
  const [history, setHistory] = React.useState<DiscoveryCard[]>([]);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const nextCardScale = useSharedValue(0.96);
  const currentCardRef = React.useRef<DiscoveryCard | null>(null);

  const liveCards = React.useMemo(
    () => flattenUniqueCards(discoveryQuery.data),
    [discoveryQuery.data]
  );

  const usingFallback =
    !hasUsableCards(liveCards) && (discoveryQuery.isError || discoveryQuery.isSuccess);
  
  const baseCards = usingFallback ? fallbackCards : liveCards;
  const cards = React.useMemo(() => {
    // Filter out cards that are already in baseCards to avoid duplicates when restoring
    const baseIds = new Set(baseCards.map(c => c.id));
    return [...restoredCards.filter(c => !baseIds.has(c.id)), ...baseCards];
  }, [restoredCards, baseCards]);

  const currentItem = cards[0] ?? null;
  const nextItem = cards[1] ?? null;
  const remainingCards = cards.length;

  currentCardRef.current = currentItem;

  React.useEffect(() => {
    if (usingFallback) {
      return;
    }

    if (
      remainingCards <= PRELOAD_THRESHOLD &&
      discoveryQuery.hasNextPage &&
      !discoveryQuery.isFetchingNextPage
    ) {
      void discoveryQuery.fetchNextPage();
    }
  }, [
    discoveryQuery,
    discoveryQuery.hasNextPage,
    discoveryQuery.isFetchingNextPage,
    remainingCards,
    usingFallback,
  ]);

  const resetCardPosition = React.useCallback(() => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    nextCardScale.value = withSpring(0.96);
  }, [nextCardScale, translateX, translateY]);

  const handleSwipeAction = React.useCallback(
    async (direction: SwipeDirection) => {
      const activeCard = currentCardRef.current;

      if (!activeCard) {
        setIsSubmitting(false);
        resetCardPosition();
        return;
      }

      const action: SwipeActionRequest['action'] = direction === 'right' ? 'like' : 'pass';

      try {
        triggerSwipeHaptic(direction);

        // Add to local history for rewind
        setHistory(prev => [...prev.slice(-19), activeCard]);

        if (usingFallback) {
          setFallbackCards((current) => current.filter((item) => item.id !== activeCard.id));
        } else {
          // Remove from restoredCards if it was one of them
          setRestoredCards(prev => prev.filter(c => c.id !== activeCard.id));
          
          await swipeAction.mutateAsync({
            payload: { action },
            profileId: activeCard.profileId,
          });
        }

        setActionError(null);
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : 'Unable to record this swipe right now.'
        );
      } finally {
        setIsSubmitting(false);
        translateX.value = 0;
        translateY.value = 0;
        nextCardScale.value = 0.96;
      }
    },
    [nextCardScale, resetCardPosition, swipeAction, translateX, translateY, usingFallback]
  );

  const handleRewind = React.useCallback(() => {
    if (history.length === 0 || isSubmitting) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const lastCard = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setRestoredCards(prev => [lastCard, ...prev]);
    
    // Animate the restoration if possible? For now just visual pop back.
  }, [history, isSubmitting]);

  const handleSuperLike = React.useCallback(() => {
    console.log('[Discovery] Super Like triggered for:', currentItem?.name);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [currentItem]);

  const beginSwipe = React.useCallback(
    (direction: SwipeDirection) => {
      if (!currentCardRef.current || isSubmitting) {
        return;
      }

      setIsSubmitting(true);
      setActionError(null);

      const destination = direction === 'right' ? width : -width;

      translateX.value = withTiming(destination * 1.2, { duration: 220 }, (finished) => {
        if (finished) {
          runOnJS(handleSwipeAction)(direction);
        }
      });
      translateY.value = withTiming(-18, { duration: 220 });
      nextCardScale.value = withTiming(1, { duration: 220 });
    },
    [handleSwipeAction, isSubmitting, nextCardScale, translateX, translateY, width]
  );

  const panGesture = Gesture.Pan()
    .enabled(Boolean(currentItem) && !isSubmitting)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.12;
      nextCardScale.value = interpolate(
        Math.abs(event.translationX),
        [0, SWIPE_THRESHOLD * 1.6],
        [0.96, 1]
      );
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        runOnJS(beginSwipe)('right');
        return;
      }

      if (event.translationX < -SWIPE_THRESHOLD) {
        runOnJS(beginSwipe)('left');
        return;
      }

      runOnJS(resetCardPosition)();
    });

  const topCardStyle = useAnimatedStyle(() => {
    const rotate = `${interpolate(translateX.value, [-width, 0, width], [-10, 0, 10])}deg`;

    return {
      transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { rotate }],
    };
  });

  const nextCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: nextCardScale.value }],
  }));

  const leftBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, -36, 0], [1, 0.3, 0]),
    transform: [{ scale: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0.8]) }],
  }));

  const rightBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, 36, SWIPE_THRESHOLD], [0, 0.3, 1]),
    transform: [{ scale: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0.8, 1]) }],
  }));

  if (!currentItem && discoveryQuery.isLoading && !usingFallback) {
    return (
      <View className="flex-1 justify-center px-4" style={{ paddingTop: insets.top }}>
        <AppCard className="gap-3 rounded-[24px] p-4">
          <AppText variant="title">Loading discovery deck...</AppText>
          <AppText tone="muted">
            Pulling the latest founder cards and match signals for this account.
          </AppText>
        </AppCard>
      </View>
    );
  }

  if (!currentItem) {
    return (
      <View className="flex-1 justify-center px-4" style={{ paddingTop: insets.top }}>
        <EmptyState
          isLoadingMore={Boolean(discoveryQuery.hasNextPage && discoveryQuery.isFetchingNextPage)}
          onResetFallback={() => setFallbackCards(mockDiscoveryCardsResponse.data.items)}
          usingFallback={usingFallback}
        />
        <View className="mt-8 flex-row items-center justify-center gap-6">
          <DeckActionButton
            color="#FFCD38"
            disabled={history.length === 0}
            icon="refresh"
            onPress={handleRewind}
            size="medium"
          />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 gap-4 px-4 pb-1" style={{ paddingTop: insets.top + 4 }}>
      {actionError ? (
        <AppCard tone="signal" className="gap-2 rounded-[16px] p-3">
          <AppText variant="subtitle">Swipe action failed</AppText>
          <AppText tone="muted">{actionError}</AppText>
        </AppCard>
      ) : null}

      <View className="flex-1">
        <View className="h-full w-full">
          {nextItem ? (
            <Animated.View
              className="absolute inset-0 overflow-hidden rounded-[24px] border border-border bg-background"
              style={[
                Shadows.card,
                nextCardStyle,
                { transform: [...(nextCardStyle.transform || []), { translateY: 8 }, { scale: 0.96 }] },
              ]}>
              <View className="h-[280px] overflow-hidden">
                {nextItem.photoUrl ? (
                  <Image
                    contentFit="cover"
                    source={{ uri: nextItem.photoUrl }}
                    style={{ height: '100%', width: '100%' }}
                  />
                ) : (
                  <View className="h-full w-full bg-surface-muted" />
                )}
              </View>
              <View className="gap-1 p-4">
                <AppText className="text-[20px]" variant="title">
                  {nextItem.name}
                </AppText>
                <AppText className="text-[14px]" tone="muted">
                  {nextItem.headline}
                </AppText>
              </View>
            </Animated.View>
          ) : null}

          <GestureDetector gesture={panGesture}>
            <Animated.View
              className="absolute inset-0 overflow-hidden rounded-[24px] border border-border bg-surface"
              style={[Shadows.card, topCardStyle]}>
              <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View className="h-[400px] overflow-hidden">
                  {currentItem.photoUrl ? (
                    <Image
                      contentFit="cover"
                      source={{ uri: currentItem.photoUrl }}
                      style={{ height: '100%', width: '100%' }}
                    />
                  ) : (
                    <View className="h-full w-full bg-surface-muted" />
                  )}

                  <View
                    className="absolute inset-0"
                    style={{ backgroundColor: 'rgba(17, 19, 26, 0.24)' }}
                  />

                  <View
                    className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-10"
                    style={{ backgroundColor: 'rgba(17, 19, 26, 0.52)' }}>
                    <AppText className="text-[28px] leading-[34px]" variant="hero">
                      {currentItem.age ? `${currentItem.name}, ${currentItem.age}` : currentItem.name}
                    </AppText>
                    <View className="mt-1 flex-row items-center gap-1.5">
                      <Ionicons color="#98A2B3" name="location-outline" size={16} />
                      <AppText className="text-[14px]" tone="muted">
                        {currentItem.location.display}
                      </AppText>
                      {typeof currentItem.location.distanceKm === 'number' ? (
                        <AppText className="text-[14px]" tone="signal">
                          • {currentItem.location.distanceKm} km
                        </AppText>
                      ) : null}
                    </View>
                  </View>
                </View>

                <View className="flex-row items-center justify-between border-b border-border px-4 py-4">
                  <View className="flex-row items-center gap-3">
                    <View className="items-center justify-center rounded-full border-2 border-[#FFCD38] p-2.5">
                      <AppText className="text-[16px] font-bold" style={{ color: '#FFCD38' }}>
                        {currentItem.match.score}%
                      </AppText>
                    </View>

                    <View className="gap-0.5">
                      <View className="flex-row items-center gap-1">
                        <Ionicons color="#FFCD38" name="star" size={14} />
                        <AppText
                          className="text-[14px]"
                          style={{ color: '#FFCD38' }}
                          variant="bodyStrong">
                          {currentItem.match.label ?? 'Strong Match'}
                        </AppText>
                      </View>
                      <AppText className="text-[12px]" tone="muted">
                        Match quality
                      </AppText>
                    </View>
                  </View>

                  <View className="items-end gap-1">
                    <AppText className="text-[17px] leading-tight" align="right" variant="title">
                      {currentItem.headline}
                    </AppText>
                    {currentItem.badges[0] ? (
                      <View className="flex-row items-center gap-1">
                        <Ionicons
                          color="#FF9A3E"
                          name={getBadgeIcon(currentItem.badges[0].icon)}
                          size={12}
                        />
                        <AppText className="text-[13px]" tone="muted">
                          {currentItem.badges[0].label}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View className="gap-5 px-4 py-4">
                  {currentItem.bio ? (
                    <AppText className="text-[16px] leading-7" tone="muted">
                      {currentItem.bio}
                    </AppText>
                  ) : null}

                  {currentItem.startupIdea ? (
                    <View
                      className="gap-2.5 rounded-[20px] border px-4 py-4"
                      style={{
                        backgroundColor: '#2A2117',
                        borderColor: 'rgba(255, 154, 62, 0.25)',
                      }}>
                      <SectionLabel icon="bulb-outline" title="Startup Idea" />
                      <AppText className="text-[16px] leading-6">{currentItem.startupIdea}</AppText>
                    </View>
                  ) : null}

                  <View className="gap-2.5">
                    <SectionLabel title="Industries & Interests" />
                    <View className="flex-row flex-wrap gap-2">
                      {currentItem.interests.map((item) => (
                        <DiscoveryTag
                          key={item.id}
                          item={item}
                          tone={item.type === 'availability' ? 'availability' : 'default'}
                        />
                      ))}
                    </View>
                  </View>

                  <View className="gap-2.5">
                    <SectionLabel title="Skills" />
                    <View className="flex-row flex-wrap gap-2">
                      {currentItem.skills.map((item) => (
                        <DiscoveryTag key={item.id} item={item} />
                      ))}
                    </View>
                  </View>

                  {currentItem.experience?.length ? (
                    <View className="gap-3">
                      <SectionLabel icon="briefcase-outline" title="Experience" />
                      {currentItem.experience.map((item) => (
                        <AppCard key={item.id} className="gap-1.5 rounded-[16px] p-4">
                          <AppText className="text-[16px]" variant="title">
                            {item.title}
                          </AppText>
                          <AppText className="text-[13px]" tone="signal">
                            {item.organization} · {item.period}
                          </AppText>
                        </AppCard>
                      ))}
                    </View>
                  ) : null}

                  {currentItem.education?.length ? (
                    <View className="gap-3">
                      {currentItem.education.map((item) => (
                        <AppCard
                          key={item.id}
                          className="flex-row items-center gap-3.5 rounded-[16px] p-4">
                          <Ionicons color="#FFCD38" name="school-outline" size={24} />
                          <View className="flex-1 gap-0.5">
                            <AppText className="text-[16px]" variant="title">
                              {item.degree}
                            </AppText>
                            <AppText className="text-[13px]" style={{ color: '#FFCD38' }}>
                              {item.school}
                            </AppText>
                          </View>
                        </AppCard>
                      ))}
                    </View>
                  ) : null}

                  {currentItem.languages?.length ? (
                    <View className="flex-row items-center gap-2 pb-1">
                      <Ionicons color="#FF9A3E" name="globe-outline" size={20} />
                      <AppText className="text-[14px]" tone="muted">
                        {currentItem.languages.join(' · ')}
                      </AppText>
                    </View>
                  ) : null}
                </View>
              </ScrollView>

              <Animated.View
                className="absolute left-4 top-5 rounded-full border border-signal bg-signal-tint px-3 py-1.5"
                style={leftBadgeStyle}>
                <AppText className="text-[12px]" tone="signal" variant="label">
                  Pass
                </AppText>
              </Animated.View>

              <Animated.View
                className="absolute right-4 top-5 rounded-full border border-accent bg-accent-tint px-3 py-1.5"
                style={rightBadgeStyle}>
                <AppText className="text-[12px]" tone="accent" variant="label">
                  Like
                </AppText>
              </Animated.View>
            </Animated.View>
          </GestureDetector>
        </View>
      </View>

      <View className="flex-row items-center justify-center gap-5">
        <DeckActionButton
          color="#EF4444"
          disabled={isSubmitting}
          icon="close"
          onPress={() => beginSwipe('left')}
          size="medium"
        />
        <DeckActionButton
          color="#FFCD38"
          disabled={history.length === 0 || isSubmitting}
          icon="refresh"
          onPress={handleRewind}
          size="small"
        />
        <DeckActionButton
          color="#FF9A3E"
          disabled={isSubmitting}
          icon="flash"
          onPress={handleSuperLike}
          size="large"
          variant="filled"
        />
        <DeckActionButton
          color="#10B981"
          disabled={isSubmitting}
          icon="checkmark"
          onPress={() => beginSwipe('right')}
          size="medium"
        />
      </View>

      {Boolean(discoveryQuery.hasNextPage && discoveryQuery.isFetchingNextPage) ? (
        <AppText align="center" className="text-[10px]" tone="muted" variant="code">
          Loading more cards...
        </AppText>
      ) : null}
    </View>
  );
}
