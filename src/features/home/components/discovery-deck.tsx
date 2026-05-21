import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { useAuth } from '@features/auth';
import { chatQueryKeys } from '@features/chat/hooks/use-mock-chat';
import { upsertDiscoveryMatchConversation } from '@features/chat/services/chat-sqlite-service';
import { matchesQueryKeys } from '@features/matches/hooks/use-matches';
import { upsertGeneratedMockMatch } from '@features/matches/services/generated-matches-storage';
import { useNotifications } from '@features/notifications';
import { useUpdateProfileLocation } from '@features/profile';
import { REVENUECAT_OFFERING_IDS, useRevenueCat } from '@features/revenuecat';
import { AppCard, AppText, AppTopBar } from '@shared/components';
import { ApiError } from '@shared/services/api';
import { Shadows } from '@shared/theme';
import { isExpoDevModeEnabled } from '@shared/utils/env';

import { getDiscoveryFilterSections } from '../config/discovery-filters';
import {
  countAppliedDiscoveryFilters,
  useDiscoveryCards,
  useDiscoveryFilterOptions,
  useRewindAction,
  useSwipeAction,
} from '../hooks/use-discovery';
import { useDiscoveryOnboardingRequiredHandler } from '../hooks/use-discovery-onboarding-required-handler';
import {
  mockDiscoveryCardsResponse,
  mockDiscoveryCardsResponsesByMode,
} from '../mock/discovery.mock';
import { setAppliedDiscoveryMode } from '../services/applied-discovery-mode-store';
import {
  isRewindNotAvailableError,
  isRewindPremiumRequiredError,
  isSuperLikeRequiresBoostError,
} from '../services/discovery-contract';
import { isDiscoveryCardsMockEnabled } from '../services/discovery-service';
import { loadOnboardingDiscoveryPreference } from '../services/onboarding-discovery-preference';
import type {
  DiscoveryAppliedFilters,
  DiscoveryCard,
  DiscoveryCardBadge,
  DiscoveryCardCertification,
  DiscoveryCardEducation,
  DiscoveryCardExperience,
  DiscoveryCardsRequest,
  DiscoveryFilterField,
  DiscoveryFilterSection,
  DiscoveryGoalId,
  DiscoveryMode,
  DiscoveryProfileCard,
  DiscoveryStartupCard,
  DiscoverySwipeHistoryEntry,
  SwipeActionRequest,
} from '../types/discovery.types';
import { isDiscoveryProfileCard } from '../types/discovery.types';
import { DiscoveryFilterSheet } from './discovery-filter-sheet';
import { MatchModal } from './match-modal';

type SwipeDirection = 'left' | 'right';
type SwipeActionIntent = SwipeActionRequest['action'];
type DeviceCoordinates = {
  latitude: number;
  longitude: number;
};
type MatchState = {
  card: DiscoveryCard;
  conversationId: string | null;
  matchId: string | null;
};

const SWIPE_THRESHOLD = 120;
const PRELOAD_THRESHOLD = 3;
const DISCOVERY_PAGE_LIMIT = 10;
const DEFAULT_FILTER_MODE: DiscoveryMode = 'joining_startups';
const MOCK_MATCH_RANDOM_CHANCE = 0.35;
const FLOATING_ACTIONS_CONTENT_PADDING = 72;
const DISCOVERY_LOCATION_TIMEOUT_MS = 6000;
const MATCH_SCORE_RING_SIZE = 52;
const MATCH_SCORE_RING_STROKE_WIDTH = 3.5;
const DISCOVERY_CARD_DESCRIPTION_MAX_LENGTH = 160;

const GOAL_ID_BY_MODE: Record<DiscoveryMode, DiscoveryGoalId> = {
  finding_cofounder: 'goal_finding_cofounder',
  building_team: 'goal_building_team',
  explore_startups: 'goal_explore_startups',
  joining_startups: 'goal_joining_startups',
};

function isMergedMockCard(card: DiscoveryCard) {
  return card.__source === 'mock';
}

function getFallbackCards(mode: DiscoveryMode | null) {
  return (mockDiscoveryCardsResponsesByMode[mode ?? DEFAULT_FILTER_MODE] ?? mockDiscoveryCardsResponse).data.items;
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
    case 'linkedin':
      return 'logo-linkedin';
    case 'verified':
    case 'badge-check':
      return 'checkmark-circle-outline';
    case 'pro':
    case 'diamond':
      return 'diamond-outline';
    default:
      return 'star-outline';
  }
}

function getStartupIndustryLabels(industry?: DiscoveryStartupCard['industry']) {
  if (!industry) {
    return [];
  }

  const displayLabels = (industry.display || '')
    .split(/\s*\/\s*/)
    .map(normalizeIndustryLabel)
    .filter(Boolean);

  if (displayLabels.length) {
    return displayLabels;
  }

  return [industry.primary, industry.secondary]
    .map(normalizeIndustryLabel)
    .filter((label): label is string => Boolean(label));
}

function getStartupIndustryPreview(industry?: DiscoveryStartupCard['industry']) {
  const labels = getStartupIndustryLabels(industry);

  return labels.slice(0, 2).join(' / ');
}

function normalizeIndustryLabel(label?: string | null) {
  const trimmedLabel = label?.trim();

  if (!trimmedLabel) {
    return '';
  }

  if (!trimmedLabel.includes('_')) {
    return trimmedLabel;
  }

  const normalizedLabel = trimmedLabel.replace(/_/g, ' ').replace(/\s+/g, ' ');

  return normalizedLabel.charAt(0).toUpperCase() + normalizedLabel.slice(1);
}

function normalizeIndustryDisplay(label?: string | null) {
  return label
    ?.split(/\s*\/\s*/)
    .map(normalizeIndustryLabel)
    .filter(Boolean)
    .join(' / ');
}

function getBoundedMatchScore(score: number) {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.min(Math.max(Math.round(score), 0), 100);
}

function getMatchScoreColor(score: number) {
  if (score >= 90) {
    return '#31D47A';
  }

  if (score >= 75) {
    return '#FFCD38';
  }

  if (score >= 60) {
    return '#FF9A3E';
  }

  return '#F04438';
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  const suffix = '...';
  const limit = Math.max(maxLength - suffix.length, 0);
  const truncated = value.slice(0, limit).trimEnd();
  const wordBoundaryIndex = truncated.lastIndexOf(' ');
  const nextValue =
    wordBoundaryIndex > Math.floor(limit * 0.65) ? truncated.slice(0, wordBoundaryIndex) : truncated;

  return `${nextValue}${suffix}`;
}

