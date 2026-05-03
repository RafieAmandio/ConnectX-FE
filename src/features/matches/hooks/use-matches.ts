import { useMutation, useQuery } from '@tanstack/react-query';

import { useAuth } from '@features/auth';
import { loadOnboardingDiscoveryPreference } from '@features/home/services/onboarding-discovery-preference';

import type { MockMatchesSeedVariant } from '../mock/matches.mock';
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
  list: (params: MatchesListQueryParams, seedVariant: MockMatchesSeedVariant) =>
    ['matches', 'list', params, seedVariant] as const,
  analysis: (matchId: string, seedVariant: MockMatchesSeedVariant) =>
    ['matches', 'analysis', matchId, seedVariant] as const,
};

function resolveMockMatchesSeedVariant(
  session: ReturnType<typeof useAuth>['session']
): MockMatchesSeedVariant {
  const localOnboardingMode = loadOnboardingDiscoveryPreference()?.mode ?? null;
  const apiDiscoveryMode =
    session?.authSessionSource === 'api' ? session.defaultDiscoveryMode ?? null : null;
  const defaultMode =
    apiDiscoveryMode ?? localOnboardingMode ?? session?.defaultDiscoveryMode ?? null;

  return defaultMode === 'joining_startups' ? 'startup' : 'individual';
}

export function useMatchesList(params: MatchesListQueryParams = {}) {
  const { session } = useAuth();
  const seedVariant = resolveMockMatchesSeedVariant(session);

  return useQuery<MatchesListResponse>({
    queryKey: matchesQueryKeys.list(params, seedVariant),
    queryFn: () => fetchMatchesList(params, seedVariant),
    staleTime: 0,
  });
}

export function useMatchAnalysis(matchId: string, enabled = true) {
  const { session } = useAuth();
  const seedVariant = resolveMockMatchesSeedVariant(session);

  return useQuery<MatchAnalysisResponse>({
    enabled: enabled && Boolean(matchId),
    queryKey: matchesQueryKeys.analysis(matchId, seedVariant),
    queryFn: () => fetchMatchAnalysis(matchId, seedVariant),
  });
}

export function useActivateSpotlight() {
  return useMutation<SpotlightActivationSuccessResponse>({
    mutationFn: activateSpotlight,
  });
}
