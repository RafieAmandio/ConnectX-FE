# Streamlined Builder Onboarding — Backend Contract Delta

This document describes what changes for the new streamlined builder onboarding flow and what must stay unchanged from the existing onboarding API contract.

## What Stays The Same

- Base API paths stay the same:
  - `POST /api/v1/onboarding/sessions`
  - `POST /api/v1/onboarding/sessions/:session_id/answer`
  - `POST /api/v1/onboarding/sessions/:session_id/back`
  - `GET /api/v1/onboarding/sessions/:session_id/current`
  - `GET /api/v1/onboarding/sessions/:session_id`
  - `GET /api/v1/onboarding/options/search`
- Request and response property names stay the same.
- Submit request body stays exactly:
  ```json
  {
    "step_id": "step_identity_details",
    "answers": {}
  }
  ```
- Step response envelope stays the same: `current_step`, `next_step`, `session_id`, `status`, `can_go_back`, `progress`, `completed`, `redirect_to`, etc.
- Existing runtime `step.id` values stay the same. Do not prefix runtime step IDs with `streamlined_`.
- Existing question IDs and answer keys stay the same.
- Existing answer value shapes stay the same.
- `Accept-Language: en | id` behavior stays the same.
- Startup path behavior is unchanged for now.
- The `streamlined_` prefix is only used for FE contract sample filenames, for example `samples/streamlined_builder-path-steps.json`.

## What Changes

The builder path is streamlined by consolidating related fields into fewer combined screens while preserving existing IDs.

### Builder Step Order

For `q_use_connectx === "builder"`, BE should return this sequence:

| Order | Step ID | Purpose |
| --- | --- | --- |
| 1 | `step_welcome` | Welcome screen |
| 2 | `step_data_diri` | Personal information |
| 3 | `step_use_connectx` | Builder vs startup intent |
| 4 | `step_identity_details` | Professional profile |
| 5 | `step_experience` | Startup experience |
| 6 | `step_founder_goal` | What are you looking for? Founder builders only |
| 7 | `step_industries_interest` | Interests and skills |
| 8 | `step_availability` | Commitment / availability |
| 9 | `step_open_to_remote` | Remote work preference |
| 10 | `step_willing_to_relocate` | Relocation preference |
| 11 | `step_credibility` | LinkedIn URL |

`step_founder_goal` is shown only when `q_builder_type === "founder"`.

### Consolidated Step Contents

`step_data_diri` now contains all personal information fields:

- `q_first_name`
- `q_last_name`
- `q_date_of_birth`
- `q_city`
- `q_gender`

`step_identity_details` for builder now contains:

- `q_builder_type`
- `q_primary_role`
- `q_years_experience`

Important: `q_builder_type` should not auto-advance in this combined step because the user still needs to complete role and years of experience.

`step_industries_interest` for builder now contains:

- `q_industries_interest`
- `q_skills`

`q_skills` is required for all builder subtypes: founder, cofounder, and team member.

## Removed From Builder Streamlined Path

The following old builder-only steps are no longer part of the streamlined builder path:

- `step_primary_role`
- `step_own_cofounder_type`
- `step_skills`
- `step_roles_needed`
- `step_cash_equity`

The answer keys from removed standalone steps may still appear inside combined steps when needed. For example, `q_primary_role`, `q_years_experience`, and `q_skills` are still used.

## Payload Keys BE Should Still Expect

The streamlined builder flow still submits existing answer keys:

- Personal info: `q_first_name`, `q_last_name`, `q_date_of_birth`, `q_city`, `q_gender`
- Intent: `q_use_connectx`
- Professional profile: `q_builder_type`, `q_primary_role`, `q_years_experience`
- Startup experience: `q_startup_experience`
- Founder goal: `q_founder_goal`
- Interests and skills: `q_industries_interest`, `q_skills`
- Work preferences: `q_availability`, `q_open_to_remote`, `q_willing_to_relocate`
- Credibility: `q_linkedin_url`

## Reference Sample

See:

- `samples/streamlined_builder-path-steps.json`

That file is a FE-facing sample of the streamlined builder step payloads. It keeps runtime IDs, question IDs, request keys, and response keys unchanged.
