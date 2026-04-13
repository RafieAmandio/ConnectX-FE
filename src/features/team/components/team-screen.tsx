import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


import { AppButton, AppCard, AppInput, AppText } from '@shared/components';
import { Shadows } from '@shared/theme';

import { useCreateStartupInvitation, useTeamOverview } from '../hooks/use-team';
import { isNoActiveStartupError } from '../services/team-service';
import type { TeamMember } from '../types/team.types';

function getCommitmentLabel(value: string) {
  switch (value) {
    case 'full_time':
      return 'Full-time';
    case 'part_time':
      return 'Part-time';
    case 'flexible':
      return 'Flexible';
    default:
      return value.replace(/_/g, ' ');
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function InfoPill({
  label,
}: {
  label: string;
}) {
  return (
    <View className="rounded-full border border-[#FF9A3E]/30 bg-[#FF9A3E]/10 px-4 py-2">
      <AppText tone="accent" variant="body">
        {label}
      </AppText>
    </View>
  );
}

function MemberCard({ member }: { member: TeamMember }) {
  return (
    <View
      className="flex-row items-center gap-4 rounded-[20px] border border-border bg-[#1A1A1F] px-4 py-4"
      style={Shadows.card}>
      <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-[16px] bg-[#11131A]">
        {member.avatarUrl ? (
          <Image contentFit="cover" source={{ uri: member.avatarUrl }} style={{ height: '100%', width: '100%' }} />
        ) : (
          <View className="h-12 w-12 items-center justify-center rounded-xl bg-[#FF9A3E]/10">
            <Ionicons color="#FF9A3E" name="briefcase" size={24} />
          </View>
        )}
      </View>

      <View className="flex-1 gap-1">
        <AppText variant="subtitle">{member.role.label}</AppText>
        <AppText className="text-[13px]" tone="muted">{member.name}</AppText>
        <AppText className="text-[13px]" tone="accent" variant="bodyStrong">
          Equity: {member.equityPercent}%
        </AppText>
      </View>

      <View className="items-end gap-2">
        <View className="flex-row gap-2">
          {member.isCurrentUser && (
            <View className="rounded-full bg-[#FF9A3E]/15 px-2 py-0.5 border border-[#FF9A3E]/30">
              <AppText className="text-[11px]" tone="accent" variant="label">You</AppText>
            </View>
          )}
        </View>
        <AppText className="text-[12px]" tone="muted">{getCommitmentLabel(member.commitment)}</AppText>
      </View>
    </View>
  );
}

function MissingRoleCard({ label, onFind }: { label: string; onFind: () => void }) {
  return (
    <View
      className="flex-row items-center gap-4 rounded-[20px] border border-border bg-[#1A1A1F] px-4 py-4"
      style={Shadows.card}>
      <View className="h-16 w-16 items-center justify-center rounded-[16px] bg-[#11131A]">
        <View className="h-12 w-12 items-center justify-center rounded-xl bg-border/20">
          <Ionicons color="#98A2B3" name="add" size={28} />
        </View>
      </View>

      <View className="flex-1 gap-1">
        <AppText variant="subtitle">Early Team</AppText>
        <AppText className="text-[13px]" tone="muted">{label}</AppText>
      </View>

      <Pressable
        className="rounded-lg border border-[#FF9A3E] px-4 py-2"
        onPress={onFind}>
        <AppText className="text-[13px]" tone="accent" variant="bodyStrong">Find</AppText>
      </Pressable>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  variant,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  variant: 'primary' | 'secondary';
}) {
  const isPrimary = variant === 'primary';
  const iconColor = isPrimary ? '#11131A' : '#F5F7FA';

  return (
    <Pressable
      className={isPrimary
        ? 'min-h-[56px] flex-1 flex-row items-center justify-center gap-3 rounded-[18px] bg-[#FF9A3E] px-5 py-4'
        : 'min-h-[56px] flex-1 flex-row items-center justify-center gap-3 rounded-[18px] border border-border bg-[#1A1A1F] px-5 py-4'}
      onPress={onPress}
      style={Shadows.card}>
      <Ionicons color={iconColor} name={icon} size={22} />
      <AppText
        className={isPrimary ? 'text-[#11131A]' : 'text-[#F5F7FA]'}
        variant="subtitle">
        {label}
      </AppText>
    </Pressable>
  );
}

export function TeamScreen() {
  const router = useRouter();
  const teamOverviewQuery = useTeamOverview();
  const createStartupInvitationMutation = useCreateStartupInvitation();
  const [inviteComposerVisible, setInviteComposerVisible] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteError, setInviteError] = React.useState<string | null>(null);
  const [inviteSuccessMessage, setInviteSuccessMessage] = React.useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const overview = teamOverviewQuery.data;

  const navigateToHome = React.useCallback(() => {
    router.navigate('/(tabs)' as never);
  }, [router]);

  const openInviteComposer = React.useCallback(() => {
    setInviteComposerVisible(true);
    setInviteError(null);
    setInviteSuccessMessage(null);
  }, []);

  const closeInviteComposer = React.useCallback(() => {
    setInviteComposerVisible(false);
    setInviteEmail('');
    setInviteError(null);
  }, []);

  const handleInvite = React.useCallback(async () => {
    const normalizedEmail = inviteEmail.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setInviteError('Enter a valid email address.');
      return;
    }

    setInviteError(null);
    setInviteSuccessMessage(null);

    try {
      const response = await createStartupInvitationMutation.mutateAsync({
        email: normalizedEmail,
      });

      setInviteComposerVisible(false);
      setInviteEmail('');
      setInviteSuccessMessage(response.message);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Unable to send invitation.');
    }
  }, [createStartupInvitationMutation, inviteEmail]);

  if (teamOverviewQuery.isPending && !overview) {
    return (
      <>
        <Stack.Screen options={{ title: 'Team' }} />
        <ScrollView
          className="flex-1 bg-canvas"
          contentContainerStyle={{
            paddingBottom: insets.bottom + 96,
            paddingHorizontal: 20,
            paddingTop: insets.top + 16,
          }}
          contentInsetAdjustmentBehavior="automatic">

          <AppCard className="gap-3">
            <AppText variant="subtitle">Loading team</AppText>
            <AppText tone="muted">
              Pulling the latest startup details and team structure.
            </AppText>
          </AppCard>
        </ScrollView>
      </>
    );
  }

  if (teamOverviewQuery.isError && !overview) {
    const isNoStartupState = isNoActiveStartupError(teamOverviewQuery.error);

    return (
      <>
        <Stack.Screen options={{ title: 'Team' }} />
        <ScrollView
          className="flex-1 bg-canvas"
          contentContainerStyle={{
            paddingBottom: insets.bottom + 96,
            paddingHorizontal: 20,
            paddingTop: insets.top + 16,
          }}
          contentInsetAdjustmentBehavior="automatic">
          <AppCard className="gap-4">
            <View className="flex-row items-center gap-3">
              <Ionicons
                color={isNoStartupState ? '#98A2B3' : '#FF9A3E'}
                name={isNoStartupState ? 'people-outline' : 'alert-circle-outline'}
                size={24}
              />
              <AppText variant="subtitle">
                {isNoStartupState ? 'No startup team yet' : 'Unable to load team'}
              </AppText>
            </View>
            <AppText tone="muted">
              {isNoStartupState
                ? 'This account is not linked to an active startup yet. Once you create or join a startup team, it will show up here.'
                : 'We could not load your startup team right now. Try again in a moment.'}
            </AppText>
            <AppButton
              label={teamOverviewQuery.isRefetching ? 'Refreshing...' : 'Try Again'}
              onPress={() => {
                void teamOverviewQuery.refetch();
              }}
              variant="secondary"
            />
          </AppCard>
        </ScrollView>
      </>
    );
  }

  if (!overview) {
    return null;
  }

  const startup = overview.data.startup;

  return (
    <>
      <Stack.Screen options={{ title: '', headerShown: false }} />
      <View
        className="flex-1 bg-[#11131A]"
        style={{ paddingTop: insets.top }}>

        <View className="flex-row items-center gap-3 px-5 pb-6">
          <Ionicons color="#FF9A3E" name="rocket" size={28} />
          <AppText className="text-2xl font-bold text-text">Startup Team Builder</AppText>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            gap: 24,
            paddingBottom: insets.bottom + 128,
            paddingHorizontal: 20,
          }}
          showsVerticalScrollIndicator={false}>


          <AppCard className="gap-6 bg-[#1A1A1F] border-border/50">
            <View className="gap-4">
              <View className="gap-1 border-b border-border/30 pb-4">
                <AppText tone="muted" variant="label">Startup Name</AppText>
                <AppText className="font-display text-xl font-bold text-text py-1">
                  {startup.name}
                </AppText>
              </View>

              <View className="gap-1 border-b border-border/30 pb-4">
                <AppText tone="muted" variant="label">Startup Idea</AppText>
                <AppText className="font-body text-[15px] leading-6 text-text-muted py-1">
                  {startup.description || 'No startup description yet.'}
                </AppText>
              </View>
            </View>

            <View className="flex-row gap-8">
              <View className="flex-1 gap-2">
                <AppText tone="muted" variant="label">Industry</AppText>
                <View className="flex-row flex-wrap gap-2">
                  <InfoPill label={startup.industry.label} />
                </View>
              </View>

              <View className="flex-1 gap-2">
                <AppText tone="muted" variant="label">Stage</AppText>
                <View className="flex-row flex-wrap gap-2">
                  <InfoPill label={startup.stage.label} />
                </View>
              </View>
            </View>
          </AppCard>

          <AppCard className="gap-4 bg-[#1A1A1F] border-border/50">
            <View className="flex-row items-center justify-between">
              <AppText className="text-[15px] font-semibold text-text">Team Completeness</AppText>
              <AppText tone="accent" className="text-[17px] font-bold">
                {overview.data.teamCompleteness.percent}%
              </AppText>
            </View>

            <View className="h-2.5 overflow-hidden rounded-full bg-[#11131A] border border-border/20">
              <View
                className="h-full rounded-full bg-[#FF9A3E]"
                style={{ width: `${overview.data.teamCompleteness.percent}%` }}
              />
            </View>
          </AppCard>

          <View className="gap-4">
            <AppText className="px-1" tone="muted" variant="label">Team Members</AppText>
            <View className="gap-3">
              {overview.data.members.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
              {overview.data.missingRoles.map((role) => (
                <MissingRoleCard key={role.id} label={role.label} onFind={navigateToHome} />
              ))}
            </View>
          </View>

          {inviteSuccessMessage ? (
            <View className="rounded-[18px] border border-[#FF9A3E]/30 bg-[#FF9A3E]/10 px-4 py-3">
              <AppText tone="accent" variant="bodyStrong">{inviteSuccessMessage}</AppText>
            </View>
          ) : null}

          {inviteComposerVisible ? (
            <AppCard className="gap-4 bg-[#1A1A1F] border-border/50">
              <View className="gap-1">
                <AppText variant="subtitle">Invite by email</AppText>
                <AppText tone="muted">
                  Send a team invitation using the startup linked to your current account.
                </AppText>
              </View>

              <AppInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                label="Email"
                onChangeText={(value) => {
                  setInviteEmail(value);
                  if (inviteError) {
                    setInviteError(null);
                  }
                }}
                placeholder="person@example.com"
                value={inviteEmail}
              />

              {inviteError ? (
                <View className="rounded-[16px] border border-danger/30 bg-danger-tint px-4 py-3">
                  <AppText tone="danger">{inviteError}</AppText>
                </View>
              ) : null}

              <View className="flex-row gap-3">
                <AppButton
                  className="flex-1"
                  disabled={createStartupInvitationMutation.isPending}
                  label="Cancel"
                  onPress={closeInviteComposer}
                  variant="secondary"
                />
                <Pressable
                  className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-[16px] bg-[#FF9A3E] px-4 py-3"
                  disabled={createStartupInvitationMutation.isPending}
                  onPress={() => {
                    void handleInvite();
                  }}
                  style={{ opacity: createStartupInvitationMutation.isPending ? 0.7 : 1 }}>
                  {createStartupInvitationMutation.isPending ? (
                    <ActivityIndicator color="#11131A" size="small" />
                  ) : (
                    <Ionicons color="#11131A" name="mail-outline" size={18} />
                  )}
                  <AppText className="text-[#11131A]" variant="bodyStrong">
                    {createStartupInvitationMutation.isPending ? 'Sending...' : 'Send Invite'}
                  </AppText>
                </Pressable>
              </View>
            </AppCard>
          ) : null}

          <View className="flex-row gap-4 mt-2">
            <ActionButton
              icon="search-outline"
              label="Find Members"
              onPress={navigateToHome}
              variant="primary"
            />
            <ActionButton
              icon="mail-outline"
              label="Invite"
              onPress={openInviteComposer}
              variant="secondary"
            />
          </View>
        </ScrollView>
      </View>
    </>
  );
}
