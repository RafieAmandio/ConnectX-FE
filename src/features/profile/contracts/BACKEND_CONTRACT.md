# ConnectX Profile Settings — Backend Contract

Source of truth for profile settings account actions. These endpoints are called from the authenticated user's Settings screen and use the same bearer token auth as the rest of the app.

## 1. Base URL & auth

```txt
Base URL: /api/v1
Auth:     Bearer token (same JWT used by the rest of the app)
```

All timestamps are ISO-8601 strings in UTC.

## 2. Endpoint list

| Method | Path                             | Purpose |
| ------ | -------------------------------- | ------- |
| POST   | `/me/account/pause`              | Soft deactivate or hide the authenticated user's profile. |
| POST   | `/me/account/activate`           | Reactivate the authenticated user's paused profile. |
| POST   | `/me/account/deletion-requests`  | Request scheduled account deletion for the authenticated user. |

## 3. Core types

```ts
type PauseAccountRequest = Record<string, never>;

type PauseAccountResponse = {
  success: true;
  message: string;
  data: {
    userId: string;
    status: 'paused';
    pausedAt: string;
  };
};

type ActivateAccountRequest = Record<string, never>;

type ActivateAccountResponse = {
  success: true;
  message: string;
  data: {
    userId: string;
    status: 'active';
    activatedAt: string;
  };
};

type RequestAccountDeletionRequest = Record<string, never>;

type RequestAccountDeletionResponse = {
  success: true;
  message: string;
  data: {
    deletionRequestId: string;
    userId: string;
    status: 'scheduled';
    requestedAt: string;
    scheduledDeletionAt: string | null;
  };
};
```

## 4. Field meanings

| Field | Meaning |
| ----- | ------- |
| `userId` | Stable authenticated user identifier. |
| `status` | Account action state. Pause returns `paused`; activate returns `active`; deletion request returns `scheduled`. |
| `pausedAt` | Timestamp when the profile/account was paused. |
| `activatedAt` | Timestamp when the profile/account was reactivated. |
| `deletionRequestId` | Stable identifier for the deletion request. |
| `requestedAt` | Timestamp when deletion was requested. |
| `scheduledDeletionAt` | Planned deletion timestamp. `null` means backend has accepted the request but has not exposed the final deletion window. |

## 5. Example payloads

### 5.1 Pause profile

See:
- [pause-account.request.json](./pause-account.request.json)
- [pause-account.response.json](./pause-account.response.json)

### 5.2 Activate profile

See:
- [activate-account.request.json](./activate-account.request.json)
- [activate-account.response.json](./activate-account.response.json)

### 5.3 Request account deletion

See:
- [request-account-deletion.request.json](./request-account-deletion.request.json)
- [request-account-deletion.response.json](./request-account-deletion.response.json)

## 6. Frontend expectations

- The frontend sends an empty JSON body for all v1 endpoints.
- `GET /api/v1/auth/session` must return the current `data.user.is_active` value after pause or activation.
- Pause success keeps the user signed in, refreshes auth session, and expects `data.user.is_active === false`.
- Activate success keeps the user signed in, refreshes auth session, and expects `data.user.is_active === true`.
- Deletion request success shows a confirmation message and signs the user out.
- Backend should return a business error instead of silently succeeding when an account action cannot be applied.
- If backend adds extra fields later, frontend will ignore unknown keys as long as the documented shape remains intact.
