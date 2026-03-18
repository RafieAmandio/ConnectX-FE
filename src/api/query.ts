import { queryOptions, type QueryKey } from '@tanstack/react-query';

import { apiFetch } from './client';

export function createApiQueryOptions<TData>(
  queryKey: QueryKey,
  path: string,
  init?: RequestInit
) {
  return queryOptions({
    queryKey,
    queryFn: () => apiFetch<TData>(path, init),
  });
}
