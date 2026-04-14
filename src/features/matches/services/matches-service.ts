import { ApiError, apiFetch } from '@shared/services/api';

import type {
  MatchAnalysisResponse,
  MatchesListQueryParams,
  MatchesListResponse,
  SpotlightActivationSuccessResponse,
} from '../types/matches.types';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

export const MATCHES_API = {
  LIST: '/api/v1/matches',
  ANALYSIS: (matchId: string) => `/api/v1/matches/${matchId}/analysis`,
  SPOTLIGHT_ACTIVATE: '/api/v1/discovery/spotlight/activate',
} as const;

type MockSpotlightActivationMode = 'success' | 'no_credit' | 'already_active';

function getMockSpotlightActivationMode(): MockSpotlightActivationMode | null {
  const normalized = process.env.EXPO_PUBLIC_MOCK_SPOTLIGHT_ACTIVATION_RESPONSE?.trim().toLowerCase();

  if (
    normalized === 'success' ||
    normalized === 'no_credit' ||
    normalized === 'already_active'
  ) {
    return normalized;
  }

  return null;
}

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

export async function activateSpotlight() {
  const mockMode = __DEV__ ? getMockSpotlightActivationMode() : null;

  if (mockMode) {
    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + 60 * 60 * 1000).toISOString();
    const startedAtIso = startedAt.toISOString();

    if (mockMode === 'success') {
      return {
        success: true,
        message: 'Spotlight activated.',
        data: {
          active: true,
          startedAt: startedAtIso,
          endsAt,
          remainingSpotlights: 2,
        },
      } satisfies SpotlightActivationSuccessResponse;
    }

    if (mockMode === 'already_active') {
      throw new ApiError('Spotlight is already active.', 409, {
        success: false,
        message: 'Spotlight is already active.',
        error: {
          code: 'DISCOVERY_SPOTLIGHT_ALREADY_ACTIVE',
          details: {
            remaining: 2,
            active: true,
            endsAt,
            nextEligibleAt: endsAt,
          },
        },
      });
    }

    throw new ApiError('No spotlights remaining.', 409, {
      success: false,
      message: 'No spotlights remaining.',
      error: {
        code: 'DISCOVERY_SPOTLIGHT_REQUIRES_CREDIT',
        details: {
          remaining: 0,
          active: false,
          endsAt: null,
          nextEligibleAt: null,
        },
      },
    });
  }

  return apiFetch<SpotlightActivationSuccessResponse>(MATCHES_API.SPOTLIGHT_ACTIVATE, {
    body: {} as unknown as BodyInit,
    method: 'POST',
  });
}
