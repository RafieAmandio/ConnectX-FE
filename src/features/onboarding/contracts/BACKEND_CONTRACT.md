# ConnectX Onboarding — Backend Contract

Source of truth for the Dynamic Onboarding Engine. The frontend is a dumb renderer: it sends answers, the backend decides what step comes next. Every shape below mirrors what the FE already consumes via `src/features/onboarding/services/onboarding-session-service.ts` and `src/features/onboarding/types/onboarding.types.ts`.

## 1. Base URL & auth

```
Base URL: /api/v1/onboarding
Auth:     Bearer token (same JWT the rest of the app uses)
Locale:   Accept-Language: "en" | "id"   (falls back to "en")
```

All localized strings (`label`, `title`, `subtitle`, `sub_label`, `helper_text`, `placeholder`, option labels) MUST be server-rendered in the requested locale. The FE does no translation.

## 2. Endpoint list

| Method | Path                                     | Purpose                                           |
| ------ | ---------------------------------------- | ------------------------------------------------- |
| POST   | `/sessions`                              | Create or resume session. Returns first step.     |
| GET    | `/sessions/:session_id`                  | Full session + current step (resume-from-anywhere)|
| GET    | `/sessions/:session_id/current`          | Just the current step (cheap reload)              |
| POST   | `/sessions/:session_id/answer`           | Submit answers for the current step               |
| POST   | `/sessions/:session_id/back`             | Rewind one step                                   |

## 3. Core types

```ts
// ─── Primitives ────────────────────────────────────────────────
type OnboardingLocale  = 'en' | 'id';
type OnboardingMode    = 'preview' | 'post_auth';
type OnboardingStatus  = 'in_progress' | 'completed';

// Possible answer values (discriminated by question.type)
type CurrencyAmountValue = { amount: string; currency: string };
type OnboardingAnswerValue =
  | string
  | number
  | string[]
  | CurrencyAmountValue
  | null;

type OnboardingAnswers = Record<string, OnboardingAnswerValue | undefined>;

// ─── Step envelope (every endpoint that returns a step uses this) ──
type OnboardingStep = {
  id: OnboardingStepId;            // see §5
  flow_key: OnboardingFlowKey;     // see §6
  section: string;                 // e.g. "Let's build your talent profile"
  section_progress: string;        // e.g. "2/4"  (display only)
  overall_progress: { current: number; total: number };
  title: string;
  subtitle: string | null;
  questions: OnboardingQuestion[]; // see §4
  cta: {
    label: string;                 // e.g. "Continue"
    enabled_when: 'always' | 'valid';
  };
  can_go_back: boolean;
};

// ─── Question ──────────────────────────────────────────────────
type OnboardingQuestion = {
  id: string;                      // e.g. "q_first_name"
  type: OnboardingQuestionType;    // see §4
  label: string;
  sub_label?: string | null;
  helper_text?: string | null;
  placeholder?: string | null;
  required: boolean;
  options?: OnboardingOption[];
  validation?: OnboardingValidation;
  meta?: OnboardingQuestionMeta;
  depends_on?: OnboardingDependsOn;
};

type OnboardingOption = {
  id: string;                      // e.g. "opt_builder"
  value: string;                   // stable machine value — FE stores this
  label: string;
  sub_label?: string | null;
  icon?: string | null;            // icon key — see §4.3
  group?: string | null;           // used by grouped renderers
};

type OnboardingValidation = {
  min?: number;                    // number range
  max?: number;
  min_length?: number;             // string length OR selection count
  max_length?: number;
  min_selections?: number;         // array length (multi-select)
  max_selections?: number;
};

type OnboardingQuestionMeta = {
  auto_advance?: boolean;          // single_select_card only
  layout?: 'grid_2' | 'list';
  searchable?: boolean;
  amount_label?: string;
  amount_placeholder?: string;
  currency_label?: string;
};

type OnboardingDependsOn = {
  question_id: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'exists';
  value?: OnboardingAnswerValue;
};
```

## 4. Question types

### 4.1 Type enum

