# Owner Profile - Backend Contract Change

## Summary

`GET /api/v1/me/profile` must return every profile owned by the authenticated user in one normalized response.

Every authenticated account has a personal talent profile. An account may additionally own a startup profile.

The owner profile endpoint must not require `viewer_context`. The frontend should not need to switch discovery sides or parse `userRaw`, `startupRaw`, or raw LinkedIn fields to render or edit either owned profile.

This change applies only to the authenticated owner endpoint:

```http
GET /api/v1/me/profile
Authorization: Bearer <access_token>
```

Other APIs may continue using `viewer_context` when the selected discovery side affects their behavior.

## GET Response

Return both profiles together. Use `startup: null` when the user does not own a startup.

```ts
type MyProfileResponse = {
  success: boolean;
  message: string;
  data: {
    id: string;
    teamId: string | null;
    stats: {
      connections: number;
      teamsJoined: number;
      matches: number;
    };
    talent: ProfileTalentData;
    startup: ProfileStartupData | null;
    createdAt: string;
    updatedAt: string;
  };
};
```

Do not place profile-specific identity fields or sections at the root of `data`. Talent and startup profiles can represent different identities and must remain independently editable.

## Talent Profile

```ts
type ProfileNamedItem = {
  id: string;
  name: string;
};

type ProfileTalentData = {
  profileType: string;
  name: string;
  headline: string;
  photoUrl: string | null;
  location: {
    id?: string;
    city: string;
    country: string;
    display: string;
  };
  badges: {
    id: string;
    label: string;
  }[];
  sections: {
    about?: {
      kind: 'personalDescription';
      title: string;
      value: string;
    };
    personalityAndHobbies?: {
      title: string;
      items: ProfileNamedItem[];
    };
    skills?: {
      title: string;
      items: ProfileNamedItem[];
    };
    interests?: {
      title: string;
      items: ProfileNamedItem[];
    };
    experience: {
      title: string;
      items: ProfileExperienceItem[];
    };
    education: {
      title: string;
      items: ProfileEducationItem[];
    };
    highlights?: {
      items: string[];
    };
  };
};

type ProfileExperienceItem = {
  id?: string;
  title: string;
  organization: string;
  period?: string | null;
  location?: string | null;
  isCurrent?: boolean;
  companyLogo?: string | null;
  description?: string | null;
};

type ProfileEducationItem = {
  id?: string;
  degree: string;
  school: string;
  field?: string | null;
  period?: string | null;
  schoolLogo?: string | null;
  description?: string | null;
};
```

Always return `talent.sections.experience` and `talent.sections.education`. Use `items: []` when no entries exist.

### Talent Response Rules

- Always return `talent`, including for accounts that also own a startup.
- Return talent identity and sections from the personal user profile, not from the startup record.
- Return empty arrays, not `null`, for `badges`, `sections.experience.items`, and `sections.education.items`.
- `profileType` remains informational. The frontend does not use it to decide whether startup data exists; use `startup !== null` for that.

### Talent Normalization

When the source is LinkedIn data, normalize raw fields before returning the response:

| Raw LinkedIn field | Normalized talent field |
| --- | --- |
| `experience[].position` | `talent.sections.experience.items[].title` |
| `experience[].companyName` | `talent.sections.experience.items[].organization` |
| `experience[].duration` or formatted dates | `talent.sections.experience.items[].period` |
| `experience[].companyLogo.url` | `talent.sections.experience.items[].companyLogo` |
| `education[].schoolName` | `talent.sections.education.items[].school` |
| `education[].fieldOfStudy` | `talent.sections.education.items[].field` |
| `education[].schoolLogo.url` | `talent.sections.education.items[].schoolLogo` |

## Startup Profile

Return a complete normalized startup object when the user owns a startup.

