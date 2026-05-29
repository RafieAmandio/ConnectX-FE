# Settings API Contract

Endpoints required by the Settings screen that are not yet available in the backend.

---

## 1. Notification Preferences

### GET /api/v1/me/settings/notifications

Returns the current notification preferences for the authenticated user.

**Headers:**
- `Authorization: Bearer {token}`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "push_enabled": true,
    "email_enabled": true
  }
}
```

### PATCH /api/v1/me/settings/notifications

Updates one or more notification preferences.

**Headers:**
- `Authorization: Bearer {token}`
- `Content-Type: application/json`

**Request body (all fields optional):**
```json
{
  "push_enabled": false,
  "email_enabled": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Notification preferences updated.",
  "data": {
    "push_enabled": false,
    "email_enabled": true
  }
}
```

---

## 2. Support Tickets

### POST /api/v1/support/tickets

Submits a support ticket (feature request, bug report, or contact support message) to the internal dashboard.

**Headers:**
- `Authorization: Bearer {token}`
- `Content-Type: application/json`

**Request body:**
```json
{
  "type": "feature_request",
  "message": "It would be great to have dark mode toggle in settings."
}
```

| Field     | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `type`    | string | yes      | One of: `feature_request`, `bug_report`, `contact_support` |
| `message` | string | yes      | User-written message body (max 2000 chars) |

**Response (201):**
```json
{
  "success": true,
  "message": "Your message has been sent. Thank you!",
  "data": {
    "ticket_id": "tkt_abc123"
  }
}
```

**Error Response (422):**
```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": {
    "message": ["The message field is required."],
    "type": ["The selected type is invalid."]
  }
}
```

---

## 3. Startup Profile Update

### PATCH /api/v1/me/startup

Updates the authenticated founder's startup profile (identity, traction, links, team config). All fields are optional — only include fields to update.

**Headers:**
- `Authorization: Bearer {token}`
- `Content-Type: application/json`

**Request body (all fields optional):**
```json
{
  "name": "ConnectX AI",
  "tagline": "Platform matchmaking untuk startup ecosystem",
  "description": "ConnectX adalah platform...",
  "logo_url": "https://example.com/logo.png",
  "stage": "idea",
  "industry": "saas",
  "secondary_industry": "future_of_work",
  "team_size": 2,
  "open_roles": ["ui_ux_designer", "full_stack_engineer"],
  "user_count": "1000+",
  "mau": "500",
  "revenue": "$10K ARR",
  "website": "https://connectx.app",
  "prototype_url": "https://figma.com/...",
  "linkedin": "https://linkedin.com/company/connectx",
  "commitment": "full_time",
  "equity": "equity_only",
  "paid": false
}
```

| Field                | Type     | Description |
|----------------------|----------|-------------|
| `name`               | string   | Startup name |
| `tagline`            | string   | Short tagline / one-liner |
| `description`        | string   | Longer description of the startup |
| `logo_url`           | string   | URL to startup logo |
| `stage`              | string   | One of: `idea`, `mvp`, `live`, `scale` |
| `industry`           | string   | Primary industry slug |
| `secondary_industry` | string   | Secondary industry slug |
| `team_size`          | number   | Current team size |
| `open_roles`         | string[] | Array of role slugs the startup is hiring for |
| `user_count`         | string   | User/customer count (free-form text) |
| `mau`                | string   | Monthly active users (free-form text) |
| `revenue`            | string   | Revenue info (free-form text, e.g. "$10K ARR") |
| `website`            | string   | Startup website URL |
| `prototype_url`      | string   | Prototype/demo link |
| `linkedin`           | string   | LinkedIn company page URL |
| `commitment`         | string   | Founder commitment level (e.g. `full_time`, `part_time`) |
| `equity`             | string   | Equity model (e.g. `equity_only`, `equity_and_salary`) |
| `paid`               | boolean  | Whether the position is paid |

**Response (200):**
```json
{
  "success": true,
  "message": "Startup profile updated.",
  "data": {
    // Updated startup object
  }
}
```

**Error Response (422):**
```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": {
    "name": ["The name field must not exceed 80 characters."]
  }
}
```

---

## Existing Endpoints (already implemented)

These endpoints are already available and used by the Settings screen:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/me/account/pause` | Pause user profile |
| POST | `/api/v1/me/account/activate` | Reactivate user profile |
| POST | `/api/v1/me/account/deletion-requests` | Request account deletion |
| PATCH | `/api/v1/me/startup` | Update startup profile (this doc, section 3) |
