import { apiFetch } from '@shared/services/api';
import { isExpoDevModeEnabled } from '@shared/utils/env';

import type {
  NotificationSettingsResponse,
  SubmitSupportTicketRequest,
  SubmitSupportTicketResponse,
  UpdateNotificationSettingsRequest,
  UpdateNotificationSettingsResponse,
} from '../types/settings.types';

const SETTINGS_API = {
  NOTIFICATIONS: '/api/v1/me/settings/notifications',
  SUPPORT_TICKETS: '/api/v1/support/tickets',
} as const;

const MOCK_NOTIFICATION_SETTINGS: NotificationSettingsResponse = {
  success: true,
  data: { push_enabled: true, email_enabled: true },
};

function shouldUseMock() {
  return isExpoDevModeEnabled();
}

export async function fetchNotificationSettings(): Promise<NotificationSettingsResponse> {
  try {
    return await apiFetch<NotificationSettingsResponse>(SETTINGS_API.NOTIFICATIONS);
  } catch {
    if (shouldUseMock()) {
      return MOCK_NOTIFICATION_SETTINGS;
    }
    throw new Error('Failed to fetch notification settings.');
  }
}

export async function updateNotificationSettings(
  payload: UpdateNotificationSettingsRequest
): Promise<UpdateNotificationSettingsResponse> {
  try {
    return await apiFetch<UpdateNotificationSettingsResponse>(SETTINGS_API.NOTIFICATIONS, {
      body: payload as unknown as BodyInit,
      method: 'PATCH',
    });
  } catch {
    if (shouldUseMock()) {
      return {
        success: true,
        message: 'Notification preferences updated.',
        data: {
          push_enabled: payload.push_enabled ?? MOCK_NOTIFICATION_SETTINGS.data.push_enabled,
          email_enabled: payload.email_enabled ?? MOCK_NOTIFICATION_SETTINGS.data.email_enabled,
        },
      };
    }
    throw new Error('Failed to update notification settings.');
  }
}

export async function submitSupportTicket(
  payload: SubmitSupportTicketRequest
): Promise<SubmitSupportTicketResponse> {
  try {
    return await apiFetch<SubmitSupportTicketResponse>(SETTINGS_API.SUPPORT_TICKETS, {
      body: payload as unknown as BodyInit,
      method: 'POST',
    });
  } catch {
    if (shouldUseMock()) {
      return {
        success: true,
        message: 'Your message has been sent. Thank you!',
        data: { ticket_id: `tkt_mock_${Date.now()}` },
      };
    }
    throw new Error('Failed to submit support ticket.');
  }
}
