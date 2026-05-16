# Streamlined Builder Onboarding — Backend Contract Delta

This is the backend handoff for the new builder onboarding flow in `src/features/onboarding`.
It is a delta from `BACKEND_CONTRACT.md`, not a replacement for the full API contract.

## Non-Negotiables

- Do not change endpoint paths.
- Do not change request or response property names.
- Do not change existing runtime `step.id` values.
- Do not change existing `question.id` / answer keys.
- Do not prefix runtime data with `streamlined_`.
- Use `streamlined_` only for FE sample filenames, for example `samples/streamlined_builder-path-steps.json`.
- Keep startup onboarding unchanged for now.

## API Shape That Must Stay The Same

Base path remains:

```txt
/api/v1/onboarding
```

Endpoints remain:

| Method | Path |
| --- | --- |
| `POST` | `/sessions` |
| `GET` | `/sessions/:session_id` |
| `GET` | `/sessions/:session_id/current` |
| `POST` | `/sessions/:session_id/answer` |
| `POST` | `/sessions/:session_id/back` |
| `GET` | `/options/search` |

Session start body remains:

```json
{
  "actor_key": "user-id-or-session-key",
  "locale": "en",
  "mode": "post_auth"
}
```

Submit answer body remains:

```json
{
  "step_id": "step_identity_details",
  "answers": {
    "q_builder_type": "founder",
    "q_primary_role": "software_engineer",
    "q_years_experience": 3
  }
}
```

On every Continue click, FE sends exactly one `POST /sessions/:session_id/answer` request for the current visible step.
The request includes:

- `step_id`: the current `OnboardingStep.id` returned by BE.
- `answers`: only the visible answers collected on that current step.

FE does not send renamed keys for the streamlined flow. Combined screens simply send multiple existing answer keys in the same `answers` object.

Step response envelopes remain unchanged. Continue returning the existing fields such as:

- `session_id`
- `status`
- `current_step`
- `next_step`
- `can_go_back`
- `completed`
- `profile_id`
- `progress`
- `redirect_to`

The `OnboardingStep` shape remains unchanged:

- `id`
- `flow_key`
- `section`
- `section_progress`
- `overall_progress`
- `title`
- `subtitle`
- `questions`
- `cta`
- `can_go_back`

## Builder Flow Order

For `q_use_connectx === "builder"`, BE should return the streamlined builder sequence below.

### All Builder Users

These steps are shown to every builder subtype: founder, cofounder, and team member.

| Order | Step ID | Questions |
| --- | --- | --- |
| 1 | `step_data_diri` | `q_first_name`, `q_last_name`, `q_date_of_birth`, `q_city`, `q_gender` |
| 2 | `step_use_connectx` | `q_use_connectx` |
| 3 | `step_identity_details` | `q_builder_type`, `q_primary_role`, `q_years_experience` |
| 4 | `step_experience` | `q_startup_experience` |
| 5 or 6 | `step_industries_interest` | `q_industries_interest`, `q_skills` |
| next | `step_availability` | `q_availability` |
| next | `step_open_to_remote` | `q_open_to_remote` |
| next | `step_willing_to_relocate` | `q_willing_to_relocate` |
| final | `step_credibility` | `q_linkedin_url` |

### Founder-Only Builder Step

Insert this step only when:

```txt
q_use_connectx === "builder" AND q_builder_type === "founder"
```

| Step ID | Questions |
| --- | --- |
| `step_founder_goal` | `q_founder_goal` |

This means:

- Founder builder flow total: 10 steps.
- Cofounder builder flow total: 9 steps.
- Team member builder flow total: 9 steps.

## Step Details BE Must Match

### `step_data_diri`

Keep all personal info fields on this one step:

- `q_first_name`
- `q_last_name`
- `q_date_of_birth`
- `q_city`
- `q_gender`

### `step_use_connectx`

Keep existing options:

- `builder`
- `startup`

This step may still use `meta.auto_advance: true`.

### `step_identity_details` for Builder

