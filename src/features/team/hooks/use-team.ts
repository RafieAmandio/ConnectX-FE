import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createStartupInvitation,
  fetchStartupInvitations,
  fetchTeamOverview,
  respondToStartupInvitation,
} from '../services/team-service';
import type { RespondToStartupInvitationRequest } from '../types/team.types';

export const teamQueryKeys = {
  overview: ['team', 'overview'] as const,
  invitations: ['team', 'invitations'] as const,
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
