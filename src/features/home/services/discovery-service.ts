import { ApiError, apiFetch } from '@shared/services/api';

import { mockDiscoveryCardsResponse, mockDiscoveryFilterOptionsByMode } from '../mock/discovery.mock';
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

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

function parseBooleanEnv(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return null;
}

function shouldMockSuperLikeRequiresBoost() {
  const envValue = parseBooleanEnv(process.env.EXPO_PUBLIC_MOCK_SUPERLIKE_NO_BOOST);

  if (envValue !== null) {
    return envValue;
  }

  return false;
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

export function getMockDiscoveryCardsResponse(limit = DEFAULT_LIMIT, cursor?: string) {
  const items = mockDiscoveryCardsResponse.data.items;
  const startIndex = cursor ? Number.parseInt(cursor, 10) || 0 : 0;
  const normalizedStartIndex = Math.max(0, startIndex);
  const endIndex = Math.min(items.length, normalizedStartIndex + normalizeLimit(limit));
  const nextCursor = endIndex < items.length ? String(endIndex) : null;

  return {
    ...mockDiscoveryCardsResponse,
    data: {
      ...mockDiscoveryCardsResponse.data,
      items: items.slice(normalizedStartIndex, endIndex),
      nextCursor,
      hasMore: nextCursor !== null,
    },
  } satisfies DiscoveryCardsResponse;
}

export function isDiscoveryCardsMockEnabled() {
  return __DEV__;
}

export function isDiscoveryFilterOptionsMockEnabled() {
  return __DEV__;
}

export const DISCOVERY_API = {
  CARDS: '/api/v1/discovery/cards',
  FILTER_OPTIONS: '/api/v1/discovery/filter-options',
  ACTION: (profileId: string) => `/api/v1/discovery/cards/${profileId}/action`,
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

export async function fetchDiscoveryCards(input: DiscoveryCardFeedInput = {}) {
  if (isDiscoveryCardsMockEnabled()) {
    return getMockDiscoveryCardsResponse(input.limit, input.cursor);
  }

  return apiFetch<DiscoveryCardsResponse>(DISCOVERY_API.CARDS, {
    body: buildDiscoveryCardsPayload(input) as unknown as BodyInit,
    method: 'POST',
  });
}

export async function fetchDiscoveryFilterOptions(mode: DiscoveryMode) {
  if (isDiscoveryFilterOptionsMockEnabled()) {
    return mockDiscoveryFilterOptionsByMode[mode];
  }

  const params = new URLSearchParams({ mode });

  return apiFetch<DiscoveryFilterOptionsResponse>(`${DISCOVERY_API.FILTER_OPTIONS}?${params.toString()}`);
}

export async function postSwipeAction(profileId: string, payload: SwipeActionRequest) {
  if (__DEV__ && payload.action === 'super_like' && shouldMockSuperLikeRequiresBoost()) {

    throw new ApiError('No boosts remaining.', 409, {
      success: false,
      message: 'No boosts remaining.',
      error: {
        code: 'DISCOVERY_SUPER_LIKE_REQUIRES_BOOST',
        details: {
          profileId,
          action: 'super_like',
          requiredConsumable: 'boost',
          remaining: 0,
        },
      },
    });
  }

  return apiFetch<SwipeActionResponse>(DISCOVERY_API.ACTION(profileId), {
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
  const mockMode = __DEV__ ? getMockRewindMode() : null;

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
            profileId: historyEntry?.card.profileId ?? null,
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
        profileId: historyEntry.card.profileId,
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