```ts
type OnboardingQuestionType =
  // free text
  | 'text' | 'textarea' | 'number' | 'date' | 'email' | 'url' | 'phone'
  // single-choice
  | 'single_select_card'           // big cards w/ icon + sub_label
  | 'single_select_chip'           // compact pill chips
  | 'single_select_radio'          // radio list with checkmark
  | 'dropdown'                     // native-style select (overlay)
  | 'searchable_dropdown'          // dropdown with inline search
  | 'searchable_single_select'     // inline grouped checklist, single value
  | 'segmented'                    // horizontal segmented control
  | 'grouped_list'                 // chip grid grouped by category
  // multi-choice
  | 'multi_select_card'
  | 'multi_select_chip'
  | 'searchable_multi_select'      // inline grouped checklist, many values
  // composite
  | 'currency_amount';             // { amount, currency } pair
```

### 4.2 Answer value shape per type

| Type                       | Stored value          | Example                              |
| -------------------------- | --------------------- | ------------------------------------ |
| `text` / `textarea`        | `string`              | `"ConnectX"`                         |
| `email` / `url` / `phone`  | `string`              | `"dio@connectx.app"`                 |
| `date`                     | `string` (YYYY-MM-DD) | `"1998-05-12"`                       |
| `number`                   | `number`              | `3`                                  |
| `single_select_*`          | `string` (option.value) | `"builder"`                        |
| `dropdown` / `searchable_dropdown` | `string`      | `"jakarta"`                          |
| `searchable_single_select` | `string`              | `"saas"`                             |
| `segmented`                | `string`              | `"annual"`                           |
| `multi_select_*`           | `string[]`            | `["engineering","growth"]`           |
| `searchable_multi_select`  | `string[]`            | `["ai","saas","fintech"]`            |
| `grouped_list`             | `string`              | `"jakarta"`                          |
| `currency_amount`          | `CurrencyAmountValue` | `{ amount: "5000", currency: "USD" }`|

### 4.3 Known `icon` keys

The FE maps these to bundled icon assets. Unknown keys fall back to a default orange circle.

**Flow-level:** `team`, `rocket`, `founder_rocket`, `cofounder_handshake`, `team_member_group`, `goal_cofounder`, `goal_team_members`, `goal_both`, `yes`, `no`, `female`, `male`, `calendar`, `clock`

**Experience:** `exp_founded`, `exp_built`, `exp_worked`, `exp_none`

**Availability:** `availability_full_time`, `availability_part_time`, `availability_flexible`

**Co-founder specialty:** `cofounder_technical`, `cofounder_business`, `cofounder_product`, `cofounder_growth`, `cofounder_ai`, `cofounder_operations`, `cofounder_finance`, `cofounder_partnerships`

**Founder/team setup:** `founder_solo`, `founder_two`, `founder_three_plus`, `team_size_small`, `team_size_medium`, `team_size_large`

### 4.4 `depends_on` semantics

A question is only rendered and validated when its `depends_on` condition matches the current answers.

```ts
// "show me if stage === 'idea'"
{ question_id: "q_startup_stage", operator: "equals", value: "idea" }

// "show me if salary minimum is strict OR flexible"
{ question_id: "q_has_salary_minimum", operator: "in", value: ["yes_strict","yes_flexible"] }

// "show me if founder_count is not 'solo'"
{ question_id: "q_founder_count", operator: "not_equals", value: "solo" }
```

The BE MUST NOT validate or store answers for hidden questions. The FE also filters them client-side in `getVisibleQuestions()`.

## 5. Step catalog

Every possible `step.id`. The same ID can materialize with different questions depending on answers (e.g. `step_identity_details` varies between builder and startup).

### 5.1 Common preamble (all flows)

| Step ID               | When shown | Key questions                                         |
| --------------------- | ---------- | ----------------------------------------------------- |
| `step_welcome`        | always     | *none* — just a marketing panel                       |
| `step_data_diri`      | always     | `q_first_name`, `q_last_name`, `q_date_of_birth`, `q_city`, `q_gender` |
| `step_use_connectx`   | always     | `q_use_connectx` ∈ {`builder`, `startup`}             |
| `step_identity_details` | always   | Builder: `q_builder_type`. Startup: `q_startup_name`, `q_startup_tagline`, `q_startup_stage` |

