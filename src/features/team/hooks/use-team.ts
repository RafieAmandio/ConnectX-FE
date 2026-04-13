import { useMutation, useQuery } from '@tanstack/react-query';

import { createStartupInvitation, fetchTeamOverview } from '../services/team-service';

export const teamQueryKeys = {
  overview: ['team', 'overview'] as const,
};

export function useTeamOverview() {
  return useQuery({
    queryKey: teamQueryKeys.overview,
    queryFn: fetchTeamOverview,
  });
}

export function useCreateStartupInvitation() {
  return useMutation({
    mutationFn: createStartupInvitation,
  });
}
