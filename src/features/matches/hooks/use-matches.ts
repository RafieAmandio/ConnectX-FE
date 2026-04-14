import { useMutation, useQuery } from '@tanstack/react-query';

import { mockMatchesListResponse } from '../mock/matches.mock';
import {
  activateSpotlight,
  fetchMatchAnalysis,
  fetchMatchesList,
  isMatchesListMockEnabled,
} from '../services/matches-service';
import type {
  MatchAnalysisResponse,
  MatchesListQueryParams,
  MatchesListResponse,
  SpotlightActivationSuccessResponse,
} from '../types/matches.types';

export const matchesQueryKeys = {
  all: ['matches'] as const,
  list: (params: MatchesListQueryParams) => ['matches', 'list', params] as const,
  analysis: (matchId: string) => ['matches', 'analysis', matchId] as const,
};

export function useMatchesList(params: MatchesListQueryParams = {}) {
  const usingMockMatches = isMatchesListMockEnabled();

  return useQuery<MatchesListResponse>({
    enabled: !usingMockMatches,
    initialData: usingMockMatches
      ? {
        ...mockMatchesListResponse
      }
      : undefined,
    queryKey: matchesQueryKeys.list(params),
    queryFn: () => fetchMatchesList(params),
    staleTime: usingMockMatches ? Number.POSITIVE_INFINITY : 0,
  });
}

export function useMatchAnalysis(matchId: string, enabled = true) {
  return useQuery<MatchAnalysisResponse>({
    enabled: enabled && Boolean(matchId),
    queryKey: matchesQueryKeys.analysis(matchId),
    queryFn: () => fetchMatchAnalysis(matchId),
  });
}

export function useActivateSpotlight() {
  return useMutation<SpotlightActivationSuccessResponse>({
    mutationFn: activateSpotlight,
  });
}
