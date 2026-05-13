# Context-Aware Matches, Chats, And Teams Contract

This document defines how Matches, Chat, and Team APIs should scope returned data when the user
switches the active side from the discovery filter sheet.

Profile endpoints are intentionally out of scope. Do not change `/api/v1/me/profile`,
`/api/v1/profile-options`, or public profile detail behavior for this contract.

## Summary

Use `viewer_context=startup|talent` on context-aware GET endpoints.

`viewer_context` means the side/profile the authenticated user is operating as for the request. It
does not mean the type of item being returned.

## Context Rules

### `viewer_context=startup`

The user is acting as a startup/founder.

Expected behavior:

- Matches return talent, cofounders, or team candidates.
- Chats return conversations with talent, cofounders, or team candidates.
- Team returns founder-facing data:
  - active startup summary
  - roster and members
  - required roles
  - missing roles
  - outgoing invitations
  - invite-from-matches actions

### `viewer_context=talent`

The user is acting as an individual/talent/startup joiner.

Expected behavior:

- Matches return startups.
- Chats return conversations with startups.
- Team returns joiner-facing data:
  - joined startup membership, if any
  - applications
  - received startup invitations
  - startup-facing team state for the startup the user joined, when applicable

### Account Eligibility

- Founder users may request either `startup` or `talent` if backend has both profile branches for
  them.
- Talent-only users may request `viewer_context=talent`.
- Startup-only users may request `viewer_context=startup`.
- If the requested branch is missing, backend should return `DISCOVERY_ONBOARDING_REQUIRED` using
  the contract in [discovery-mode-onboarding-contract.md](./discovery-mode-onboarding-contract.md).
- If `viewer_context` is omitted, backend may fall back to the user's default discovery mode for
  backward compatibility.

## Endpoint Contract

All endpoints below use the same bearer token auth as the rest of the app.

### Matches

```txt
GET /api/v1/matches?viewer_context=startup|talent&status=active&page=1&limit=10
GET /api/v1/matches/:matchId/analysis?viewer_context=startup|talent
```

Behavior:

- `viewer_context=startup`: return matches/analysis against talent-side counterparties.
- `viewer_context=talent`: return matches/analysis against startup-side counterparties.
- `matchId` remains globally unique.
- Backend must verify the authenticated user can access the requested match in the requested
  context.

### Chat

```txt
GET /api/v1/conversations?viewer_context=startup|talent
GET /api/v1/conversations/:conversationId/messages?viewer_context=startup|talent&limit=50&before=<cursor>
```

Behavior:

- `viewer_context=startup`: return conversations/messages with talent-side counterparties.
- `viewer_context=talent`: return conversations/messages with startup-side counterparties.
- `conversationId` remains globally unique.
- Backend must verify the authenticated user can access the requested conversation in the requested
  context.

### Team

```txt
GET /api/v1/me/startup/team-overview?viewer_context=startup|talent
GET /api/v1/me/startup/invitation-options?viewer_context=startup
GET /api/v1/me/startup-invitations?viewer_context=talent
```

Behavior:

- `viewer_context=startup`: return founder-facing team overview and invite controls.
- `viewer_context=talent`: return joiner-facing team overview and received startup invitations.
- `GET /api/v1/me/startup/invitation-options` is only meaningful for `viewer_context=startup`
  because only a startup/founder can send outgoing startup invitations.
- `GET /api/v1/me/startup-invitations` is only meaningful for `viewer_context=talent` because it
  returns incoming invitations for the user as a startup joiner.

## Mutations

Keep mutation endpoints unchanged for v1.

Examples:

- `POST /api/v1/conversations/:conversationId/messages`
- `POST /api/v1/conversations/:conversationId/read`
- `POST /api/v1/me/startup/invitations`
- `DELETE /api/v1/me/startup/invitations/:invitationId`
- `PATCH /api/v1/startups/:startupId/team-members/:memberId`
- `DELETE /api/v1/startups/:startupId/team-members/:memberId`
- `POST /api/v1/me/startup-invitations/:invitationId/respond`

Backend should infer authorization from the authenticated user and resource IDs. Do not require
`viewer_context` on these mutations unless a future version needs it.

## Response Shape

Keep existing response bodies stable.

- Matches list uses the current `MatchesListResponse`.
- Match analysis uses the current `MatchAnalysisResponse`.
- Conversations and messages use the current chat response shapes.
- Team overview uses the current `TeamOverviewResponse`.

Backend may add optional context metadata without breaking the frontend:

```json
{
  "viewer_context": "startup"
}
```

For wrapped responses, prefer `data.viewer_context`:

```json
{
  "success": true,
  "data": {
    "viewer_context": "startup",
    "items": []
  }
}
```

For current unwrapped chat responses, top-level `viewer_context` is acceptable:

```json
{
  "viewer_context": "talent",
  "conversations": []
}
```

## Onboarding-Required Error

When the user requests a context that needs a missing branch, return `409 Conflict`.

Talent-only user requesting `viewer_context=startup`:

```json
{
  "success": false,
  "message": "Set up your startup before using this mode.",
  "error": {
    "code": "DISCOVERY_ONBOARDING_REQUIRED",
    "details": {
      "reason": "MISSING_STARTUP_PROFILE",
      "required_profile_type": "startup",
      "requested_viewer_context": "startup",
      "next_action": "START_ONBOARDING"
    }
  }
}
```

Startup-only user requesting `viewer_context=talent`:

```json
{
  "success": false,
  "message": "Create your individual profile before using this mode.",
  "error": {
    "code": "DISCOVERY_ONBOARDING_REQUIRED",
    "details": {
      "reason": "MISSING_TALENT_PROFILE",
      "required_profile_type": "talent",
      "requested_viewer_context": "talent",
      "next_action": "START_ONBOARDING"
    }
  }
}
```

## Test Scenarios

- Founder requests `viewer_context=startup`: backend returns talent matches/chats and founder-facing
  team tools.
- Founder requests `viewer_context=talent`: backend returns startup matches/chats and joiner-facing
  team state.
- Talent-only user requests `viewer_context=startup`: backend returns `DISCOVERY_ONBOARDING_REQUIRED`
  with `MISSING_STARTUP_PROFILE`.
- Startup-only user requests `viewer_context=talent`: backend returns `DISCOVERY_ONBOARDING_REQUIRED`
  with `MISSING_TALENT_PROFILE`.
- Existing clients without `viewer_context` continue working through backend fallback.
- Profile endpoints are unchanged.

## Frontend Expectations

- Derive `viewer_context` from the selected discovery mode.
- Send `viewer_context` only to the GET endpoints documented here.
- Do not send `viewer_context` to profile endpoints.
- Do not require `viewer_context` on mutations for v1.
- Treat unknown response fields as optional metadata.
