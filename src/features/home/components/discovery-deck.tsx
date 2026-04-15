import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import React from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { REVENUECAT_OFFERING_IDS, useRevenueCat } from '@features/revenuecat';
import { AppCard, AppText, AppTopBar } from '@shared/components';
import { ApiError } from '@shared/services/api';
import { Shadows } from '@shared/theme';

import { getDiscoveryFilterSections } from '../config/discovery-filters';
import {
  countAppliedDiscoveryFilters,
  useDiscoveryCards,
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

  const locationAvailability = filters.locationAvailability;

  if (!isRecordValue(locationAvailability)) {
    return filters;
  }

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
  scrollEnabled = true,
}: {
  card: DiscoveryProfileCard;
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
        contentContainerStyle={{ paddingBottom: 24 }}>
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

        {card.education?.length ? (
          <View className="gap-3">
            {card.education.map((item) => (
              <AppCard key={item.id} className="flex-row items-center gap-3.5 rounded-[16px] p-4">
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
  scrollEnabled = true,
}: {
  card: DiscoveryStartupCard;
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
        contentContainerStyle={{ paddingBottom: 24 }}>
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
          <AppCard className="rounded-[18px] p-4">
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
  card,
  scrollEnabled = true,
}: {
  card: DiscoveryCard;
  scrollEnabled?: boolean;
}) {
  return isDiscoveryProfileCard(card) ? (
    <ProfileCardContent card={card} scrollEnabled={scrollEnabled} />
  ) : (
    <StartupCardContent card={card} scrollEnabled={scrollEnabled} />
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
  usingMockData,
}: {
  isLoadingMore: boolean;
  onResetFallback: () => void;
  usingMockData: boolean;
}) {
  return (
    <AppCard className="gap-3 rounded-[24px] p-4">
      <AppText variant="title">
        {isLoadingMore ? 'Loading more cards...' : 'No more discovery cards right now.'}
      </AppText>
      <AppText tone="muted">
        {isLoadingMore
          ? 'Hang tight while the next page of discovery cards loads into the deck.'
          : 'You reached the end of the current stack. Check back later for fresh matches.'}
      </AppText>
      {usingMockData ? (
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
  const { width } = useWindowDimensions();
  const usingMockCards = isDiscoveryCardsMockEnabled();
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
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const nextCardScale = useSharedValue(0.96);
  const currentCardRef = React.useRef<DiscoveryCard | null>(null);
  const usingFallbackRef = React.useRef(false);
  const matchToastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const filterSections = React.useMemo(() => getDiscoveryFilterSections(sheetMode), [sheetMode]);
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
    if (!appliedMode) {
      return {};
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

  const discoveryQuery = useDiscoveryCards(discoveryRequest, DISCOVERY_PAGE_LIMIT);
  const rewindAction = useRewindAction();
  const swipeAction = useSwipeAction();


  const liveCards = React.useMemo(() => flattenUniqueCards(discoveryQuery.data), [discoveryQuery.data]);

  React.useEffect(() => {
    if (liveCards.length > 0) {
      setLastSuccessfulCards(liveCards);
    }
  }, [liveCards]);

  const effectiveLiveCards = liveCards.length > 0 ? liveCards : lastSuccessfulCards;
  const usingFallback =
    !usingMockCards &&
    !hasUsableCards(effectiveLiveCards) && (discoveryQuery.isError || discoveryQuery.isSuccess);
  const usingLocalMockCards = usingMockCards || usingFallback;
  const baseCards = usingLocalMockCards ? mockCards : effectiveLiveCards;
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

    translateX.value = withTiming(width * 0.52, { duration: 220 }, (finished) => {
      if (finished) {
        runOnJS(handleSwipeAction)('super_like');
      }
    });
    translateY.value = withTiming(-64, { duration: 220 });
    nextCardScale.value = withTiming(1, { duration: 220 });
  }, [handleSwipeAction, isSubmitting, nextCardScale, translateX, translateY, width]);

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

        if (isRecordValue(sanitizedNextFilters.locationAvailability)) {
          try {
            const existingPermission = await Location.getForegroundPermissionsAsync();
            const permission =
              existingPermission.status === Location.PermissionStatus.GRANTED
                ? existingPermission
                : await Location.requestForegroundPermissionsAsync();

            if (permission.status === Location.PermissionStatus.GRANTED) {
              const position =
                (await Location.getLastKnownPositionAsync()) ??
                (await Location.getCurrentPositionAsync({
                  accuracy: Location.Accuracy.Balanced,
                }));

              if (position?.coords) {
                nextDeviceCoordinates = {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                };
                setDeviceCoordinates(nextDeviceCoordinates);
              }
            }
          } catch (error) {
            console.warn('Unable to attach device coordinates to discovery filters.', error);
          }
        }

        console.log('applyDiscoveryFilters payload', {
          context: {
            mode,
          },
          filters: {
            goalId: GOAL_ID_BY_MODE[mode],
            ...withDeviceCoordinates(sanitizedNextFilters, nextDeviceCoordinates),
          },
        });

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
    [deviceCoordinates]
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
    transform: [{ translateY: 8 }, { scale: nextCardScale.value }],
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
      errorMessage={filterError}
      goalOptions={goalOptions}
      hasConnectXPro={isConnectXProActive}
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

  const filterButton = (
    <Pressable
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

  if (!currentItem && discoveryQuery.isLoading && !usingLocalMockCards) {
    return (
      <View className="flex-1">
        <AppTopBar rightAccessory={filterButton} />
        <View className="flex-1 justify-center px-4">
          <AppCard className="gap-3 rounded-[24px] p-4">
            <AppText variant="title">Loading discovery deck...</AppText>
            <AppText tone="muted">
              Pulling the latest discovery cards and match signals for this account.
            </AppText>
          </AppCard>
        </View>
        {filterSheet}
      </View>
    );
  }

  if (!currentItem) {
    return (
      <View className="flex-1">
        <AppTopBar rightAccessory={filterButton} />
        <View className="flex-1 justify-center px-4">
          <EmptyState
            isLoadingMore={Boolean(discoveryQuery.hasNextPage && discoveryQuery.isFetchingNextPage)}
            onResetFallback={() => setMockCards(getFallbackCards(appliedMode))}
            usingMockData={usingLocalMockCards}
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
        {filterSheet}
      </View>
    );
  }

  return (
    <View className="flex-1">
      <AppTopBar rightAccessory={filterButton} />
      <View className="flex-1 gap-2 px-2 pb-1">
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
          <AppCard tone="signal" className="gap-2 rounded-[16px] p-3">
            <AppText variant="subtitle">Discovery search</AppText>
            <AppText tone="muted">{filterError}</AppText>
          </AppCard>
        ) : null}


        <View className="flex-1 mt-2">
          <View className="h-full w-full">
            {nextItem ? (
              <Animated.View
                className="absolute inset-0 overflow-hidden rounded-[24px] border border-border"
                style={[Shadows.card, nextCardStyle, { backgroundColor: '#232323' }]}>
                <DiscoveryCardContent card={nextItem} scrollEnabled={false} />
              </Animated.View>
            ) : null}

            <GestureDetector gesture={panGesture}>
              <Animated.View
                className="absolute inset-0 overflow-hidden rounded-[24px] border border-border"
                style={[Shadows.card, topCardStyle, { backgroundColor: '#232323' }]}>
                <DiscoveryCardContent card={currentItem} />

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

        <View className="flex-row items-center justify-center gap-4">
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
