import { ApiError, apiFetch } from '@shared/services/api';
import { isExpoDevModeEnabled } from '@shared/utils/env';

import { mockMatchesListResponse } from '../mock/matches.mock';
import {
  loadGeneratedMockMatchAnalysis,
  loadGeneratedMockMatches,
} from './generated-matches-storage';
import type {
  MatchAnalysisResponse,
  MatchListItem,
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

type MockMatchesListMode = 'success';
type MockSpotlightActivationMode = 'success' | 'no_credit' | 'already_active';

export function getMockMatchesListMode(): MockMatchesListMode | null {
  const normalized = process.env.EXPO_PUBLIC_MOCK_MATCHES_LIST_RESPONSE?.trim().toLowerCase();

  if (normalized === 'success') {
    return normalized;
  }

  return null;
}

export function isMatchesListMockEnabled() {
  return isExpoDevModeEnabled() && getMockMatchesListMode() === 'success';
}

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

function getDemoMatchDedupeKey(match: MatchListItem) {
  const normalizedName = match.user.name.trim().toLowerCase();

  return normalizedName || match.matchId;
}

export async function fetchMatchesList(params: MatchesListQueryParams = {}) {
  if (isMatchesListMockEnabled()) {
    const normalizedLimit = normalizeLimit(params.limit);
    const page = params.page && params.page > 0 ? params.page : 1;
    const generatedMatches = loadGeneratedMockMatches();
    const matchesByName = new Map<string, MatchListItem>();

    for (const match of [...mockMatchesListResponse.data.items, ...generatedMatches]) {
      const dedupeKey = getDemoMatchDedupeKey(match);
      const existingMatch = matchesByName.get(dedupeKey);

      if (!existingMatch || match.matchedAt >= existingMatch.matchedAt) {
        matchesByName.set(dedupeKey, match);
      }
    }

    const mergedMatches = Array.from(matchesByName.values()).sort((left, right) =>
      right.matchedAt.localeCompare(left.matchedAt)
    );

    return {
      ...mockMatchesListResponse,
      data: {
        ...mockMatchesListResponse.data,
        items: mergedMatches,
        total: mergedMatches.length,
        limit: normalizedLimit,
        page,
      },
    } satisfies MatchesListResponse;
  }

  return apiFetch<MatchesListResponse>(buildMatchesListPath(params));
}

export async function fetchMatchAnalysis(matchId: string) {
  if (isMatchesListMockEnabled()) {
    const generatedAnalysis = loadGeneratedMockMatchAnalysis(matchId);

    if (generatedAnalysis) {
      return generatedAnalysis;
    }
  }

  return apiFetch<MatchAnalysisResponse>(MATCHES_API.ANALYSIS(matchId));
}

export async function activateSpotlight() {
  const mockMode = isExpoDevModeEnabled() ? getMockSpotlightActivationMode() : null;

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
