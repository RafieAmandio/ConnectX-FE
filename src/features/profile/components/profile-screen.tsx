import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';

import { useAuthContext } from '@features/auth/store/auth-provider';
import { AppCard, AppText, AppTopBar } from '@shared/components';

import { useMyProfile } from '../hooks/use-profile';
import { mockMyProfileResponse } from '../mock/profile.mock';
import type {
  ProfileAboutKind,
  MyProfileData,
  MyProfileResponse,
  ProfileBadge,
  ProfileNamedItem,
} from '../types/profile.types';
import { EditProfileModal } from './edit-profile-modal';

const BADGE_ICON_BY_ID: Record<string, keyof typeof Ionicons.glyphMap> = {
  'startup-founder': 'rocket-outline',
  'top-builder': 'star-outline',
  'open-source': 'shield-outline',
};

const HIGHLIGHT_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'briefcase-outline',
  'school-outline',
  'globe-outline',
  'sparkles-outline',
];

const SURFACE_COLOR = '#2C2C2C';
const SURFACE_MUTED = '#252525';
const SURFACE_RAISED = '#343434';
const BORDER_COLOR = 'rgba(255, 255, 255, 0.08)';
const ACCENT = '#F59E0B';
const ACCENT_BORDER = 'rgba(245, 158, 11, 0.28)';
const ACCENT_SOFT_BG = '#2A2117';
const DANGER = '#FF5A67';
const DANGER_BORDER = 'rgba(255, 90, 103, 0.2)';

function hasUsableProfile(response?: MyProfileResponse) {
  return typeof response?.data?.id === 'string' && response.data.id.length > 0;
}

function getInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function getProfileStatusCopy({
  isError,
  isFetching,
}: {
  isError: boolean;
  isFetching: boolean;
}) {
  if (isError) {
    return {
      icon: 'alert-circle-outline' as const,
      label: 'Using fallback profile',
      tone: '#F4D03F',
    };
  }

  if (isFetching) {
    return {
      icon: 'sync-outline' as const,
      label: 'Syncing profile',
      tone: ACCENT,
    };
  }

  return {
    icon: 'person-circle-outline' as const,
    label: 'My profile',
    tone: '#98A2B3',
  };
}

function getAboutSectionDescription(kind: ProfileAboutKind) {
  if (kind === 'personalDescription') {
    return 'A quick summary of who this person is and what they are looking for.';
  }

  return 'A quick summary of what this profile is building right now.';
}

