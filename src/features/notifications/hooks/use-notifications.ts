import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchNotifications,
  isNotificationsMockEnabled,
  markNotificationsRead,
} from '../services/notifications-service';
import type { GetNotificationsResponse } from '../types/notifications.types';

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

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => {
      const readAt = new Date().toISOString();

      queryClient.setQueryData<GetNotificationsResponse>(notificationsQueryKeys.list, (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          data: {
            ...current.data,
            unreadCount: 0,
            notifications: current.data.notifications.map((notification) => ({
              ...notification,
              readAt: notification.readAt ?? readAt,
            })),
          },
        };
      });
    },
  });
}
