# Discovery Consumables Contract (`CON-60`)

This document clarifies the discovery API contract for swipe actions, boost-backed `super_like`,
and backend-managed spotlight activation.

## Source Of Truth

- RevenueCat is the payment and paywall provider only.
- The backend is the source of truth for:
  - remaining boosts
  - remaining spotlights
  - active spotlight window
  - next eligible spotlight activation time
  - whether `super_like` is allowed
  - whether spotlight activation is allowed

Frontend can use RevenueCat to complete a purchase flow, but usable balances and eligibility must be
read from backend responses.

## 3. Swipe Action Endpoint

`POST /api/v1/discovery/cards/{profileId}/action`

### Request

```json
{
  "action": "like"
}
```

Supported values:
- `like`
- `pass`
- `super_like`

UI copy may refer to `pass` as "dislike", but the API value remains `pass`.

### `200 OK`

`like` and `pass` always use the normal success response when accepted.

`super_like` also uses `200 OK` only when backend confirms the user still has at least one boost to
consume.

```json
{
  "success": true,
  "message": "Swipe action recorded.",
  "data": {
    "profileId": "prof_123",
    "action": "super_like",
    "isMatch": false,
    "matchId": null,
    "consumables": {
      "boosts": {
        "remaining": 2
      }
    }
  }
}
```

Minimum success fields:
- `profileId`
- `action`
- `isMatch`
- `matchId`

Recommended addition for `super_like` success:
- `consumables.boosts.remaining`

### `409 Conflict` when `super_like` has no boost

If the request is valid but backend balance is `0`, backend must deny the action and must not
persist the swipe.

```json
{
  "success": false,
  "message": "No boosts remaining.",
  "error": {
    "code": "DISCOVERY_SUPER_LIKE_REQUIRES_BOOST",
    "details": {
      "profileId": "prof_123",
      "action": "super_like",
      "requiredConsumable": "boost",
      "remaining": 0
    }
  }
}
```

Behavior requirements:
- no swipe action is persisted on this `409`
- frontend should open the boost paywall or purchase flow
- backend remains the source of truth even if RevenueCat later reports a successful purchase

## 4. Spotlight Activation Endpoint

`POST /api/v1/discovery/spotlight/activate`

Spotlight is not a swipe action. It is a separate backend-managed consumable flow.

### Activation Rules

- activating spotlight consumes `1` spotlight from backend balance
- activation starts immediately when allowed
- activation lasts for `1 hour`
- backend rejects activation when remaining spotlights are `0`
- backend rejects activation when spotlight is already active in the current window

### `200 OK`

```json
{
  "success": true,
  "message": "Spotlight activated.",
  "data": {
    "active": true,
    "startedAt": "2026-04-14T10:00:00Z",
    "endsAt": "2026-04-14T11:00:00Z",
    "remainingSpotlights": 2
  }
}
```

Success fields:
- `active`
- `startedAt`
- `endsAt`
- `remainingSpotlights`

### `409 Conflict` denial responses

When no spotlight inventory remains:

```json
{
  "success": false,
  "message": "No spotlights remaining.",
  "error": {
    "code": "DISCOVERY_SPOTLIGHT_REQUIRES_CREDIT",
    "details": {
      "remaining": 0,
      "active": false,
      "endsAt": null,
      "nextEligibleAt": null
    }
  }
}
```

When spotlight is already active:

```json
{
  "success": false,
  "message": "Spotlight is already active.",
  "error": {
    "code": "DISCOVERY_SPOTLIGHT_ALREADY_ACTIVE",
    "details": {
      "remaining": 2,
      "active": true,
      "endsAt": "2026-04-14T11:00:00Z",
      "nextEligibleAt": "2026-04-14T11:00:00Z"
    }
  }
}
```

## Optional Discovery State Payload

If discovery bootstrap or profile-status payloads already exist, expose backend-owned consumables in
that response shape:

```json
{
  "consumables": {
    "boosts": {
      "remaining": 3
    },
    "spotlights": {
      "remaining": 2,
      "current": {
        "active": true,
        "startedAt": "2026-04-14T10:00:00Z",
        "endsAt": "2026-04-14T11:00:00Z",
        "nextEligibleAt": "2026-04-14T11:00:00Z"
      }
    }
  }
}
```

Recommended fields:
- `consumables.boosts.remaining`
- `consumables.spotlights.remaining`
- `consumables.spotlights.current.active`
- `consumables.spotlights.current.endsAt`
- `consumables.spotlights.current.nextEligibleAt`

## Validation Scenarios

- `like` succeeds with `200 OK`
- `pass` succeeds with `200 OK`
- `super_like` succeeds when `boosts.remaining > 0` and decrements the balance
- `super_like` returns `409 DISCOVERY_SUPER_LIKE_REQUIRES_BOOST` when balance is `0`
- denied `super_like` does not remove the card or persist the action server-side
- spotlight activation succeeds when user has inventory and no active spotlight
- spotlight activation returns `409 DISCOVERY_SPOTLIGHT_REQUIRES_CREDIT` when inventory is `0`
- spotlight activation returns `409 DISCOVERY_SPOTLIGHT_ALREADY_ACTIVE` when spotlight is already
  active
