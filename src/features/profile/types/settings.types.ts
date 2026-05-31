export type NotificationSettings = {
  push_enabled: boolean;
  email_enabled: boolean;
};

export type NotificationSettingsResponse = {
  success: boolean;
  data: NotificationSettings;
};

export type UpdateNotificationSettingsRequest = {
  push_enabled?: boolean;
  email_enabled?: boolean;
};

export type UpdateNotificationSettingsResponse = {
  success: boolean;
  message: string;
  data: NotificationSettings;
};

export type SupportTicketType = 'feature_request' | 'bug_report' | 'contact_support';

export type SubmitSupportTicketRequest = {
  type: SupportTicketType;
  message: string;
};

export type SubmitSupportTicketResponse = {
  success: boolean;
  message: string;
  data: {
    ticket_id: string;
  };
};

export type ChangePasswordRequest = {
  current_password: string;
  password: string;
  password_confirmation: string;
};

export type ChangePasswordResponse = {
  success: boolean;
  message: string;
};

export type RequestEmailChangeRequest = {
  email: string;
};

export type RequestWhatsappChangeRequest = {
  whatsapp_number: string;
};

export type ContactChangeRequestResponse = {
  success: boolean;
  message: string;
  data: {
    verification_id: string;
    resend_available_at: string;
  };
};

export type VerifyContactChangeRequest = {
  verification_id: string;
  otp_code: string;
};

export type VerifyContactChangeResponse = {
  success: boolean;
  message: string;
};
