import { ApiError, apiFetch } from '@shared/services/api';
import { isExpoDevModeEnabled } from '@shared/utils/env';

import type {
  ChangePasswordRequest,
  ChangePasswordResponse,
  ContactChangeRequestResponse,
  NotificationSettingsResponse,
  RequestEmailChangeRequest,
  RequestWhatsappChangeRequest,
  SubmitSupportTicketRequest,
  SubmitSupportTicketResponse,
  UpdateNotificationSettingsRequest,
  UpdateNotificationSettingsResponse,
  VerifyContactChangeRequest,
  VerifyContactChangeResponse,
} from '../types/settings.types';

const SETTINGS_API = {
  CHANGE_PASSWORD: '/api/v1/me/account/password',
  EMAIL_CHANGE_REQUESTS: '/api/v1/me/account/email/change-requests',
  EMAIL_CHANGE_VERIFY: '/api/v1/me/account/email/change-requests/verify',
  NOTIFICATIONS: '/api/v1/me/settings/notifications',
  SUPPORT_TICKETS: '/api/v1/support/tickets',
  WHATSAPP_CHANGE_REQUESTS: '/api/v1/me/account/whatsapp/change-requests',
  WHATSAPP_CHANGE_VERIFY: '/api/v1/me/account/whatsapp/change-requests/verify',
} as const;

const MOCK_NOTIFICATION_SETTINGS: NotificationSettingsResponse = {
  success: true,
  data: { push_enabled: true, email_enabled: true },
};

function shouldUseMock() {
  return isExpoDevModeEnabled();
}

function buildMockContactChangeRequestResponse(prefix: string): ContactChangeRequestResponse {
  return {
    success: true,
    message: 'Verification code sent.',
    data: {
      verification_id: `${prefix}_${Date.now()}`,
      resend_available_at: new Date(Date.now() + 60 * 1000).toISOString(),
    },
  };
}

function buildMockContactChangeVerification(
  payload: VerifyContactChangeRequest,
  expectedOtp: string
): VerifyContactChangeResponse {
  if (payload.otp_code !== expectedOtp) {
    throw new ApiError('The verification code is invalid or expired.', 422, {
      success: false,
      message: 'The verification code is invalid or expired.',
      errors: { otp_code: ['The verification code is invalid or expired.'] },
    });
  }

  return {
    success: true,
    message: 'Account contact information updated successfully.',
  };
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

export async function changePassword(
  payload: ChangePasswordRequest
): Promise<ChangePasswordResponse> {
  try {
    return await apiFetch<ChangePasswordResponse>(SETTINGS_API.CHANGE_PASSWORD, {
      body: payload as unknown as BodyInit,
      method: 'PATCH',
    });
  } catch (error) {
    if (shouldUseMock()) {
      return {
        success: true,
        message: 'Password updated successfully.',
      };
    }
    throw error;
  }
}

export async function requestEmailChange(
  payload: RequestEmailChangeRequest
): Promise<ContactChangeRequestResponse> {
  try {
    return await apiFetch<ContactChangeRequestResponse>(SETTINGS_API.EMAIL_CHANGE_REQUESTS, {
      body: payload as unknown as BodyInit,
      method: 'POST',
    });
  } catch (error) {
    if (shouldUseMock() && (!(error instanceof ApiError) || error.status === 0 || error.status === 404)) {
      return buildMockContactChangeRequestResponse('verify_email');
    }
    throw error;
  }
}

export async function verifyEmailChange(
  payload: VerifyContactChangeRequest
): Promise<VerifyContactChangeResponse> {
  try {
    return await apiFetch<VerifyContactChangeResponse>(SETTINGS_API.EMAIL_CHANGE_VERIFY, {
      body: payload as unknown as BodyInit,
      method: 'POST',
    });
  } catch (error) {
    if (shouldUseMock() && (!(error instanceof ApiError) || error.status === 0 || error.status === 404)) {
      return buildMockContactChangeVerification(payload, 'ABC123');
    }
    throw error;
  }
}

export async function requestWhatsappChange(
  payload: RequestWhatsappChangeRequest
): Promise<ContactChangeRequestResponse> {
  try {
    const response = await apiFetch<ContactChangeRequestResponse>(SETTINGS_API.WHATSAPP_CHANGE_REQUESTS, {
      body: payload as unknown as BodyInit,
      method: 'POST',
    });
    console.log('requestWhatsappChange response:', JSON.stringify(response, null, 2));
    return response;
  } catch (error) {
    console.log('requestWhatsappChange error:', error instanceof ApiError ? JSON.stringify(error.payload, null, 2) : error);
    if (shouldUseMock() && (!(error instanceof ApiError) || error.status === 0 || error.status === 404)) {
      return buildMockContactChangeRequestResponse('verify_whatsapp');
    }
    throw error;
  }
}

export async function verifyWhatsappChange(
  payload: VerifyContactChangeRequest
): Promise<VerifyContactChangeResponse> {
  try {
    const response = await apiFetch<VerifyContactChangeResponse>(SETTINGS_API.WHATSAPP_CHANGE_VERIFY, {
      body: payload as unknown as BodyInit,
      method: 'POST',
    });
    console.log('verifyWhatsappChange response:', JSON.stringify(response, null, 2));
    return response;
  } catch (error) {
    console.log('verifyWhatsappChange error:', error instanceof ApiError ? JSON.stringify(error.payload, null, 2) : error);
    if (shouldUseMock() && (!(error instanceof ApiError) || error.status === 0 || error.status === 404)) {
      return buildMockContactChangeVerification(payload, '123456');
    }
    throw error;
  }
}