### 5.2 Builder path (`q_use_connectx === "builder"`)

| Step ID                 | When shown                                         | Key questions |
| ----------------------- | -------------------------------------------------- | ------------- |
| `step_primary_role`     | always                                             | `q_primary_role`, `q_years_experience` |
| `step_experience`       | always                                             | `q_startup_experience` |
| `step_founder_goal`     | `q_builder_type === "founder"`                     | `q_founder_goal` ∈ {`cofounder`,`team_members`,`both`} |
| `step_industries_interest` | always                                          | `q_industries_interest` (multi, max 5) |
| `step_own_cofounder_type` | `q_builder_type === "cofounder"`                 | `q_own_cofounder_type` |
| `step_skills`           | `q_builder_type === "team_member"`                 | `q_skills` (multi, max 10) |
| `step_cofounder_type`   | `q_builder_type === "founder" && q_founder_goal ∈ {cofounder,both}` | `q_cofounder_type` (multi) |
| `step_roles_needed`     | `q_builder_type === "founder" && q_founder_goal ∈ {team_members,both}` | `q_roles_needed` (multi) |
| `step_availability`     | always                                             | `q_availability` |
| `step_cash_equity`      | `q_builder_type ∈ {cofounder, team_member}`        | `q_cash_equity_expectation`, `q_has_salary_minimum`, `q_salary_period`*, `q_minimum_salary`* |
| `step_open_to_remote`   | always                                             | `q_open_to_remote` (yes/no) |
| `step_willing_to_relocate` | always                                          | `q_willing_to_relocate` (yes/no) |
| `step_credibility`      | always                                             | `q_linkedin_url` |

`*` = depends_on `q_has_salary_minimum ∈ {yes_strict, yes_flexible}`.

### 5.3 Startup path (`q_use_connectx === "startup"`)

| Step ID                   | Key questions                                                      |
| ------------------------- | ------------------------------------------------------------------ |
| `step_problem_solution`   | `q_problem`, `q_solution`, `q_target_users`                        |
| `step_startup_industries` | `q_industries_interest` (multi, max 5)                             |
| `step_business_model`     | `q_business_model` (searchable_single_select)                      |
| `step_traction`           | Dynamic — see §5.4                                                 |
| `step_online_presence`    | `q_website`, `q_startup_linkedin`, `q_twitter`, `q_instagram`, `q_pitch_deck` (all optional) |
| `step_founder_setup`      | `q_founder_count`, `q_covered_roles`*                              |
| `step_team_presence`      | `q_has_team`, `q_team_size`*, `q_team_roles`*                      |
| `step_founder_goal`       | `q_founder_goal`                                                   |
| `step_cofounder_type`     | `q_cofounder_type` (if `q_founder_goal ∈ {cofounder, both}`)       |
| `step_skills_needed`      | `q_skills_needed` (searchable_multi_select over `skillOptions`, max 10) |

`*` = conditional follow-ups (covered_roles if not solo; team_size/team_roles if has_team === "yes").

Builder-only steps (`step_primary_role`, `step_experience`, `step_industries_interest`, `step_availability`, `step_cash_equity`, `step_open_to_remote`, `step_willing_to_relocate`, `step_credibility`) MUST be skipped on the startup path.

### 5.4 Dynamic traction branches

`step_traction` shows different questions keyed on `q_startup_stage`:

| Stage value | Visible questions                                                              |
| ----------- | ------------------------------------------------------------------------------ |
| `idea`      | `q_has_prototype` (required), `q_prototype_link` (if yes), `q_waitlist_size`, `q_validation_methods` |
| `mvp`       | `q_user_count` (required), `q_mau`, `q_mvp_revenue`, `q_growth_rate`           |
| `live`      | `q_mrr`, `q_live_users` (both required), `q_retention`, `q_key_metrics`        |
| `scale`     | `q_funding_raised`, `q_scale_team_size`, `q_arr` (all required), `q_investors` |

## 6. Flow keys

