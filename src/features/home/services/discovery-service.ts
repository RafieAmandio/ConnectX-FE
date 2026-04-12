import { apiFetch } from '@shared/services/api';

import type {
  DiscoveryCardsQueryParams,
  DiscoveryCardsResponse,
  SwipeActionRequest,
  SwipeActionResponse,
} from '../types/discovery.types';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

export const DISCOVERY_API = {
  CARDS: '/api/v1/discovery/cards',
  ACTION: (profileId: string) => `/api/v1/discovery/cards/${profileId}/action`,
} as const;

function normalizeLimit(limit?: number) {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_LIMIT;
  }

  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limit)));
}

function buildDiscoveryCardsPath({ cursor, limit }: DiscoveryCardsQueryParams = {}) {
  const params = new URLSearchParams();

  params.set('limit', String(normalizeLimit(limit)));

  if (cursor) {
    params.set('cursor', cursor);
  }

  return `${DISCOVERY_API.CARDS}?${params.toString()}`;
}

export async function fetchDiscoveryCards(params: DiscoveryCardsQueryParams = {}) {
  return apiFetch<DiscoveryCardsResponse>(buildDiscoveryCardsPath(params));
}

export async function postSwipeAction(profileId: string, payload: SwipeActionRequest) {
  return apiFetch<SwipeActionResponse>(DISCOVERY_API.ACTION(profileId), {
    body: payload as unknown as BodyInit,
    method: 'POST',
  });
}
