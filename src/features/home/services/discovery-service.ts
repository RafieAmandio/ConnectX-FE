import { ApiError, apiFetch, getApiAccessToken } from '@shared/services/api';
import { buildApiUrl } from '@shared/services/api/config';
import { isExpoDevModeEnabled, parseBooleanEnv } from '@shared/utils/env';

import {
  mockDiscoveryCardsResponse,
  mockDiscoveryCardsResponsesByMode,
} from '../mock/discovery.mock';
import type {
  DiscoveryCardFeedInput,
  DiscoveryCardsRequest,
  DiscoveryCardsResponse,
  DiscoveryFilterOptionsResponse,
  DiscoveryMode,
  DiscoverySwipeHistoryEntry,
  RewindActionRequest,
  RewindActionSuccessResponse,
  SpotlightActivationRequest,
  SpotlightActivationSuccessResponse,
  SwipeActionRequest,
  SwipeActionResponse,
} from '../types/discovery.types';

const mockDiscoveryFilterOptionsResponsesByMode = require('../mock/discovery-filter-options.responses.json') as Record<
  DiscoveryMode,
  DiscoveryFilterOptionsResponse
>;

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;
const DEFAULT_MOCK_MODE: DiscoveryMode = 'joining_startups';

function shouldMockSuperLikeRequiresBoost() {
  const envValue = parseBooleanEnv(process.env.EXPO_PUBLIC_MOCK_SUPERLIKE_NO_BOOST);

  if (envValue !== null) {
    return envValue;
  }

  return false;
}

function shouldMergeMockDiscoveryCards() {
  return parseBooleanEnv(process.env.EXPO_PUBLIC_MERGE_MOCK_DISCOVERY_CARDS) ?? false;
}

type MockRewindMode = 'success' | 'premium_required' | 'not_available';

function getMockRewindMode(): MockRewindMode | null {
  const normalized = process.env.EXPO_PUBLIC_MOCK_DISCOVERY_REWIND_RESPONSE?.trim().toLowerCase();

  if (
    normalized === 'success' ||
    normalized === 'premium_required' ||
    normalized === 'not_available'
  ) {
    return normalized;
  }

  return null;
}

function resolveMockMode(request?: Omit<DiscoveryCardsRequest, 'pagination'>) {
  return request?.context?.mode ?? DEFAULT_MOCK_MODE;
}

export function getMockDiscoveryCardsResponse(
  limit = DEFAULT_LIMIT,
  cursor?: string,
  request?: Omit<DiscoveryCardsRequest, 'pagination'>
) {
  const response = mockDiscoveryCardsResponsesByMode[resolveMockMode(request)] ?? mockDiscoveryCardsResponse;
  const items = response.data.items;
  const startIndex = cursor ? Number.parseInt(cursor, 10) || 0 : 0;
  const normalizedStartIndex = Math.max(0, startIndex);
  const endIndex = Math.min(items.length, normalizedStartIndex + normalizeLimit(limit));
  const nextCursor = endIndex < items.length ? String(endIndex) : null;

  return {
    ...response,
    data: {
      ...response.data,
      items: items.slice(normalizedStartIndex, endIndex),
      nextCursor,
      hasMore: nextCursor !== null,
    },
  } satisfies DiscoveryCardsResponse;
}

export function isDiscoveryCardsMockEnabled() {
  return parseBooleanEnv(process.env.EXPO_PUBLIC_MOCK_DISCOVERY_CARDS) ?? false;
}

export const DISCOVERY_API = {
  CARDS: '/api/v1/discovery/cards',
  FILTER_OPTIONS: '/api/v1/discovery/filter-options',
  ACTION: (targetId: string) => `/api/v1/discovery/cards/${targetId}/action`,
  REWIND: '/api/v1/discovery/swipes/rewind',
  SPOTLIGHT_ACTIVATE: '/api/v1/discovery/spotlight/activate',
} as const;

function normalizeLimit(limit?: number) {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_LIMIT;
  }

  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limit)));
}

function buildDiscoveryCardsPayload({
  cursor,
  limit,
  request,
}: DiscoveryCardFeedInput = {}): DiscoveryCardsRequest {
  const payload: DiscoveryCardsRequest = {};

  if (request?.context && Object.keys(request.context).length > 0) {
    payload.context = request.context;
  }

  if (request?.filters && Object.keys(request.filters).length > 0) {
    payload.filters = request.filters;
  }

  payload.pagination = {
    limit: normalizeLimit(limit),
  };

  if (cursor) {
    payload.pagination.cursor = cursor;
  }

  return payload;
}

function maskToken(token: string | null) {
  if (!token) {
    return null;
  }

  if (token.length <= 12) {
    return `${token.slice(0, 4)}...`;
  }

  return `${token.slice(0, 6)}...${token.slice(-6)}`;
}

function mergeDiscoveryCardsWithMocks(
  response: DiscoveryCardsResponse,
  input: DiscoveryCardFeedInput
): DiscoveryCardsResponse {
  const mockResponse = getMockDiscoveryCardsResponse(input.limit, input.cursor, input.request);
  const apiCardIds = new Set(response.data.items.map((card) => card.id));
  const mockItems = mockResponse.data.items
    .filter((card) => !apiCardIds.has(card.id))
    .map((card) => ({
      ...card,
      __source: 'mock' as const,
    }));

  return {
    ...response,
    data: {
      ...response.data,
      items: [...response.data.items, ...mockItems],
    },
  };
}

export function getMockDiscoveryFilterOptionsResponse(mode: DiscoveryMode) {
  const response = mockDiscoveryFilterOptionsResponsesByMode[mode];

  return JSON.parse(JSON.stringify(response)) as DiscoveryFilterOptionsResponse;
}