Returned on every step so FE can segment analytics / route post-onboarding.

```ts
type OnboardingFlowKey =
  | 'common_data_diri'           // until use_connectx is picked
  | 'builder_founder_cofounder'  // founder recruiting a cofounder
  | 'builder_founder_team_members'
  | 'builder_founder_both'
  | 'builder_cofounder'          // joining as cofounder
  | 'builder_team_member'        // joining as team member
  | 'startup_representative';    // startup rep
```

Resolution rules (see `resolveFlowKey()` in `registry.ts`):

```
q_use_connectx === "startup"                          → startup_representative
q_builder_type === "cofounder"                        → builder_cofounder
q_builder_type === "team_member"                      → builder_team_member
q_builder_type === "founder" & q_founder_goal:
    "cofounder"                                       → builder_founder_cofounder
    "team_members"                                    → builder_founder_team_members
    "both"                                            → builder_founder_both
else                                                  → common_data_diri
```

## 7. Endpoint details

### 7.1 `POST /sessions` — start or resume

**Request**
```json
{
  "actor_key": "usr_abc123",
  "mode": "post_auth",
  "locale": "en"
}
```

**Response `201 Created`**
```json
{
  "session_id": "ses_01HSXYZABC123",
  "status": "in_progress",
  "current_step": { /* OnboardingStep — see §3 */ }
}
```

If a session already exists for `actor_key + mode`, return it (same shape, current step = where the user left off). Idempotent.

### 7.2 `GET /sessions/:session_id` — full session

**Response `200 OK`**
```json
{
  "session": {
    "id": "ses_01HSXYZABC123",
    "user_id": "usr_abc123",
    "status": "in_progress",
    "flow_key": "builder_founder_cofounder",
    "locale": "en",
    "started_at": "2026-04-12T08:45:00.000Z",
    "updated_at": "2026-04-12T08:47:20.000Z",
    "completed_at": null,
    "profile_id": null,
    "current_step_id": "step_founder_goal",
    "step_history": [
      "step_welcome","step_data_diri","step_use_connectx",
      "step_identity_details","step_primary_role","step_experience",
      "step_founder_goal"
    ],
    "answers": {
      "q_first_name": "Dio",
      "q_use_connectx": "builder",
      "q_builder_type": "founder",
      "q_primary_role": "frontend_engineer",
      "q_years_experience": 4,
      "q_startup_experience": "built"
    }
  },
  "current_step": { /* OnboardingStep */ }
}
```

### 7.3 `GET /sessions/:session_id/current` — current step only

**Response `200 OK`**
```json
{ /* OnboardingStep */ }
```

Same shape as `current_step` in §7.2 but no enclosing envelope. Use on reload when the FE already has the session id.

### 7.4 `POST /sessions/:session_id/answer` — submit answers

**Request**
```json
{
  "step_id": "step_data_diri",
  "answers": {
    "q_first_name": "Dio",
    "q_last_name": "Pratama",
    "q_date_of_birth": "1998-05-12",
    "q_city": "jakarta",
    "q_gender": "male"
  }
}
```

