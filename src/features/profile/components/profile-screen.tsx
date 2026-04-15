import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { AppCard, AppText, AppTopBar } from '@shared/components';
import { useAuthContext } from '@features/auth/store/auth-provider';

import { useMyProfile } from '../hooks/use-profile';
import { mockMyProfileResponse } from '../mock/profile.mock';
import type { MyProfileData, MyProfileResponse, ProfileBadge, ProfileNamedItem } from '../types/profile.types';
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

function ProfileStatCard({ label, value }: { label: string; value: number }) {
  return (
    <AppCard className="flex-1 items-center rounded-[16px] px-2 py-3">
      <AppText align="center" className="text-[28px] leading-[32px]" variant="title">
        {value}
      </AppText>
      <AppText
        align="center"
        className="mt-0.5 text-[10px] normal-case tracking-[0px]"
        tone="muted"
        variant="label">
        {label}
      </AppText>
    </AppCard>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <View className="flex-row items-center gap-1.5">
      <Ionicons color="#F59E0B" name={icon} size={16} />
      <AppText className="text-[14px]" variant="subtitle">
        {title}
      </AppText>
    </View>
  );
}

function WarmPill({
  icon,
  label,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View
      className="flex-row items-center gap-1 rounded-full border px-2.5 py-1"
      style={{ backgroundColor: '#2A2117', borderColor: 'rgba(245, 158, 11, 0.28)' }}>
      {icon ? <Ionicons color="#F59E0B" name={icon} size={12} /> : null}
      <AppText className="text-[12px] font-semibold" tone="signal">
        {label}
      </AppText>
    </View>
  );
}

