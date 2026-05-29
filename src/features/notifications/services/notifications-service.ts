import { apiFetch } from '@shared/services/api';
import { isExpoDevModeEnabled } from '@shared/utils/env';

import { getMockNotificationsResponse } from '../mock/notifications.mock';
import type { GetNotificationsResponse } from '../types/notifications.types';

export const NOTIFICATIONS_API = {
  LIST: '/api/v1/me/notifications',
  READ: '/api/v1/me/notifications/read',
} as const;

export function isNotificationsMockEnabled() {
  return isExpoDevModeEnabled();
}

export async function fetchNotifications() {
  if (isNotificationsMockEnabled()) {
    return getMockNotificationsResponse();
  }

  return apiFetch<GetNotificationsResponse>(NOTIFICATIONS_API.LIST);
}

export async function markNotificationsRead() {
  return apiFetch<unknown>(NOTIFICATIONS_API.READ, {
    body: { mark_all: true } as unknown as BodyInit,
    method: 'POST',
  });
}