Contract:
- `step_id` MUST match the session's current step. If it doesn't, reply `409 Conflict` with `{ "error": "step_mismatch", "current_step_id": "..." }` and let the FE re-sync via `GET /current`.
- Only send answers for questions *currently visible* on the step (hidden depends_on branches are the BE's responsibility to ignore).
- Answers MAY be partial updates; BE merges into the session's answer blob.

**Response `200 OK` (advance)**
```json
{
  "next_step": { /* OnboardingStep */ },
  "progress": { "current": 4, "total": 12 },
  "can_go_back": true
}
```

**Response `200 OK` (completion — final step)**
```json
{
  "next_step": null,
  "completed": true,
  "profile_id": "prof_01HSXYZABC123",
  "redirect_to": "/(tabs)",
  "can_go_back": false
}
```

`profile_id` is the materialized `user_profiles` row created from the answer blob. `redirect_to` is an Expo Router path — the FE navigates there on completion.

**Response `422 Unprocessable Entity` (validation failed)**
```json
{
  "error": "validation_failed",
  "errors": {
    "q_first_name": "First name is required.",
    "q_date_of_birth": "Use the YYYY-MM-DD format.",
    "q_city": "Pick a city from the list."
  }
}
```

Error messages MUST be localized (match the session's locale). Keys are question ids. The FE places errors under each field.

### 7.5 `POST /sessions/:session_id/back` — rewind

**Request**: empty body.

**Response `200 OK`**
```json
{
  "previous_step": { /* OnboardingStep */ },
  "progress": { "current": 2, "total": 12 }
}
```

BE pops the last entry off `step_history` and returns whatever step the user was on before. The previous step's answers are preserved so the FE can pre-fill.

If `can_go_back === false` on the current step (e.g. welcome), BE MUST reply `409 Conflict` with `{ "error": "cannot_go_back" }`.

## 8. Validation rules (BE must enforce)

Mirror these to match the FE's `validateStepAnswers()`:

| Rule                                    | Source field                            |
| --------------------------------------- | --------------------------------------- |
| Required field missing                  | `question.required === true`            |
| String too short / too long             | `validation.min_length`, `max_length`   |
| Number out of range                     | `validation.min`, `validation.max`      |
| Too few / too many selections           | `validation.min_selections`, `max_selections` |
| Invalid email                           | `type === "email"`                      |
| Invalid URL (must start with http/https)| `type === "url"`                        |
| Invalid YYYY-MM-DD                      | `type === "date"`                       |
| Invalid phone format                    | `type === "phone"`                      |

Hidden questions (unmatched `depends_on`) are always valid.

## 9. Session lifecycle

```
┌──────────┐     create/resume     ┌─────────────┐
│   none   │ ─────────────────────▶│ in_progress │
└──────────┘                       └──────┬──────┘
                                          │
                                  submit answer
                                          │
                   ┌──────────────────────┴──────────────────┐
                   │                                          │
             has next step                            final step submitted
                   │                                          │
                   ▼                                          ▼
            in_progress (new step)                    ┌───────────────┐
                                                       │   completed   │
                                                       └───────┬───────┘
                                                               │
                                                 materialize user_profiles row
                                                               │
                                                               ▼
                                                       returns profile_id
```

- A user can have at most one `in_progress` session per `mode` (`preview` vs `post_auth`).
- On completion, BE materializes a typed `user_profiles` (or `startup_profiles`) row and sets `profile_id`. The session row is kept for audit.
- `locale` is captured at session start. If a user switches app language mid-flow, FE passes the new locale via `Accept-Language` and BE re-renders labels; stored answers are unaffected.

## 10. Answer blob reference

Every question id that may appear in `session.answers`. Group by step for readability.

### Common
```
q_first_name: string
q_last_name: string (optional)
q_date_of_birth: string (YYYY-MM-DD)
q_city: string
q_gender: "female" | "male"
q_use_connectx: "builder" | "startup"
```

### Builder identity
```
q_builder_type: "founder" | "cofounder" | "team_member"
q_primary_role: string (role value from primaryRoleOptions)
q_years_experience: number
q_startup_experience: "founded" | "built" | "worked" | "none"
```

### Founder recruiting
```
q_founder_goal: "cofounder" | "team_members" | "both"
q_cofounder_type: string[]  (e.g. ["technical","product"])
q_roles_needed: string[]
```

### Builder joining
```
q_own_cofounder_type: "technical" | "business" | "product" | "growth" | "ai" | "operations" | "finance" | "partnerships"
q_skills: string[]  (values from skillOptions)
```

### Work preferences
```
q_industries_interest: string[]  (max 5, from industryOptions)
q_availability: "full_time" | "part_time" | "flexible"
q_open_to_remote: "yes" | "no"
q_willing_to_relocate: "yes" | "no"
q_linkedin_url: string
```

### Compensation (builder joining only)
```
q_cash_equity_expectation: "equity_important" | "some_equity" | "cash_heavy"
q_has_salary_minimum: "yes_strict" | "yes_flexible" | "no_flexible"
q_salary_period: "annual" | "hourly"                  // if salary minimum
q_minimum_salary: { amount: string; currency: string } // if salary minimum
```

### Startup identity & vision
```
q_startup_name: string
q_startup_tagline: string
q_startup_stage: "idea" | "mvp" | "live" | "scale"
q_problem: string
q_solution: string
q_target_users: string
q_business_model: string  (value from businessModelOptions)
```

### Startup traction (depends on stage)
```
// idea
q_has_prototype: "yes" | "no"
q_prototype_link: string   (if has_prototype === "yes")
q_waitlist_size: number
q_validation_methods: string

// mvp
q_user_count: number
q_mau: number
q_mvp_revenue: string
q_growth_rate: string

// live
q_mrr: string
q_live_users: number
q_retention: string
q_key_metrics: string

// scale
q_funding_raised: string
q_investors: string
q_scale_team_size: number
q_arr: string
```

### Startup presence & team
```
q_website: string
q_startup_linkedin: string
q_twitter: string
q_instagram: string
q_pitch_deck: string

q_founder_count: "solo" | "two" | "three_plus"
q_covered_roles: string[]   (if not solo)
q_has_team: "yes" | "no"
q_team_size: "small" | "medium" | "large"    (if has_team === "yes")
q_team_roles: string[]                        (if has_team === "yes")
q_skills_needed: string[]                     (values from skillOptions)
```

## 11. Sample payloads (end-to-end)

### 11.1 Builder → Founder → Cofounder, final answers
```json
{
  "q_first_name": "Dio",
  "q_last_name": "Pratama",
  "q_date_of_birth": "1998-05-12",
  "q_city": "jakarta",
  "q_gender": "male",
  "q_use_connectx": "builder",
  "q_builder_type": "founder",
  "q_primary_role": "frontend_engineer",
  "q_years_experience": 4,
  "q_startup_experience": "built",
  "q_founder_goal": "cofounder",
  "q_industries_interest": ["ai","saas","fintech"],
  "q_cofounder_type": ["business","growth"],
  "q_availability": "full_time",
  "q_open_to_remote": "yes",
  "q_willing_to_relocate": "no",
  "q_linkedin_url": "https://linkedin.com/in/diopratama"
}
```

### 11.2 Startup representative, stage=mvp, recruiting cofounder
```json
{
  "q_first_name": "Dio",
  "q_date_of_birth": "1998-05-12",
  "q_city": "jakarta",
  "q_gender": "male",
  "q_use_connectx": "startup",
  "q_startup_name": "ConnectX",
  "q_startup_tagline": "Find the people you need",
  "q_startup_stage": "mvp",
  "q_problem": "Builders waste weeks vetting random DMs...",
  "q_solution": "Structured matching based on goals + skills...",
  "q_target_users": "Early-stage founders in SEA",
  "q_industries_interest": ["saas","future_of_work"],
  "q_business_model": "saas",
  "q_user_count": 350,
  "q_mau": 120,
  "q_mvp_revenue": "$500 MRR",
  "q_growth_rate": "25% MoM",
  "q_website": "https://connectx.app",
  "q_startup_linkedin": "https://linkedin.com/company/connectx",
  "q_founder_count": "two",
  "q_covered_roles": ["technical","product"],
  "q_has_team": "no",
  "q_founder_goal": "cofounder",
  "q_cofounder_type": ["business","growth"],
  "q_skills_needed": ["paid_ads","lead_generation","b2b_b2c_sales"]
}
```

## 12. Non-goals / notes for BE

- **No server push.** Onboarding is strictly request/response. No websockets.
- **Answers are the source of truth during onboarding.** BE should store the raw JSON blob in `onboarding_sessions.answers` and only project to `user_profiles` on completion.
- **Do not re-order steps.** The FE's `ONBOARDING_STEP_ORDER` and gating rules in `getEffectiveStepOrder()` are duplicated on the client for optimistic UX. BE is authoritative — if BE and FE disagree, the FE re-syncs via `GET /current`.
- **Step history is append-only** except on `back`, which pops exactly one entry.
- **Idempotency on retry.** `POST /answer` with the same `step_id` + same answers must be safe to retry (same response, no double-advance).
