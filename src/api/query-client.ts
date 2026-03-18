import { QueryClient } from '@tanstack/react-query';

import { ApiError } from './client';

const FIVE_MINUTES = 1000 * 60 * 5;

export function shouldRetryRequest(failureCount: number, error: unknown) {
  if (failureCount >= 1) {
    return false;
  }

  if (error instanceof ApiError) {
    return error.status === 0 || error.status >= 500;
  }

  return true;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetryRequest,
        staleTime: FIVE_MINUTES,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