export async function fetchDiscoveryCards(input: DiscoveryCardFeedInput = {}) {
  const payload = buildDiscoveryCardsPayload(input);
  const token = await getApiAccessToken();
  const requestLog = {
    body: payload,
    hasToken: Boolean(token),
    method: 'POST',
    tokenPreview: maskToken(token),
    url: buildApiUrl(DISCOVERY_API.CARDS),
  };

  if (isExpoDevModeEnabled()) {
    console.log('[Discovery] fetch cards request', JSON.stringify(requestLog, null, 2));
  }

  if (isDiscoveryCardsMockEnabled()) {
    console.log(
      '[Discovery] fetch cards using mock; backend API was not called',
      JSON.stringify(requestLog, null, 2)
    );
    const response = getMockDiscoveryCardsResponse(input.limit, input.cursor, input.request);
    console.log('[Discovery] fetch cards response', JSON.stringify(response, null, 2));
    return response;
  }

  console.log('[Discovery] fetch cards using api', JSON.stringify(requestLog, null, 2));
  const response = await apiFetch<DiscoveryCardsResponse>(DISCOVERY_API.CARDS, {
    body: payload as unknown as BodyInit,
    method: 'POST',
  });

  if (shouldMergeMockDiscoveryCards()) {
    const mergedResponse = mergeDiscoveryCardsWithMocks(response, input);
    console.log('[Discovery] fetch cards response merged with mock', JSON.stringify(mergedResponse, null, 2));
    return mergedResponse;
  }

  console.log('[Discovery] fetch cards response', JSON.stringify(response, null, 2));

  return response;
}

export async function fetchDiscoveryFilterOptions(mode: DiscoveryMode) {
  if (isExpoDevModeEnabled()) {
    console.log('[Discovery] fetch filter options mode', mode);
  }

  // if (isDiscoveryCardsMockEnabled()) {
  //   const response = getMockDiscoveryFilterOptionsResponse(mode);

  //   if (isExpoDevModeEnabled()) {
  //     console.log('[Discovery] fetch filter options source', {
  //       cityOptionCount: response.data.city?.options.length ?? 0,
  //       mode,
  //       source: 'mock',
  //     });
  //   }

  //   return response;
  // }

  const response = await apiFetch<DiscoveryFilterOptionsResponse>(
    `${DISCOVERY_API.FILTER_OPTIONS}?mode=${encodeURIComponent(mode)}`
  );

  if (isExpoDevModeEnabled()) {
    console.log('[Discovery] fetch filter options source', {
      cityOptionCount: response.data.city?.options.length ?? 0,
      mode,
      source: 'api',
    });
  }

  return response;
}

export async function postSwipeAction(targetId: string, payload: SwipeActionRequest) {
  if (isExpoDevModeEnabled() && payload.action === 'super_like' && shouldMockSuperLikeRequiresBoost()) {

    throw new ApiError('No boosts remaining.', 409, {
      success: false,
      message: 'No boosts remaining.',
      error: {
        code: 'DISCOVERY_SUPER_LIKE_REQUIRES_BOOST',
        details: {
          id: targetId,
          targetId,
          action: 'super_like',
          requiredConsumable: 'boost',
          remaining: 0,
        },
      },
    });
  }

  return apiFetch<SwipeActionResponse>(DISCOVERY_API.ACTION(targetId), {
    body: payload as unknown as BodyInit,
    method: 'POST',
  });
}

export async function postRewindAction(
  payload: RewindActionRequest = {},
  options?: {
    mockHistoryEntry?: DiscoverySwipeHistoryEntry | null;
  }
) {
  const mockMode = isExpoDevModeEnabled() ? getMockRewindMode() : null;

  if (mockMode) {
    if (mockMode === 'premium_required') {
      throw new ApiError('ConnectX Pro is required to rewind your last swipe.', 403, {
        success: false,
        message: 'ConnectX Pro is required to rewind your last swipe.',
        error: {
          code: 'DISCOVERY_REWIND_PREMIUM_REQUIRED',
          details: {
            requiredEntitlement: 'connectx_pro',
          },
        },
      });
    }

    const historyEntry = options?.mockHistoryEntry;

    if (mockMode === 'not_available' || !historyEntry) {
      throw new ApiError('No swipe is available to rewind right now.', 409, {
        success: false,
        message: 'No swipe is available to rewind right now.',
        error: {
          code: 'DISCOVERY_REWIND_NOT_AVAILABLE',
          details: {
            id: historyEntry?.card.id ?? null,
            profileId:
              historyEntry?.card.entityType === 'profile' ? historyEntry.card.profileId : null,
            rewoundAction: historyEntry?.action ?? null,
            reason: 'EMPTY_HISTORY',
          },
        },
      });
    }

    return {
      success: true,
      message: 'Last swipe rewound.',
      data: {
        id: historyEntry.card.id,
        profileId: historyEntry.card.entityType === 'profile' ? historyEntry.card.profileId : null,
        rewoundAction: historyEntry.action,
        card: historyEntry.card,
      },
    } satisfies RewindActionSuccessResponse;
  }

  return apiFetch<RewindActionSuccessResponse>(DISCOVERY_API.REWIND, {
    body: payload as unknown as BodyInit,
    method: 'POST',
  });
}

export async function postSpotlightActivation(payload: SpotlightActivationRequest = {}) {
  return apiFetch<SpotlightActivationSuccessResponse>(DISCOVERY_API.SPOTLIGHT_ACTIVATE, {
    body: payload as unknown as BodyInit,
    method: 'POST',
  });
}
