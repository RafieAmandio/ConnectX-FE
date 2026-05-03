import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';

import { useAuthContext } from '@features/auth/store/auth-provider';
import { AppCard, AppText, AppTopBar } from '@shared/components';

import { useMyProfile } from '../hooks/use-profile';
import {
  mockIndividualProfileResponse,
  mockStartupProfileResponse,
} from '../mock/profile.mock';
import type {
  MyProfileData,
  MyProfileResponse,
  ProfileAboutKind,
  ProfileBadge,
  ProfileNamedItem,
} from '../types/profile.types';

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

type ProfileMockMode = 'startup' | 'individual';

function hasUsableProfile(response?: MyProfileResponse): response is MyProfileResponse {
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

function StartupProfileCard({ startup }: { startup: NonNullable<MyProfileData['startup']> }) {
  return (
    <SectionCard className="gap-5 rounded-[24px] px-4 py-4">
      <View className="flex-row items-start gap-3">
        <View
          className="h-10 w-10 items-center justify-center rounded-full border"
          style={{ backgroundColor: ACCENT_SOFT_BG, borderColor: ACCENT_BORDER }}
        >
          <Ionicons color={ACCENT} name="rocket-outline" size={18} />
        </View>

        <View className="min-w-0 flex-1 gap-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <AppText className="text-[11px] tracking-[1.2px]" tone="muted" variant="label">
              Startup
            </AppText>
            <View
              className="rounded-full border px-2.5 py-1"
              style={{ backgroundColor: ACCENT_SOFT_BG, borderColor: ACCENT_BORDER }}
            >
              <AppText className="text-[11px]" tone="signal" variant="bodyStrong">
                {startup.stage.label}
              </AppText>
            </View>
          </View>
          <AppText className="text-[18px] leading-6" variant="subtitle">
            {startup.name}
          </AppText>
          <AppText className="text-[14px] leading-5" tone="muted">
            {startup.tagline}
          </AppText>
        </View>
      </View>

      {startup.industries.length ? (
        <View className="gap-2.5">
          <AppText className="text-[11px] tracking-[1px]" tone="muted" variant="label">
            Industries
          </AppText>
          <NamedItemList items={startup.industries} />
        </View>
      ) : null}

      {startup.links.length ? (
        <View className="gap-2.5">
          <AppText className="text-[11px] tracking-[1px]" tone="muted" variant="label">
            Links
          </AppText>
          <View className="gap-2">
            {startup.links.map((link) => (
              <Pressable
                key={`${link.label}-${link.url}`}
                className="min-h-[52px] flex-row items-center gap-3 rounded-[16px] border px-3 active:opacity-80"
                onPress={() => Linking.openURL(link.url)}
                style={{ backgroundColor: SURFACE_MUTED, borderColor: BORDER_COLOR }}
              >
                <View
                  className="h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: ACCENT_SOFT_BG }}
                >
                  <Ionicons color={ACCENT} name="link-outline" size={15} />
                </View>
                <View className="min-w-0 flex-1">
                  <AppText className="text-[13px]" variant="bodyStrong">
                    {link.label}
                  </AppText>
                  <AppText className="text-[12px] leading-4" numberOfLines={1} tone="muted">
                    {link.url}
                  </AppText>
                </View>
                <Ionicons color="rgba(255,255,255,0.45)" name="open-outline" size={15} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </SectionCard>
  );
}

function MockProfileToggle({
  mode,
  onChange,
}: {
  mode: ProfileMockMode;
  onChange: (mode: ProfileMockMode) => void;
}) {
  const options: { label: string; value: ProfileMockMode }[] = [
    { label: 'Startup', value: 'startup' },
    { label: 'Individual', value: 'individual' },
  ];

  return (
    <View
      className="flex-row rounded-[18px] border p-1"
      style={{ backgroundColor: SURFACE_MUTED, borderColor: BORDER_COLOR }}
    >
      {options.map((option) => {
        const isActive = mode === option.value;

        return (
          <Pressable
            key={option.value}
            className="min-h-10 flex-1 items-center justify-center rounded-[14px] px-3 active:opacity-80"
            onPress={() => onChange(option.value)}
            style={{
              backgroundColor: isActive ? ACCENT_SOFT_BG : 'transparent',
              borderColor: isActive ? ACCENT_BORDER : 'transparent',
              borderWidth: 1,
            }}
          >
            <AppText
              className="text-[13px]"
              tone={isActive ? 'signal' : 'muted'}
              variant="bodyStrong"
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
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
      className="gap-4 rounded-[28px] px-4 py-4"
      style={{
        backgroundColor: '#2B2A28',
        borderColor: 'rgba(245, 158, 11, 0.18)',
      }}
    >
      <View className="flex-row items-center gap-4">
        {profile.photoUrl ? (
          <Image
            contentFit="cover"
            source={{ uri: profile.photoUrl }}
            style={{
              borderColor: 'rgba(245, 158, 11, 0.85)',
              borderRadius: 999,
              borderWidth: 3,
              height: 76,
              width: 76,
            }}
          />
        ) : (
          <View
            className="items-center justify-center rounded-full"
            style={{
              backgroundColor: ACCENT,
              borderColor: 'rgba(255, 216, 128, 0.4)',
              borderWidth: 3,
              height: 76,
              width: 76,
            }}
          >
            <AppText className="text-[24px] leading-[28px]" tone="inverse" variant="title">
              {initials}
            </AppText>
          </View>
        )}

        <View className="min-w-0 flex-1 gap-3">
          <View className="flex-row items-start gap-3">
            <View className="min-w-0 flex-1 gap-1">
              <AppText className="text-[25px] leading-[30px]" numberOfLines={2} variant="title">
                {profile.name}
              </AppText>
              <AppText className="text-[14px] leading-5" numberOfLines={1} tone="muted">
                {profile.headline}
              </AppText>
            </View>

            <Pressable
              className="min-h-10 flex-row items-center justify-center gap-1.5 rounded-full border px-3 active:opacity-80"
              onPress={onEdit}
              style={{ backgroundColor: SURFACE_RAISED, borderColor: BORDER_COLOR }}
            >
              <Ionicons color={ACCENT} name="create-outline" size={15} />
              <AppText className="text-[13px]" variant="bodyStrong">
                Edit
              </AppText>
            </Pressable>
          </View>

          <View className="flex-row flex-wrap items-center gap-2">
            <View
              className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5"
              style={{ backgroundColor: SURFACE_MUTED, borderColor: BORDER_COLOR }}
            >
              <Ionicons color={ACCENT} name="location-outline" size={13} />
              <AppText className="max-w-[170px] text-[12px]" numberOfLines={1} tone="default">
                {profile.location.display}
              </AppText>
            </View>

            {profile.badges.map((badge) => (
              <BadgePill key={badge.id} badge={badge} />
            ))}
          </View>
        </View>
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
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { signOut } = useAuthContext();
  const [mockMode, setMockMode] = React.useState<ProfileMockMode>('startup');
  const myProfileQuery = useMyProfile();
  const myProfileResponse = myProfileQuery.data;
  const shouldUseMockProfile =
    myProfileQuery.isError ||
    (myProfileQuery.isSuccess && !hasUsableProfile(myProfileResponse));
  const mockProfile =
    mockMode === 'startup'
      ? mockStartupProfileResponse.data
      : mockIndividualProfileResponse.data;

  const effectiveProfile =
    shouldUseMockProfile || !hasUsableProfile(myProfileResponse)
      ? mockProfile
      : myProfileResponse.data;

  const aboutSection = effectiveProfile.sections.about;
  const startup = effectiveProfile.startup;
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
        {!shouldUseMockProfile && !hasUsableProfile(myProfileResponse) ? (
          <View className="flex-1 items-center justify-center gap-3 px-6">
            <ActivityIndicator color={ACCENT} />
            <AppText align="center" className="text-[14px]" tone="muted">
              Loading profile...
            </AppText>
          </View>
        ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 px-3.5 pt-3 pb-20"
          contentInsetAdjustmentBehavior="automatic"
        >
          <ProfileHero
            onEdit={() => router.push('/profile/edit' as never)}
            profile={effectiveProfile}
          />

          {shouldUseMockProfile ? (
            <MockProfileToggle mode={mockMode} onChange={setMockMode} />
          ) : null}

          <StatsOverview stats={effectiveProfile.stats} />

          {startup ? <StartupProfileCard startup={startup} /> : null}

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
        )}
      </View>
    </>
  );
}