function SectionHeader({
  eyebrow,
  icon,
  title,
  description,
}: {
  eyebrow?: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
}) {
  return (
    <View className="gap-1.5">
      {eyebrow ? (
        <AppText className="text-[11px] tracking-[1.2px]" tone="muted" variant="label">
          {eyebrow}
        </AppText>
      ) : null}
      <View className="flex-row items-center gap-2">
        <View
          className="h-8 w-8 items-center justify-center rounded-full border"
          style={{ backgroundColor: ACCENT_SOFT_BG, borderColor: ACCENT_BORDER }}>
          <Ionicons color={ACCENT} name={icon} size={16} />
        </View>
        <View className="flex-1 gap-0.5">
          <AppText className="text-[17px] leading-[22px]" variant="subtitle">
            {title}
          </AppText>
          {description ? (
            <AppText className="text-[13px] leading-5" tone="muted">
              {description}
            </AppText>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AppCard
      className={className ?? 'gap-4 rounded-[24px] px-4 py-4'}
      style={{ backgroundColor: SURFACE_COLOR, borderColor: BORDER_COLOR }}
    >
      {children}
    </AppCard>
  );
}

function BadgePill({ badge }: { badge: ProfileBadge }) {
  return (
    <View
      className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5"
      style={{ backgroundColor: ACCENT_SOFT_BG, borderColor: ACCENT_BORDER }}
    >
      <Ionicons color={ACCENT} name={BADGE_ICON_BY_ID[badge.id] ?? 'sparkles-outline'} size={12} />
      <AppText className="text-[12px]" tone="signal" variant="bodyStrong">
        {badge.label}
      </AppText>
    </View>
  );
}

function BadgeList({ badges }: { badges: ProfileBadge[] }) {
  if (!badges.length) {
    return null;
  }

  return (
    <View className="flex-row flex-wrap gap-2">
      {badges.map((badge) => (
        <BadgePill key={badge.id} badge={badge} />
      ))}
    </View>
  );
}

function NamedItemList({
  items,
  tone = 'signal',
}: {
  items: ProfileNamedItem[];
  tone?: 'signal' | 'warning';
}) {
  const borderColor =
    tone === 'warning' ? 'rgba(245, 208, 84, 0.28)' : 'rgba(245, 158, 11, 0.2)';
  const backgroundColor = tone === 'warning' ? '#302712' : '#272015';
  const textColor = tone === 'warning' ? '#F4D03F' : '#F5C062';

  return (
    <View className="flex-row flex-wrap gap-2">
      {items.map((item) => (
        <View
          key={item.id}
          className="rounded-full border px-3 py-2"
          style={{ backgroundColor, borderColor }}
        >
          <AppText className="text-[12px] leading-4" style={{ color: textColor }}>
            {item.name}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function StatusRow({
  isError,
  isFetching,
}: {
  isError: boolean;
  isFetching: boolean;
}) {
  const status = getProfileStatusCopy({ isError, isFetching });

  return (
    <View className="flex-row items-center gap-2 self-start rounded-full px-3 py-1.5">
      <View
        className="flex-row items-center gap-2 rounded-full border px-3 py-1.5"
        style={{ backgroundColor: SURFACE_MUTED, borderColor: BORDER_COLOR }}
      >
        {isFetching ? <ActivityIndicator color={status.tone} size="small" /> : null}
        {!isFetching ? <Ionicons color={status.tone} name={status.icon} size={14} /> : null}
        <AppText className="text-[11px] tracking-[0.8px]" tone="muted" variant="label">
          {status.label}
        </AppText>
      </View>
    </View>
  );
}

function ProfileHero({
  onEdit,
  profile,
}: {
  onEdit: () => void;
  profile: MyProfileData;
}) {
  const initials = getInitials(profile.name);

  return (
    <AppCard
      className="gap-5 rounded-[28px] px-5 py-5"
      style={{
        backgroundColor: '#2B2A28',
        borderColor: 'rgba(245, 158, 11, 0.18)',
      }}
    >
      <View className="flex-row items-start gap-4">
        {profile.photoUrl ? (
          <Image
            contentFit="cover"
            source={{ uri: profile.photoUrl }}
            style={{
              borderColor: 'rgba(245, 158, 11, 0.85)',
              borderRadius: 999,
              borderWidth: 3,
              height: 92,
              width: 92,
            }}
          />
        ) : (
          <View
            className="items-center justify-center rounded-full"
            style={{
              backgroundColor: ACCENT,
              borderColor: 'rgba(255, 216, 128, 0.4)',
              borderWidth: 3,
              height: 92,
              width: 92,
            }}
          >
            <AppText className="text-[28px] leading-[32px]" tone="inverse" variant="title">
              {initials}
            </AppText>
          </View>
        )}

        <View className="flex-1 gap-2">
          <View className="gap-1">
            <AppText className="text-[30px] leading-[36px]" variant="hero">
              {profile.name}
            </AppText>
            <AppText className="text-[15px] leading-[22px]" tone="muted">
              {profile.headline}
            </AppText>
          </View>

          <View className="self-start flex-row items-center gap-2 rounded-full border px-3 py-1.5" style={{ backgroundColor: SURFACE_MUTED, borderColor: BORDER_COLOR }}>
            <Ionicons color={ACCENT} name="location-outline" size={14} />
            <AppText className="text-[13px]" tone="default">
              {profile.location.display}
            </AppText>
          </View>
        </View>
      </View>

      <View className="gap-3">
        <BadgeList badges={profile.badges} />

        <Pressable
          className="min-h-[48px] flex-row items-center justify-center gap-2 self-start rounded-full border px-4 py-3"
          onPress={onEdit}
          style={{ backgroundColor: SURFACE_RAISED, borderColor: BORDER_COLOR }}
        >
          <Ionicons color={ACCENT} name="create-outline" size={16} />
          <AppText className="text-[14px]" variant="bodyStrong">
            Edit Profile
          </AppText>
        </Pressable>
      </View>
    </AppCard>
  );
}

function StatsOverview({
  stats,
}: {
  stats: MyProfileData['stats'];
}) {
  const entries = [
    { label: 'Connections', value: stats.connections },
    { label: 'Teams Joined', value: stats.teamsJoined },
    { label: 'Matches', value: stats.matches },
  ];

  return (
    <SectionCard className="gap-4 rounded-[24px] px-4 py-4">
      <SectionHeader
        eyebrow="Snapshot"
        icon="bar-chart-outline"
        title="Your network at a glance"
      />

      <View
        className="flex-row rounded-[20px] border"
        style={{ backgroundColor: SURFACE_MUTED, borderColor: BORDER_COLOR }}
      >
        {entries.map((entry, index) => (
          <React.Fragment key={entry.label}>
            {index > 0 ? (
              <View
                className="my-4 w-px"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
              />
            ) : null}
            <View className="flex-1 items-center px-2 py-4">
              <AppText
                align="center"
                className="text-[30px] leading-[34px]"
                variant="title"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {entry.value}
              </AppText>
              <AppText
                align="center"
                className="mt-1 text-[11px] leading-4 normal-case tracking-[0.3px]"
                tone="muted"
                variant="label"
              >
                {entry.label}
              </AppText>
            </View>
          </React.Fragment>
        ))}
      </View>
    </SectionCard>
  );
}

function HighlightList({ items }: { items: string[] }) {
  return (
    <View className="gap-3">
      {items.map((item, index) => (
        <View
          key={item}
          className="flex-row items-center gap-3 rounded-[18px] border px-3.5 py-3"
          style={{ backgroundColor: SURFACE_MUTED, borderColor: BORDER_COLOR }}
        >
          <View
            className="h-9 w-9 items-center justify-center rounded-full border"
            style={{ backgroundColor: ACCENT_SOFT_BG, borderColor: ACCENT_BORDER }}
          >
            <Ionicons
              color={ACCENT}
              name={HIGHLIGHT_ICONS[index] ?? 'ellipse-outline'}
              size={16}
            />
          </View>
          <AppText className="flex-1 text-[14px] leading-5">{item}</AppText>
        </View>
      ))}
    </View>
  );
}

function BottomSignOut({ onPress }: { onPress: () => void }) {
  return (
    <View className="gap-3 px-1 pt-2">
      <AppText className="text-[11px] tracking-[1px]" tone="muted" variant="label">
        Account
      </AppText>
      <Pressable
        className="flex-row items-center justify-center gap-2 rounded-[18px] border px-4 py-4"
        onPress={onPress}
        style={{ backgroundColor: '#1C1C21', borderColor: DANGER_BORDER }}
      >
        <Ionicons color={DANGER} name="log-out-outline" size={20} />
        <AppText className="text-[15px] font-semibold" style={{ color: DANGER }}>
          Sign Out
        </AppText>
      </Pressable>
    </View>
  );
}

export function ProfileScreen() {
  const { width } = useWindowDimensions();
  const { signOut } = useAuthContext();
  const myProfileQuery = useMyProfile();
  const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
  const myProfileResponse = myProfileQuery.data;

  const effectiveProfile =
    myProfileResponse && hasUsableProfile(myProfileResponse)
      ? myProfileResponse.data
      : mockMyProfileResponse.data;

  const aboutSection = effectiveProfile.sections.about;
  const personalitySection = effectiveProfile.sections.personalityAndHobbies;
  const skillsSection = effectiveProfile.sections.skills;
  const interestsSection = effectiveProfile.sections.interests;
  const highlightsSection = effectiveProfile.sections.highlights;
  const shouldStackPanels = width < 390;

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: '' }} />
      <View className="flex-1" style={{ backgroundColor: '#262626' }}>
        <AppTopBar />
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 px-3.5 pt-3 pb-20"
          contentInsetAdjustmentBehavior="automatic"
        >
          <StatusRow isError={myProfileQuery.isError} isFetching={myProfileQuery.isFetching} />

          <ProfileHero
            onEdit={() => setIsEditModalVisible(true)}
            profile={effectiveProfile}
          />

          <StatsOverview stats={effectiveProfile.stats} />

          {aboutSection ? (
            <SectionCard>
              <SectionHeader
                description={getAboutSectionDescription(aboutSection.kind)}
                eyebrow="About"
                icon="bulb-outline"
                title={aboutSection.title}
              />
              <AppText className="text-[15px] leading-7" selectable tone="muted">
                {aboutSection.value}
              </AppText>
            </SectionCard>
          ) : null}

          {personalitySection ? (
            <SectionCard>
              <SectionHeader
                description="Traits and hobbies that make the collaboration style easier to read."
                eyebrow="Personality"
                icon="flash-outline"
                title={personalitySection.title}
              />
              <NamedItemList items={personalitySection.items} />
            </SectionCard>
          ) : null}

          {skillsSection || interestsSection ? (
            <View className={shouldStackPanels ? 'gap-3' : 'flex-row gap-3'}>
              {skillsSection ? (
                <SectionCard className="min-h-[170px] flex-1 gap-4 rounded-[24px] px-4 py-4">
                  <SectionHeader
                    eyebrow="Expertise"
                    icon="construct-outline"
                    title={skillsSection.title}
                  />
                  <NamedItemList items={skillsSection.items} tone="warning" />
                </SectionCard>
              ) : null}

              {interestsSection ? (
                <SectionCard className="min-h-[170px] flex-1 gap-4 rounded-[24px] px-4 py-4">
                  <SectionHeader
                    eyebrow="Focus"
                    icon="compass-outline"
                    title={interestsSection.title}
                  />
                  <NamedItemList items={interestsSection.items} />
                </SectionCard>
              ) : null}
            </View>
          ) : null}

          {highlightsSection?.items?.length ? (
            <SectionCard>
              <SectionHeader
                description="Quick facts that help others understand experience and context."
                eyebrow="Highlights"
                icon="sparkles-outline"
                title="Standout details"
              />
              <HighlightList items={highlightsSection.items} />
            </SectionCard>
          ) : null}

          <BottomSignOut onPress={() => signOut()} />
        </ScrollView>
      </View>

      {isEditModalVisible ? (
        <EditProfileModal
          onClose={() => setIsEditModalVisible(false)}
          profile={effectiveProfile}
          visible={isEditModalVisible}
        />
      ) : null}
    </>
  );
}
