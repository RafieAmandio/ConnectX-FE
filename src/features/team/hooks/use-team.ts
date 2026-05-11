import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createStartupInvitation,
  fetchStartupInvitationOptions,
  fetchStartupInvitations,
  fetchTeamOverview,
  removeTeamMember,
  respondToStartupInvitation,
  revokeStartupInvitation,
  updateTeamMember,
} from '../services/team-service';
import type { RespondToStartupInvitationRequest, UpdateTeamMemberRequest } from '../types/team.types';

export const teamQueryKeys = {
  overview: ['team', 'overview'] as const,
  invitations: ['team', 'invitations'] as const,
  invitationOptions: ['team', 'invitation-options'] as const,
};

export function useTeamOverview() {
  return useQuery({
    queryKey: teamQueryKeys.overview,
    queryFn: fetchTeamOverview,
  });
}

export function useCreateStartupInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createStartupInvitation,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: teamQueryKeys.overview }),
        queryClient.invalidateQueries({ queryKey: teamQueryKeys.invitations }),
      ]);
    },
  });
}

export function useStartupInvitationOptions(enabled = true) {
  return useQuery({
    enabled,
    queryKey: teamQueryKeys.invitationOptions,
    queryFn: fetchStartupInvitationOptions,
  });
}

export function useStartupInvitations(enabled = true) {
  return useQuery({
    enabled,
    queryKey: teamQueryKeys.invitations,
    queryFn: fetchStartupInvitations,
  });
}

export function useRespondToStartupInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invitationId,
      payload,
    }: {
      invitationId: string;
      payload: RespondToStartupInvitationRequest;
    }) => respondToStartupInvitation(invitationId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: teamQueryKeys.overview }),
        queryClient.invalidateQueries({ queryKey: teamQueryKeys.invitations }),
      ]);
    },
  });
}

export function useRevokeStartupInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeStartupInvitation,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: teamQueryKeys.overview }),
        queryClient.invalidateQueries({ queryKey: teamQueryKeys.invitations }),
      ]);
    },
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      memberId,
      payload,
      startupId,
    }: {
      memberId: string;
      payload: UpdateTeamMemberRequest;
      startupId: string;
    }) => updateTeamMember(startupId, memberId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: teamQueryKeys.overview });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, startupId }: { memberId: string; startupId: string }) =>
      removeTeamMember(startupId, memberId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: teamQueryKeys.overview });
    },
  });
}
