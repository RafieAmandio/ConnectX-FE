# ConnectX Notifications — Backend Contract

Source of truth for the current-user notifications inbox. The frontend will render these notifications from the Home bell and use the same bearer token auth as the rest of the app.

## 1. Base URL & auth

```txt
Base URL: /api/v1
Auth:     Bearer token (same JWT used by the rest of the app)
```

All timestamps are ISO-8601 strings in UTC.

## 2. Endpoint list

| Method | Path                    | Purpose |
| ------ | ----------------------- | ------- |
| GET    | `/me/notifications`     | Fetch notifications for the authenticated user. |

## 3. Core types

```ts
type NotificationType =
  | 'match'
  | 'message'
  | 'team_invitation'
  | 'system';

type UserNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  actor: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  target: {
    kind: 'match' | 'conversation' | 'startup_invitation' | 'system';
    id: string | null;
    deepLink: string | null;
  };
};

type GetNotificationsResponse = {
  success: true;
  message: string;
  data: {
    unreadCount: number;
    notifications: UserNotification[];
  };
};
```

## 4. Field meanings

| Field | Meaning |
| ----- | ------- |
| `id` | Stable notification identifier. |
| `type` | Notification category used for icons and grouping. |
| `title` | Short display title. |
| `body` | Human-readable notification detail. |
| `createdAt` | When the notification was created. |
| `readAt` | `null` when unread; timestamp when read. |
| `actor` | User who caused the notification, or `null` for system events. |
| `target` | Optional app destination metadata. |
| `unreadCount` | Count of notifications where `readAt` is `null`. |

## 5. Example payload

See [get-notifications.response.json](./get-notifications.response.json).

## 6. Frontend expectations

- The frontend calls this endpoint with `Authorization: Bearer <token>`.
- Notifications should be returned newest-first by `createdAt`.
- An empty `notifications` array is a valid success response and should include `unreadCount: 0`.
- Unknown future fields will be ignored as long as this documented shape remains intact.