This is now the combined professional profile step. It must include:

- `q_builder_type`
- `q_primary_role`
- `q_years_experience`

Important:

- Do not set `meta.auto_advance: true` on `q_builder_type` in this combined builder step.
- The user must choose builder type, role, and years before submitting.
- Keep `q_primary_role` as `searchable_dropdown`.
- Keep `q_years_experience` as `number`.

Startup still uses the existing startup version of `step_identity_details`.

### `step_experience`

Keep existing `q_startup_experience` options and answer values.

This step may still use `meta.auto_advance: true`.

### `step_founder_goal`

Show only for builder founders and startup path where already applicable.

For builder, only show it when:

```txt
q_builder_type === "founder"
```

Keep existing answer values:

- `cofounder`
- `team_members`
- `both`

### `step_industries_interest` for Builder

This is now the combined interests and skills step. It must include:

- `q_industries_interest`
- `q_skills`

Important:

- `q_industries_interest` remains `searchable_multi_select`, min 1, max 5.
- `q_skills` remains `searchable_multi_select`, min 1, max 10.
- `q_skills` is required for every builder subtype, including founder and cofounder.

Startup still uses `step_startup_industries` and `step_skills_needed` as before.

### Work Preference Steps

Keep these as standalone builder steps:

- `step_availability` with `q_availability`
- `step_open_to_remote` with `q_open_to_remote`
- `step_willing_to_relocate` with `q_willing_to_relocate`

These may keep existing auto-advance behavior.

### `step_credibility`

Keep this as the final builder step.

- Question: `q_linkedin_url`
- CTA label: `Finish`
- On successful submit, BE may return `completed: true`.

## Builder Steps Removed From The Streamlined Builder Path

Do not return these standalone steps in the streamlined builder path:

- `step_primary_role`
- `step_own_cofounder_type`
- `step_skills`
- `step_roles_needed`
- `step_cash_equity`

Notes:

- Their answer keys may still be used inside combined steps.
- Example: `q_primary_role` and `q_years_experience` now live in `step_identity_details`.
- Example: `q_skills` now lives in `step_industries_interest`.
- `step_cofounder_type` is not part of builder anymore; keep it only for the existing startup path if startup still needs it.

## Flow Keys

Keep existing `flow_key` values.

Recommended builder behavior:

- Before `q_builder_type` is known: `common_data_diri`.
- `q_builder_type === "cofounder"`: `builder_cofounder`.
- `q_builder_type === "team_member"`: `builder_team_member`.
- `q_builder_type === "founder"` and `q_founder_goal === "cofounder"`: `builder_founder_cofounder`.
- `q_builder_type === "founder"` and `q_founder_goal === "team_members"`: `builder_founder_team_members`.
- `q_builder_type === "founder"` and `q_founder_goal === "both"`: `builder_founder_both`.

If founder has selected `q_builder_type` but not yet answered `q_founder_goal`, returning `common_data_diri` is acceptable until the founder goal is known.

## Option Search Expectations

The FE can render large option lists either from full `options` arrays in the step payload or from `GET /options/search`.

BE should support these question IDs for option search:

- `q_city`
- `q_primary_role`
- `q_roles_needed`
- `q_industries_interest`
- `q_skills`
- `q_skills_needed`
- `q_business_model`

Expected query format:

```txt
GET /api/v1/onboarding/options/search?q=fe&question_id=q_city
Accept-Language: en
```

Expected response shape remains:

```json
{
  "options": [
    {
      "id": "opt_city_jakarta",
      "value": "jakarta",
      "label": "Jakarta, Indonesia",
      "sub_label": null,
      "icon": null,
      "group": "Indonesia"
    }
  ]
}
```

## Payload Keys BE Should Expect

The streamlined builder flow submits these existing keys:

| Area | Keys |
| --- | --- |
| Personal info | `q_first_name`, `q_last_name`, `q_date_of_birth`, `q_city`, `q_gender` |
| Intent | `q_use_connectx` |
| Professional profile | `q_builder_type`, `q_primary_role`, `q_years_experience` |
| Startup experience | `q_startup_experience` |
| Founder goal | `q_founder_goal` |
| Interests and skills | `q_industries_interest`, `q_skills` |
| Work preferences | `q_availability`, `q_open_to_remote`, `q_willing_to_relocate` |
| Credibility | `q_linkedin_url` |

Do not expect old builder-only keys that no longer appear in the streamlined builder path:

- `q_own_cofounder_type`
- `q_roles_needed`
- `q_cash_equity_expectation`
- `q_has_salary_minimum`
- `q_salary_period`
- `q_minimum_salary`

## Continue Request Examples

These examples show the exact request shape FE sends when the user taps Continue.

### `step_data_diri`

```json
{
  "step_id": "step_data_diri",
  "answers": {
    "q_first_name": "Dio",
    "q_last_name": "Wijaya",
    "q_date_of_birth": "1998-05-12",
    "q_city": "jakarta",
    "q_gender": "male"
  }
}
```

### `step_use_connectx`

This may be submitted automatically after selection because the existing step uses auto-advance.

```json
{
  "step_id": "step_use_connectx",
  "answers": {
    "q_use_connectx": "builder"
  }
}
```

### `step_identity_details` Builder Variant

This is a combined screen. `q_builder_type`, `q_primary_role`, and `q_years_experience` are submitted together.

```json
{
  "step_id": "step_identity_details",
  "answers": {
    "q_builder_type": "founder",
    "q_primary_role": "software_engineer",
    "q_years_experience": 3
  }
}
```

### `step_experience`

This may be submitted automatically after selection because the existing step uses auto-advance.

```json
{
  "step_id": "step_experience",
  "answers": {
    "q_startup_experience": "built"
  }
}
```

### `step_founder_goal`

Only sent for founder builders.

```json
{
  "step_id": "step_founder_goal",
  "answers": {
    "q_founder_goal": "both"
  }
}
```

### `step_industries_interest` Builder Variant

This is a combined screen. `q_industries_interest` and `q_skills` are submitted together.

```json
{
  "step_id": "step_industries_interest",
  "answers": {
    "q_industries_interest": ["ai", "fintech"],
    "q_skills": ["typescript", "product_strategy"]
  }
}
```

### `step_availability`

```json
{
  "step_id": "step_availability",
  "answers": {
    "q_availability": "full_time"
  }
}
```

### `step_open_to_remote`

```json
{
  "step_id": "step_open_to_remote",
  "answers": {
    "q_open_to_remote": "yes"
  }
}
```

### `step_willing_to_relocate`

```json
{
  "step_id": "step_willing_to_relocate",
  "answers": {
    "q_willing_to_relocate": "no"
  }
}
```

### `step_credibility`

```json
{
  "step_id": "step_credibility",
  "answers": {
    "q_linkedin_url": "https://linkedin.com/in/dio"
  }
}
```

## Progress And Back Behavior

BE remains authoritative for progress and back navigation.

Expected progress totals:

- Founder builder: total 10.
- Cofounder builder: total 9.
- Team member builder: total 9.
- Startup: unchanged from existing contract.

`POST /sessions/:session_id/back` should move to the previous effective step in the branch-specific sequence.

When going back before `q_builder_type` or `q_founder_goal` is known, recompute the effective order from stored answers exactly as the existing engine does.

## Completion

For builder, completion should happen after successfully submitting `step_credibility`.

Expected final response shape remains:

```json
{
  "can_go_back": true,
  "completed": true,
  "next_step": null,
  "profile_id": "profile_123",
  "progress": {
    "current": 10,
    "total": 10
  },
  "redirect_to": "/home"
}
```

`progress.total` should match the actual branch total.

## Reference Files

- Full existing API contract: `BACKEND_CONTRACT.md`
- Streamlined builder sample payloads: `samples/streamlined_builder-path-steps.json`
- Current FE mock implementation: `../mock/registry.ts` and `../mock/common-steps.ts`
