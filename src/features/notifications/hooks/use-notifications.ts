import { useQuery } from '@tanstack/react-query';

import { fetchNotifications, isNotificationsMockEnabled } from '../services/notifications-service';

export const notificationsQueryKeys = {
  all: ['notifications'] as const,
  list: ['notifications', 'list'] as const,
};

export function useNotifications(enabled = true) {
  return useQuery({
    enabled,
    queryKey: notificationsQueryKeys.list,
    queryFn: fetchNotifications,
    staleTime: isNotificationsMockEnabled() ? Number.POSITIVE_INFINITY : 1000 * 60,
  });
}