function BadgeList({ badges }: { badges: ProfileBadge[] }) {
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {badges.map((badge) => (
        <WarmPill key={badge.id} icon={BADGE_ICON_BY_ID[badge.id]} label={badge.label} />
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
    tone === 'warning' ? 'rgba(245, 208, 84, 0.34)' : 'rgba(245, 158, 11, 0.28)';
  const backgroundColor = tone === 'warning' ? '#302712' : '#2A2117';
  const textColor = tone === 'warning' ? '#F4D03F' : '#F59E0B';

  return (
    <View className="flex-row flex-wrap gap-1.5">
      {items.map((item) => (
        <View
          key={item.id}
          className="rounded-full border px-2.5 py-1"
          style={{ backgroundColor, borderColor }}>
          <AppText className="text-[12px] font-medium" style={{ color: textColor }}>
            {item.name}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function HighlightList({ items }: { items: string[] }) {
  return (
    <AppCard className="gap-3 rounded-[20px] px-3.5 py-4">
      {items.map((item, index) => (
        <View key={item} className="flex-row items-center gap-2.5">
          <Ionicons
            color="#F59E0B"
            name={HIGHLIGHT_ICONS[index] ?? 'ellipse-outline'}
            size={18}
          />
          <AppText className="flex-1 text-[13px] leading-5">{item}</AppText>
        </View>
      ))}
    </AppCard>
  );
}

function Header({ profile }: { profile: MyProfileData }) {
  const initials = getInitials(profile.name);

  return (
    <View className="items-center gap-1.5 pt-0">
      {profile.photoUrl ? (
        <Image
          contentFit="cover"
          source={{ uri: profile.photoUrl }}
          style={{
            borderColor: 'rgba(245, 158, 11, 0.9)',
            borderRadius: 999,
            borderWidth: 2.5,
            height: 84,
            width: 84,
          }}
        />
      ) : (
        <View
          className="items-center justify-center rounded-full"
          style={{
            backgroundColor: '#F59E0B',
            borderColor: 'rgba(255, 216, 128, 0.4)',
            borderWidth: 2.5,
            height: 84,
            width: 84,
          }}>
          <AppText className="text-[24px] leading-[28px]" tone="inverse" variant="title">
            {initials}
          </AppText>
        </View>
      )}

      <View className="items-center gap-0">
        <AppText align="center" className="text-[28px] leading-[34px]" variant="hero">
          {profile.name}
        </AppText>
        <AppText align="center" className="text-[14px]" tone="muted">
          {profile.headline}
        </AppText>
        <View className="mt-0.5 flex-row items-center gap-1">
          <Ionicons color="#F59E0B" name="location-outline" size={14} />
          <AppText className="text-[14px]" tone="signal">
            {profile.location.display}
          </AppText>
        </View>
      </View>
    </View>
  );
}

export function ProfileScreen() {
  const { signOut } = useAuthContext();
  const myProfileQuery = useMyProfile();
  const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
  const myProfileResponse = myProfileQuery.data;

  const effectiveProfile = myProfileResponse && hasUsableProfile(myProfileResponse)
    ? myProfileResponse.data
    : mockMyProfileResponse.data;

  const startupIdeaSection = effectiveProfile.sections.startupIdea;
  const personalitySection = effectiveProfile.sections.personalityAndHobbies;
  const skillsSection = effectiveProfile.sections.skills;
  const interestsSection = effectiveProfile.sections.interests;
  const highlightsSection = effectiveProfile.sections.highlights;

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: '' }} />
      <View className="flex-1" style={{ backgroundColor: '#262626' }}>
        <AppTopBar />
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 px-3.5 pt-3 pb-20"
          contentInsetAdjustmentBehavior="automatic">
          <View className="flex-row items-center gap-2 self-center">
            {myProfileQuery.isFetching ? <ActivityIndicator color="#F59E0B" size="small" /> : null}
            <AppText className="text-[12px]" tone="muted" variant="label">
              {myProfileQuery.isError
                ? 'Using fallback profile'
                : myProfileQuery.isFetching
                  ? 'Syncing profile'
                  : 'My profile'}
            </AppText>
          </View>

          <Header profile={effectiveProfile} />

          <Pressable
            className="self-center flex-row items-center gap-1 rounded-full border px-4 py-2"
            onPress={() => setIsEditModalVisible(true)}
            style={{ backgroundColor: '#2A2117', borderColor: 'rgba(245, 158, 11, 0.28)' }}>
            <Ionicons color="#F59E0B" name="create-outline" size={14} />
            <AppText className="text-[12px]" tone="signal" variant="bodyStrong">
              Edit Profile
            </AppText>
          </Pressable>

          <View className="flex-row gap-2">
            <ProfileStatCard label="Connections" value={effectiveProfile.stats.connections} />
            <ProfileStatCard label="Teams Joined" value={effectiveProfile.stats.teamsJoined} />
            <ProfileStatCard label="Matches" value={effectiveProfile.stats.matches} />
          </View>

          <BadgeList badges={effectiveProfile.badges} />

          {startupIdeaSection ? (
            <AppCard
              className="gap-2.5 rounded-[20px] px-3.5 py-4"
              style={{ backgroundColor: '#231C13', borderColor: 'rgba(245, 158, 11, 0.28)' }}>
              <SectionTitle icon="bulb-outline" title={startupIdeaSection.title} />
              <AppText className="text-[14px] leading-6" tone="muted">
                {startupIdeaSection.value}
              </AppText>
            </AppCard>
          ) : null}

          {personalitySection ? (
            <AppCard className="gap-3.5 rounded-[20px] px-3.5 py-4">
              <SectionTitle icon="flash-outline" title={personalitySection.title} />
              <NamedItemList items={personalitySection.items} />
            </AppCard>
          ) : null}

          {(skillsSection || interestsSection) ? (
            <View className="flex-row gap-2.5">
              {skillsSection ? (
                <AppCard className="min-h-[160px] flex-1 gap-3.5 rounded-[20px] px-3.5 py-4">
                  <AppText className="text-[12px] tracking-[1px]" tone="muted" variant="label">
                    {skillsSection.title}
                  </AppText>
                  <NamedItemList items={skillsSection.items} tone="warning" />
                </AppCard>
              ) : null}

              {interestsSection ? (
                <AppCard className="min-h-[160px] flex-1 gap-3.5 rounded-[20px] px-3.5 py-4">
                  <AppText className="text-[12px] tracking-[1px]" tone="muted" variant="label">
                    {interestsSection.title}
                  </AppText>
                  <NamedItemList items={interestsSection.items} />
                </AppCard>
              ) : null}
            </View>
          ) : null}

          {highlightsSection?.items?.length ? <HighlightList items={highlightsSection.items} /> : null}

          <Pressable
            className="mt-4 flex-row items-center justify-center gap-2 rounded-[16px] border py-4"
            onPress={() => signOut()}
            style={{ backgroundColor: '#1C1C21', borderColor: 'rgba(255, 90, 103, 0.2)' }}>
            <Ionicons color="#FF5A67" name="log-out-outline" size={20} />
            <AppText className="text-[15px] font-semibold" style={{ color: '#FF5A67' }}>
              Sign Out
            </AppText>
          </Pressable>
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
