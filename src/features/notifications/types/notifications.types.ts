export type NotificationType = 'match' | 'message' | 'team_invitation' | 'system';

export type NotificationTargetKind = 'match' | 'conversation' | 'startup_invitation' | 'system';

export type NotificationActor = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type NotificationTarget = {
  kind: NotificationTargetKind;
  id: string | null;
  deepLink: string | null;
};

export type UserNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  actor: NotificationActor | null;
  target: NotificationTarget;
};

export type GetNotificationsResponse = {
  success: true;
  message: string;
  data: {
    unreadCount: number;
    notifications: UserNotification[];
  };
};
