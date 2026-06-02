import type {
  NotificationTarget,
  NotificationTargetKind,
  UserNotification,
} from '../types/notifications.types';

type PushNotificationData = Record<string, string | object> | undefined;

const NOTIFICATION_TARGET_KINDS = new Set<NotificationTargetKind>([
  'match',
  'conversation',
  'startup_invitation',
  'system',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsePushNotification(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function parseNotificationTarget(value: unknown): NotificationTarget | null {
  if (!isRecord(value) || !NOTIFICATION_TARGET_KINDS.has(value.kind as NotificationTargetKind)) {
    return null;
  }

  return {
    kind: value.kind as NotificationTargetKind,
    id: typeof value.id === 'string' ? value.id : null,
    deepLink: typeof value.deepLink === 'string' ? value.deepLink : null,
  };
}

function isDetailDeepLink(deepLink: string | undefined, prefix: string) {
  if (!deepLink?.startsWith(prefix)) {
    return false;
  }

  const routeId = deepLink.slice(prefix.length).split(/[?#]/, 1)[0];

  return routeId.length > 0 && !routeId.includes('/');
}

function getConversationRouteFromPushData(data: PushNotificationData) {
  const actionUrl = typeof data?.action_url === 'string' ? data.action_url.trim() : '';
  const actionUrlMatch = actionUrl.match(/^connectx:\/\/conversation\/([^/?#]+)(?:[?#].*)?$/);

  if (actionUrlMatch) {
    return `/chat_demo/${actionUrlMatch[1]}`;
  }

  const conversationId =
    data?.screen === 'chat_room' && typeof data.conversation_id === 'string'
      ? data.conversation_id.trim()
      : '';

  return conversationId ? `/chat_demo/${encodeURIComponent(conversationId)}` : null;
}

export function getNotificationRoute(notification: Pick<UserNotification, 'target'>) {
  const deepLink = notification.target.deepLink?.trim();
  const targetId = notification.target.id?.trim();
  const encodedTargetId = targetId ? encodeURIComponent(targetId) : null;

  switch (notification.target.kind) {
    case 'conversation':
      return isDetailDeepLink(deepLink, '/chat_demo/')
        ? deepLink
        : encodedTargetId
          ? `/chat_demo/${encodedTargetId}`
          : null;
    case 'match':
      return isDetailDeepLink(deepLink, '/match-analysis/')
        ? deepLink
        : encodedTargetId
          ? `/match-analysis/${encodedTargetId}`
          : null;
    case 'startup_invitation':
      return '/(tabs)/team';
    default:
      return null;
  }
}

export function getNotificationRouteFromPushData(data: PushNotificationData) {
  const conversationRoute = getConversationRouteFromPushData(data);

  if (conversationRoute) {
    return conversationRoute;
  }

  const notification = parsePushNotification(data?.notification);

  if (!isRecord(notification)) {
    return null;
  }

  const target = parseNotificationTarget(notification.target);

  return target ? getNotificationRoute({ target }) : null;
}
