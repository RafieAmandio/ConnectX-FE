import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { AppCard, AppText } from '@shared/components';

import { mockProfileResponse } from '../mock/profile.mock';
import type {
  ProfileBadge,
  ProfileDetail,
  ProfileHighlight,
  ProfileTrait,
} from '../types/profile.types';

type ProfileStatCardProps = {
  label: string;
  value: number;
};

type SectionTitleProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
};

type WarmPillProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  emoji?: string | null;
};

function isIoniconName(name: string | null): name is keyof typeof Ionicons.glyphMap {
  return Boolean(name && name in Ionicons.glyphMap);
}

function getInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function ProfileStatCard({ label, value }: ProfileStatCardProps) {
  return (
    <AppCard className="flex-1 items-center rounded-[16px] px-2 py-3">
      <AppText align="center" className="text-[28px] leading-[32px]" variant="title">
        {value}
      </AppText>
      <AppText align="center" className="mt-0.5 text-[10px] normal-case tracking-[0px]" tone="muted" variant="label">
        {label}
      </AppText>
    </AppCard>
  );
}

function SectionTitle({ icon, title }: SectionTitleProps) {
  return (
    <View className="flex-row items-center gap-1.5">
      <Ionicons color="#F59E0B" name={icon} size={16} />
      <AppText className="text-[14px]" variant="subtitle">{title}</AppText>
    </View>
  );
}

function WarmPill({ emoji, icon, label }: WarmPillProps) {
  return (
    <View
      className="flex-row items-center gap-1 rounded-full border px-2.5 py-1"
      style={{ backgroundColor: '#2A2117', borderColor: 'rgba(245, 158, 11, 0.28)' }}>
      {emoji ? <AppText className="text-[13px] leading-[14px]">{emoji}</AppText> : null}
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
        <WarmPill
          key={badge.id}
          icon={isIoniconName(badge.icon) ? badge.icon : undefined}
          label={badge.label}
        />
      ))}
    </View>
  );
}

function TraitList({ traits }: { traits: ProfileTrait[] }) {
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {traits.map((trait) => (
        <WarmPill key={trait.id} emoji={trait.emoji} label={trait.label} />
      ))}
    </View>
  );
}

function KeywordList({ items, tone = 'signal' }: { items: string[]; tone?: 'signal' | 'warning' }) {
  const borderColor = tone === 'warning' ? 'rgba(245, 208, 84, 0.34)' : 'rgba(245, 158, 11, 0.28)';
  const backgroundColor = tone === 'warning' ? '#302712' : '#2A2117';
  const textColor = tone === 'warning' ? '#F4D03F' : '#F59E0B';

  return (
    <View className="flex-row flex-wrap gap-1.5">
      {items.map((item) => (
        <View
          key={item}
          className="rounded-full border px-2.5 py-1"
          style={{ backgroundColor, borderColor }}>
          <AppText className="text-[12px] font-medium" style={{ color: textColor }}>
            {item}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function HighlightList({ items }: { items: ProfileHighlight[] }) {
  return (
    <AppCard className="gap-3 rounded-[20px] px-3.5 py-4">
      {items.map((item) => (
        <View key={item.id} className="flex-row items-center gap-2.5">
          <Ionicons
            color="#F59E0B"
            name={isIoniconName(item.icon) ? item.icon : 'ellipse-outline'}
            size={18}
          />
          <AppText className="flex-1 text-[13px] leading-5">{item.text}</AppText>
        </View>
      ))}
    </AppCard>
  );
}

function Header({ profile }: { profile: ProfileDetail }) {
  const initials = getInitials(profile.fullName);

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
          {profile.fullName}
        </AppText>
        <AppText align="center" className="text-[14px]" tone="muted">
          {profile.headline}
        </AppText>
        <View className="mt-0.5 flex-row items-center gap-1">
          <Ionicons color="#F59E0B" name="location-outline" size={14} />
          <AppText className="text-[14px]" tone="signal">
            {profile.location.displayName}
          </AppText>
        </View>
      </View>
    </View>
  );
}

export function ProfileScreen() {
  const profile = mockProfileResponse.data.profile;

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: '' }} />
      <ScrollView
        className="flex-1 bg-canvas"
        contentContainerClassName="gap-5 px-3.5 pt-3 pb-20"
        contentInsetAdjustmentBehavior="automatic">
        <Header profile={profile} />

        <View className="flex-row gap-2">
          <ProfileStatCard label="Connections" value={profile.stats.connections} />
          <ProfileStatCard label="Teams Joined" value={profile.stats.teamsJoined} />
          <ProfileStatCard label="Matches" value={profile.stats.matches} />
        </View>

        <BadgeList badges={profile.badges} />

        <AppCard
          className="gap-2.5 rounded-[20px] px-3.5 py-4"
          style={{ backgroundColor: '#231C13', borderColor: 'rgba(245, 158, 11, 0.28)' }}>
          <SectionTitle icon="bulb-outline" title="Startup Idea" />
          <AppText className="text-[14px] leading-6" tone="muted">
            {profile.startupIdea}
          </AppText>
        </AppCard>

        <AppCard className="gap-3.5 rounded-[20px] px-3.5 py-4">
          <SectionTitle icon="flash-outline" title="Personality & Hobbies" />
          <TraitList traits={profile.personalityAndHobbies} />
        </AppCard>

        <View className="flex-row gap-2.5">
          <AppCard className="min-h-[160px] flex-1 gap-3.5 rounded-[20px] px-3.5 py-4">
            <AppText className="text-[12px] tracking-[1px]" tone="muted" variant="label">
              Skills
            </AppText>
            <KeywordList items={profile.skills} tone="warning" />
          </AppCard>

          <AppCard className="min-h-[160px] flex-1 gap-3.5 rounded-[20px] px-3.5 py-4">
            <AppText className="text-[12px] tracking-[1px]" tone="muted" variant="label">
              Interests
            </AppText>
            <KeywordList items={profile.interests} />
          </AppCard>
        </View>

        <HighlightList items={profile.highlights} />
      </ScrollView>
    </>
  );
}
