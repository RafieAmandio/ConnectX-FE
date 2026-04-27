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

import { AppButton, AppCard, AppInput, AppText, AppTopBar } from '@shared/components';
import { Shadows } from '@shared/theme';
import { isExpoDevModeEnabled } from '@shared/utils/env';

import {
  useCreateStartupInvitation,
  useRespondToStartupInvitation,
  useTeamOverview,
} from '../hooks/use-team';
import {
  getMockPersonTeamOverviewResponse,
  getMockTeamOverviewResponse,
} from '../mock/team.mock';
import { isNoActiveStartupError } from '../services/team-service';
import type { TeamApplication, TeamDashboardInvite, TeamMember } from '../types/team.types';

type DevTeamResponseMode = 'startup' | 'person';

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

function formatInvitationDate(value: string | null) {
  if (!value) {
    return 'No expiry';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getInvitationStatusLabel(status: string) {
  switch (status) {
    case 'accepted':
      return 'Accepted';
    case 'denied':
    case 'declined':
      return 'Denied';
    case 'expired':
      return 'Expired';
    case 'in_review':
      return 'In Review';
    case 'interview':
      return 'Interview';
    case 'applied':
      return 'Applied';
    case 'active':
      return 'Active';
    default:
      return 'Pending';
  }
}

function InfoPill({
  label,
}: {
  label: string;
}) {
  return (
    <View className="rounded-full border border-[#FF9A3E]/30 bg-[#FF9A3E]/10 px-4 py-2">
      <AppText className="text-[#FF9A3E]" variant="body">
        {label}
      </AppText>
    </View>
  );
}

function StatusPill({ label, status }: { label?: string; status: string }) {
  const palette =
    status === 'accepted' || status === 'active'
      ? {
        backgroundColor: 'rgba(52, 211, 153, 0.12)',
        borderColor: 'rgba(52, 211, 153, 0.28)',
        color: '#34D399',
      }
      : status === 'denied' || status === 'declined' || status === 'rejected'
        ? {
          backgroundColor: 'rgba(248, 113, 113, 0.12)',
          borderColor: 'rgba(248, 113, 113, 0.28)',
          color: '#F87171',
        }
        : status === 'in_review' || status === 'interview'
          ? {
            backgroundColor: 'rgba(0, 117, 255, 0.12)',
            borderColor: 'rgba(0, 117, 255, 0.28)',
            color: '#3394FF',
          }
          : {
            backgroundColor: '#FF9A3E1A',
            borderColor: '#FF9A3E4D',
            color: '#FF9A3E',
          };

  return (
    <View
      className="rounded-full border px-3 py-1"
      style={{
        backgroundColor: palette.backgroundColor,
        borderColor: palette.borderColor,
      }}>
      <AppText className="text-[11px]" style={{ color: palette.color }} variant="label">
        {label ?? getInvitationStatusLabel(status)}
      </AppText>
    </View>
  );
}

function MemberCard({
  member,
  onEditRole,
  onRemove,
}: {
  member: TeamMember;
  onEditRole: () => void;
  onRemove: () => void;
}) {
  const memberActions = member.availableActions ?? [];

  return (
    <View
      className="gap-4 rounded-[20px] border border-white/10 bg-[#2C2C2C] px-4 py-4"
      style={Shadows.card}>
      <View className="flex-row items-center gap-4">
        <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-[16px] bg-[#3A3A3C]">
          {member.avatarUrl ? (
            <Image contentFit="cover" source={{ uri: member.avatarUrl }} style={{ height: '100%', width: '100%' }} />
          ) : (
            <View className="h-12 w-12 items-center justify-center rounded-xl bg-[#FF9A3E]/10">
              <Ionicons color="#FF9A3E" name="person" size={24} />
            </View>
          )}
        </View>

        <View className="flex-1 gap-2">
          <View className="flex-row flex-wrap items-center gap-2">
            <AppText variant="subtitle">{member.name}</AppText>
            {member.isCurrentUser ? (
              <View className="rounded-full bg-[#FF9A3E]/15 px-2 py-0.5 border border-[#FF9A3E]/30">
                <AppText className="text-[11px] text-[#FF9A3E]" variant="label">You</AppText>
              </View>
            ) : null}
          </View>
          <View className="flex-row flex-wrap gap-2">
            <InfoPill label={member.role.label} />
            <StatusPill label={member.statusLabel} status={member.status} />
          </View>
          <View className="flex-row flex-wrap gap-x-4 gap-y-1">
            <AppText className="text-[13px] text-[#FF9A3E]" variant="bodyStrong">
              Equity: {member.equityPercent}%
            </AppText>
            <AppText className="text-[13px]" tone="muted">
              {getCommitmentLabel(member.commitment)}
            </AppText>
          </View>
        </View>
      </View>

      {memberActions.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {memberActions.includes('edit_role') ? (
            <Pressable className="rounded-lg border border-white/10 bg-[#3A3A3C] px-3 py-2" onPress={onEditRole}>
              <AppText className="text-[13px]" variant="bodyStrong">Edit role</AppText>
            </Pressable>
          ) : null}
          {memberActions.includes('remove') ? (
            <Pressable className="rounded-lg border border-danger/30 bg-danger-tint px-3 py-2" onPress={onRemove}>
              <AppText className="text-[13px]" tone="danger" variant="bodyStrong">Remove</AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function ApplicationCard({ application }: { application: TeamApplication }) {
  return (
    <AppCard className="gap-3 bg-[#2C2C2C] border-white/10">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <AppText variant="subtitle">{application.startupName}</AppText>
          <AppText className="text-[13px]" tone="muted">
            {application.role.label} • Applied {formatInvitationDate(application.appliedAt)}
          </AppText>
        </View>
        <StatusPill label={application.statusLabel} status={application.status} />
      </View>
    </AppCard>
  );
}

function DashboardInviteCard({
  invitation,
  isAcceptPending,
  isDeclinePending,
  onAccept,
  onDecline,
  onRevoke,
}: {
  invitation: TeamDashboardInvite;
  isAcceptPending: boolean;
  isDeclinePending: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onRevoke: () => void;
}) {
  const isPending = invitation.status === 'pending';
  const canAccept = invitation.availableActions.includes('accept');
  const canDecline = invitation.availableActions.includes('decline');
  const canRevoke = invitation.availableActions.includes('revoke');

  return (
    <AppCard className="gap-4 bg-[#2C2C2C] border-white/10">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <AppText variant="subtitle">{invitation.startupName}</AppText>
          <AppText className="text-[13px]" tone="muted">
            {invitation.direction === 'received' ? 'Received' : 'Sent'} • {invitation.role.label}
          </AppText>
        </View>
        <StatusPill label={invitation.statusLabel} status={invitation.status} />
      </View>

      <View className="gap-2 rounded-[16px] border border-white/10 bg-[#343434] px-4 py-3">
        <View className="flex-row items-center gap-2">
          <Ionicons color="#98A2B3" name="mail-outline" size={16} />
          <AppText className="flex-1 text-[13px]" tone="muted">
            {invitation.email}
          </AppText>
        </View>
        <View className="flex-row items-center gap-2">
          <Ionicons color="#98A2B3" name="calendar-outline" size={16} />
          <AppText className="flex-1 text-[13px]" tone="muted">
            Sent {formatInvitationDate(invitation.sentAt)}
          </AppText>
        </View>
      </View>

      {isPending && (canAccept || canDecline || canRevoke) ? (
        <View className="flex-row flex-wrap gap-3">
          {canDecline ? (
            <Pressable
              className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-[16px] border border-white/10 bg-[#3A3A3C] px-4 py-3"
              disabled={isAcceptPending || isDeclinePending}
              onPress={onDecline}
              style={{ opacity: isAcceptPending || isDeclinePending ? 0.65 : 1 }}>
              {isDeclinePending ? (
                <ActivityIndicator color="#F5F7FA" size="small" />
              ) : (
                <Ionicons color="#F5F7FA" name="close-outline" size={18} />
              )}
              <AppText className="text-[#F5F7FA]" variant="bodyStrong">
                {isDeclinePending ? 'Declining...' : 'Decline'}
              </AppText>
            </Pressable>
          ) : null}
          {canAccept ? (
            <Pressable
              className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-[16px] bg-[#FF9A3E] px-4 py-3"
              disabled={isAcceptPending || isDeclinePending}
              onPress={onAccept}
              style={{ opacity: isAcceptPending || isDeclinePending ? 0.65 : 1 }}>
              {isAcceptPending ? (
                <ActivityIndicator color="#11131A" size="small" />
              ) : (
                <Ionicons color="#11131A" name="checkmark-outline" size={18} />
              )}
              <AppText className="text-[#11131A]" variant="bodyStrong">
                {isAcceptPending ? 'Accepting...' : 'Accept'}
              </AppText>
            </Pressable>
          ) : null}
          {canRevoke ? (
            <Pressable
              className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-[16px] border border-danger/30 bg-danger-tint px-4 py-3"
              onPress={onRevoke}>
              <Ionicons color="#FF5A67" name="trash-outline" size={18} />
              <AppText tone="danger" variant="bodyStrong">Revoke</AppText>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <AppText className="text-[13px]" tone="muted">
          This invitation is no longer actionable.
        </AppText>
      )}
    </AppCard>
  );
}

function DashboardStatCard({ label, value }: { label: string; value: number }) {
  return (
    <View className="min-h-[86px] flex-1 justify-center rounded-[18px] border border-white/10 bg-[#2C2C2C] px-4 py-3">
      <AppText className="text-2xl font-bold text-[#FF9A3E]">{value}</AppText>
      <AppText className="text-[12px]" tone="muted" variant="label">{label}</AppText>
    </View>
  );
}

function EmptySectionCard({ icon, message, title }: {
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  title: string;
}) {
  return (
    <AppCard className="gap-3 bg-[#2C2C2C] border-white/10">
      <View className="flex-row items-center gap-3">
        <Ionicons color="#98A2B3" name={icon} size={22} />
        <AppText variant="subtitle">{title}</AppText>
      </View>
      <AppText tone="muted">{message}</AppText>
    </AppCard>
  );
}

function MissingRoleCard({ label, onFind }: { label: string; onFind: () => void }) {
  return (
    <View
      className="flex-row items-center gap-4 rounded-[20px] border border-white/10 bg-[#2C2C2C] px-4 py-4"
      style={Shadows.card}>
      <View className="h-16 w-16 items-center justify-center rounded-[16px] bg-[#3A3A3C]">
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
        <AppText className="text-[13px] text-[#FF9A3E]" variant="bodyStrong">Find</AppText>
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
        : 'min-h-[56px] flex-1 flex-row items-center justify-center gap-3 rounded-[18px] border border-white/10 bg-[#2C2C2C] px-5 py-4'}
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

function DevResponseToggle({
  mode,
  onChange,
}: {
  mode: DevTeamResponseMode;
  onChange: (mode: DevTeamResponseMode) => void;
}) {
  return (
    <View className="mx-5 mb-4 flex-row rounded-[18px] border border-[#FF9A3E]/25 bg-[#2C2C2C] p-1">
      {(['startup', 'person'] as const).map((item) => {
        const isSelected = mode === item;

        return (
          <Pressable
            key={item}
            className={isSelected
              ? 'min-h-11 flex-1 items-center justify-center rounded-[14px] bg-[#FF9A3E] px-3'
              : 'min-h-11 flex-1 items-center justify-center rounded-[14px] px-3'}
            onPress={() => {
              onChange(item);
            }}>
            <AppText
              className={isSelected ? 'text-[#11131A]' : 'text-[#F5F7FA]'}
              variant="bodyStrong">
              {item === 'startup' ? 'Founder response' : 'User response'}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TeamScreen() {
  const router = useRouter();
  const isDevMode = isExpoDevModeEnabled();
  const [devResponseMode, setDevResponseMode] = React.useState<DevTeamResponseMode>('startup');
  const teamOverviewQuery = useTeamOverview();
  const isNoStartupState = teamOverviewQuery.isError && isNoActiveStartupError(teamOverviewQuery.error);
  const respondToStartupInvitationMutation = useRespondToStartupInvitation();
  const createStartupInvitationMutation = useCreateStartupInvitation();
  const [inviteComposerVisible, setInviteComposerVisible] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteError, setInviteError] = React.useState<string | null>(null);
  const [inviteSuccessMessage, setInviteSuccessMessage] = React.useState<string | null>(null);
  const [invitationFeedbackMessage, setInvitationFeedbackMessage] = React.useState<string | null>(null);
  const [invitationActionError, setInvitationActionError] = React.useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const devOverview = React.useMemo(
    () =>
      devResponseMode === 'startup'
        ? getMockTeamOverviewResponse()
        : getMockPersonTeamOverviewResponse(),
    [devResponseMode]
  );
  const overview = isDevMode ? devOverview : teamOverviewQuery.data;

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

  const handleInvitationDecision = React.useCallback(
    async (invitationId: string, decision: 'accept' | 'decline') => {
      setInvitationActionError(null);
      setInvitationFeedbackMessage(null);

      try {
        const response = await respondToStartupInvitationMutation.mutateAsync({
          invitationId,
          payload: {
            decision: decision === 'decline' ? 'deny' : 'accept',
          },
        });

        setInvitationFeedbackMessage(response.message);

        if (decision === 'accept') {
          await teamOverviewQuery.refetch();
        }
      } catch (error) {
        setInvitationActionError(
          error instanceof Error ? error.message : 'Unable to respond to this invitation right now.'
        );
      }
    },
    [respondToStartupInvitationMutation, teamOverviewQuery]
  );

  const handleInviteRevoke = React.useCallback((invitation: TeamDashboardInvite) => {
    setInvitationActionError(null);
    setInvitationFeedbackMessage(`Revoke requested for ${invitation.email}.`);
  }, []);

  const handleMemberAction = React.useCallback((member: TeamMember, action: 'edit_role' | 'remove') => {
    setInvitationActionError(null);
    setInvitationFeedbackMessage(
      action === 'edit_role'
        ? `Edit role requested for ${member.name}.`
        : `Remove requested for ${member.name}.`
    );
  }, []);

  if (!isDevMode && teamOverviewQuery.isPending && !overview) {
    return (
      <>
        <Stack.Screen options={{ title: '', headerShown: false }} />
        <View className="flex-1" style={{ backgroundColor: '#262626' }}>
          <AppTopBar />
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingBottom: insets.bottom + 96,
              paddingHorizontal: 20,
              paddingTop: 16,
            }}
            contentInsetAdjustmentBehavior="automatic">

            <AppCard className="gap-3">
              <AppText variant="subtitle">Loading team</AppText>
              <AppText tone="muted">
                Pulling the latest startup details and team structure.
              </AppText>
            </AppCard>
          </ScrollView>
        </View>
      </>
    );
  }

  if (!isDevMode && teamOverviewQuery.isError && !overview) {
    return (
      <>
        <Stack.Screen options={{ title: 'Team', headerShown: false }} />
        <View className="flex-1" style={{ backgroundColor: '#262626' }}>
          <AppTopBar />
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingBottom: insets.bottom + 96,
              paddingHorizontal: 20,
              paddingTop: 16,
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
        </View>
      </>
    );
  }

  if (!overview) {
    return null;
  }

  const startup = overview.data.startup;
  const viewerContext = overview.data.viewerContext;
  const teamRoster = overview.data.teamRoster;
  const myApplications = overview.data.myApplications;
  const teamInvites = overview.data.teamInvites;
  const hasActiveStartup = viewerContext.hasActiveStartup && Boolean(startup);
  const screenTitle = hasActiveStartup ? 'Startup Team Builder' : 'Team Dashboard';

  return (
    <>
      <Stack.Screen options={{ title: '', headerShown: false }} />
      <View
        className="flex-1"
        style={{ backgroundColor: '#262626' }}>
        <AppTopBar />

        <View className="flex-row items-center gap-3 px-5 pb-6 pt-2">
          <Ionicons color="#FF9A3E" name={hasActiveStartup ? 'rocket' : 'briefcase'} size={28} />
          <AppText className="text-2xl font-bold text-text">{screenTitle}</AppText>
        </View>

        {isDevMode ? (
          <DevResponseToggle mode={devResponseMode} onChange={setDevResponseMode} />
        ) : null}

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            gap: 24,
            paddingBottom: insets.bottom + 128,
            paddingHorizontal: 20,
          }}
          showsVerticalScrollIndicator={false}>

          {startup ? (
            <AppCard className="gap-6 bg-[#2C2C2C] border-white/10">
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
          ) : null}

          {hasActiveStartup ? (
            <AppCard className="gap-4 bg-[#2C2C2C] border-white/10">
              <View className="flex-row items-center justify-between">
                <AppText className="text-[15px] font-semibold text-text">Team Completeness</AppText>
                <AppText className="text-[17px] font-bold text-[#FF9A3E]">
                  {overview.data.teamCompleteness.percent}%
                </AppText>
              </View>

              <View className="h-2.5 overflow-hidden rounded-full bg-[#3A3A3C] border border-white/10">
                <View
                  className="h-full rounded-full bg-[#FF9A3E]"
                  style={{ width: `${overview.data.teamCompleteness.percent}%` }}
                />
              </View>
            </AppCard>
          ) : null}

          <View className="gap-4">
            <View className="flex-row items-center justify-between px-1">
              <AppText tone="muted" variant="label">{teamRoster.title}</AppText>
              <StatusPill
                label={hasActiveStartup ? viewerContext.kind.replace(/_/g, ' ') : 'Person'}
                status={hasActiveStartup ? 'active' : 'pending'}
              />
            </View>
            <View className="gap-3">
              {teamRoster.members.length === 0 ? (
                <EmptySectionCard
                  icon="people-outline"
                  message={
                    hasActiveStartup
                      ? 'No active team members are listed yet.'
                      : 'You are not attached to an active startup team yet.'
                  }
                  title="No team members"
                />
              ) : null}
              {teamRoster.members.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  onEditRole={() => {
                    handleMemberAction(member, 'edit_role');
                  }}
                  onRemove={() => {
                    handleMemberAction(member, 'remove');
                  }}
                />
              ))}
              {overview.data.missingRoles.map((role) => (
                <MissingRoleCard key={role.id} label={role.label} onFind={navigateToHome} />
              ))}
            </View>
          </View>

          {!hasActiveStartup ? (
            <View className="gap-4">
              <AppText className="px-1" tone="muted" variant="label">{myApplications.title}</AppText>
              <View className="flex-row gap-3">
                <DashboardStatCard label="Applied" value={myApplications.stats.applied} />
                <DashboardStatCard label="In Review" value={myApplications.stats.inReview} />
                <DashboardStatCard label="Interviews" value={myApplications.stats.interviews} />
              </View>
              <View className="gap-3">
                {myApplications.items.length === 0 ? (
                  <EmptySectionCard
                    icon="document-text-outline"
                    message="Applications you send to startups will show up here."
                    title="No applications yet"
                  />
                ) : null}
                {myApplications.items.map((application) => (
                  <ApplicationCard key={application.id} application={application} />
                ))}
              </View>
              <View className="flex-row gap-4">
                {myApplications.actions.browseStartups ? (
                  <ActionButton
                    icon="search-outline"
                    label="Browse Startups"
                    onPress={navigateToHome}
                    variant="primary"
                  />
                ) : null}
                {myApplications.actions.discoverMoreStartups ? (
                  <ActionButton
                    icon="compass-outline"
                    label="Discover More"
                    onPress={navigateToHome}
                    variant="secondary"
                  />
                ) : null}
              </View>
            </View>
          ) : null}

          <View className="gap-4">
            <AppText className="px-1" tone="muted" variant="label">{teamInvites.title}</AppText>

            {invitationFeedbackMessage ? (
              <View className="rounded-[18px] border border-[#FF9A3E]/30 bg-[#FF9A3E]/10 px-4 py-3">
                <AppText className="text-[#FF9A3E]" variant="bodyStrong">
                  {invitationFeedbackMessage}
                </AppText>
              </View>
            ) : null}

            {invitationActionError ? (
              <View className="rounded-[16px] border border-danger/30 bg-danger-tint px-4 py-3">
                <AppText tone="danger">{invitationActionError}</AppText>
              </View>
            ) : null}

            <View className="gap-3">
              {teamInvites.items.length === 0 ? (
                <EmptySectionCard
                  icon="mail-open-outline"
                  message="Pending sent and received invitations will appear here."
                  title="No pending invites"
                />
              ) : null}
              {teamInvites.items.map((invitation) => {
                const activeVariables = respondToStartupInvitationMutation.variables;
                const isCurrentInvitation =
                  respondToStartupInvitationMutation.isPending &&
                  activeVariables?.invitationId === invitation.id;

                return (
                  <DashboardInviteCard
                    key={invitation.id}
                    invitation={invitation}
                    isAcceptPending={
                      isCurrentInvitation && activeVariables?.payload.decision === 'accept'
                    }
                    isDeclinePending={
                      isCurrentInvitation && activeVariables?.payload.decision === 'deny'
                    }
                    onAccept={() => {
                      void handleInvitationDecision(invitation.id, 'accept');
                    }}
                    onDecline={() => {
                      void handleInvitationDecision(invitation.id, 'decline');
                    }}
                    onRevoke={() => {
                      handleInviteRevoke(invitation);
                    }}
                  />
                );
              })}
            </View>
          </View>

          {inviteSuccessMessage ? (
            <View className="rounded-[18px] border border-[#FF9A3E]/30 bg-[#FF9A3E]/10 px-4 py-3">
              <AppText className="text-[#FF9A3E]" variant="bodyStrong">{inviteSuccessMessage}</AppText>
            </View>
          ) : null}

          {inviteComposerVisible ? (
            <AppCard className="gap-4 bg-[#2C2C2C] border-white/10">
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
                className="bg-[#3A3A3C] border-none"
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
                  className="flex-1 bg-[#3A3A3C] border-white/10"
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

          {hasActiveStartup ? (
            <View className="flex-row gap-4 mt-2">
              {teamRoster.actions.addFromMatches ? (
                <ActionButton
                  icon="search-outline"
                  label="Add from Matches"
                  onPress={navigateToHome}
                  variant="primary"
                />
              ) : null}
              {teamRoster.actions.inviteViaLink ? (
                <ActionButton
                  icon="link-outline"
                  label="Invite via Link"
                  onPress={openInviteComposer}
                  variant="secondary"
                />
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </>
  );
}
