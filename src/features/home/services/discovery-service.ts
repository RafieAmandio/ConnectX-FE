import { apiFetch } from '@shared/services/api';

import type {
  DiscoveryCardFeedInput,
  DiscoveryCardsRequest,
  DiscoveryCardsResponse,
  DiscoveryFilterOptionsResponse,
  DiscoveryMode,
  SwipeActionRequest,
  SwipeActionResponse,
} from '../types/discovery.types';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

export const DISCOVERY_API = {
  CARDS: '/api/v1/discovery/cards',
  FILTER_OPTIONS: '/api/v1/discovery/filter-options',
  ACTION: (profileId: string) => `/api/v1/discovery/cards/${profileId}/action`,
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
  return apiFetch<DiscoveryCardsResponse>(DISCOVERY_API.CARDS, {
    body: buildDiscoveryCardsPayload(input) as unknown as BodyInit,
    method: 'POST',
  });
}

export async function fetchDiscoveryFilterOptions(mode: DiscoveryMode) {
  const params = new URLSearchParams({ mode });

  return apiFetch<DiscoveryFilterOptionsResponse>(`${DISCOVERY_API.FILTER_OPTIONS}?${params.toString()}`);
}

export async function postSwipeAction(profileId: string, payload: SwipeActionRequest) {
  return apiFetch<SwipeActionResponse>(DISCOVERY_API.ACTION(profileId), {
    body: payload as unknown as BodyInit,
    method: 'POST',
  });
}
