import { InfiniteData, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { fetchDiscoveryCards, postSwipeAction } from '../services/discovery-service';
import type { DiscoveryCardsResponse, SwipeActionRequest } from '../types/discovery.types';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

export const discoveryQueryKeys = {
  all: ['discovery'] as const,
  cards: ['discovery', 'cards'] as const,
  feed: (limit: number) => ['discovery', 'cards', limit] as const,
};

function normalizeLimit(limit?: number) {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_LIMIT;
  }

  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limit)));
}

function removeCardFromPages(
  data: InfiniteData<DiscoveryCardsResponse, string | undefined> | undefined,
  profileId: string
) {
  if (!data) {
    return data;
  }

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      data: {
        ...page.data,
        items: page.data.items.filter((item) => item.profileId !== profileId),
      },
    })),
  };
}

export function useDiscoveryCards(limit = DEFAULT_LIMIT) {
  const normalizedLimit = normalizeLimit(limit);

  return useInfiniteQuery({
    initialPageParam: undefined as string | undefined,
    queryKey: discoveryQueryKeys.feed(normalizedLimit),
    queryFn: ({ pageParam }) =>
      fetchDiscoveryCards({
        cursor: pageParam,
        limit: normalizedLimit,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.data.hasMore ? (lastPage.data.nextCursor ?? undefined) : undefined,
  });
}

export function useSwipeAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
      profileId,
    }: {
      payload: SwipeActionRequest;
      profileId: string;
    }) => postSwipeAction(profileId, payload),
    onSuccess: (_response, variables) => {
      queryClient.setQueriesData<InfiniteData<DiscoveryCardsResponse, string | undefined>>(
        { queryKey: discoveryQueryKeys.cards },
        (current) => removeCardFromPages(current, variables.profileId)
      );
    },
  });
}
