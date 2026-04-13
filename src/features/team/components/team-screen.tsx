import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


import { industryOptions, startupStageOptions } from '@features/onboarding/mock/catalogs';
import { AppCard, AppText } from '@shared/components';
import { Shadows } from '@shared/theme';

import { useCurrentStartupId, useTeamOverview, useUpdateStartup } from '../hooks/use-team';
import type { TeamMember, UpdateStartupRequest } from '../types/team.types';

type StartupDraft = {
  name: string;
  description: string;
  industryId: string;
  stageId: string;
};

const industryChoices = industryOptions.map((option) => ({
  id: option.value,
  label: option.label.en,
}));

const stageChoices = startupStageOptions.map((option) => ({
  id: option.value,
  label: option.label.en,
}));

function getInitials(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

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

function toDraft(startup: {
  name: string;
  description: string;
  industry: { id: string };
  stage: { id: string };
}): StartupDraft {
  return {
    name: startup.name,
    description: startup.description,
    industryId: startup.industry.id,
    stageId: startup.stage.id,
  };
}

function diffStartupDraft(current: StartupDraft, saved: StartupDraft): UpdateStartupRequest {
  const patch: UpdateStartupRequest = {};

  if (current.name.trim() !== saved.name.trim()) {
    patch.name = current.name.trim();
  }

  if (current.description.trim() !== saved.description.trim()) {
    patch.description = current.description.trim();
  }

  if (current.industryId !== saved.industryId) {
    patch.industryId = current.industryId;
  }

  if (current.stageId !== saved.stageId) {
    patch.stageId = current.stageId;
  }

  return patch;
}

function hasPatch(payload: UpdateStartupRequest) {
  return Object.keys(payload).length > 0;
}

function SelectablePill({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={active
        ? 'rounded-full border border-[#FF9A3E]/30 bg-[#FF9A3E]/10 px-4 py-2'
        : 'rounded-full border border-border bg-[#1A1A1F] px-4 py-2'}
      onPress={onPress}>
      <AppText tone={active ? 'accent' : 'muted'} variant="body">
        {label}
      </AppText>
    </Pressable>
  );
}

function StagePill({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={active
        ? 'h-[52px] w-[52px] items-center justify-center rounded-full border border-[#FF9A3E] bg-[#FF9A3E]/20'
        : 'h-[52px] w-[52px] items-center justify-center rounded-full border border-border bg-[#1A1A1F]'}
      onPress={onPress}>
      <AppText
        align="center"
        className="text-[10px] leading-3"
        tone={active ? 'accent' : 'muted'}
        variant="label">
        {label}
      </AppText>
    </Pressable>
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
  const startupId = useCurrentStartupId();
  const teamOverviewQuery = useTeamOverview(startupId);
  const updateStartupMutation = useUpdateStartup(startupId);
  const [draft, setDraft] = React.useState<StartupDraft | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const initializedStartupIdRef = React.useRef<string | null>(null);
  const savedDraftRef = React.useRef<StartupDraft | null>(null);
  const draftRef = React.useRef<StartupDraft | null>(null);
  const autosaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRequestIdRef = React.useRef(0);
  const insets = useSafeAreaInsets();

  const overview = teamOverviewQuery.data;


  React.useEffect(() => {
    if (!overview) {
      return;
    }

    if (initializedStartupIdRef.current === startupId && draftRef.current) {
      return;
    }

    const nextDraft = toDraft(overview.data.startup);
    initializedStartupIdRef.current = startupId;
    savedDraftRef.current = nextDraft;
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    setSaveError(null);
  }, [overview, startupId]);

  React.useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  const applyDraft = React.useCallback((updater: (current: StartupDraft) => StartupDraft) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const nextDraft = updater(current);
      draftRef.current = nextDraft;
      return nextDraft;
    });
  }, []);

  const savePatch = React.useCallback(
    async (payload: UpdateStartupRequest) => {
      if (!hasPatch(payload)) {
        return;
      }

      const requestId = latestRequestIdRef.current + 1;
      latestRequestIdRef.current = requestId;
      setIsSaving(true);
      setSaveError(null);

      try {
        const result = await updateStartupMutation.mutateAsync({
          payload,
          requestId,
        });

        if (requestId !== latestRequestIdRef.current) {
          return;
        }

        const savedDraft = toDraft(result.response.data);
        const savedKeys = Object.keys(payload) as (keyof UpdateStartupRequest)[];

        savedDraftRef.current = savedDraft;
        setDraft((current) => {
          if (!current) {
            draftRef.current = savedDraft;
            return savedDraft;
          }

          const nextDraft = { ...current };

          for (const key of savedKeys) {
            if (key === 'name') {
              nextDraft.name = savedDraft.name;
            }

            if (key === 'description') {
              nextDraft.description = savedDraft.description;
            }

            if (key === 'industryId') {
              nextDraft.industryId = savedDraft.industryId;
            }

            if (key === 'stageId') {
              nextDraft.stageId = savedDraft.stageId;
            }
          }

          draftRef.current = nextDraft;
          return nextDraft;
        });
      } catch (error) {
        if (requestId !== latestRequestIdRef.current) {
          return;
        }

        setSaveError(error instanceof Error ? error.message : 'Unable to save startup changes.');
      } finally {
        if (requestId === latestRequestIdRef.current) {
          setIsSaving(false);
        }
      }
    },
    [updateStartupMutation]
  );

  const flushAutosave = React.useCallback(async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    if (!draftRef.current || !savedDraftRef.current) {
      return;
    }

    const payload = diffStartupDraft(draftRef.current, savedDraftRef.current);
    await savePatch(payload);
  }, [savePatch]);

  const scheduleAutosave = React.useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      void flushAutosave();
    }, 800);
  }, [flushAutosave]);

  const navigateToHome = React.useCallback(() => {
    router.navigate('/(tabs)' as never);
  }, [router]);

  if (!draft || !overview) {
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
                <TextInput
                  onBlur={() => {
                    void flushAutosave();
                  }}
                  onChangeText={(value) => {
                    applyDraft((current) => ({
                      ...current,
                      name: value,
                    }));
                    scheduleAutosave();
                  }}
                  className="font-display text-xl font-bold text-text py-1"
                  value={draft.name}
                  placeholder="My Startup"
                  placeholderTextColor="#667085"
                />
              </View>

              <View className="gap-1 border-b border-border/30 pb-4">
                <AppText tone="muted" variant="label">Description</AppText>
                <TextInput
                  multiline
                  onBlur={() => {
                    void flushAutosave();
                  }}
                  onChangeText={(value) => {
                    applyDraft((current) => ({
                      ...current,
                      description: value,
                    }));
                    scheduleAutosave();
                  }}
                  className="font-body text-[15px] leading-6 text-text-muted py-1"
                  value={draft.description}
                  placeholder="Al-powered supply chain platform..."
                  placeholderTextColor="#667085"
                />
              </View>
            </View>

            <View className="flex-row gap-8">
              <View className="flex-1 gap-2">
                <AppText tone="muted" variant="label">Industry</AppText>
                <View className="flex-row flex-wrap gap-2">
                  {industryChoices.map((option) => (
                    draft.industryId === option.id && (
                      <AppText key={option.id} className="text-[17px] font-semibold text-text">
                        {option.label}
                      </AppText>
                    )
                  ))}
                  {/* Keep selection logic available via a simple pill if needed, or just text */}
                  <Pressable
                    onPress={() => {
                      // Logic to open industry picker could go here
                    }}
                    className="hidden">
                    <AppText tone="accent">Change</AppText>
                  </Pressable>
                </View>
              </View>

              <View className="flex-1 gap-3">
                <AppText tone="muted" variant="label">Stage</AppText>
                <View className="flex-row gap-2">
                  {stageChoices.slice(0, 4).map((option) => (
                    <StagePill
                      key={option.id}
                      active={draft.stageId === option.id}
                      label={option.label}
                      onPress={() => {
                        applyDraft((current) => ({
                          ...current,
                          stageId: option.id,
                        }));
                        const nextDraft = draftRef.current;
                        const savedDraft = savedDraftRef.current;
                        if (!nextDraft || !savedDraft) return;
                        void savePatch(diffStartupDraft(nextDraft, savedDraft));
                      }}
                    />
                  ))}
                </View>
              </View>
            </View>

            {saveError && (
              <View className="flex-row items-center justify-between gap-3 rounded-[16px] border border-danger/30 bg-danger-tint px-4 py-3">
                <AppText className="flex-1" tone="danger">{saveError}</AppText>
                <Pressable onPress={() => void flushAutosave()}>
                  <AppText tone="accent" variant="bodyStrong">Retry</AppText>
                </Pressable>
              </View>
            )}
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
              onPress={() => Alert.alert('Invite', 'Coming soon.')}
              variant="secondary"
            />
          </View>
        </ScrollView>
      </View>
    </>
  );
}
