import { useQuery } from '@tanstack/react-query';

import { fetchMatchAnalysis, fetchMatchesList } from '../services/matches-service';
import type {
  MatchAnalysisResponse,
  MatchesListQueryParams,
  MatchesListResponse,
} from '../types/matches.types';

export const matchesQueryKeys = {
  all: ['matches'] as const,
  list: (params: MatchesListQueryParams) => ['matches', 'list', params] as const,
  analysis: (matchId: string) => ['matches', 'analysis', matchId] as const,
};

export function useMatchesList(params: MatchesListQueryParams = {}) {
  return useQuery<MatchesListResponse>({
    queryKey: matchesQueryKeys.list(params),
    queryFn: () => fetchMatchesList(params),
  });
}

export function useMatchAnalysis(matchId: string, enabled = true) {
  return useQuery<MatchAnalysisResponse>({
    enabled: enabled && Boolean(matchId),
    queryKey: matchesQueryKeys.analysis(matchId),
    queryFn: () => fetchMatchAnalysis(matchId),
  });
}