```ts
type ProfileStartupData = {
  name: string;
  tagline: string;
  description: string | null;
  logoUrl: string | null;
  vision: {
    problem: string | null;
    solution: string | null;
    targetUsers: string | null;
  };
  stage: {
    value: 'idea' | 'mvp' | 'live' | 'scale';
    label: string;
    details: {
      id: string;
      label: string;
      value: string | number | null;
    }[];
  };
  industries: ProfileNamedItem[];
  links: {
    kind: 'website' | 'linkedin' | 'twitter' | 'instagram' | 'pitch_deck';
    label: string;
    url: string;
  }[];
  teamSize: number | null;
  openRoles: {
    id: string;
    title: string;
  }[];
  hiringPreferences: {
    commitment: 'full_time' | 'part_time' | null;
    equity: 'equity_only' | 'equity_and_salary' | null;
    paid: boolean | null;
  };
  sections: {
    about?: {
      kind: 'startupIdea';
      title: string;
      value: string;
    };
    skills?: {
      title: string;
      items: ProfileNamedItem[];
    };
    interests?: {
      title: string;
      items: ProfileNamedItem[];
    };
    highlights?: {
      items: string[];
    };
  };
};
```

### Startup Response Rules

- Always return `name`, `tagline`, `vision`, `stage`, `industries`, `links`, `openRoles`, `hiringPreferences`, and `sections`.
- Return empty arrays, not `null`, for `industries`, `links`, `stage.details`, and `openRoles`.
- Return nested nullable values explicitly.
- Backfill legacy records before returning them. Use `tagline: ""` when empty. If a legacy record has no stage, return a stable fallback such as `{ value: "idea", label: "Idea", details: [] }`.
- Return only links with a non-empty `url`. The `kind` field is required because the editor hydrates links by `kind`, not `label`.
- `industries[].id` must use the same IDs accepted by `PATCH industry` and `PATCH secondary_industry`.
- `openRoles[].id` must use the same IDs accepted by `PATCH open_roles`.
- `teamSize` is a numeric persisted edit value. Do not infer it from onboarding `q_team_size`, which currently stores categorical values.
- Always return `hiringPreferences`. Return each missing preference as `null`; the frontend applies UI defaults until the user saves.
- `startup.sections` is the startup-facing display content. Keep it separate from `talent.sections`.
- The Edit Startup form hydrates from the normalized startup fields outside `startup.sections`. Do not require the frontend to parse display text back into editable values.

### Startup Onboarding Mapping

| Onboarding answer | Normalized startup field |
| --- | --- |
| `q_startup_name` | `startup.name` |
| `q_startup_tagline` | `startup.tagline` |
| `q_startup_stage` | `startup.stage.value`; derive `startup.stage.label` |
| `q_problem` | `startup.vision.problem` |
| `q_solution` | `startup.vision.solution` |
| `q_target_users` | `startup.vision.targetUsers` |
| Active stage traction answers | `startup.stage.details[]` |
| `q_website` | `startup.links[kind=website]` |
| `q_startup_linkedin` | `startup.links[kind=linkedin]` |
| `q_twitter` | `startup.links[kind=twitter]` |
| `q_instagram` | `startup.links[kind=instagram]` |
| `q_pitch_deck` | `startup.links[kind=pitch_deck]` |

### Startup Stage Details

Return only details for the active startup stage:

| Stage | `stage.details[].id` | Value type |
| --- | --- | --- |
| `idea` | `q_has_prototype` | `"yes" \| "no" \| null` |
| `idea` | `q_prototype_link` | `string \| null` |
| `idea` | `q_waitlist_size` | `number \| null` |
| `idea` | `q_validation_methods` | `string \| null` |
| `mvp` | `q_user_count` | `number \| null` |
| `mvp` | `q_mau` | `number \| null` |
| `mvp` | `q_mvp_revenue` | `string \| null` |
| `mvp` | `q_growth_rate` | `string \| null` |
| `live` | `q_mrr` | `string \| null` |
| `live` | `q_live_users` | `number \| null` |
| `live` | `q_retention` | `string \| null` |
| `live` | `q_key_metrics` | `string \| null` |
| `scale` | `q_funding_raised` | `string \| null` |
| `scale` | `q_investors` | `string \| null` |
| `scale` | `q_scale_team_size` | `number \| null` |
| `scale` | `q_arr` | `string \| null` |

Return each active stage detail as `{ id, label, value }`. Missing answers may use `value: null`. Do not return inactive-stage details.

## PATCH `/api/v1/me/profile`

Update the authenticated user's personal talent profile. This endpoint remains talent-only even when the account also owns a startup.

