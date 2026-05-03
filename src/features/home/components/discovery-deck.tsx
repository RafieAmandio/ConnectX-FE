import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, RefreshControl, ScrollView, useWindowDimensions, View } from 'react-native';
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

import { useAuth } from '@features/auth';
import { useNotifications } from '@features/notifications';
import { REVENUECAT_OFFERING_IDS, useRevenueCat } from '@features/revenuecat';
import { AppCard, AppText, AppTopBar } from '@shared/components';
import { ApiError } from '@shared/services/api';
import { Shadows } from '@shared/theme';

import { getDiscoveryFilterSections } from '../config/discovery-filters';
import {
  countAppliedDiscoveryFilters,
  useDiscoveryCards,
  useDiscoveryFilterOptions,
  useRewindAction,
  useSwipeAction,
} from '../hooks/use-discovery';
import {
  mockDiscoveryCardsResponse,
  mockDiscoveryCardsResponsesByMode,
} from '../mock/discovery.mock';
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

type SwipeDirection = 'left' | 'right';
type SwipeActionIntent = SwipeActionRequest['action'];
type DeviceCoordinates = {
  latitude: number;
  longitude: number;
};

const SWIPE_THRESHOLD = 120;
const PRELOAD_THRESHOLD = 3;
const DISCOVERY_PAGE_LIMIT = 10;
const DEFAULT_FILTER_MODE: DiscoveryMode = 'joining_startups';
const MATCH_TOAST_DURATION_MS = 2600;
const FLOATING_ACTIONS_CONTENT_PADDING = 72;

const GOAL_ID_BY_MODE: Record<DiscoveryMode, DiscoveryGoalId> = {
  finding_cofounder: 'goal_finding_cofounder',
  building_team: 'goal_building_team',
  explore_startups: 'goal_explore_startups',
  joining_startups: 'goal_joining_startups',
};

