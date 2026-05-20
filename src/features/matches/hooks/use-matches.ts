import { useMutation, useQuery } from '@tanstack/react-query';

import { useViewerContext } from '@features/home/hooks/use-viewer-context';
import type { ViewerContext } from '@features/home/services/discovery-viewer-context';

import {
  activateSpotlight,
  fetchMatchAnalysis,
  fetchMatchesList,
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
  analysis: (matchId: string, viewerContext: ViewerContext) =>
    ['matches', 'analysis', matchId, viewerContext] as const,
};

export function useMatchesList(params: MatchesListQueryParams = {}) {
  const viewerContext = useViewerContext();
  const queryParams = {
    ...params,
    viewerContext,
  };

  return useQuery<MatchesListResponse>({
    queryKey: matchesQueryKeys.list(queryParams),
    queryFn: () => fetchMatchesList(queryParams),
    staleTime: 0,
  });
}

export function useMatchAnalysis(matchId: string, enabled = true) {
  const viewerContext = useViewerContext();

  return useQuery<MatchAnalysisResponse>({
    enabled: enabled && Boolean(matchId),
    queryKey: matchesQueryKeys.analysis(matchId, viewerContext),
    queryFn: () => fetchMatchAnalysis(matchId, viewerContext),
  });
}

export function useActivateSpotlight() {
  return useMutation<SpotlightActivationSuccessResponse>({
    mutationFn: activateSpotlight,
  });
}
