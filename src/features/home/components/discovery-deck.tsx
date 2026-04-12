import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';
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

import { useRevenueCat } from '@features/revenuecat';
import { AppCard, AppText } from '@shared/components';
import { ApiError } from '@shared/services/api';
import { Shadows } from '@shared/theme';

import {
  countAppliedDiscoveryFilters,
  useDiscoveryCards,
  useDiscoveryFilterOptions,
  useSwipeAction,
} from '../hooks/use-discovery';
import {
  mockDiscoveryCardsResponse,
  mockDiscoveryFilterOptionsByMode,
} from '../mock/discovery.mock';
import type {
  DiscoveryAppliedFilters,
  DiscoveryCard,
  DiscoveryCardsRequest,
  DiscoveryFilterField,
  DiscoveryFilterSection,
  DiscoveryGoalId,
  DiscoveryMode,
  SwipeActionRequest,
} from '../types/discovery.types';
import { DiscoveryFilterSheet } from './discovery-filter-sheet';

type SwipeDirection = 'left' | 'right';

const SWIPE_THRESHOLD = 120;
const PRELOAD_THRESHOLD = 3;
const DISCOVERY_PAGE_LIMIT = 10;
const DEFAULT_FILTER_MODE: DiscoveryMode = 'joining_startups';

const GOAL_ID_BY_MODE: Record<DiscoveryMode, DiscoveryGoalId> = {
  finding_cofounder: 'goal_finding_cofounder',
  building_team: 'goal_building_team',
  explore_startups: 'goal_explore_startups',
  joining_startups: 'goal_joining_startups',
};

function hasUsableCards(items: DiscoveryCard[]) {
  return items.length > 0;
}

function hasUsableFilterSections(sections?: DiscoveryFilterSection[]) {
  return Boolean(sections?.length);
}

function getFallbackFilterOptions(mode: DiscoveryMode) {
  return mockDiscoveryFilterOptionsByMode[mode];
}

function flattenUniqueCards(response?: { pages: { data: { items: DiscoveryCard[] } }[] }) {
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

function triggerSwipeHaptic(direction: SwipeDirection) {
  if (process.env.EXPO_OS === 'ios') {
    void Haptics.impactAsync(
      direction === 'right' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    );
  }
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

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function isPremiumRequiredError(error: unknown) {
  if (!(error instanceof ApiError)) {
    return false;
  }

  const payloadCode =
    error.payload &&
    typeof error.payload === 'object' &&
    'error' in error.payload &&
    error.payload.error &&
    typeof error.payload.error === 'object' &&
    'code' in error.payload.error
      ? error.payload.error.code
      : undefined;

  return (
    payloadCode === 'PREMIUM_REQUIRED' ||
    error.message.toUpperCase().includes('PREMIUM_REQUIRED') ||
    error.message.toLowerCase().includes('premium subscription required')
  );
}

function getDefaultFieldValue(field: DiscoveryFilterField) {
  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }

  if (field.type === 'multi_select') {
    return [];
  }

  if (field.type === 'boolean') {
    return false;
  }

  if (field.type === 'range') {
    return field.min ?? 0;
  }

  return '';
}

function getDefaultSectionValue(section: DiscoveryFilterSection) {
  if (section.defaultValue !== undefined) {
    return section.defaultValue;
  }

  if (section.type === 'multi_select') {
    return [];
  }

  if (section.fields?.length) {
    return Object.fromEntries(section.fields.map((field) => [field.id, getDefaultFieldValue(field)]));
  }

  return '';
}

function sanitizeFieldValue(field: DiscoveryFilterField, rawValue: unknown) {
  if (field.type === 'multi_select') {
    return Array.isArray(rawValue)
      ? rawValue.filter((value): value is string => typeof value === 'string' && value.length > 0)
      : [];
  }

  if (field.type === 'boolean') {
    return Boolean(rawValue);
  }

  if (field.type === 'range') {
    const numericValue =
      typeof rawValue === 'number'
        ? rawValue
        : typeof rawValue === 'string'
          ? Number(rawValue)
          : field.defaultValue;

    return Number.isFinite(numericValue) ? numericValue : field.defaultValue ?? field.min ?? 0;
  }

  if (typeof rawValue !== 'string') {
    return '';
  }

  return rawValue.trim();
}

function sanitizeSectionValue(section: DiscoveryFilterSection, rawValue: unknown) {
  if (section.id === 'goal') {
    return '';
  }

  if (section.type === 'group') {
    const record =
      rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)
        ? (rawValue as Record<string, unknown>)
        : {};

    return section.fields?.reduce<Record<string, unknown>>((nextValue, field) => {
      const normalized = sanitizeFieldValue(field, record[field.id]);
      const defaultValue = getDefaultFieldValue(field);

      if (JSON.stringify(normalized) !== JSON.stringify(defaultValue)) {
        nextValue[field.id] = normalized;
      }

      return nextValue;
    }, {}) ?? {};
  }

  if (section.type === 'multi_select') {
    return Array.isArray(rawValue)
      ? rawValue.filter((value): value is string => typeof value === 'string' && value.length > 0)
      : [];
  }

  if (typeof rawValue !== 'string') {
    return '';
  }

  return rawValue.trim();
}

