import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  fetchDiscoveryCards,
  fetchDiscoveryFilterOptions,
  getMockDiscoveryCardsResponse,
  isDiscoveryCardsMockEnabled,
  postRewindAction,
  postSwipeAction,
} from '../services/discovery-service';
import type {
  DiscoveryAppliedFilters,
  DiscoveryCard,
  DiscoveryCardsRequest,
  DiscoveryCardsResponse,
  DiscoveryFilterOptionsResponse,
  DiscoveryMode,
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
  filterOptions: ['discovery', 'filter-options'] as const,
  feed: (
    request: Omit<DiscoveryCardsRequest, 'pagination'>,
    limit: number
  ) => ['discovery', 'cards', request, limit] as const,
  options: (mode: DiscoveryMode) => ['discovery', 'filter-options', mode] as const,
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

function restoreCardToPages(
  data: InfiniteData<DiscoveryCardsResponse, string | undefined> | undefined,
  card: DiscoveryCard
) {
  if (!data || data.pages.length === 0) {
    return data;
  }

  const alreadyPresent = data.pages.some((page) =>
    page.data.items.some((item) => item.id === card.id)
  );

  if (alreadyPresent) {
    return data;
  }

  const [firstPage, ...remainingPages] = data.pages;

  return {
    ...data,
    pages: [
      {
        ...firstPage,
        data: {
          ...firstPage.data,
          items: [card, ...firstPage.data.items],
        },
      },
      ...remainingPages,
    ],
  };
}

export function useDiscoveryCards(
  request: Omit<DiscoveryCardsRequest, 'pagination'> = {},
  limit = DEFAULT_LIMIT,
  enabled = true
) {
  const normalizedLimit = normalizeLimit(limit);
  const usingMockCards = isDiscoveryCardsMockEnabled();
  const shouldSeedMockData = usingMockCards && enabled;

  return useInfiniteQuery({
    enabled,
    initialPageParam: undefined as string | undefined,
    initialData: shouldSeedMockData
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
    staleTime: shouldSeedMockData ? Number.POSITIVE_INFINITY : 0,
  });
}

export function useDiscoveryFilterOptions(mode: DiscoveryMode, enabled = true) {
  return useQuery<DiscoveryFilterOptionsResponse>({
    enabled,
    queryKey: discoveryQueryKeys.options(mode),
    queryFn: () => fetchDiscoveryFilterOptions(mode),
    staleTime: isDiscoveryCardsMockEnabled() ? Number.POSITIVE_INFINITY : 0,
  });
}

export function useSwipeAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      payload,
      targetId,
    }: {
      card: DiscoveryCard;
      cardId: string;
      optimistic?: boolean;
      payload: SwipeActionRequest;
      targetId: string;
    }) => postSwipeAction(targetId, payload),
    // For optimistic swipes (pass/connect) drop the card from the deck before the
    // request resolves so the next card appears instantly, then roll it back on failure.
    onMutate: (variables) => {
      if (!variables.optimistic) {
        return;
      }

      // Remove synchronously so the next card appears immediately, then cancel any
      // in-flight feed fetch in the background to avoid it resurrecting the card.
      queryClient.setQueriesData<InfiniteData<DiscoveryCardsResponse, string | undefined>>(
        { queryKey: discoveryQueryKeys.cards },
        (current) => removeCardFromPages(current, variables.cardId)
      );
      void queryClient.cancelQueries({ queryKey: discoveryQueryKeys.cards });
    },
    onError: (_error, variables) => {
      if (!variables.optimistic) {
        return;
      }

      queryClient.setQueriesData<InfiniteData<DiscoveryCardsResponse, string | undefined>>(
        { queryKey: discoveryQueryKeys.cards },
        (current) => restoreCardToPages(current, variables.card)
      );
    },
    onSuccess: (_response, variables) => {
      // Optimistic swipes already removed the card in onMutate.
      if (variables.optimistic) {
        return;
      }

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