```ts
type UpdateMyProfileRequest = {
  name: string;
  headline: string;
  photoUrl?: string | null;
  locationId: string;
  about: string;
  personalityAndHobbyIds?: string[];
  experience: ProfileExperienceItem[];
  education: ProfileEducationItem[];
};
```

### Talent PATCH Rules

- Persist personal identity fields and return them under `talent` on the next owner GET.
- Replace personal experience and education with the submitted arrays. Empty arrays clear the saved values.
- Apply `personalityAndHobbyIds` only to the talent profile. Omission means the frontend is intentionally not changing that field.
- Do not update startup identity, startup sections, or startup edit fields from this endpoint.
- A successful PATCH may keep its existing JSON response shape. The frontend refetches `GET /api/v1/me/profile`.

| PATCH field | Next owner GET field |
| --- | --- |
| `name` | `talent.name` |
| `headline` | `talent.headline` |
| `photoUrl` | `talent.photoUrl` |
| `locationId` | Resolve and return `talent.location` |
| `about` | `talent.sections.about.value` with `kind: "personalDescription"` |
| `personalityAndHobbyIds` | `talent.sections.personalityAndHobbies.items` |
| `experience` | `talent.sections.experience.items` |
| `education` | `talent.sections.education.items` |

## PATCH `/api/v1/me/startup`

Update the owned startup profile. Optional cleared values are sent as `null`. Clearing open roles sends `[]`.

```ts
type UpdateStartupProfileRequest = {
  name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  problem: string | null;
  solution: string | null;
  target_users: string | null;
  stage: 'idea' | 'mvp' | 'live' | 'scale';
  industry: string | null;
  secondary_industry: string | null;
  team_size: number | null;
  open_roles: string[];
  traction: Record<string, string | number | null>;
  website: string | null;
  linkedin: string | null;
  twitter: string | null;
  instagram: string | null;
  pitch_deck: string | null;
  commitment: 'full_time' | 'part_time' | null;
  equity: 'equity_only' | 'equity_and_salary' | null;
  paid: boolean | null;
};
```

### Startup PATCH Rules

- Treat the request as the complete supported Edit Startup state. The frontend sends every key on save.
- Clear persisted optional scalar values when the request sends `null`.
- Replace all open roles with `open_roles`. An empty array clears them.
- Replace active traction values with `traction`. Remove or ignore stale values from previous stages.
- Preserve additional startup industries beyond the primary and secondary positions unless the product intentionally removes them.

| PATCH field | Next owner GET field |
| --- | --- |
| `name` | `startup.name` |
| `tagline` | `startup.tagline`; return `""` when cleared |
| `description` | `startup.description` |
| `logo_url` | `startup.logoUrl` |
| `problem` | `startup.vision.problem` |
| `solution` | `startup.vision.solution` |
| `target_users` | `startup.vision.targetUsers` |
| `stage` | `startup.stage.value`; derive `startup.stage.label` |
| `traction` | `startup.stage.details[]` for the active stage |
| `industry`, `secondary_industry` | First two `startup.industries[]` entries |
| `team_size` | `startup.teamSize` |
| `open_roles` | `startup.openRoles[]` |
| `website`, `linkedin`, `twitter`, `instagram`, `pitch_deck` | Typed non-empty `startup.links[]` entries |
| `commitment`, `equity`, `paid` | `startup.hiringPreferences` |

After a successful PATCH, return HTTP `200` with a JSON success envelope. The frontend refetches `GET /api/v1/me/profile`, so PATCH does not need to return the full owner profile.

```ts
type UpdateStartupProfileResponse = {
  success: boolean;
  message: string;
  data: Record<string, unknown>;
};
```

## Scope

The Edit Startup UI intentionally does not edit business model, founder setup, categorical team presence, or missing skills in this version.

During rollout, the backend may continue returning `userRaw` and `startupRaw` for debugging. They are not part of the frontend contract and must not replace normalized `talent` or `startup` data.

## Rollout

This GET response shape is a breaking change from the previous flat owner-profile payload. Coordinate the backend release with the frontend owner-profile migration.

For compatibility with older app builds during rollout:

- accept an optional legacy `viewer_context` query parameter on `GET /api/v1/me/profile`;
- ignore it and return the same complete owner payload; and
- do not require `viewer_context`.
