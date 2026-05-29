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