function sanitizeDiscoveryFilters(
  filters: DiscoveryAppliedFilters,
  sections: DiscoveryFilterSection[]
) {
  return sections.reduce<DiscoveryAppliedFilters>((nextFilters, section) => {
    const normalized = sanitizeSectionValue(section, filters[section.id]);
    const defaultValue = sanitizeSectionValue(section, getDefaultSectionValue(section));

    const isEmpty =
      normalized === '' ||
      (Array.isArray(normalized) && normalized.length === 0) ||
      (normalized &&
        typeof normalized === 'object' &&
        !Array.isArray(normalized) &&
        Object.keys(normalized).length === 0);

    if (section.id === 'goal' || isEmpty) {
      return nextFilters;
    }

    if (JSON.stringify(normalized) === JSON.stringify(defaultValue)) {
      return nextFilters;
    }

    nextFilters[section.id] = normalized;
    return nextFilters;
  }, {});
}

function getGoalOptions(sections: DiscoveryFilterSection[], mode: DiscoveryMode) {
  const goalSection = sections.find((section) => section.id === 'goal');

  if (goalSection?.options?.length) {
    return goalSection.options;
  }

  return (
    getFallbackFilterOptions(mode).data.sections.find((section) => section.id === 'goal')?.options ?? []
  );
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
  const { width } = useWindowDimensions();
  const { isConnectXProActive, presentPaywallIfNeeded, supported } = useRevenueCat();
  const [fallbackCards, setFallbackCards] = React.useState(mockDiscoveryCardsResponse.data.items);
  const [restoredCards, setRestoredCards] = React.useState<DiscoveryCard[]>([]);
  const [history, setHistory] = React.useState<DiscoveryCard[]>([]);
  const [lastSuccessfulCards, setLastSuccessfulCards] = React.useState<DiscoveryCard[]>([]);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [filterError, setFilterError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isFilterVisible, setIsFilterVisible] = React.useState(false);
  const [isApplyingFilters, setIsApplyingFilters] = React.useState(false);
  const [sheetMode, setSheetMode] = React.useState<DiscoveryMode>(DEFAULT_FILTER_MODE);
  const [appliedMode, setAppliedMode] = React.useState<DiscoveryMode | null>(null);
  const [appliedFilters, setAppliedFilters] = React.useState<DiscoveryAppliedFilters>({});
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const nextCardScale = useSharedValue(0.96);
  const currentCardRef = React.useRef<DiscoveryCard | null>(null);

  const filterOptionsQuery = useDiscoveryFilterOptions(sheetMode, isFilterVisible);
  const liveFilterOptions = filterOptionsQuery.data;
  const usingFilterFallback = !hasUsableFilterSections(liveFilterOptions?.data.sections);
  const activeFilterOptions = usingFilterFallback
    ? getFallbackFilterOptions(sheetMode)
    : liveFilterOptions ?? getFallbackFilterOptions(sheetMode);
  const filterSections = activeFilterOptions.data.sections;
  const goalOptions = getGoalOptions(filterSections, sheetMode);

  const appliedSections = React.useMemo(() => {
    if (!appliedMode) {
      return getFallbackFilterOptions(DEFAULT_FILTER_MODE).data.sections;
    }

    if (
      appliedMode === sheetMode &&
      liveFilterOptions?.data.context.mode === appliedMode &&
      hasUsableFilterSections(liveFilterOptions.data.sections)
    ) {
      return liveFilterOptions.data.sections;
    }

    return getFallbackFilterOptions(appliedMode).data.sections;
  }, [appliedMode, liveFilterOptions, sheetMode]);

  const sanitizedAppliedFilters = React.useMemo(
    () => sanitizeDiscoveryFilters(appliedFilters, appliedSections),
    [appliedFilters, appliedSections]
  );

  const discoveryRequest = React.useMemo<Omit<DiscoveryCardsRequest, 'pagination'>>(() => {
    if (!appliedMode) {
      return {};
    }

    return {
      context: {
        mode: appliedMode,
      },
      filters: {
        goalId: GOAL_ID_BY_MODE[appliedMode],
        ...sanitizedAppliedFilters,
      },
    };
  }, [appliedMode, sanitizedAppliedFilters]);

  const discoveryQuery = useDiscoveryCards(discoveryRequest, DISCOVERY_PAGE_LIMIT);
  const swipeAction = useSwipeAction();

  const liveCards = React.useMemo(() => flattenUniqueCards(discoveryQuery.data), [discoveryQuery.data]);

  React.useEffect(() => {
    if (liveCards.length > 0) {
      setLastSuccessfulCards(liveCards);
    }
  }, [liveCards]);

  const effectiveLiveCards = liveCards.length > 0 ? liveCards : lastSuccessfulCards;
  const usingFallback =
    !hasUsableCards(effectiveLiveCards) && (discoveryQuery.isError || discoveryQuery.isSuccess);
  const baseCards = usingFallback ? fallbackCards : effectiveLiveCards;
  const cards = React.useMemo(() => {
    const baseIds = new Set(baseCards.map((card) => card.id));
    return [...restoredCards.filter((card) => !baseIds.has(card.id)), ...baseCards];
  }, [baseCards, restoredCards]);

  const currentItem = cards[0] ?? null;
  const nextItem = cards[1] ?? null;
  const remainingCards = cards.length;
  const appliedFilterCount = React.useMemo(
    () => countAppliedDiscoveryFilters(sanitizedAppliedFilters),
    [sanitizedAppliedFilters]
  );

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

  React.useEffect(() => {
    if (!discoveryQuery.isError || !isPremiumRequiredError(discoveryQuery.error)) {
      return;
    }

    setFilterError(
      getErrorMessage(discoveryQuery.error, 'Premium subscription required to use advanced discovery filters.')
    );
  }, [discoveryQuery.error, discoveryQuery.isError]);

  React.useEffect(() => {
    setFallbackCards(mockDiscoveryCardsResponse.data.items);
    setRestoredCards([]);
    setHistory([]);
    setActionError(null);
    translateX.value = 0;
    translateY.value = 0;
    nextCardScale.value = 0.96;
  }, [discoveryRequest, nextCardScale, translateX, translateY]);

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
        setHistory((current) => [...current.slice(-19), activeCard]);

        if (usingFallback) {
          setFallbackCards((current) => current.filter((item) => item.id !== activeCard.id));
        } else {
          setRestoredCards((current) => current.filter((card) => card.id !== activeCard.id));
          await swipeAction.mutateAsync({
            payload: { action },
            profileId: activeCard.profileId,
          });
        }

        setActionError(null);
      } catch (error) {
        setActionError(getErrorMessage(error, 'Unable to record this swipe right now.'));
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
    if (history.length === 0 || isSubmitting) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const lastCard = history[history.length - 1];
    setHistory((current) => current.slice(0, -1));
    setRestoredCards((current) => [lastCard, ...current]);
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

  const handleOpenFilters = React.useCallback(() => {
    setFilterError(null);
    setSheetMode(appliedMode ?? DEFAULT_FILTER_MODE);
    setIsFilterVisible(true);
  }, [appliedMode]);

  const handleCloseFilters = React.useCallback(() => {
    setIsFilterVisible(false);
  }, []);

  const handleResetFilters = React.useCallback(() => {
    setAppliedMode(null);
    setAppliedFilters({});
    setFilterError(null);
    setSheetMode(DEFAULT_FILTER_MODE);
    setIsFilterVisible(false);
  }, []);

  const handleApplyFilters = React.useCallback(
    async (mode: DiscoveryMode, nextFilters: DiscoveryAppliedFilters) => {
      setIsApplyingFilters(true);

      try {
        if (!isConnectXProActive) {
          const result = await presentPaywallIfNeeded();
          const unlockedPro =
            isConnectXProActive ||
            result === PAYWALL_RESULT.PURCHASED ||
            result === PAYWALL_RESULT.RESTORED;

          if (!unlockedPro) {
            setFilterError(
              supported
                ? 'ConnectX Pro is required to apply discovery filters.'
                : 'Discovery premium filters are available in native builds with ConnectX Pro.'
            );
            return;
          }
        }

        console.log('applyDiscoveryFilters payload', {
          context: {
            mode,
          },
          filters: {
            goalId: GOAL_ID_BY_MODE[mode],
            ...sanitizeDiscoveryFilters(nextFilters, getFallbackFilterOptions(mode).data.sections),
          },
        });

        setAppliedMode(mode);
        setAppliedFilters(nextFilters);
        setSheetMode(mode);
        setFilterError(null);
        setIsFilterVisible(false);
      } catch (error) {
        setFilterError(getErrorMessage(error, 'Unable to open the ConnectX Pro upgrade flow.'));
      } finally {
        setIsApplyingFilters(false);
      }
    },
    [isConnectXProActive, presentPaywallIfNeeded, supported]
  );

  const handleModeChange = React.useCallback((mode: DiscoveryMode) => {
    setSheetMode(mode);
    setFilterError(null);
  }, []);

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

  const filterSheet = (
    <DiscoveryFilterSheet
      currentMode={sheetMode}
      errorMessage={
        filterError ??
        (usingFilterFallback ? 'Showing fallback filter options while the API is unavailable.' : null)
      }
      goalOptions={goalOptions}
      initialAppliedMode={appliedMode}
      initialFilters={appliedFilters}
      isApplying={isApplyingFilters}
      onApply={handleApplyFilters}
      onClose={handleCloseFilters}
      onModeChange={handleModeChange}
      onReset={handleResetFilters}
      sections={filterSections}
      visible={isFilterVisible}
    />
  );

  if (!currentItem && discoveryQuery.isLoading && !usingFallback) {
    return (
      <View className="flex-1 justify-center px-4" style={{ paddingTop: insets.top }}>
        <AppCard className="gap-3 rounded-[24px] p-4">
          <AppText variant="title">Loading discovery deck...</AppText>
          <AppText tone="muted">
            Pulling the latest founder cards and match signals for this account.
          </AppText>
        </AppCard>
        {filterSheet}
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
        {filterSheet}
      </View>
    );
  }

  return (
    <View className="flex-1 gap-4 px-4 pb-1" style={{ paddingTop: insets.top + 4 }}>
      <View className="flex-row items-center justify-between">
        <View className="gap-1">
          <AppText variant="title">Discover</AppText>
          <AppText tone="muted">
            Swipe through curated builders, founders, and operators near you.
          </AppText>
        </View>
        <Pressable
          className="flex-row items-center gap-2 rounded-full border px-3 py-2"
          onPress={handleOpenFilters}
          style={{
            backgroundColor: '#1A1C22',
            borderColor:
              appliedFilterCount > 0 || appliedMode
                ? 'rgba(255, 154, 62, 0.38)'
                : 'rgba(152, 162, 179, 0.18)',
          }}>
          <Ionicons
            color={appliedFilterCount > 0 || appliedMode ? '#FF9A3E' : '#D0D5DD'}
            name="options-outline"
            size={16}
          />
          <AppText
            className="text-[13px]"
            style={{ color: appliedFilterCount > 0 || appliedMode ? '#FF9A3E' : '#D0D5DD' }}
            variant="bodyStrong">
            Filter
          </AppText>
          {appliedFilterCount > 0 ? (
            <View
              className="min-w-6 items-center rounded-full px-2 py-0.5"
              style={{ backgroundColor: '#2A2117' }}>
              <AppText className="text-[11px]" tone="signal" variant="code">
                {appliedFilterCount}
              </AppText>
            </View>
          ) : null}
        </Pressable>
      </View>

      {filterError ? (
        <AppCard tone="signal" className="gap-2 rounded-[16px] p-3">
          <AppText variant="subtitle">Discovery search</AppText>
          <AppText tone="muted">{filterError}</AppText>
        </AppCard>
      ) : null}

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

      {filterSheet}
    </View>
  );
}
