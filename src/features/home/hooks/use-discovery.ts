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
  postRewindAction,
  postSwipeAction,
} from '../services/discovery-service';
import type {
  DiscoveryAppliedFilters,
  DiscoverySwipeHistoryEntry,
  DiscoveryCardsRequest,
  DiscoveryCardsResponse,
  DiscoveryFilterOptionsResponse,
  DiscoveryMode,
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

export function useDiscoveryCards(
  request: Omit<DiscoveryCardsRequest, 'pagination'> = {},
  limit = DEFAULT_LIMIT
) {
  const normalizedLimit = normalizeLimit(limit);

  return useInfiniteQuery({
    initialPageParam: undefined as string | undefined,
    queryKey: discoveryQueryKeys.feed(request, normalizedLimit),
    queryFn: ({ pageParam }) =>
      fetchDiscoveryCards({
        cursor: pageParam,
        limit: normalizedLimit,
        request,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.data.hasMore ? (lastPage.data.nextCursor ?? undefined) : undefined,
  });
}

export function useDiscoveryFilterOptions(mode: DiscoveryMode, enabled = true) {
  return useQuery<DiscoveryFilterOptionsResponse>({
    enabled,
    queryKey: discoveryQueryKeys.options(mode),
    queryFn: () => fetchDiscoveryFilterOptions(mode),
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