function normalizeExternalUrl(url: string) {
  const trimmedUrl = url.trim();

  if (/^https?:\/\//i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  return `https://${trimmedUrl}`;
}

function openExternalUrl(url: string) {
  void Linking.openURL(normalizeExternalUrl(url)).catch((error) => {
    console.warn('Unable to open external URL.', error);
  });
}

function getExperienceOrganization(item: DiscoveryCardExperience) {
  return item.organization ?? item.company ?? '';
}

function getExperienceKey(item: DiscoveryCardExperience, index: number) {
  return item.id ?? `${item.title}-${getExperienceOrganization(item)}-${item.period ?? index}`;
}

function getEducationKey(item: DiscoveryCardEducation, index: number) {
  return item.id ?? `${item.degree}-${item.school}-${item.period ?? index}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function getCoordinatesKey(coordinates: DeviceCoordinates) {
  return `${coordinates.latitude},${coordinates.longitude}`;
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

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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

function withDeviceCoordinates(
  filters: DiscoveryAppliedFilters,
  coordinates: DeviceCoordinates | null
) {
  if (!coordinates) {
    return filters;
  }

  const locationAvailability = isRecordValue(filters.locationAvailability) ? filters.locationAvailability : {};

  return {
    ...filters,
    locationAvailability: {
      ...locationAvailability,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    },
  };
}

function withoutLocationAvailability(filters: DiscoveryAppliedFilters) {
  if (!('locationAvailability' in filters)) {
    return filters;
  }

  const { locationAvailability: _locationAvailability, ...remainingFilters } = filters;
  return remainingFilters;
}

function buildDiscoveryRequestFilters(
  filters: DiscoveryAppliedFilters,
  coordinates: DeviceCoordinates | null,
  shouldIncludeLocationAvailability: boolean
) {
  if (!shouldIncludeLocationAvailability) {
    return withoutLocationAvailability(filters);
  }

  return withDeviceCoordinates(filters, coordinates);
}

function hasDiscoveryQuerySettled({
  isError,
  isSuccess,
}: {
  isError: boolean;
  isSuccess: boolean;
}) {
  return isError || isSuccess;
}

function getGoalOptions(sections: DiscoveryFilterSection[], mode: DiscoveryMode) {
  const goalSection = sections.find((section) => section.id === 'goal');

  if (goalSection?.options?.length) {
    return goalSection.options;
  }

  return getDiscoveryFilterSections(mode).find((section) => section.id === 'goal')?.options ?? [];
}

function getCardActionTargetId(card: DiscoveryCard) {
  return isDiscoveryProfileCard(card) ? card.profileId : card.startupId;
}

function getDiscoveryMatchConversationInput(card: DiscoveryCard) {
  if (isDiscoveryProfileCard(card)) {
    return {
      id: getCardActionTargetId(card),
      name: card.name,
      photoUrl: card.photoUrl,
    };
  }

  return {
    id: getCardActionTargetId(card),
    name: card.name,
    photoUrl: card.logoUrl,
  };
}

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

function getSafeAccentColor(color?: string) {
  const normalized = color?.trim();

  if (normalized && /^#[\da-f]{6}$/i.test(normalized)) {
    return normalized;
  }

  return '#FF9A3E';
}

function normalizeStringList(items?: string[]) {
  return items
    ?.map((item) => item.trim())
    .filter((item): item is string => item.length > 0) ?? [];
}

function getBadgeKey(badge: DiscoveryCardBadge, index: number) {
  return badge.id ?? `${badge.label}-${index}`;
}

function getCertificationKey(item: DiscoveryCardCertification, index: number) {
  return item.id ?? `${item.name}-${item.issuer ?? 'issuer'}-${item.date ?? index}`;
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

function DiscoveryDeckSkeleton() {
  return (
    <View className="flex-1 px-2 pb-1">
      <View
        className="mt-2 flex-1 overflow-hidden rounded-[24px] border border-border p-4"
        style={[Shadows.card, { backgroundColor: '#232323' }]}>
        <SkeletonBlock className="h-[48%] rounded-[20px]" />

        <View className="mt-5 gap-3">
          <SkeletonBlock className="h-4 w-24 rounded-full" style={{ backgroundColor: withAlpha('#FF9A3E', 0.26) }} />
          <SkeletonBlock className="h-8 w-[78%] rounded-[10px]" />
          <SkeletonBlock className="h-4 w-[92%] rounded-full" />
          <SkeletonBlock className="h-4 w-[68%] rounded-full" />
        </View>

        <View className="mt-5 flex-row flex-wrap gap-2">
          <SkeletonBlock className="h-8 w-28 rounded-full" />
          <SkeletonBlock className="h-8 w-24 rounded-full" />
          <SkeletonBlock className="h-8 w-32 rounded-full" />
        </View>

        <View className="mt-auto gap-3">
          <SkeletonBlock className="h-16 rounded-[16px]" />
          <View className="flex-row justify-center gap-5">
            <SkeletonBlock className="h-14 w-14 rounded-full" />
            <SkeletonBlock className="h-16 w-16 rounded-full" style={{ backgroundColor: withAlpha('#FF9A3E', 0.22) }} />
            <SkeletonBlock className="h-14 w-14 rounded-full" />
          </View>
        </View>
      </View>
    </View>
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

function StartupLogo({
  card,
  size = 96,
}: {
  card: DiscoveryStartupCard;
  size?: number;
}) {
  const initials = card.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  if (card.logoUrl) {
    return (
      <Image
        contentFit="cover"
        source={{ uri: card.logoUrl }}
        style={{ borderRadius: 24, height: size, width: size }}
      />
    );
  }

  return (
    <View
      className="items-center justify-center rounded-[24px]"
      style={{
        backgroundColor: '#FFBE3D',
        height: size,
        width: size,
      }}>
      <AppText className="text-[24px] font-bold" style={{ color: '#1E1A12' }}>
        {initials}
      </AppText>
    </View>
  );
}

function MatchScoreRing({ score }: { score: number }) {
  const boundedScore = getBoundedMatchScore(score);
  const color = getMatchScoreColor(boundedScore);
  const radius = (MATCH_SCORE_RING_SIZE - MATCH_SCORE_RING_STROKE_WIDTH) / 2;
  const center = MATCH_SCORE_RING_SIZE / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - boundedScore / 100);

  return (
    <View
      className="items-center justify-center"
      style={{ height: MATCH_SCORE_RING_SIZE, width: MATCH_SCORE_RING_SIZE }}>
      <Svg height={MATCH_SCORE_RING_SIZE} width={MATCH_SCORE_RING_SIZE}>
        <Circle
          cx={center}
          cy={center}
          fill="none"
          r={radius}
          stroke={withAlpha(color, 0.18)}
          strokeWidth={MATCH_SCORE_RING_STROKE_WIDTH}
        />
        <Circle
          cx={center}
          cy={center}
          fill="none"
          r={radius}
          stroke={color}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          strokeWidth={MATCH_SCORE_RING_STROKE_WIDTH}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <AppText className="text-[16px] font-bold" style={{ color }}>
          {boundedScore}%
        </AppText>
      </View>
    </View>
  );
}

function MatchScoreBadge({ label, score }: { label?: string; score: number }) {
  const color = getMatchScoreColor(getBoundedMatchScore(score));

  return (
    <View className="shrink-0 items-center gap-1">
      <MatchScoreRing score={score} />
      <View className="max-w-[104px] flex-row items-center justify-center gap-1">
        <Ionicons color={color} name="star" size={12} />
        <AppText
          className="min-w-0 text-[11px] leading-[14px]"
          ellipsizeMode="tail"
          numberOfLines={1}
          style={{ color, flexShrink: 1 }}
          variant="bodyStrong">
          {label ?? 'Strong Match'}
        </AppText>
      </View>
    </View>
  );
}

function StartupRoleChip({ title }: { title: string }) {
  return (
    <View
      className="rounded-full border px-3 py-1.5"
      style={{
        backgroundColor: '#2A2117',
        borderColor: 'rgba(255, 154, 62, 0.35)',
      }}>
      <AppText className="text-[12px]" style={{ color: '#FF9A3E' }} variant="bodyStrong">
        {title}
      </AppText>
    </View>
  );
}

function StartupJourney({ card }: { card: DiscoveryStartupCard }) {
  if (!card.journey?.stages?.length) {
    return null;
  }

  return (
    <View
      className="gap-4 rounded-[22px] border px-4 py-4"
      style={{
        backgroundColor: '#261C15',
        borderColor: 'rgba(255, 154, 62, 0.28)',
      }}>
      <SectionLabel icon="rocket-outline" title="Startup Journey" />
      <View className="gap-2">
        <View className="flex-row gap-2">
          {card.journey.stages.map((stage, index) => {
            const isCurrent = stage.state === 'current';
            const isCompleted = stage.state === 'completed';

            return (
              <View key={stage.id} className="flex-1 gap-2">
                <View
                  className="h-1.5 rounded-full"
                  style={{
                    backgroundColor: isCurrent || isCompleted ? '#FF9A3E' : 'rgba(152, 162, 179, 0.18)',
                  }}
                />
                <AppText
                  className="text-[11px]"
                  style={{
                    color: isCurrent ? '#FFB05B' : isCompleted ? '#D0D5DD' : '#667085',
                    textAlign: index === card.journey.stages.length - 1 ? 'right' : 'left',
                  }}>
                  {stage.label}
                </AppText>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function ProfileBadgePill({ badge }: { badge: DiscoveryCardBadge }) {
  const accentColor = getSafeAccentColor(badge.color);

  return (
    <View
      className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5"
      style={{
        backgroundColor: withAlpha(accentColor, 0.14),
        borderColor: withAlpha(accentColor, 0.34),
      }}>
      <Ionicons color={accentColor} name={getBadgeIcon(badge.icon)} size={13} />
      <AppText className="text-[12px] font-semibold" numberOfLines={1} style={{ color: accentColor }}>
        {badge.label}
      </AppText>
    </View>
  );
}

function MatchHighlights({
  items,
  title = 'Why you match',
}: {
  items: string[];
  title?: string;
}) {
  if (!items.length) {
    return null;
  }

  return (
    <View
      className="gap-3 rounded-[20px] border px-4 py-4"
      style={{
        backgroundColor: '#221F19',
        borderColor: 'rgba(255, 154, 62, 0.24)',
      }}>
      <SectionLabel icon="sparkles-outline" title={title} />
      <View className="gap-2.5">
        {items.map((item, index) => (
          <View key={`${item}-${index}`} className="flex-row gap-2.5">
            <View
              className="mt-2 h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: '#FF9A3E' }}
            />
            <AppText className="min-w-0 flex-1 text-[14px] leading-5" tone="muted">
              {item}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

function CertificationCard({ item, index }: { item: DiscoveryCardCertification; index: number }) {
  const verificationUrl = item.link?.trim();

  return (
    <AppCard className="rounded-[16px] border border-white/10 bg-[#2C2C2C] p-4">
      <View className="flex-row items-center gap-3.5">
        {item.logoUrl ? (
          <View className="h-11 w-11 overflow-hidden rounded-[12px] border border-white/10 bg-white">
            <Image
              contentFit="contain"
              source={{ uri: item.logoUrl }}
              style={{ height: '100%', width: '100%' }}
            />
          </View>
        ) : (
          <View
            className="h-11 w-11 items-center justify-center rounded-[12px] border"
            style={{
              backgroundColor: 'rgba(255, 154, 62, 0.12)',
              borderColor: 'rgba(255, 154, 62, 0.22)',
            }}>
            <Ionicons color="#FF9A3E" name="ribbon-outline" size={22} />
          </View>
        )}
        <View className="min-w-0 flex-1 gap-1">
          <AppText className="text-[16px]" numberOfLines={2} variant="title">
            {item.name}
          </AppText>
          {item.issuer || item.date ? (
            <AppText className="text-[13px] text-[#FF9A3E]" numberOfLines={2}>
              {[item.issuer, item.date].filter(Boolean).join(' · ')}
            </AppText>
          ) : null}
        </View>
        {verificationUrl ? (
          <Pressable
            accessibilityLabel={`Open certification verification for ${item.name}`}
            accessibilityRole="link"
            className="h-9 w-9 items-center justify-center rounded-full"
            onPress={() => openExternalUrl(verificationUrl)}
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}>
            <Ionicons color="#D0D5DD" name="open-outline" size={18} />
          </Pressable>
        ) : null}
      </View>
    </AppCard>
  );
}

function ProfileCardContent({
  card,
  bottomInset = 24,
  refreshControl,
  scrollEnabled = true,
}: {
  card: DiscoveryProfileCard;
  bottomInset?: number;
  refreshControl?: React.ComponentProps<typeof ScrollView>['refreshControl'];
  scrollEnabled?: boolean;
}) {
  const bio = card.bio?.trim() ?? '';
  const bioPreview = truncateText(bio, DISCOVERY_CARD_DESCRIPTION_MAX_LENGTH);
  const linkedinUrl = card.linkedinUrl?.trim();
  const badgeItems = card.badges ?? [];
  const highlightItems = normalizeStringList(card.sections?.highlights?.items);
  const highlightsTitle = card.sections?.highlights?.title?.trim() || undefined;
  const languageItems = normalizeStringList(card.sections?.languages?.items ?? card.languages);
  const certificationItems = card.certifications?.items ?? [];

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      scrollEnabled={scrollEnabled}
      contentContainerStyle={{ paddingBottom: bottomInset }}>
      <View>
        <View className="overflow-hidden" style={{ height: 260 }}>
          {card.photoUrl ? (
            <Image
              key={card.id}
              contentFit="cover"
              source={{ uri: card.photoUrl }}
              style={{ height: '100%', width: '100%' }}
            />
          ) : (
            <View className="h-full w-full bg-surface-muted" />
          )}

          <View
            className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-10"
            style={{ backgroundColor: 'rgba(17, 19, 26, 0.52)' }}>
            {linkedinUrl ? (
              <Pressable
                accessibilityLabel={`Open ${card.name}'s LinkedIn profile`}
                accessibilityRole="link"
                className="mb-2 h-9 w-9 items-center justify-center rounded-full"
                onPress={() => openExternalUrl(linkedinUrl)}
                style={{ backgroundColor: 'rgba(10, 102, 194, 0.92)' }}>
                <Ionicons color="#FFFFFF" name="logo-linkedin" size={20} />
              </Pressable>
            ) : null}
            <View className="flex-row items-end justify-between gap-3">
              <View className="min-w-0 flex-1 gap-1">
                <AppText className="text-[28px] leading-[34px]" numberOfLines={1} variant="hero">
                  {card.age ? `${card.name}, ${card.age}` : card.name}
                </AppText>
                <AppText className="text-[15px] leading-tight" numberOfLines={2} style={{ color: '#E4E7EC' }}>
                  {card.headline}
                </AppText>
                {card.location ? (
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons color="#98A2B3" name="location-outline" size={16} />
                    <AppText className="text-[14px]" tone="muted">
                      {card.location.display}
                    </AppText>
                    {typeof card.location.distanceKm === 'number' ? (
                      <AppText className="text-[14px]" tone="signal">
                        • {card.location.distanceKm} km
                      </AppText>
                    ) : null}
                  </View>
                ) : null}
              </View>
              {card.match ? <MatchScoreBadge label={card.match.label} score={card.match.score ?? 0} /> : null}
            </View>
          </View>
        </View>

        {badgeItems.length ? (
          <View className="border-b border-border px-4 py-4">
            <View className="flex-row flex-wrap gap-2">
              {badgeItems.map((badge, index) => (
                <ProfileBadgePill key={getBadgeKey(badge, index)} badge={badge} />
              ))}
            </View>
          </View>
        ) : null}
      </View>

      <View className="gap-5 px-4 py-4">
        <MatchHighlights items={highlightItems} title={highlightsTitle} />

        {bio ? (
          <AppText className="text-[16px] leading-7" tone="muted">
            {bioPreview}
          </AppText>
        ) : null}

        {card.startupIdea ? (
          <View
            className="gap-2.5 rounded-[20px] border px-4 py-4"
            style={{
              backgroundColor: '#2A2117',
              borderColor: 'rgba(255, 154, 62, 0.25)',
            }}>
            <SectionLabel icon="bulb-outline" title="Startup Idea" />
            <AppText className="text-[16px] leading-6">{card.startupIdea}</AppText>
          </View>
        ) : null}

        {card.interests?.length ? (
          <View className="gap-2.5">
            <SectionLabel title="Industries & Interests" />
            <View className="flex-row flex-wrap gap-2">
              {card.interests.map((item) => (
                <DiscoveryTag
                  key={item.id}
                  item={item}
                  tone={item.type === 'availability' ? 'availability' : 'default'}
                />
              ))}
            </View>
          </View>
        ) : null}

        {card.skills?.length ? (
          <View className="gap-2.5">
            <SectionLabel title="Skills" />
            <View className="flex-row flex-wrap gap-2">
              {card.skills.map((item) => (
                <DiscoveryTag key={item.id} item={item} />
              ))}
            </View>
          </View>
        ) : null}

        {card.experience?.length ? (
          <View className="gap-3">
            <SectionLabel icon="briefcase-outline" title="Experience" />
            {card.experience.map((item, index) => (
              <AppCard
                key={getExperienceKey(item, index)}
                className="rounded-[16px] bg-[#2C2C2C] border border-white/10 border-l-[2.5px] border-l-[#FF9A3E] p-4">
                <View className="flex-row gap-3.5">
                  {item.companyLogo ? (
                    <View className="h-11 w-11 overflow-hidden rounded-[12px] border border-white/10 bg-white">
                      <Image
                        contentFit="contain"
                        source={{ uri: item.companyLogo }}
                        style={{ height: '100%', width: '100%' }}
                      />
                    </View>
                  ) : null}
                  <View className="min-w-0 flex-1 gap-1.5">
                    <AppText className="text-[16px]" numberOfLines={2} variant="title">
                      {item.title}
                    </AppText>
                    {getExperienceOrganization(item) || item.period ? (
                      <AppText className="text-[13px] text-[#FF9A3E]" numberOfLines={2}>
                        {[getExperienceOrganization(item), item.period].filter(Boolean).join(' · ')}
                      </AppText>
                    ) : null}
                    {item.location ? (
                      <View className="flex-row items-center gap-1">
                        <Ionicons color="#98A2B3" name="location-outline" size={13} />
                        <AppText className="text-[12px]" numberOfLines={1} tone="muted">
                          {item.location}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                </View>
              </AppCard>
            ))}
          </View>
        ) : null}

        {certificationItems.length ? (
          <View className="gap-3">
            <SectionLabel icon="ribbon-outline" title="Certifications" />
            {certificationItems.map((item, index) => (
              <CertificationCard key={getCertificationKey(item, index)} item={item} index={index} />
            ))}
          </View>
        ) : null}

        {card.education?.length ? (
          <View className="gap-3">
            {card.education.map((item, index) => (
              <AppCard key={getEducationKey(item, index)} className="flex-row items-center gap-3.5 rounded-[16px] p-4 bg-[#2C2C2C] border-white/10">
                {item.schoolLogo ? (
                  <View className="h-11 w-11 overflow-hidden rounded-[12px] border border-white/10 bg-white">
                    <Image
                      contentFit="contain"
                      source={{ uri: item.schoolLogo }}
                      style={{ height: '100%', width: '100%' }}
                    />
                  </View>
                ) : (
                  <Ionicons color="#FFCD38" name="school-outline" size={24} />
                )}
                <View className="flex-1 gap-0.5">
                  <AppText className="text-[16px]" numberOfLines={2} variant="title">
                    {item.degree}
                  </AppText>
                  <AppText className="text-[13px]" numberOfLines={2} style={{ color: '#FFCD38' }}>
                    {item.school}
                  </AppText>
                  {item.period ? (
                    <AppText className="text-[12px]" numberOfLines={1} tone="muted">
                      {item.period}
                    </AppText>
                  ) : null}
                </View>
              </AppCard>
            ))}
          </View>
        ) : null}

        {languageItems.length ? (
          <View className="flex-row items-center gap-2 pb-1">
            <Ionicons color="#FF9A3E" name="globe-outline" size={20} />
            <AppText className="text-[14px]" tone="muted">
              {languageItems.join(' · ')}
            </AppText>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function StartupCardContent({
  card,
  bottomInset = 24,
  refreshControl,
  scrollEnabled = true,
}: {
  card: DiscoveryStartupCard;
  bottomInset?: number;
  refreshControl?: React.ComponentProps<typeof ScrollView>['refreshControl'];
  scrollEnabled?: boolean;
}) {
  const industryLabels = getStartupIndustryLabels(card.industry);
  const industryPreview = getStartupIndustryPreview(card.industry);
  const hiddenIndustryCount = Math.max(industryLabels.length - 2, 0);
  const teamStageIndustry = normalizeIndustryDisplay(card.teamStage?.industry);
  const summary = card.summary?.trim() ?? '';
  const summaryPreview = truncateText(summary, DISCOVERY_CARD_DESCRIPTION_MAX_LENGTH);

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      scrollEnabled={scrollEnabled}
      contentContainerStyle={{ paddingBottom: bottomInset }}>
      <View>
        <View
          className="overflow-hidden rounded-t-[24px] px-4 pb-5 pt-4"
          style={{ backgroundColor: '#5A4226' }}>
          <View className="items-end">
            {card.badge ? (
              <View
                className="rounded-full border px-3 py-1"
                style={{
                  backgroundColor: '#7B5A30',
                  borderColor: 'rgba(255, 190, 61, 0.35)',
                }}>
                <AppText className="text-[11px] uppercase" style={{ color: '#FFD06A' }} variant="label">
                  {card.badge.label}
                </AppText>
              </View>
            ) : null}
          </View>

          <View className="mt-3 items-center">
            <StartupLogo card={card} />
          </View>

          <View className="mt-5 flex-row items-end justify-between gap-3">
            <View className="min-w-0 flex-1 gap-1">
              <AppText className="text-[30px] leading-[34px]" numberOfLines={2} variant="hero">
                {card.name}
              </AppText>
              <View className="flex-row items-center gap-1.5">
                <Ionicons color="#C7CCD4" name="briefcase-outline" size={15} />
                <AppText className="min-w-0 flex-1 text-[14px]" numberOfLines={2} tone="muted">
                  {card.founder?.title && card.founder?.name ? `${card.founder.title} by ${card.founder.name}` : card.founder?.name}
                </AppText>
              </View>
            </View>
            {card.match ? <MatchScoreBadge label={card.match.label} score={card.match.score ?? 0} /> : null}
          </View>
        </View>

        <View className="border-b border-border px-4 py-4">
          <View className="min-w-0 gap-1">
            <View className="w-full flex-row flex-wrap items-center gap-1.5">
              <AppText
                className="min-w-0 text-[17px] leading-tight"
                ellipsizeMode="tail"
                numberOfLines={2}
                style={{ flexShrink: 1 }}
                variant="title">
                {industryPreview}
              </AppText>
              {hiddenIndustryCount > 0 ? (
                <View
                  className="rounded-full border px-2 py-0.5"
                  style={{
                    backgroundColor: 'rgba(152, 162, 179, 0.10)',
                    borderColor: 'rgba(152, 162, 179, 0.18)',
                  }}>
                  <AppText className="text-[11px] leading-[14px]" tone="muted" variant="bodyStrong">
                    +{hiddenIndustryCount}
                  </AppText>
                </View>
              ) : null}
            </View>
            <View className="flex-row items-center gap-1">
              <Ionicons color="#98A2B3" name="people-outline" size={14} />
              <AppText className="text-[13px]" tone="muted">
                {card.team?.display ?? ''}
              </AppText>
            </View>
          </View>
        </View>
      </View>

      <View className="gap-4 px-4 pb-4 pt-3">
        {summary ? (
          <AppText className="text-[16px] leading-7" tone="muted">
            {summaryPreview}
          </AppText>
        ) : null}

        {card.openRoles?.length ? (
          <View className="gap-3">
            <SectionLabel icon="briefcase-outline" title="Open Roles" />
            <View className="flex-row flex-wrap gap-2">
              {card.openRoles.map((role) => (
                <StartupRoleChip key={role.id} title={role.title} />
              ))}
            </View>
          </View>
        ) : null}

        {card.lookingFor?.length ? (
          <View
            className="gap-2.5 rounded-[20px] border px-4 py-4"
            style={{
              backgroundColor: '#2A261B',
              borderColor: 'rgba(255, 190, 61, 0.28)',
            }}>
            <SectionLabel icon="sparkles-outline" title="Looking For" />
            <AppText className="text-[16px] leading-6">
              {card.lookingFor.join(' & ')}
            </AppText>
          </View>
        ) : null}

        {card.teamStage ? (
          <View className="gap-3">
            <SectionLabel icon="people-outline" title="Team & Stage" />
            <AppCard className="rounded-[18px] p-4 bg-[#2C2C2C] border-white/10">
              <View className="flex-row flex-wrap gap-y-4">
                <View className="w-1/2 gap-1 pr-2">
                  <AppText className="text-[12px]" tone="muted">
                    Team Size
                  </AppText>
                  <AppText className="text-[18px]" variant="title">
                    {card.teamStage.teamSize} members
                  </AppText>
                </View>
                <View className="w-1/2 gap-1 pl-2">
                  <AppText className="text-[12px]" tone="muted">
                    Stage
                  </AppText>
                  <AppText className="text-[18px]" variant="title">
                    {card.teamStage.stage}
                  </AppText>
                </View>
                <View className="w-1/2 gap-1 pr-2">
                  <AppText className="text-[12px]" tone="muted">
                    Hiring
                  </AppText>
                  <AppText className="text-[18px]" variant="title">
                    {card.teamStage.hiringCount} roles
                  </AppText>
                </View>
                <View className="w-full gap-1">
                  <AppText className="text-[12px]" tone="muted">
                    Industry
                  </AppText>
                  <AppText className="text-[18px] leading-[23px]" variant="title">
                    {teamStageIndustry}
                  </AppText>
                </View>
              </View>
            </AppCard>
          </View>
        ) : null}

        <StartupJourney card={card} />
      </View>
    </ScrollView>
  );
}

function DiscoveryCardContent({
  bottomInset = 24,
  card,
  refreshControl,
  scrollEnabled = true,
}: {
  bottomInset?: number;
  card: DiscoveryCard;
  refreshControl?: React.ComponentProps<typeof ScrollView>['refreshControl'];
  scrollEnabled?: boolean;
}) {
  return isDiscoveryProfileCard(card) ? (
    <ProfileCardContent
      bottomInset={bottomInset}
      card={card}
      refreshControl={refreshControl}
      scrollEnabled={scrollEnabled}
    />
  ) : (
    <StartupCardContent
      bottomInset={bottomInset}
      card={card}
      refreshControl={refreshControl}
      scrollEnabled={scrollEnabled}
    />
  );
}

function DeckActionButton({
  color,
  disabled,
  icon,
  label,
  onPress,
  size = 'medium',
}: {
  color: string;
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
}) {
  const iconSize = size === 'large' ? 28 : size === 'medium' ? 24 : 20;

  return (
    <Pressable
      className="items-center gap-1"
      disabled={disabled}
      onPress={onPress}
      style={{ opacity: disabled ? 0.35 : 1, minWidth: 48 }}>
      <Ionicons color={color} name={icon} size={iconSize} />
      <AppText className="text-[11px]" style={{ color: '#98A2B3' }}>
        {label}
      </AppText>
    </Pressable>
  );
}

function EmptyState({
  isLoadingMore,
  connectedCount,
  onStartOver,
  skippedCount,
}: {
  connectedCount: number;
  isLoadingMore: boolean;
  onStartOver: () => void;
  skippedCount: number;
}) {
  const hasActivity = connectedCount > 0 || skippedCount > 0;

  return (
    <View className="items-center px-8">
      <View
        className="h-16 w-16 items-center justify-center rounded-[18px]"
        style={{ backgroundColor: '#332F2B', borderColor: '#4A4038', borderWidth: 1 }}>
        <Ionicons
          color="#FF9836"
          name={isLoadingMore ? 'hourglass-outline' : 'search-outline'}
          size={26}
        />
      </View>

      <View className="mt-5 items-center">
        <AppText align="center" className="text-[20px] leading-[26px]" variant="subtitle">
          {isLoadingMore ? 'Finding more profiles' : 'No profiles match right now'}
        </AppText>
        <AppText align="center" className="mt-2 max-w-[280px] text-[14px] leading-5" tone="muted">
          {isLoadingMore
            ? 'We are checking for more relevant recommendations.'
            : 'Try refreshing or adjusting your discovery filters to broaden the search.'}
        </AppText>

        {hasActivity ? (
          <AppText align="center" className="mt-3 text-[12px] leading-[17px]" tone="muted">
            {connectedCount} connected · {skippedCount} skipped
          </AppText>
        ) : null}
      </View>

      {!isLoadingMore ? (
        <Pressable
          className="mt-6 h-12 flex-row items-center justify-center gap-2 rounded-[14px] px-5"
          onPress={onStartOver}
          style={{ backgroundColor: '#FF9836' }}>
          <Ionicons color="#1A120B" name="refresh" size={17} />
          <AppText className="text-[15px]" style={{ color: '#1A120B' }} variant="bodyStrong">
            Refresh results
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function DiscoveryDeck() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isHydrated: isAuthHydrated, session } = useAuth();
  const usingMockCards = isDiscoveryCardsMockEnabled();
  const notificationsQuery = useNotifications();
  const { mutateAsync: updateProfileLocationAsync } = useUpdateProfileLocation();
  const { isConnectXProActive, presentPaywallForOffering, presentPaywallIfNeeded, supported } =
    useRevenueCat();
  const [mockCards, setMockCards] = React.useState<DiscoveryCard[]>(getFallbackCards(null));
  const [restoredCards, setRestoredCards] = React.useState<DiscoveryCard[]>([]);
  const [dismissedMergedMockCardIds, setDismissedMergedMockCardIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [history, setHistory] = React.useState<DiscoverySwipeHistoryEntry[]>([]);
  const [lastSuccessfulCards, setLastSuccessfulCards] = React.useState<DiscoveryCard[]>([]);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [matchState, setMatchState] = React.useState<MatchState | null>(null);
  const [filterError, setFilterError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isFilterVisible, setIsFilterVisible] = React.useState(false);
  const [isApplyingFilters, setIsApplyingFilters] = React.useState(false);
  const [sheetMode, setSheetMode] = React.useState<DiscoveryMode>(DEFAULT_FILTER_MODE);
  const [appliedMode, setAppliedMode] = React.useState<DiscoveryMode | null>(null);
  const [appliedFilters, setAppliedFilters] = React.useState<DiscoveryAppliedFilters>({});
  const [deviceCoordinates, setDeviceCoordinates] = React.useState<DeviceCoordinates | null>(null);
  const [hasResolvedAuthSessionSetup, setHasResolvedAuthSessionSetup] = React.useState(false);
  const [hasResolvedInitialLocation, setHasResolvedInitialLocation] = React.useState(false);
  const [shouldIncludeLocationAvailability, setShouldIncludeLocationAvailability] =
    React.useState(false);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const nextCardScale = useSharedValue(0.96);
  const currentCardRef = React.useRef<DiscoveryCard | null>(null);
  const pendingCardAdvanceResetRef = React.useRef<string | null>(null);
  const usingFallbackRef = React.useRef(false);
  const hasShownGuaranteedMockMatchRef = React.useRef(false);
  const hasRequestedDeviceCoordinatesRef = React.useRef(false);
  const lastSyncedProfileLocationKeyRef = React.useRef<string | null>(null);

  const hasSyncedAuthSession =
    !session ||
    session.authPhase !== 'authenticated' ||
    Boolean(session.authSessionSyncedAt) ||
    Boolean(session.isDevelopmentBypass);
  const canResolveDiscoveryAuthSetup =
    isAuthHydrated && (hasSyncedAuthSession || session?.authPhase === 'authenticated');

  React.useEffect(() => {
    console.log('[DiscoveryDeck] bootstrap gates', {
      authPhase: session?.authPhase ?? null,
      canResolveDiscoveryAuthSetup,
      authSessionSource: session?.authSessionSource ?? null,
      authSessionSyncedAt: session?.authSessionSyncedAt ?? null,
      hasResolvedAuthSessionSetup,
      hasResolvedInitialLocation,
      hasSyncedAuthSession,
      isAuthHydrated,
      queryEnabled: hasResolvedAuthSessionSetup && hasResolvedInitialLocation,
      usingMockCards,
    });
  }, [
    canResolveDiscoveryAuthSetup,
    hasResolvedAuthSessionSetup,
    hasResolvedInitialLocation,
    hasSyncedAuthSession,
    isAuthHydrated,
    session?.authPhase,
    session?.authSessionSource,
    session?.authSessionSyncedAt,
    usingMockCards,
  ]);

  React.useEffect(() => {
    if (!canResolveDiscoveryAuthSetup) {
      console.log('[DiscoveryDeck] waiting for auth session setup', {
        canResolveDiscoveryAuthSetup,
        hasSyncedAuthSession,
        isAuthHydrated,
      });
      return;
    }

    if (session?.authPhase === 'authenticated' && !hasSyncedAuthSession) {
      console.log('[DiscoveryDeck] proceeding before auth session sync metadata is set', {
        authSessionSource: session.authSessionSource ?? null,
        authSessionSyncedAt: session.authSessionSyncedAt ?? null,
      });
    }

    const localOnboardingMode = loadOnboardingDiscoveryPreference()?.mode ?? null;
    const defaultMode =
      session?.authSessionSource === 'api'
        ? session.defaultDiscoveryMode
        : localOnboardingMode ?? session?.defaultDiscoveryMode ?? null;

    const initialMode = defaultMode ?? DEFAULT_FILTER_MODE;

    setSheetMode(initialMode);
    setAppliedMode(initialMode);
    setAppliedDiscoveryMode(initialMode);

    setAppliedFilters({});
    setShouldIncludeLocationAvailability(false);
    setHasResolvedAuthSessionSetup(true);
    console.log('[DiscoveryDeck] auth session setup resolved', {
      appliedMode: initialMode,
      authSessionSource: session?.authSessionSource ?? null,
    });
  }, [
    canResolveDiscoveryAuthSetup,
    hasSyncedAuthSession,
    isAuthHydrated,
    session?.authPhase,
    session?.authSessionSource,
    session?.authSessionSyncedAt,
    session?.defaultDiscoveryMode,
  ]);

  const filterOptionsQuery = useDiscoveryFilterOptions(sheetMode, isFilterVisible);
  const matchingFilterOptionsResponse =
    filterOptionsQuery.data?.data.mode === sheetMode ? filterOptionsQuery.data : undefined;
  const isFilterOptionsLoading =
    !matchingFilterOptionsResponse && (filterOptionsQuery.isLoading || filterOptionsQuery.isFetching);
  const filterOptionsErrorMessage = React.useMemo(
    () =>
      filterOptionsQuery.error
        ? getErrorMessage(filterOptionsQuery.error, 'Unable to load filter options right now.')
        : null,
    [filterOptionsQuery.error]
  );
  React.useEffect(() => {
    console.log('discovery filter-options query state', {
      isFilterVisible,
      responseMode: filterOptionsQuery.data?.data.mode,
      sheetMode,
    });
  }, [filterOptionsQuery.data?.data.mode, isFilterVisible, sheetMode]);

  const filterSections = React.useMemo(
    () => getDiscoveryFilterSections(sheetMode, matchingFilterOptionsResponse),
    [matchingFilterOptionsResponse, sheetMode]
  );
  const goalOptions = getGoalOptions(filterSections, sheetMode);

  const appliedSections = React.useMemo(
    () => getDiscoveryFilterSections(appliedMode ?? DEFAULT_FILTER_MODE),
    [appliedMode]
  );

  const sanitizedAppliedFilters = React.useMemo(
    () => sanitizeDiscoveryFilters(appliedFilters, appliedSections),
    [appliedFilters, appliedSections]
  );
  const requestFilters = React.useMemo(
    () =>
      buildDiscoveryRequestFilters(
        sanitizedAppliedFilters,
        deviceCoordinates,
        shouldIncludeLocationAvailability
      ),
    [deviceCoordinates, sanitizedAppliedFilters, shouldIncludeLocationAvailability]
  );

  const discoveryRequest = React.useMemo<Omit<DiscoveryCardsRequest, 'pagination'>>(() => {
    const hasRequestFilters = Object.keys(requestFilters).length > 0;

    if (!appliedMode) {
      if (!hasRequestFilters) {
        return {};
      }

      return {
        filters: requestFilters,
      };
    }

    return {
      context: {
        mode: appliedMode,
      },
      filters: {
        goalId: GOAL_ID_BY_MODE[appliedMode],
        ...requestFilters,
      },
    };
  }, [appliedMode, requestFilters]);

  const discoveryQuery = useDiscoveryCards(
    discoveryRequest,
    DISCOVERY_PAGE_LIMIT,
    hasResolvedAuthSessionSetup && hasResolvedInitialLocation
  );
  const handleOnboardingRequired = useDiscoveryOnboardingRequiredHandler();
  const rewindAction = useRewindAction();
  const swipeAction = useSwipeAction();

  React.useEffect(() => {
    if (!hasDiscoveryQuerySettled(discoveryQuery)) {
      return;
    }

    console.log('[DiscoveryDeck] discovery fetch settled', {
      shouldIncludeLocationAvailability,
    });
  }, [discoveryQuery, shouldIncludeLocationAvailability]);

  const loadDeviceCoordinates = React.useCallback(async (requestPermissionIfNeeded = true) => {
    try {
      const existingPermission = await Location.getForegroundPermissionsAsync();
      const permission =
        existingPermission.status === Location.PermissionStatus.GRANTED
          ? existingPermission
          : requestPermissionIfNeeded
            ? await Location.requestForegroundPermissionsAsync()
            : existingPermission;

      if (permission.status !== Location.PermissionStatus.GRANTED) {
        return null;
      }

      const position =
        (await Location.getLastKnownPositionAsync()) ??
        (await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }));

      if (!position?.coords) {
        return null;
      }

      const nextCoordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      setDeviceCoordinates((currentCoordinates) => {
        if (
          currentCoordinates?.latitude === nextCoordinates.latitude &&
          currentCoordinates?.longitude === nextCoordinates.longitude
        ) {
          return currentCoordinates;
        }

        return nextCoordinates;
      });

      return nextCoordinates;
    } catch (error) {
      console.warn('Unable to load device coordinates for discovery.', error);
      return null;
    }
  }, []);

  const syncProfileLocationCoordinates = React.useCallback(
    async (coordinates: DeviceCoordinates | null) => {
      if (
        !coordinates ||
        session?.authPhase !== 'authenticated' ||
        session.isDevelopmentBypass
      ) {
        return;
      }

      const userKey = session.user?.id ?? session.email;
      const coordinatesKey = `${userKey}:${getCoordinatesKey(coordinates)}`;

      if (lastSyncedProfileLocationKeyRef.current === coordinatesKey) {
        return;
      }

      try {
        await updateProfileLocationAsync({
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        });
        lastSyncedProfileLocationKeyRef.current = coordinatesKey;
      } catch (error) {
        if (isExpoDevModeEnabled()) {
          console.warn('[DiscoveryDeck] failed to update profile location coordinates', error);
        }
      }
    },
    [
      session?.authPhase,
      session?.email,
      session?.isDevelopmentBypass,
      session?.user?.id,
      updateProfileLocationAsync,
    ]
  );

  React.useEffect(() => {
    if (!canResolveDiscoveryAuthSetup) {
      return;
    }

    if (hasRequestedDeviceCoordinatesRef.current) {
      return;
    }

    hasRequestedDeviceCoordinatesRef.current = true;
    void (async () => {
      try {
        console.log('[DiscoveryDeck] resolving initial location');
        const coordinates = await Promise.race([
          loadDeviceCoordinates(true),
          new Promise<null>((resolve) => {
            setTimeout(() => resolve(null), DISCOVERY_LOCATION_TIMEOUT_MS);
          }),
        ]);
        void syncProfileLocationCoordinates(coordinates);
      } finally {
        setHasResolvedInitialLocation(true);
        console.log('[DiscoveryDeck] initial location resolved', {
          timedOutAfterMs: DISCOVERY_LOCATION_TIMEOUT_MS,
        });
      }
    })();
  }, [canResolveDiscoveryAuthSetup, loadDeviceCoordinates, syncProfileLocationCoordinates]);

  React.useEffect(() => {
    console.log('[DiscoveryDeck] query input on enter/update', {
      enabled: hasResolvedAuthSessionSetup && hasResolvedInitialLocation,
      hasResolvedAuthSessionSetup,
      hasResolvedInitialLocation,
      request: discoveryRequest,
      shouldIncludeLocationAvailability,
    });
  }, [
    discoveryRequest,
    hasResolvedAuthSessionSetup,
    hasResolvedInitialLocation,
    shouldIncludeLocationAvailability,
  ]);


  const liveCards = React.useMemo(() => flattenUniqueCards(discoveryQuery.data), [discoveryQuery.data]);

  React.useEffect(() => {
    if (liveCards.length > 0) {
      setLastSuccessfulCards(liveCards);
    }
  }, [liveCards]);

  const shouldKeepLastSuccessfulCards =
    !discoveryQuery.isSuccess && (discoveryQuery.isLoading || discoveryQuery.isFetching);
  const effectiveLiveCards = React.useMemo(
    () => (liveCards.length > 0 ? liveCards : shouldKeepLastSuccessfulCards ? lastSuccessfulCards : []),
    [lastSuccessfulCards, liveCards, shouldKeepLastSuccessfulCards]
  );
  const usingLocalMockCards = usingMockCards;
  const baseCards = React.useMemo(
    () =>
      (usingLocalMockCards ? mockCards : effectiveLiveCards).filter(
        (card) => !dismissedMergedMockCardIds.has(card.id)
      ),
    [dismissedMergedMockCardIds, effectiveLiveCards, mockCards, usingLocalMockCards]
  );
  const cards = React.useMemo(() => {
    const baseIds = new Set(baseCards.map((card) => card.id));
    return [...restoredCards.filter((card) => !baseIds.has(card.id)), ...baseCards];
  }, [baseCards, restoredCards]);
  const handleRefreshDiscovery = React.useCallback(async () => {
    const nextDeviceCoordinates = await loadDeviceCoordinates(true);
    await syncProfileLocationCoordinates(nextDeviceCoordinates ?? deviceCoordinates);

    if (usingLocalMockCards) {
      setMockCards(getFallbackCards(appliedMode));
      hasShownGuaranteedMockMatchRef.current = false;
      setDismissedMergedMockCardIds(new Set());
      return;
    }

    setDismissedMergedMockCardIds(new Set());
    await discoveryQuery.refetch();
  }, [
    appliedMode,
    deviceCoordinates,
    discoveryQuery,
    loadDeviceCoordinates,
    syncProfileLocationCoordinates,
    usingLocalMockCards,
  ]);
  const handleStartOver = React.useCallback(async () => {
    setHistory([]);
    setRestoredCards([]);
    setDismissedMergedMockCardIds(new Set());
    setMatchState(null);
    setActionError(null);
    hasShownGuaranteedMockMatchRef.current = false;

    if (usingLocalMockCards) {
      setMockCards(getFallbackCards(appliedMode));
      return;
    }

    await discoveryQuery.refetch();
  }, [appliedMode, discoveryQuery, usingLocalMockCards]);

  const currentItem = cards[0] ?? null;
  const nextItem = cards[1] ?? null;
  const remainingCards = cards.length;
  const connectedCount = history.filter(
    (entry) => entry.action === 'like' || entry.action === 'super_like'
  ).length;
  const skippedCount = history.filter((entry) => entry.action === 'pass').length;
  const floatingActionsContentPadding = FLOATING_ACTIONS_CONTENT_PADDING;
  const appliedFilterCount = React.useMemo(
    () => countAppliedDiscoveryFilters(sanitizedAppliedFilters),
    [sanitizedAppliedFilters]
  );
  const unreadNotificationCount = notificationsQuery.data?.data.unreadCount ?? 0;

  currentCardRef.current = currentItem;
  usingFallbackRef.current = usingLocalMockCards;

  React.useLayoutEffect(() => {
    const pendingCardId = pendingCardAdvanceResetRef.current;

    if (!pendingCardId || currentItem?.id === pendingCardId) {
      return;
    }

    pendingCardAdvanceResetRef.current = null;
    translateX.value = 0;
    translateY.value = 0;
    nextCardScale.value = 0.96;
    setIsSubmitting(false);
  }, [currentItem?.id, nextCardScale, translateX, translateY]);

  React.useEffect(() => {
    if (usingFallbackRef.current) {
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
    usingLocalMockCards,
  ]);

  React.useEffect(() => {
    if (discoveryQuery.isError && handleOnboardingRequired(discoveryQuery.error)) {
      return;
    }

    if (!discoveryQuery.isError || !isPremiumRequiredError(discoveryQuery.error)) {
      return;
    }

    setFilterError(
      getErrorMessage(discoveryQuery.error, 'Premium subscription required to use advanced discovery filters.')
    );
  }, [discoveryQuery.error, discoveryQuery.isError, handleOnboardingRequired]);

  React.useEffect(() => {
    setMockCards(getFallbackCards(appliedMode));
    setRestoredCards([]);
    setDismissedMergedMockCardIds(new Set());
    setHistory([]);
    setActionError(null);
    setMatchState(null);
    hasShownGuaranteedMockMatchRef.current = false;
    translateX.value = 0;
    translateY.value = 0;
    nextCardScale.value = 0.96;
  }, [appliedMode, discoveryRequest, nextCardScale, translateX, translateY]);

  const resetCardPosition = React.useCallback(() => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    nextCardScale.value = withSpring(0.96);
  }, [nextCardScale, translateX, translateY]);

  const maybePresentBoostPaywall = React.useCallback(async () => {
    if (!supported) {
      setActionError('Boost purchases are available in the native iOS and Android builds.');
      return;
    }

    try {
      const result = await presentPaywallForOffering(REVENUECAT_OFFERING_IDS.discoverySpotlights);

      if (
        result !== PAYWALL_RESULT.PURCHASED &&
        result !== PAYWALL_RESULT.RESTORED &&
        result !== PAYWALL_RESULT.CANCELLED
      ) {
        setActionError('No boosts remaining.');
      }
    } catch (error) {
      setActionError(getErrorMessage(error, 'Unable to open the boost purchase flow.'));
    }
  }, [presentPaywallForOffering, supported]);

  const handleSwipeAction = React.useCallback(
    async (action: SwipeActionIntent, direction?: SwipeDirection) => {
      const activeCard = currentCardRef.current;
      let didAdvanceCard = false;

      if (!activeCard) {
        setIsSubmitting(false);
        resetCardPosition();
        return;
      }

      try {
        let matched = false;

        const shouldHandleLocally = usingFallbackRef.current || isMergedMockCard(activeCard);

        if (shouldHandleLocally) {
          if (usingFallbackRef.current) {
            setMockCards((current) => current.filter((item) => item.id !== activeCard.id));
          } else {
            setDismissedMergedMockCardIds((current) => new Set(current).add(activeCard.id));
          }

          if (action === 'like' || action === 'super_like') {
            matched =
              !hasShownGuaranteedMockMatchRef.current ||
              Math.random() < MOCK_MATCH_RANDOM_CHANCE;
            hasShownGuaranteedMockMatchRef.current = true;
          }
        } else {
          const response = await swipeAction.mutateAsync({
            cardId: activeCard.id,
            payload: { action },
            targetId: getCardActionTargetId(activeCard),
          });

          matched = Boolean(response.data.isMatch);
        }

        didAdvanceCard = true;
        pendingCardAdvanceResetRef.current = activeCard.id;

        // Rewound cards are restored from local state, so clear that copy once
        // the backend accepts the new swipe.
        setRestoredCards((current) => current.filter((card) => card.id !== activeCard.id));

        setHistory((current) => [...current.slice(-19), { action, card: activeCard }]);

        if (direction) {
          triggerSwipeHaptic(direction);
        }

        if (
          (action === 'like' || action === 'super_like') &&
          matched
        ) {
          let conversationId: string | null = null;
          let matchId: string | null = null;

          try {
            conversationId = await upsertDiscoveryMatchConversation(
              getDiscoveryMatchConversationInput(activeCard)
            );
            const generatedMatch = upsertGeneratedMockMatch(activeCard, conversationId);
            matchId = generatedMatch.item.matchId;
            await queryClient.invalidateQueries({ queryKey: chatQueryKeys.conversationsRoot });
            await queryClient.invalidateQueries({ queryKey: matchesQueryKeys.all });
          } catch (error) {
            console.warn('Unable to create local mock match records for discovery match.', error);
          }

          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setMatchState({ card: activeCard, conversationId, matchId });
        }

        setActionError(null);
      } catch (error) {
        console.log('[DiscoveryDeck] swipe action failed', {
          action,
          cardId: activeCard.id,
          cardSource: activeCard.__source ?? 'api',
          error:
            error instanceof ApiError
              ? {
                message: error.message,
                payload: error.payload,
                status: error.status,
              }
              : error instanceof Error
                ? {
                  message: error.message,
                  name: error.name,
                }
                : error,
          targetId: getCardActionTargetId(activeCard),
        });

        if (action === 'super_like' && isSuperLikeRequiresBoostError(error)) {
          await maybePresentBoostPaywall();
        } else {
          setActionError(getErrorMessage(error, 'Unable to record this swipe right now.'));
        }
      } finally {
        if (didAdvanceCard) {
          return;
        }

        setIsSubmitting(false);
        resetCardPosition();
      }
    },
    [
      maybePresentBoostPaywall,
      queryClient,
      resetCardPosition,
      swipeAction,
    ]
  );

  const handleRewind = React.useCallback(() => {
    if (history.length === 0 || isSubmitting) {
      return;
    }
    const lastEntry = history[history.length - 1];
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);


    setIsSubmitting(true);
    setActionError(null);

    void rewindAction
      .mutateAsync({
        options: {
          mockHistoryEntry: lastEntry,
        },
      })
      .then(async (response) => {
        setHistory((current) => current.slice(0, -1));

        setRestoredCards((current) => [
          response.data.card,
          ...current.filter((card) => card.id !== response.data.card.id),
        ]);
        setActionError(null);
      })
      .catch(async (error) => {
        if (isRewindPremiumRequiredError(error)) {
          if (!supported) {
            setActionError('Rewind is available in the native iOS and Android builds with ConnectX Pro.');
            return;
          }

          try {
            const result = await presentPaywallIfNeeded();
            const unlockedPro =
              isConnectXProActive ||
              result === PAYWALL_RESULT.PURCHASED ||
              result === PAYWALL_RESULT.RESTORED;

            if (!unlockedPro) {
              setActionError('ConnectX Pro is required to rewind your last swipe.');
            }
          } catch (paywallError) {
            setActionError(
              getErrorMessage(paywallError, 'Unable to open the ConnectX Pro upgrade flow.')
            );
          }

          return;
        }

        if (isRewindNotAvailableError(error)) {
          setActionError(getErrorMessage(error, 'No swipe is available to rewind right now.'));
          return;
        }

        setActionError(getErrorMessage(error, 'Unable to rewind the last swipe right now.'));
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }, [
    history,
    isConnectXProActive,
    isSubmitting,
    presentPaywallIfNeeded,
    rewindAction,
    supported,
  ]);

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
          runOnJS(handleSwipeAction)(direction === 'right' ? 'like' : 'pass', direction);
        }
      });
      translateY.value = withTiming(-18, { duration: 220 });
      nextCardScale.value = withTiming(1, { duration: 220 });
    },
    [handleSwipeAction, isSubmitting, nextCardScale, translateX, translateY, width]
  );

  const handleSuperLike = React.useCallback(() => {
    if (!currentCardRef.current || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    translateX.value = withTiming(0, { duration: 220 });
    translateY.value = withTiming(-height * 0.9, { duration: 220 }, (finished) => {
      if (finished) {
        runOnJS(handleSwipeAction)('super_like');
      }
    });
    nextCardScale.value = withTiming(1, { duration: 220 });
  }, [handleSwipeAction, height, isSubmitting, nextCardScale, translateX, translateY]);

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
    setShouldIncludeLocationAvailability(false);
    setFilterError(null);
    setSheetMode(DEFAULT_FILTER_MODE);
    setAppliedDiscoveryMode(null);
    setIsFilterVisible(false);
  }, []);

  const handleApplyFilters = React.useCallback(
    async (mode: DiscoveryMode, nextFilters: DiscoveryAppliedFilters) => {
      setIsApplyingFilters(true);

      try {
        const sanitizedNextFilters = sanitizeDiscoveryFilters(
          nextFilters,
          getDiscoveryFilterSections(mode)
        );
        let nextDeviceCoordinates = deviceCoordinates;

        if (!nextDeviceCoordinates) {
          nextDeviceCoordinates = await loadDeviceCoordinates(isRecordValue(sanitizedNextFilters.locationAvailability));
        }

        setShouldIncludeLocationAvailability(isRecordValue(sanitizedNextFilters.locationAvailability));
        setAppliedMode(mode);
        setAppliedFilters(nextFilters);
        setSheetMode(mode);
        setAppliedDiscoveryMode(mode);
        setFilterError(null);
        setIsFilterVisible(false);
      } catch (error) {
        setFilterError(getErrorMessage(error, 'Unable to generate candidates with these filters.'));
      } finally {
        setIsApplyingFilters(false);
      }
    },
    [deviceCoordinates, loadDeviceCoordinates]
  );

  const handleModeChange = React.useCallback((mode: DiscoveryMode) => {
    setSheetMode(mode);
    setFilterError(null);
  }, []);

  const panGesture = Gesture.Pan()
    .enabled(Boolean(currentItem) && !isSubmitting)
    .activeOffsetX([-12, 12])
    .failOffsetY([-24, 24])
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
    transform: [{ translateY: 8 }, { scale: nextCardScale.value }],
  }));

  const passOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, -32, 0], [1, 0.2, 0], Extrapolation.CLAMP),
    transform: [
      { rotate: '-14deg' },
      { scale: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0.82], Extrapolation.CLAMP) },
    ],
  }));

  const likeOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, 32, SWIPE_THRESHOLD], [0, 0.2, 1], Extrapolation.CLAMP),
    transform: [
      { rotate: '14deg' },
      { scale: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0.82, 1], Extrapolation.CLAMP) },
    ],
  }));

  const superLikeOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, -24, -120], [0, 0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(translateY.value, [0, -120], [16, 0], Extrapolation.CLAMP) },
      { scale: interpolate(translateY.value, [0, -120], [0.86, 1], Extrapolation.CLAMP) },
    ],
  }));

  const filterSheet = (
    <DiscoveryFilterSheet
      currentMode={sheetMode}
      errorMessage={filterError}
      filterOptionsResponse={matchingFilterOptionsResponse}
      goalOptions={goalOptions}
      hasConnectXPro={isConnectXProActive}
      initialAppliedMode={appliedMode}
      initialFilters={appliedFilters}
      isApplying={isApplyingFilters}
      isLoadingOptions={isFilterOptionsLoading}
      onApply={handleApplyFilters}
      onClose={handleCloseFilters}
      onModeChange={handleModeChange}
      onReset={handleResetFilters}
      optionsErrorMessage={filterOptionsErrorMessage}
      sections={filterSections}
      visible={isFilterVisible}
    />
  );

  const filterButton = (
    <Pressable
      accessibilityLabel="Open discovery filters"
      className="flex-row items-center gap-2 rounded-full border px-3 py-2"
      onPress={handleOpenFilters}
      style={{
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
  );

  const notificationButton = (
    <Pressable
      accessibilityLabel="Open notifications"
      className="relative h-10 w-10 items-center justify-center rounded-full border"
      onPress={() => router.push('/notifications' as never)}
      style={{ borderColor: 'rgba(152, 162, 179, 0.18)' }}>
      <Ionicons
        color={unreadNotificationCount > 0 ? '#FF9A3E' : '#D0D5DD'}
        name="notifications-outline"
        size={19}
      />
      {unreadNotificationCount > 0 ? (
        <View
          className="absolute -right-1 -top-1 min-w-5 items-center rounded-full px-1.5 py-0.5"
          style={{ backgroundColor: '#FF9A3E' }}>
          <AppText
            className="text-[10px] leading-[12px]"
            style={{ color: '#1A120B', fontVariant: ['tabular-nums'] }}
            variant="code">
            {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );

  const topBarAccessory = (
    <View className="flex-row items-center gap-2">
      {notificationButton}
      {filterButton}
    </View>
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

    if (!matchId) {
      return;
    }

    router.push(`/match-analysis/${matchId}` as never);
  }, [matchState?.matchId, router]);

  const matchModal = (
    <MatchModal
      card={matchState?.card ?? null}
      onChat={handleOpenMatchChat}
      onClose={() => setMatchState(null)}
      onReport={handleOpenMatchReport}
    />
  );

  if (
    !hasResolvedAuthSessionSetup ||
    (!currentItem &&
      !usingLocalMockCards &&
      (discoveryQuery.isLoading || discoveryQuery.isRefetching))
  ) {
    return (
      <View className="flex-1">
        <AppTopBar rightAccessory={topBarAccessory} />
        <DiscoveryDeckSkeleton />
        {filterSheet}
        {matchModal}
      </View>
    );
  }

  if (!currentItem) {
    return (
      <View className="flex-1">
        <AppTopBar rightAccessory={topBarAccessory} />
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-center px-4 py-8"
          refreshControl={
            <RefreshControl
              refreshing={discoveryQuery.isRefetching}
              tintColor="#FF9A3E"
              onRefresh={handleRefreshDiscovery}
            />
          }>
          <EmptyState
            connectedCount={connectedCount}
            isLoadingMore={Boolean(discoveryQuery.hasNextPage && discoveryQuery.isFetchingNextPage)}
            onStartOver={handleStartOver}
            skippedCount={skippedCount}
          />
        </ScrollView>
        {filterSheet}
        {matchModal}
      </View>
    );
  }

  return (
    <View className="flex-1">
      <AppTopBar rightAccessory={topBarAccessory} />
      <View className="flex-1 px-2 pb-1">
        {filterError ? (
          <AppCard tone="signal" className="mb-2 gap-2 rounded-[16px] p-3">
            <AppText variant="subtitle">Discovery search</AppText>
            <AppText tone="muted">{filterError}</AppText>
          </AppCard>
        ) : null}

        <View className="relative mt-2 flex-1">
          <View className="h-full w-full">
            {nextItem ? (
              <Animated.View
                className="absolute inset-0 overflow-hidden rounded-[24px] border border-border"
                style={[Shadows.card, nextCardStyle, { backgroundColor: '#232323' }]}>
                <DiscoveryCardContent
                  bottomInset={floatingActionsContentPadding}
                  card={nextItem}
                  scrollEnabled={false}
                />
              </Animated.View>
            ) : null}

            <GestureDetector gesture={panGesture}>
              <Animated.View
                className="absolute inset-0 overflow-hidden rounded-[24px] border border-border"
                style={[Shadows.card, topCardStyle, { backgroundColor: '#232323' }]}>
                <DiscoveryCardContent
                  bottomInset={floatingActionsContentPadding}
                  card={currentItem}
                  refreshControl={
                    <RefreshControl
                      refreshing={discoveryQuery.isRefetching}
                      tintColor="#FF9A3E"
                      onRefresh={handleRefreshDiscovery}
                    />
                  }
                />

                <Animated.View
                  className="absolute inset-x-0 top-[42%] items-center"
                  pointerEvents="none"
                  style={passOverlayStyle}>
                  <View
                    className="rounded-[10px] border-[3px] px-5 py-2.5"
                    style={{
                      backgroundColor: 'rgba(24, 10, 10, 0.72)',
                      borderColor: '#EF4444',
                    }}>
                    <AppText className="text-[34px] leading-[38px]" style={{ color: '#F87171' }} variant="hero">
                      SKIP
                    </AppText>
                  </View>
                </Animated.View>

                <Animated.View
                  className="absolute inset-x-0 top-[42%] items-center"
                  pointerEvents="none"
                  style={likeOverlayStyle}>
                  <View
                    className="rounded-[10px] border-[3px] px-5 py-2.5"
                    style={{
                      backgroundColor: 'rgba(5, 24, 17, 0.72)',
                      borderColor: '#10B981',
                    }}>
                    <AppText className="text-[34px] leading-[38px]" style={{ color: '#34D399' }} variant="hero">
                      CONNECT
                    </AppText>
                  </View>
                </Animated.View>

                <Animated.View
                  className="absolute inset-x-0 top-[42%] items-center"
                  pointerEvents="none"
                  style={superLikeOverlayStyle}>
                  <View
                    className="rounded-[10px] border-[3px] px-5 py-2.5"
                    style={{
                      backgroundColor: 'rgba(31, 20, 5, 0.74)',
                      borderColor: '#FF9A3E',
                    }}>
                    <AppText
                      align="center"
                      className="text-[30px] leading-[34px]"
                      style={{ color: '#FFCD38' }}
                      variant="hero">
                      SUPER LIKE
                    </AppText>
                  </View>
                </Animated.View>
              </Animated.View>
            </GestureDetector>
          </View>

          <View
            className="absolute inset-x-0 z-10 items-center"
            pointerEvents="box-none"
            style={{ bottom: 5 }}>
            <View
              className="flex-row items-center justify-center gap-5 rounded-full px-6 py-3"
              style={{
                backgroundColor: 'rgba(30, 30, 30, 1)',
                borderColor: 'rgba(255, 255, 255, 0.08)',
                borderWidth: 1,
              }}>
              <DeckActionButton
                color="#EF4444"
                disabled={isSubmitting}
                icon="close"
                label="Skip"
                onPress={() => beginSwipe('left')}
                size="medium"
              />
              <DeckActionButton
                color="#FFCD38"
                disabled={history.length === 0 || isSubmitting}
                icon="arrow-undo"
                label="Rewind"
                onPress={handleRewind}
                size="small"
              />
              <DeckActionButton
                color="#FF9A3E"
                disabled={isSubmitting}
                icon="flash"
                label="Spotlight"
                onPress={handleSuperLike}
                size="medium"
              />
              <DeckActionButton
                color="#10B981"
                disabled={isSubmitting}
                icon="checkmark"
                label="Connect"
                onPress={() => beginSwipe('right')}
                size="medium"
              />
            </View>
          </View>
        </View>

        {actionError ? (
          <AppCard
            className="mt-3 rounded-[18px] border-[#6D3A32] bg-[#332320] px-4 py-3"
            style={{ shadowColor: 'transparent' }}>
            <AppText className="text-[#F7DDD8]" variant="bodyStrong">
              Discovery action failed
            </AppText>
            <AppText className="mt-1 text-[#D9A49C]">{actionError}</AppText>
          </AppCard>
        ) : null}

        {Boolean(discoveryQuery.hasNextPage && discoveryQuery.isFetchingNextPage) ? (
          <AppText align="center" className="text-[10px]" tone="muted" variant="code">
            Loading more cards...
          </AppText>
        ) : null}

        {filterSheet}
      </View>
      {matchModal}
    </View>
  );
}
