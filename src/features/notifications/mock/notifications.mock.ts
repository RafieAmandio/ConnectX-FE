import type { GetNotificationsResponse } from '../types/notifications.types';

const mockNotificationsResponse = require('../contracts/get-notifications.response.json') as GetNotificationsResponse;

export function getMockNotificationsResponse(): GetNotificationsResponse {
  const response = JSON.parse(JSON.stringify(mockNotificationsResponse)) as GetNotificationsResponse;
  const notifications = [...response.data.notifications].sort(
    (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  );

  return {
    ...response,
    data: {
      ...response.data,
      notifications,
      unreadCount: notifications.filter((notification) => notification.readAt === null).length,
    },
  };
}
