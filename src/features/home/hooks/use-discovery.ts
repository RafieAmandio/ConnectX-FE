import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import {
  fetchDiscoveryCards,
  getMockDiscoveryCardsResponse,
  isDiscoveryCardsMockEnabled,
  postRewindAction,
  postSwipeAction,
} from '../services/discovery-service';
import type {
  DiscoveryAppliedFilters,
  DiscoveryCardsRequest,
  DiscoveryCardsResponse,
  DiscoverySwipeHistoryEntry,
  RewindActionRequest,
  RewindActionSuccessResponse,
  SwipeActionRequest,
} from '../types/discovery.types';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

export const discoveryQueryKeys = {
  all: ['discovery'] as const,
  cards: ['discovery', 'cards'] as const,
  feed: (
    request: Omit<DiscoveryCardsRequest, 'pagination'>,
    limit: number
  ) => ['discovery', 'cards', request, limit] as const,
};

function normalizeLimit(limit?: number) {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_LIMIT;
  }

  return Math.max(1, Math.min(MAX_LIMIT, Math.trunc(limit)));
}

function removeCardFromPages(
  data: InfiniteData<DiscoveryCardsResponse, string | undefined> | undefined,
  cardId: string
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
        items: page.data.items.filter((item) => item.id !== cardId),
      },
    })),
  };
}

export function useDiscoveryCards(
  request: Omit<DiscoveryCardsRequest, 'pagination'> = {},
  limit = DEFAULT_LIMIT
) {
  const normalizedLimit = normalizeLimit(limit);
  const usingMockCards = isDiscoveryCardsMockEnabled();

  return useInfiniteQuery({
    initialPageParam: undefined as string | undefined,
    initialData: usingMockCards
      ? {
        pageParams: [undefined as string | undefined],
        pages: [getMockDiscoveryCardsResponse(normalizedLimit, undefined, request)],
      }
      : undefined,
    queryKey: discoveryQueryKeys.feed(request, normalizedLimit),
    queryFn: ({ pageParam }) =>
      fetchDiscoveryCards({
        cursor: pageParam,
        limit: normalizedLimit,
        request,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.data.hasMore ? (lastPage.data.nextCursor ?? undefined) : undefined,
    staleTime: usingMockCards ? Number.POSITIVE_INFINITY : 0,
  });
}

export function useSwipeAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      cardId,
      payload,
      targetId,
    }: {
      cardId: string;
      payload: SwipeActionRequest;
      targetId: string;
    }) => postSwipeAction(targetId, payload),
    onSuccess: (_response, variables) => {
      queryClient.setQueriesData<InfiniteData<DiscoveryCardsResponse, string | undefined>>(
        { queryKey: discoveryQueryKeys.cards },
        (current) => removeCardFromPages(current, variables.cardId)
      );
    },
  });
}

export function useRewindAction() {
  return useMutation<
    RewindActionSuccessResponse,
    Error,
    {
      options?: {
        mockHistoryEntry?: DiscoverySwipeHistoryEntry | null;
      };
      payload?: RewindActionRequest;
    }
  >({
    mutationFn: ({ options, payload }) => postRewindAction(payload, options),
  });
}

export function countAppliedDiscoveryFilters(filters: DiscoveryAppliedFilters) {
  return Object.values(filters).reduce<number>((count, value) => {
    if (Array.isArray(value)) {
      return value.length > 0 ? count + 1 : count;
    }

    if (value && typeof value === 'object') {
      return Object.values(value as Record<string, unknown>).some((item) => {
        if (Array.isArray(item)) {
          return item.length > 0;
        }

        return Boolean(item);
      })
        ? count + 1
        : count;
    }

    return value ? count + 1 : count;
  }, 0);
}
