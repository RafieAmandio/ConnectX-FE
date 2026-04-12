import { apiFetch } from '@shared/services/api';

import type {
  MatchAnalysisResponse,
  MatchesListQueryParams,
  MatchesListResponse,
} from '../types/matches.types';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

export const MATCHES_API = {
  LIST: '/api/v1/matches',
  ANALYSIS: (matchId: string) => `/api/v1/matches/${matchId}/analysis`,
} as const;

function normalizeLimit(limit?: number) {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_LIMIT;
  }

  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limit)));
}

function buildMatchesListPath({ limit, page, status = 'active' }: MatchesListQueryParams = {}) {
  const params = new URLSearchParams();

  params.set('limit', String(normalizeLimit(limit)));
  params.set('page', String(page && page > 0 ? page : 1));
  params.set('status', status);

  return `${MATCHES_API.LIST}?${params.toString()}`;
}

export async function fetchMatchesList(params: MatchesListQueryParams = {}) {
  return apiFetch<MatchesListResponse>(buildMatchesListPath(params));
}

export async function fetchMatchAnalysis(matchId: string) {
  return apiFetch<MatchAnalysisResponse>(MATCHES_API.ANALYSIS(matchId));
}
