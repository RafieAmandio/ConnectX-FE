import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useViewerContext } from '@features/home/hooks/use-viewer-context';
import type { ViewerContext } from '@features/home/services/discovery-viewer-context';

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
  overviewRoot: ['team', 'overview'] as const,
  overview: (viewerContext: ViewerContext) => ['team', 'overview', viewerContext] as const,
  invitationsRoot: ['team', 'invitations'] as const,
  invitations: ['team', 'invitations', 'talent'] as const,
  invitationOptions: ['team', 'invitation-options', 'startup'] as const,
};

export function useTeamOverview() {
  const viewerContext = useViewerContext();

  return useQuery({
    queryKey: teamQueryKeys.overview(viewerContext),
    queryFn: () => fetchTeamOverview(viewerContext),
  });
}

export function useCreateStartupInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createStartupInvitation,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: teamQueryKeys.overviewRoot }),
        queryClient.invalidateQueries({ queryKey: teamQueryKeys.invitationsRoot }),
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
        queryClient.invalidateQueries({ queryKey: teamQueryKeys.overviewRoot }),
        queryClient.invalidateQueries({ queryKey: teamQueryKeys.invitationsRoot }),
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
        queryClient.invalidateQueries({ queryKey: teamQueryKeys.overviewRoot }),
        queryClient.invalidateQueries({ queryKey: teamQueryKeys.invitationsRoot }),
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
      await queryClient.invalidateQueries({ queryKey: teamQueryKeys.overviewRoot });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, startupId }: { memberId: string; startupId: string }) =>
      removeTeamMember(startupId, memberId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: teamQueryKeys.overviewRoot });
    },
  });
}
