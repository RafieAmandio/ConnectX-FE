# Discovery Mode Onboarding Contract

This document defines how discovery mode switching should trigger additional onboarding when the
authenticated user does not yet have the profile required by the requested discovery mode.

## Summary

`POST /api/v1/discovery/cards` may reject candidate generation with an onboarding-required error
when the user tries to enter a discovery mode that needs a missing profile branch.

The frontend does not send a branch selector when starting onboarding. After the user accepts the
error message, the frontend calls the existing onboarding start endpoint and the backend determines
the correct onboarding branch from the bearer token and current user state.

## Mode Branches

Discovery modes map to two backend profile branches:

| Discovery mode | Required profile branch |
| --- | --- |
| `finding_cofounder` | `startup` |
| `building_team` | `startup` |
| `explore_startups` | `talent` |
| `joining_startups` | `talent` |

Backend rules:

- If the authenticated user has the required profile branch, return the normal discovery cards response.
- If the user is a founder whose initial onboarding already created both startup and talent profiles,
  return the normal discovery cards response for every mode.
- If the required branch is missing, return the structured `DISCOVERY_ONBOARDING_REQUIRED` error.
- Backend must infer the user's state from the access token. Frontend must not send an onboarding
  branch hint.
- If an existing startup representative is missing only the talent branch and starts secondary
  onboarding for `joining_startups` or `explore_startups`, backend should route them into the
  talent/builder onboarding branch. If they choose `builder -> founder` during that secondary flow,
  backend may create or complete the talent/founder profile branch, but must not overwrite the
  existing startup profile.
- Secondary talent onboarding must preserve the existing startup identity, startup stage, team data,
  roles, traction, and representative ownership.

## Discovery Cards Endpoint

`POST /api/v1/discovery/cards`

This is the existing candidate generation endpoint used after applying discovery filters.

### Request Context

The selected mode is sent through the existing discovery request shape:

```json
{
  "context": {
    "mode": "building_team"
  },
  "filters": {
    "goalId": "goal_building_team"
  },
  "pagination": {
    "limit": 10
  }
}
```

### `409 Conflict` when onboarding is required

Use `409 Conflict` because the request is syntactically valid, but the authenticated user's account
state is incomplete for the requested mode.

```json
{
  "success": false,
  "message": "Set up your startup before using this discovery mode.",
  "error": {
    "code": "DISCOVERY_ONBOARDING_REQUIRED",
    "details": {
      "reason": "MISSING_STARTUP_PROFILE",
      "required_profile_type": "startup",
      "requested_mode": "building_team",
      "next_action": "START_ONBOARDING"
    }
  }
}
```

Supported `error.details.reason` values:

- `MISSING_STARTUP_PROFILE`: user selected `finding_cofounder` or `building_team`, but has no
  startup profile.
- `MISSING_TALENT_PROFILE`: user selected `explore_startups` or `joining_startups`, but has no
  talent/basic individual profile.

Supported `error.details.required_profile_type` values:

- `startup`
- `talent`

Supported `error.details.next_action` value:

- `START_ONBOARDING`

Recommended message copy:

- Startup branch missing: `Set up your startup before using this discovery mode.`
- Talent branch missing: `Create your individual profile before using this discovery mode.`

The frontend will display `message` from the backend. After the user taps OK, the frontend starts a
new onboarding session.

## Onboarding Start Endpoint

`POST /api/v1/onboarding/sessions`

This reuses the existing `onboarding_test` contract. The frontend sends the normal post-auth
onboarding request and does not include any discovery mode, required profile type, or branch hint.

### Request

```http
POST /api/v1/onboarding/sessions
Authorization: Bearer <token>
Accept-Language: en
Content-Type: application/json
```

```json
{
  "actor_key": "<existing FE actor key>",
  "locale": "en",
  "mode": "post_auth"
}
```

Backend behavior:

- Use the bearer token to identify the current user.
- Inspect the user's existing startup and talent profiles.
- Create or resume the onboarding session for the missing branch.
- Return the first/current step using the existing onboarding response shape.

### `201 Created` or `200 OK`

The response must reuse the existing onboarding session response shape:

```json
{
  "session_id": "ses_123",
  "status": "in_progress",
  "current_step": {
    "id": "step_...",
    "flow_key": "builder_team_member",
    "section": "Data Diri",
    "section_progress": "1/4",
    "overall_progress": {
      "current": 1,
      "total": 8
    },
    "title": "Tell us about yourself",
    "subtitle": null,
    "questions": [],
    "cta": {
      "label": "Continue",
      "enabled_when": "valid"
    },
    "can_go_back": true
  }
}
```

The frontend route already renders this flow through `onboarding_test` via `app/(auth)/onboarding.tsx`.

## Test Scenarios

- Talent-only user selects `building_team`: `POST /api/v1/discovery/cards` returns `409` with
  `DISCOVERY_ONBOARDING_REQUIRED` and `MISSING_STARTUP_PROFILE`.
- Talent-only user selects `finding_cofounder`: `POST /api/v1/discovery/cards` returns `409` with
  `DISCOVERY_ONBOARDING_REQUIRED` and `MISSING_STARTUP_PROFILE`.
- Startup-only user selects `joining_startups`: `POST /api/v1/discovery/cards` returns `409` with
  `DISCOVERY_ONBOARDING_REQUIRED` and `MISSING_TALENT_PROFILE`.
- Startup-only user selects `explore_startups`: `POST /api/v1/discovery/cards` returns `409` with
  `DISCOVERY_ONBOARDING_REQUIRED` and `MISSING_TALENT_PROFILE`.
- Founder user with both backend-created profiles switches between startup-side and talent-side
  modes: discovery returns cards and no onboarding error.
- Existing startup representative selects `joining_startups`, receives `MISSING_TALENT_PROFILE`,
  starts secondary onboarding, chooses `builder -> founder`, and completes onboarding: backend keeps
  the original startup record unchanged while enabling talent-side discovery.
- After the user taps OK on the onboarding-required message, `POST /api/v1/onboarding/sessions`
  returns the first/current step for the missing branch without frontend branch hints.
- Completing the secondary onboarding returns to the authenticated app flow.

## Frontend Expectations

- Show the backend `message` to the user.
- On OK, call `POST /api/v1/onboarding/sessions` with the existing post-auth request shape.
- Navigate into the existing onboarding route rendered by `onboarding_test`.
- Do not send `required_profile_type`, `requested_mode`, `reason`, or any other branch selector to
  the onboarding start endpoint.
