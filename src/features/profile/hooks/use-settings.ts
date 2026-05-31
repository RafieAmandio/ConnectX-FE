import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  changePassword,
  fetchNotificationSettings,
  requestEmailChange,
  requestWhatsappChange,
  submitSupportTicket,
  updateNotificationSettings,
  verifyEmailChange,
  verifyWhatsappChange,
} from '../services/settings-service';
import type { NotificationSettingsResponse } from '../types/settings.types';

export const settingsQueryKeys = {
  notifications: ['settings', 'notifications'] as const,
};

export function useNotificationSettings() {
  return useQuery({
    queryFn: fetchNotificationSettings,
    queryKey: settingsQueryKeys.notifications,
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateNotificationSettings,
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: settingsQueryKeys.notifications });

      const previous = queryClient.getQueryData<NotificationSettingsResponse>(
        settingsQueryKeys.notifications
      );

      if (previous) {
        queryClient.setQueryData<NotificationSettingsResponse>(
          settingsQueryKeys.notifications,
          {
            ...previous,
            data: { ...previous.data, ...payload },
          }
        );
      }

      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(settingsQueryKeys.notifications, context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: settingsQueryKeys.notifications });
    },
  });
}

export function useSubmitSupportTicket() {
  return useMutation({
    mutationFn: submitSupportTicket,
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: changePassword,
  });
}

export function useRequestEmailChange() {
  return useMutation({
    mutationFn: requestEmailChange,
  });
}

export function useVerifyEmailChange() {
  return useMutation({
    mutationFn: verifyEmailChange,
  });
}

export function useRequestWhatsappChange() {
  return useMutation({
    mutationFn: requestWhatsappChange,
  });
}

export function useVerifyWhatsappChange() {
  return useMutation({
    mutationFn: verifyWhatsappChange,
  });
}