function hasUsableCards(items: DiscoveryCard[]) {
  return items.length > 0;
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

function getGoalOptions(sections: DiscoveryFilterSection[], mode: DiscoveryMode) {
  const goalSection = sections.find((section) => section.id === 'goal');

  if (goalSection?.options?.length) {
    return goalSection.options;
  }

  return getDiscoveryFilterSections(mode).find((section) => section.id === 'goal')?.options ?? [];
}

function shouldShowMockMatchToast(card: DiscoveryCard) {
  return false
}

function getCardActionTargetId(card: DiscoveryCard) {
  return isDiscoveryProfileCard(card) ? card.profileId : card.startupId;
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

function ProfileCardContent({
  card,
  bottomInset = 24,
  scrollEnabled = true,
}: {
  card: DiscoveryProfileCard;
  bottomInset?: number;
  scrollEnabled?: boolean;
}) {
  return (
    <View className="flex-1">
      <View className="shrink-0">
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
            <AppText className="text-[28px] leading-[34px]" variant="hero">
              {card.age ? `${card.name}, ${card.age}` : card.name}
            </AppText>
            <View className="mt-1 flex-row items-center gap-1.5">
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
          </View>
        </View>

        <View className="flex-row items-center justify-between border-b border-border px-4 py-4">
          <View className="flex-row items-center gap-3">
            <View className="h-[52px] w-[52px] items-center justify-center rounded-full border-[2.5px] border-[#FFCD38]">
              <AppText className="text-[16px] font-bold" style={{ color: '#FFCD38' }}>
                {card.match.score}%
              </AppText>
            </View>

            <View className="gap-0.5">
              <View className="flex-row items-center gap-1">
                <Ionicons color="#FFCD38" name="star" size={14} />
                <AppText className="text-[14px]" style={{ color: '#FFCD38' }} variant="bodyStrong">
                  {card.match.label ?? 'Strong Match'}
                </AppText>
              </View>
              <AppText className="text-[12px]" tone="muted">
                Match quality
              </AppText>
            </View>
          </View>

          <View className="items-end gap-1">
            <AppText className="text-[17px] leading-tight" align="right" variant="title">
              {card.headline}
            </AppText>
            {card.badges[0] ? (
              <View className="flex-row items-center gap-1">
                <Ionicons color="#FF9A3E" name={getBadgeIcon(card.badges[0].icon)} size={12} />
                <AppText className="text-[13px]" tone="muted">
                  {card.badges[0].label}
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        contentContainerStyle={{ paddingBottom: bottomInset }}>
        <View className="gap-5 px-4 py-4">
          {card.bio ? (
            <AppText className="text-[16px] leading-7" tone="muted">
              {card.bio}
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

          <View className="gap-2.5">
            <SectionLabel title="Skills" />
            <View className="flex-row flex-wrap gap-2">
              {card.skills.map((item) => (
                <DiscoveryTag key={item.id} item={item} />
              ))}
            </View>
          </View>

          {card.experience?.length ? (
            <View className="gap-3">
              <SectionLabel icon="briefcase-outline" title="Experience" />
              {card.experience.map((item) => (
                <AppCard key={item.id} className="gap-1.5 rounded-[16px] p-4 bg-[#2C2C2C] border border-white/10 border-l-[2.5px] border-l-[#FF9A3E]">
                  <AppText className="text-[16px]" variant="title">
                    {item.title}
                  </AppText>
                  <AppText className="text-[13px] text-[#FF9A3E]">
                    {item.organization} · {item.period}
                  </AppText>
                </AppCard>
              ))}
            </View>
          ) : null}

          {card.education?.length ? (
            <View className="gap-3">
              {card.education.map((item) => (
                <AppCard key={item.id} className="flex-row items-center gap-3.5 rounded-[16px] p-4 bg-[#2C2C2C] border-white/10">
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

          {card.languages?.length ? (
            <View className="flex-row items-center gap-2 pb-1">
              <Ionicons color="#FF9A3E" name="globe-outline" size={20} />
              <AppText className="text-[14px]" tone="muted">
                {card.languages.join(' · ')}
              </AppText>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function StartupCardContent({
  card,
  bottomInset = 24,
  scrollEnabled = true,
}: {
  card: DiscoveryStartupCard;
  bottomInset?: number;
  scrollEnabled?: boolean;
}) {
  return (
    <View className="flex-1">
      <View className="shrink-0">
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

          <View className="mt-5 gap-1">
            <AppText className="text-[30px] leading-[34px]" variant="hero">
              {card.name}
            </AppText>
            <View className="flex-row items-center gap-1.5">
              <Ionicons color="#C7CCD4" name="briefcase-outline" size={15} />
              <AppText className="text-[14px]" tone="muted">
                {card.founder.title ? `${card.founder.title} by ${card.founder.name}` : card.founder.name}
              </AppText>
            </View>
          </View>
        </View>

        <View className="flex-row items-center justify-between border-b border-border px-4 py-4">
          <View className="flex-row items-center gap-3">
            <View className="h-[52px] w-[52px] items-center justify-center rounded-full border-[2.5px] border-[#31D47A]">
              <AppText className="text-[16px] font-bold" style={{ color: '#58EA93' }}>
                {card.match.score}%
              </AppText>
            </View>
            <View className="gap-0.5">
              <View className="flex-row items-center gap-1">
                <Ionicons color="#58EA93" name="star" size={14} />
                <AppText className="text-[14px]" style={{ color: '#58EA93' }} variant="bodyStrong">
                  {card.match.label ?? 'Strong Match'}
                </AppText>
              </View>
            </View>
          </View>

          <View className="items-end gap-1">
            <AppText className="text-[17px] leading-tight" align="right" variant="title">
              {card.industry.display}
            </AppText>
            <View className="flex-row items-center gap-1">
              <Ionicons color="#98A2B3" name="people-outline" size={14} />
              <AppText className="text-[13px]" tone="muted">
                {card.team.display}
              </AppText>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        contentContainerStyle={{ paddingBottom: bottomInset }}>
        <View className="gap-5 px-4 py-4">
          <AppText className="text-[16px] leading-7" tone="muted">
            {card.summary}
          </AppText>

          {card.openRoles.length ? (
            <View className="gap-3">
              <SectionLabel icon="briefcase-outline" title="Open Roles" />
              <View className="flex-row flex-wrap gap-2">
                {card.openRoles.map((role) => (
                  <StartupRoleChip key={role.id} title={role.title} />
                ))}
              </View>
            </View>
          ) : null}

          {card.lookingFor.length ? (
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
                    Industry
                  </AppText>
                  <AppText className="text-[18px]" variant="title">
                    {card.teamStage.industry}
                  </AppText>
                </View>
                <View className="w-1/2 gap-1 pl-2">
                  <AppText className="text-[12px]" tone="muted">
                    Hiring
                  </AppText>
                  <AppText className="text-[18px]" variant="title">
                    {card.teamStage.hiringCount} roles
                  </AppText>
                </View>
              </View>
            </AppCard>
          </View>

          <StartupJourney card={card} />
        </View>
      </ScrollView>
    </View>
  );
}

function DiscoveryCardContent({
  bottomInset = 24,
  card,
  scrollEnabled = true,
}: {
  bottomInset?: number;
  card: DiscoveryCard;
  scrollEnabled?: boolean;
}) {
  return isDiscoveryProfileCard(card) ? (
    <ProfileCardContent bottomInset={bottomInset} card={card} scrollEnabled={scrollEnabled} />
  ) : (
    <StartupCardContent bottomInset={bottomInset} card={card} scrollEnabled={scrollEnabled} />
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
  hasActiveFilters,
  isLoadingMore,
  onOpenFilters,
  onResetFallback,
  onResetFilters,
  usingMockData,
}: {
  hasActiveFilters: boolean;
  isLoadingMore: boolean;
  onOpenFilters: () => void;
  onResetFallback: () => void;
  onResetFilters: () => void;
  usingMockData: boolean;
}) {
  const title = isLoadingMore
    ? 'Loading more cards...'
    : hasActiveFilters
      ? 'No cards match these filters'
      : 'No discovery cards right now';
  const description = isLoadingMore
    ? 'Hang tight while the next page of discovery cards loads into the deck.'
    : hasActiveFilters
      ? 'Try widening the role, location, or availability filters to bring more people into the deck.'
      : 'You are all caught up for now. Fresh matches will appear here when they are available.';

  return (
    <AppCard className="items-center gap-4 rounded-[24px] p-5">
      <View
        className="h-16 w-16 items-center justify-center rounded-full border"
        style={{ backgroundColor: '#2A2117', borderColor: 'rgba(255, 154, 62, 0.28)' }}>
        <Ionicons color="#FF9A3E" name={hasActiveFilters ? 'options-outline' : 'albums-outline'} size={28} />
      </View>

      <View className="items-center gap-2">
        <AppText className="text-center" variant="title">
          {title}
        </AppText>
        <AppText className="max-w-[300px] text-center" tone="muted">
          {description}
        </AppText>
      </View>

      {!isLoadingMore ? (
        <View className="w-full gap-2">
          {hasActiveFilters ? (
            <Pressable
              className="h-11 flex-row items-center justify-center gap-2 rounded-full"
              onPress={onOpenFilters}
              style={{ backgroundColor: '#FF9A3E' }}>
              <Ionicons color="#1A120B" name="options-outline" size={18} />
              <AppText style={{ color: '#1A120B' }} variant="bodyStrong">
                Adjust filters
              </AppText>
            </Pressable>
          ) : null}

          {hasActiveFilters ? (
            <Pressable
              className="h-11 flex-row items-center justify-center gap-2 rounded-full border"
              onPress={onResetFilters}
              style={{ backgroundColor: '#1E1E1E', borderColor: 'rgba(255, 255, 255, 0.16)' }}>
              <Ionicons color="#D0D5DD" name="close-circle-outline" size={18} />
              <AppText tone="muted" variant="bodyStrong">
                Clear filters
              </AppText>
            </Pressable>
          ) : null}

          {usingMockData ? (
            <Pressable
              className="h-11 flex-row items-center justify-center gap-2 rounded-full border"
              onPress={onResetFallback}
              style={{ backgroundColor: '#2A2117', borderColor: 'rgba(245, 158, 11, 0.28)' }}>
              <Ionicons color="#FF9A3E" name="refresh-outline" size={18} />
              <AppText tone="signal" variant="bodyStrong">
                Reload Mock Deck
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </AppCard>
  );
}

export function DiscoveryDeck() {
  const router = useRouter();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isHydrated: isAuthHydrated, session } = useAuth();
  const usingMockCards = isDiscoveryCardsMockEnabled();
  const notificationsQuery = useNotifications();
  const { isConnectXProActive, presentPaywallForOffering, presentPaywallIfNeeded, supported } =
    useRevenueCat();
  const [mockCards, setMockCards] = React.useState<DiscoveryCard[]>(getFallbackCards(null));
  const [restoredCards, setRestoredCards] = React.useState<DiscoveryCard[]>([]);
  const [history, setHistory] = React.useState<DiscoverySwipeHistoryEntry[]>([]);
  const [lastSuccessfulCards, setLastSuccessfulCards] = React.useState<DiscoveryCard[]>([]);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [matchToastName, setMatchToastName] = React.useState<string | null>(null);
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
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const nextCardScale = useSharedValue(0.96);
  const currentCardRef = React.useRef<DiscoveryCard | null>(null);
  const usingFallbackRef = React.useRef(false);
  const matchToastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRequestedDeviceCoordinatesRef = React.useRef(false);

  const hasSyncedAuthSession =
    !session ||
    session.authPhase !== 'authenticated' ||
    Boolean(session.authSessionSyncedAt) ||
    Boolean(session.isDevelopmentBypass);

  React.useEffect(() => {
    if (!isAuthHydrated || !hasSyncedAuthSession) {
      return;
    }

    const localOnboardingMode = loadOnboardingDiscoveryPreference()?.mode ?? null;
    const defaultMode =
      session?.authSessionSource === 'api'
        ? session.defaultDiscoveryMode
        : localOnboardingMode ?? session?.defaultDiscoveryMode ?? null;

    if (defaultMode) {
      setSheetMode(defaultMode);
      setAppliedMode(defaultMode);
    }

    setAppliedFilters({});
    setHasResolvedAuthSessionSetup(true);
  }, [hasSyncedAuthSession, isAuthHydrated, session?.authSessionSource, session?.defaultDiscoveryMode]);

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
    () => withDeviceCoordinates(sanitizedAppliedFilters, deviceCoordinates),
    [deviceCoordinates, sanitizedAppliedFilters]
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
  const rewindAction = useRewindAction();
  const swipeAction = useSwipeAction();

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

  React.useEffect(() => {
    if (hasRequestedDeviceCoordinatesRef.current) {
      return;
    }

    hasRequestedDeviceCoordinatesRef.current = true;
    void (async () => {
      try {
        await loadDeviceCoordinates(true);
      } finally {
        setHasResolvedInitialLocation(true);
      }
    })();
  }, [loadDeviceCoordinates]);

  React.useEffect(() => {
    if (!hasResolvedInitialLocation) {
      return;
    }

    console.log('[DiscoveryDeck] request payload on enter/update', discoveryRequest);
  }, [discoveryRequest, hasResolvedInitialLocation]);


  const liveCards = React.useMemo(() => flattenUniqueCards(discoveryQuery.data), [discoveryQuery.data]);

  React.useEffect(() => {
    if (liveCards.length > 0) {
      setLastSuccessfulCards(liveCards);
    }
  }, [liveCards]);

  const shouldKeepLastSuccessfulCards =
    !discoveryQuery.isSuccess && (discoveryQuery.isLoading || discoveryQuery.isFetching);
  const effectiveLiveCards =
    liveCards.length > 0 ? liveCards : shouldKeepLastSuccessfulCards ? lastSuccessfulCards : [];
  const usingFallback =
    !usingMockCards &&
    !hasUsableCards(effectiveLiveCards) &&
    (discoveryQuery.isError || discoveryQuery.isSuccess);
  const usingLocalMockCards = usingMockCards || usingFallback;
  const baseCards = usingLocalMockCards ? mockCards : effectiveLiveCards;
  const cards = React.useMemo(() => {
    const baseIds = new Set(baseCards.map((card) => card.id));
    return [...restoredCards.filter((card) => !baseIds.has(card.id)), ...baseCards];
  }, [baseCards, restoredCards]);
  const handleRefreshDiscovery = React.useCallback(async () => {
    if (usingLocalMockCards) {
      setMockCards(getFallbackCards(appliedMode));
      return;
    }

    await discoveryQuery.refetch();
  }, [appliedMode, discoveryQuery, usingLocalMockCards]);

  const currentItem = cards[0] ?? null;
  const nextItem = cards[1] ?? null;
  const remainingCards = cards.length;
  const floatingActionsContentPadding = FLOATING_ACTIONS_CONTENT_PADDING;
  const appliedFilterCount = React.useMemo(
    () => countAppliedDiscoveryFilters(sanitizedAppliedFilters),
    [sanitizedAppliedFilters]
  );
  const unreadNotificationCount = notificationsQuery.data?.data.unreadCount ?? 0;

  currentCardRef.current = currentItem;
  usingFallbackRef.current = usingLocalMockCards;

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
    if (!discoveryQuery.isError || !isPremiumRequiredError(discoveryQuery.error)) {
      return;
    }

    setFilterError(
      getErrorMessage(discoveryQuery.error, 'Premium subscription required to use advanced discovery filters.')
    );
  }, [discoveryQuery.error, discoveryQuery.isError]);

  React.useEffect(() => {
    setMockCards(getFallbackCards(appliedMode));
    setRestoredCards([]);
    setHistory([]);
    setActionError(null);
    setMatchToastName(null);
    translateX.value = 0;
    translateY.value = 0;
    nextCardScale.value = 0.96;
  }, [appliedMode, discoveryRequest, nextCardScale, translateX, translateY]);

  React.useEffect(() => {
    return () => {
      if (matchToastTimerRef.current) {
        clearTimeout(matchToastTimerRef.current);
      }
    };
  }, []);

  const resetCardPosition = React.useCallback(() => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    nextCardScale.value = withSpring(0.96);
  }, [nextCardScale, translateX, translateY]);

  const showMatchToast = React.useCallback((cardName: string) => {
    if (matchToastTimerRef.current) {
      clearTimeout(matchToastTimerRef.current);
    }

    setMatchToastName(cardName);
    matchToastTimerRef.current = setTimeout(() => {
      setMatchToastName(null);
      matchToastTimerRef.current = null;
    }, MATCH_TOAST_DURATION_MS);
  }, []);

  const maybePresentBoostPaywall = React.useCallback(async () => {
    if (!supported) {
      setActionError('Boost purchases are available in the native iOS and Android builds.');
      return;
    }

    try {
      const result = await presentPaywallForOffering(REVENUECAT_OFFERING_IDS.discoveryBoosts);

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

      if (!activeCard) {
        setIsSubmitting(false);
        resetCardPosition();
        return;
      }

      try {
        let matched = false;

        if (usingFallbackRef.current) {
          setMockCards((current) => current.filter((item) => item.id !== activeCard.id));

        } else {
          const response = await swipeAction.mutateAsync({
            cardId: activeCard.id,
            payload: { action },
            targetId: getCardActionTargetId(activeCard),
          });

          matched = Boolean(response.data.isMatch);
        }

        // Rewound cards are restored from local state, so clear that copy once
        // the backend accepts the new swipe.
        setRestoredCards((current) => current.filter((card) => card.id !== activeCard.id));

        setHistory((current) => [...current.slice(-19), { action, card: activeCard }]);

        if (direction) {
          triggerSwipeHaptic(direction);
        }

        if (
          (action === 'like' || action === 'super_like') &&
          (matched || shouldShowMockMatchToast(activeCard))
        ) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showMatchToast(activeCard.name);
        }

        setActionError(null);
      } catch (error) {
        if (action === 'super_like' && isSuperLikeRequiresBoostError(error)) {
          await maybePresentBoostPaywall();
        } else {
          setActionError(getErrorMessage(error, 'Unable to record this swipe right now.'));
        }
      } finally {
        setIsSubmitting(false);
        // Defer the position reset to the next frame so React commits the
        // new currentItem first. Without this, the card snaps to center
        // while still showing the previous card's content for one frame.
        requestAnimationFrame(() => {
          translateX.value = 0;
          translateY.value = 0;
          nextCardScale.value = 0.96;
        });
      }
    },
    [
      maybePresentBoostPaywall,
      nextCardScale,
      resetCardPosition,
      showMatchToast,
      swipeAction,
      translateX,
      translateY,
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
    setFilterError(null);
    setSheetMode(DEFAULT_FILTER_MODE);
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

        setAppliedMode(mode);
        setAppliedFilters(nextFilters);
        setSheetMode(mode);
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

  const onboardingPreferenceDebugButton = (
    <Pressable
      accessibilityLabel="Log onboarding discovery preference"
      className="h-10 w-10 items-center justify-center rounded-full border"
      onPress={() => {
        console.log(
          '[discovery_bootstrap] saved state',
          {
            authSession: {
              authSessionSyncedAt: session?.authSessionSyncedAt ?? null,
              authSessionSource: session?.authSessionSource ?? null,
              defaultDiscoveryMode: session?.defaultDiscoveryMode ?? null,
              premium: session?.premium ?? null,
            },
            onboardingPreference: loadOnboardingDiscoveryPreference(),
          }
        );
      }}
      style={{ borderColor: 'rgba(152, 162, 179, 0.18)' }}>
      <Ionicons color="#D0D5DD" name="bug-outline" size={18} />
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
      {/* {onboardingPreferenceDebugButton} */}
      {notificationButton}
      {filterButton}
    </View>
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
            hasActiveFilters={appliedFilterCount > 0 || Boolean(appliedMode)}
            isLoadingMore={Boolean(discoveryQuery.hasNextPage && discoveryQuery.isFetchingNextPage)}
            onOpenFilters={handleOpenFilters}
            onResetFallback={() => setMockCards(getFallbackCards(appliedMode))}
            onResetFilters={handleResetFilters}
            usingMockData={usingLocalMockCards}
          />
        </ScrollView>
        {filterSheet}
      </View>
    );
  }

  return (
    <View className="flex-1">
      <AppTopBar rightAccessory={topBarAccessory} />
      <View className="flex-1 px-2 pb-1">
        {matchToastName ? (
          <View className="absolute inset-x-4 top-2 z-20" pointerEvents="none">
            <AppCard
              className="gap-1 rounded-[18px] border px-4 py-3"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.96)',
                borderColor: 'rgba(209, 250, 229, 0.72)',
              }}>
              <AppText className="text-[12px] uppercase tracking-[1px]" style={{ color: '#052E16' }} variant="label">
                Mock Match
              </AppText>
              <AppText className="text-[15px]" style={{ color: '#052E16' }} variant="bodyStrong">
                You and {matchToastName} liked each other.
              </AppText>
            </AppCard>
          </View>
        ) : null}

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
    </View>
  );
}
