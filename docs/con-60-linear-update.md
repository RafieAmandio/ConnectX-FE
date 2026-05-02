# Discovery Home API Contract (`CON-60`)

References:
- `CON-64` for `super_like`
- `CON-65` for rewind

## Summary
- Discovery filters are frontend-owned.
- The backend contract only owns:
  - `GET /api/v1/discovery/filter-options`
  - `POST /api/v1/discovery/cards`
  - `POST /api/v1/discovery/cards/:targetId/action`
- The swipe feed response is a discriminated union:
  - `entityType: "profile"` for `finding_cofounder` and `building_team`
  - `entityType: "startup"` for `explore_startups` and `joining_startups`
- Premium filters remain visible in the app, but backend must still validate premium-only ids and reject unauthorized requests with `PREMIUM_REQUIRED`.

## Auth Model
Protected discovery endpoints require:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

The backend resolves the current user from the token.

## Ownership Model

### Frontend owns
- Filter section structure
- Filter section order
- Labels, descriptions, and option labels
- Local premium/locked presentation
- Visual-only UI behavior such as icons, collapse defaults, helper copy, and search UX

### Backend owns
- Accepted request schema
- Canonical ids used in filter payloads
- Validation of mode-specific filter payloads
- Premium enforcement
- Ranked discovery results
- Match score calculation
- Distance calculation
- Excluding the current user and already-swiped targets

### Filter options rule
`GET /api/v1/discovery/filter-options` provides backend-owned dynamic filter options for the active discovery mode.

The frontend owns section order, local premium presentation, and visual behavior. The backend owns canonical dynamic option values, including city options. The frontend sends only selected ids/values when the user presses `Generate Candidates`.

## Filter Options Endpoint

### Endpoint

```http
GET /api/v1/discovery/filter-options?mode=finding_cofounder
```

### Query Parameters
- `mode`: one of `finding_cofounder`, `building_team`, `explore_startups`, `joining_startups`.

### Response Shape

```json
{
  "success": true,
  "message": "Discovery filter options fetched successfully",
  "data": {
    "mode": "finding_cofounder",
    "city": {
      "id": "q_city",
      "type": "searchable_dropdown",
      "placeholder": "Search a city",
      "required": true,
      "meta": { "searchable": true },
      "options": [
        { "id": "opt_city_jakarta", "label": "Jakarta", "value": "jakarta", "group": "Indonesia" },
        { "id": "opt_city_bandung", "label": "Bandung", "value": "bandung", "group": "Indonesia" },
        { "id": "opt_city_singapore", "label": "Singapore", "value": "singapore", "group": "Singapore" },
        { "id": "opt_city_bangalore", "label": "Bangalore", "value": "bangalore", "group": "India" },
        { "id": "opt_city_hcmc", "label": "Ho Chi Minh City", "value": "hcmc", "group": "Vietnam" },
        { "id": "opt_city_dubai", "label": "Dubai", "value": "dubai", "group": "United Arab Emirates" }
      ]
    },
    "industries": [],
    "skills": [],
    "roles": [],
    "languages": []
  }
}
```

### City Filter Rules
- `city.id` is the UI/question id from the filter-options response.
- `city.options[].id` is the UI option id.
- `city.options[].value` is the canonical value sent in `POST /api/v1/discovery/cards`.
- The frontend sends selected city as `filters.locationAvailability.city`.

## Premium Validation Rules
- Non-premium users can call discovery cards with:
  - no filters
  - basic/unlocked filters
- Premium-only filter ids may still be visible in the UI, but backend must reject them when the caller is not entitled.
- Premium users can submit both basic and premium filters.
- `{}` and partial request bodies are valid for all authenticated users.
- Premium users may receive AI-personalized default discovery when the request is empty or partial.

Premium validation error:

```json
{
  "success": false,
  "message": "Premium subscription required to use advanced discovery filters",
  "error": {
    "code": "PREMIUM_REQUIRED"
  }
}
```

## Frontend Filter Configuration Reference
This section documents the canonical ids the frontend will send. It is reference material, not an API response contract.

Premium sections may carry local frontend metadata such as:

```json
{
  "access": {
    "requiresEntitlement": "connectx_pro",
    "enabled": false,
    "errorCode": "PREMIUM_REQUIRED"
  }
}
```

### `finding_cofounder`
- `goal`
  - options:
    - `goal_finding_cofounder`
    - `goal_building_team`
    - `goal_explore_startups`
    - `goal_joining_startups`
- `skillStrengthIds`
  - options:
    - `ss_technical`
    - `ss_product`
    - `ss_business`
    - `ss_sales`
    - `ss_marketing`
    - `ss_design`
    - `ss_operations`
    - `ss_finance`
- `industryIds`
  - options:
    - `ind_ai`
    - `ind_fintech`
    - `ind_healthtech`
    - `ind_edtech`
    - `ind_web3`
    - `ind_saas`
- `locationAvailability`
  - fields:
    - `workArrangementIds`
      - `wa_onsite`
      - `wa_hybrid`
      - `wa_remote`
    - `city`
    - `remoteReady`
    - `distanceKm`
- `commitmentIds`
  - options:
    - `commitment_full_time`
    - `commitment_part_time`
    - `commitment_side_project`
- premium `aiMatchPrecision`
  - fields:
    - `minimumMatchScore`
    - `priorityPreferenceIds`
      - `ai_same_stage`
      - `ai_similar_commitment`
      - `ai_leadership_compatibility`
      - `ai_functional_balance`
      - `ai_geographic_fit`
      - `ai_language_compatibility`
    - `showAiExplainWhyMatch`
- premium `founderBuilderQuality`
  - fields:
    - `startupExperienceIds`
      - `se_first_time_founder`
      - `se_built_1_startup`
      - `se_serial_founder`
      - `se_exit_experience`
      - `se_vc_backed`
      - `se_accelerator_alumni`
    - `leadershipBackgroundIds`
      - `lb_led_team`
      - `lb_built_from_zero`
      - `lb_owned_revenue`
      - `lb_raised_capital`
      - `lb_advisor_mentor`
- premium `cofounderReadiness`
  - fields:
    - `readinessLevelIds`
      - `cr_ready_30_days`
      - `cr_exploring_ideas`
      - `cr_build_from_zero`
      - `cr_existing_founder`
      - `cr_equity_based`
      - `cr_long_term`
- premium `globalCompatibility`
  - fields:
    - `languageIds`
      - `lang_en`
      - `lang_id`
      - `lang_zh`
      - `lang_ja`
      - `lang_ko`
      - `lang_es`
    - `educationIds`
      - `edu_bachelor`
      - `edu_master`
      - `edu_mba`
      - `edu_phd`
      - `edu_research`

### `building_team`
- `goal`
  - options:
    - `goal_finding_cofounder`
    - `goal_building_team`
    - `goal_explore_startups`
    - `goal_joining_startups`
- `industryIds`
  - options:
    - `ind_ai`
    - `ind_fintech`
    - `ind_healthtech`
    - `ind_edtech`
    - `ind_web3`
    - `ind_saas`
- `locationAvailability`
  - fields:
    - `workArrangementIds`
      - `wa_onsite`
      - `wa_hybrid`
      - `wa_remote`
    - `city`
    - `remoteReady`
    - `distanceKm`
- `roleNeededIds`
  - options:
    - `role_engineer`
    - `role_product`
    - `role_designer`
    - `role_sales`
    - `role_marketing`
    - `role_operations`
    - `role_finance`
    - `role_growth`
    - `role_ai_ml`
- `skillIds`
  - options:
    - `skill_react`
    - `skill_python`
    - `skill_figma`
    - `skill_growth`
    - `skill_seo`
    - `skill_salesforce`
- `commitmentIds`
  - options:
    - `commitment_full_time`
    - `commitment_part_time`
    - `commitment_side_project`
- premium `aiTalentPrecision`
  - fields:
    - `minimumMatchScore`
    - `priorityPreferenceIds`
      - `ai_skill_depth`
      - `ai_startup_readiness`
      - `ai_immediate_availability`
      - `ai_leadership_potential`
      - `ai_role_complementarity`
    - `showAiExplainWhyMatch`
- premium `executionQuality`
  - fields:
    - `trackRecordIds`
      - `eq_built_mvp`
      - `eq_startup_experience`
      - `eq_product_shipped`
      - `eq_led_growth`
      - `eq_built_systems`
- premium `globalCompatibility`
  - fields:
    - `languageIds`
      - `lang_en`
      - `lang_id`
      - `lang_zh`
      - `lang_ja`
      - `lang_ko`
      - `lang_es`
- premium `hiringReadiness`
  - fields:
    - `availabilityIds`
      - `hr_immediate_join`
      - `hr_30_days`
      - `hr_part_time_first`
      - `hr_equity_open`
      - `hr_remote_ready`

### `explore_startups`
- `goal`
  - options:
    - `goal_finding_cofounder`
    - `goal_building_team`
    - `goal_explore_startups`
    - `goal_joining_startups`
- `startupStageIds`
  - options:
    - `stage_idea`
    - `stage_mvp`
    - `stage_pre_seed`
    - `stage_seed`
- `industryIds`
  - options:
    - `ind_ai`
    - `ind_fintech`
    - `ind_healthtech`
    - `ind_edtech`
    - `ind_web3`
    - `ind_saas`
- `locationAvailability`
  - fields:
    - `workArrangementIds`
      - `wa_onsite`
      - `wa_hybrid`
      - `wa_remote`
    - `city`
    - `remoteReady`
    - `distanceKm`
- `roleNeededIds`
  - options:
    - `role_engineer`
    - `role_designer`
    - `role_marketing`
    - `role_sales`
    - `role_operations`
- premium `startupQuality`
  - fields:
    - `founderBackgroundIds`
      - `sq_repeat_founder`
      - `sq_startup_exit`
      - `sq_vc_backed_founder`
      - `sq_strong_founder_background`
- premium `startupReadiness`
  - fields:
    - `progressIds`
      - `sr_mvp_ready`
      - `sr_product_live`
      - `sr_paying_users`
      - `sr_existing_team`
- premium `opportunityFit`
  - fields:
    - `conditionIds`
      - `of_equity_offered`
      - `of_remote_team`
      - `of_fast_hiring`
      - `of_early_core_role`
- premium `aiStartupFit`
  - fields:
    - `minimumFitScore`
    - `showAiExplainWhyMatch`

### `joining_startups`
- `goal`
  - options:
    - `goal_finding_cofounder`
    - `goal_building_team`
    - `goal_explore_startups`
    - `goal_joining_startups`
- `startupStageIds`
  - options:
    - `stage_idea`
    - `stage_mvp`
    - `stage_pre_seed`
    - `stage_seed`
- `industryIds`
  - options:
    - `ind_ai`
    - `ind_fintech`
    - `ind_healthtech`
    - `ind_edtech`
    - `ind_web3`
    - `ind_saas`
- `founderTypeIds`
  - options:
    - `ft_technical_founder`
    - `ft_business_founder`
    - `ft_product_founder`
    - `ft_operator_founder`
- `locationAvailability`
  - fields:
    - `workArrangementIds`
      - `wa_onsite`
      - `wa_hybrid`
      - `wa_remote`
    - `city`
    - `remoteReady`
    - `distanceKm`
- premium `founderQuality`
  - fields:
    - `backgroundIds`
      - `fq_startup_experience`
      - `fq_exit`
      - `fq_fundraising_exposure`
      - `fq_accelerator_background`
- premium `leadershipStrength`
  - fields:
    - `leadershipIds`
      - `ls_built_team`
      - `ls_led_product`
      - `ls_growth_ownership`
      - `ls_operations_leadership`
- premium `startupReadiness`
  - fields:
    - `progressIds`
      - `jsr_mvp`
      - `jsr_traction`
      - `jsr_paying_users`
- premium `equityAndCommitment`
  - fields:
    - `termIds`
      - `eac_cofounder_equity`
      - `eac_full_time_expected`
      - `eac_pre_revenue_build`

## Discovery Cards Endpoint

### Endpoint

```http
POST /api/v1/discovery/cards
```

### Request Shape
The top-level shape is shared across all modes:

```json
{
  "context": {
    "mode": "finding_cofounder"
  },
  "filters": {},
  "pagination": {
    "limit": 10,
    "cursor": null
  }
}
```

### Request Rules
- `context.mode` is optional for default discovery, but recommended.
- `filters` is optional.
- `pagination.limit` maximum is `20`.
- `pagination.cursor` is nullable.
- Backend validates the contents of `filters` based on `context.mode`.
- Backend should reject unknown ids, invalid option ids, or premium-only filters without entitlement.

### Full Request Example: `finding_cofounder`

```json
{
  "context": {
    "mode": "finding_cofounder"
  },
  "filters": {
    "goalId": "goal_finding_cofounder",
    "skillStrengthIds": ["ss_business", "ss_finance"],
    "industryIds": ["ind_ai", "ind_fintech"],
    "locationAvailability": {
      "workArrangementIds": ["wa_remote", "wa_hybrid"],
      "city": "jakarta",
      "remoteReady": true,
      "latitude": 37.785834,
      "longitude": -122.406417,
      "distanceKm": 50
    },
    "commitmentIds": ["commitment_full_time"],
    "aiMatchPrecision": {
      "minimumMatchScore": 81,
      "priorityPreferenceIds": [
        "ai_functional_balance",
        "ai_language_compatibility"
      ],
      "showAiExplainWhyMatch": false
    },
    "founderBuilderQuality": {
      "startupExperienceIds": ["se_serial_founder"],
      "leadershipBackgroundIds": ["lb_led_team"]
    },
    "cofounderReadiness": {
      "readinessLevelIds": ["cr_long_term"]
    },
    "globalCompatibility": {
      "languageIds": ["lang_en", "lang_es"],
      "educationIds": ["edu_bachelor", "edu_mba"]
    }
  },
  "pagination": {
    "limit": 10,
    "cursor": null
  }
}
```

### Full Request Example: `building_team`

```json
{
  "context": {
    "mode": "building_team"
  },
  "filters": {
    "goalId": "goal_building_team",
    "industryIds": ["ind_ai", "ind_saas"],
    "locationAvailability": {
      "workArrangementIds": ["wa_onsite", "wa_hybrid", "wa_remote"],
      "city": "singapore",
      "remoteReady": true,
      "latitude": 37.785834,
      "longitude": -122.406417,
      "distanceKm": 50
    },
    "roleNeededIds": ["role_engineer", "role_ai_ml"],
    "skillIds": ["skill_react", "skill_python"],
    "commitmentIds": ["commitment_full_time", "commitment_part_time"],
    "aiTalentPrecision": {
      "minimumMatchScore": 81,
      "priorityPreferenceIds": [
        "ai_skill_depth",
        "ai_startup_readiness",
        "ai_immediate_availability"
      ],
      "showAiExplainWhyMatch": false
    },
    "executionQuality": {
      "trackRecordIds": [
        "eq_built_mvp",
        "eq_startup_experience",
        "eq_product_shipped"
      ]
    },
    "globalCompatibility": {
      "languageIds": ["lang_en"]
    },
    "hiringReadiness": {
      "availabilityIds": ["hr_remote_ready", "hr_30_days"]
    }
  },
  "pagination": {
    "limit": 10,
    "cursor": null
  }
}
```

### Full Request Example: `explore_startups`

```json
{
  "context": {
    "mode": "explore_startups"
  },
  "filters": {
    "goalId": "goal_explore_startups",
    "startupStageIds": ["stage_mvp", "stage_seed"],
    "industryIds": ["ind_ai", "ind_fintech"],
    "locationAvailability": {
      "workArrangementIds": ["wa_remote", "wa_hybrid"],
      "city": "bangalore",
      "remoteReady": true,
      "latitude": 37.785834,
      "longitude": -122.406417,
      "distanceKm": 50
    },
    "roleNeededIds": ["role_engineer", "role_marketing"],
    "startupQuality": {
      "founderBackgroundIds": ["sq_repeat_founder", "sq_vc_backed_founder"]
    },
    "startupReadiness": {
      "progressIds": ["sr_product_live", "sr_paying_users"]
    },
    "opportunityFit": {
      "conditionIds": ["of_equity_offered", "of_remote_team"]
    },
    "aiStartupFit": {
      "minimumFitScore": 81,
      "showAiExplainWhyMatch": false
    }
  },
  "pagination": {
    "limit": 10,
    "cursor": null
  }
}
```

### Full Request Example: `joining_startups`

```json
{
  "context": {
    "mode": "joining_startups"
  },
  "filters": {
    "goalId": "goal_joining_startups",
    "startupStageIds": ["stage_mvp", "stage_seed"],
    "industryIds": ["ind_ai", "ind_fintech"],
    "founderTypeIds": ["ft_technical_founder", "ft_business_founder"],
    "locationAvailability": {
      "workArrangementIds": ["wa_remote", "wa_hybrid"],
      "city": "dubai",
      "remoteReady": true,
      "latitude": 37.785834,
      "longitude": -122.406417,
      "distanceKm": 50
    },
    "founderQuality": {
      "backgroundIds": [
        "fq_startup_experience",
        "fq_exit",
        "fq_fundraising_exposure"
      ]
    },
    "leadershipStrength": {
      "leadershipIds": [
        "ls_built_team",
        "ls_led_product",
        "ls_growth_ownership"
      ]
    },
    "startupReadiness": {
      "progressIds": ["jsr_mvp", "jsr_traction", "jsr_paying_users"]
    },
    "equityAndCommitment": {
      "termIds": [
        "eac_cofounder_equity",
        "eac_full_time_expected",
        "eac_pre_revenue_build"
      ]
    }
  },
  "pagination": {
    "limit": 10,
    "cursor": null
  }
}
```

## Discovery Cards Response Contract

### Response Envelope

```json
{
  "success": true,
  "message": "Discovery cards fetched successfully",
  "data": {
    "items": [],
    "nextCursor": null,
    "hasMore": false
  }
}
```

### Profile Card Variant

```json
{
  "entityType": "profile",
  "id": "card_001",
  "profileId": "usr_ardi_001",
  "photoUrl": "https://cdn.connectx.app/profiles/ardi.jpg",
  "name": "Ardi Wijaya",
  "age": 28,
  "headline": "Full-Stack Engineer",
  "location": {
    "city": "Jakarta",
    "country": "Indonesia",
    "display": "Jakarta, Indonesia",
    "distanceKm": 3
  },
  "match": {
    "score": 99,
    "label": "Top Match"
  },
  "badges": [
    {
      "id": "badge_mvp",
      "label": "MVP",
      "icon": "rocket"
    }
  ],
  "bio": "Building a payments infrastructure for underbanked communities in Southeast Asia. Looking for a business-minded co-founder.",
  "startupIdea": "Neo-bank for micro-merchants",
  "interests": [
    { "id": "in_1", "name": "FinTech" },
    { "id": "in_2", "name": "AI/ML" },
    { "id": "in_3", "name": "SaaS" },
    { "id": "avail_1", "name": "Full-time", "type": "availability" }
  ],
  "skills": [
    { "id": "sk_10", "name": "React" },
    { "id": "sk_11", "name": "Node.js" },
    { "id": "sk_12", "name": "PostgreSQL" }
  ],
  "experience": [
    {
      "id": "exp_1",
      "title": "Senior Full-Stack Engineer",
      "organization": "Gojek",
      "period": "2021 – 2024"
    },
    {
      "id": "exp_2",
      "title": "Co-Founder & CTO",
      "organization": "PayKecil (acquired)",
      "period": "2019 – 2021"
    }
  ],
  "education": [
    {
      "id": "edu_1",
      "degree": "B.S. Computer Science",
      "school": "Universitas Indonesia"
    }
  ],
  "languages": ["English", "Bahasa Indonesia"]
}
```

### Startup Card Variant

```json
{
  "entityType": "startup",
  "id": "startup_card_payflow_ai",
  "startupId": "startup_payflow_ai",
  "name": "PayFlow AI",
  "logoUrl": null,
  "badge": {
    "label": "MVP"
  },
  "founder": {
    "name": "Sarah Chen",
    "title": "Founder"
  },
  "match": {
    "score": 94,
    "label": "Perfect Match"
  },
  "industry": {
    "primary": "Fintech",
    "secondary": "AI",
    "display": "Fintech / AI"
  },
  "team": {
    "memberCount": 2,
    "display": "2 members"
  },
  "summary": "Building an AI-powered payment infrastructure for Southeast Asian SMEs.",
  "openRoles": [
    {
      "id": "startup_payflow_ai_technical_co_founder",
      "title": "Technical Co-Founder"
    },
    {
      "id": "startup_payflow_ai_backend_engineer",
      "title": "Backend Engineer"
    }
  ],
  "lookingFor": [
    "Co-Founder",
    "Team members"
  ],
  "teamStage": {
    "teamSize": 2,
    "stage": "MVP",
    "industry": "Fintech / AI",
    "hiringCount": 2
  },
  "journey": {
    "currentStage": "mvp",
    "stages": [
      { "id": "idea", "label": "Idea", "state": "completed" },
      { "id": "mvp", "label": "MVP", "state": "current" },
      { "id": "pre_seed", "label": "Pre-Seed", "state": "upcoming" },
      { "id": "seed", "label": "Seed", "state": "upcoming" }
    ]
  }
}
```

### Full Response Example: `finding_cofounder`

```json
{
  "success": true,
  "message": "Discovery cards fetched successfully",
  "data": {
    "items": [
      {
        "entityType": "profile",
        "id": "card_001",
        "profileId": "usr_ardi_001",
        "photoUrl": "https://cdn.connectx.app/profiles/ardi.jpg",
        "name": "Ardi Wijaya",
        "age": 28,
        "headline": "Full-Stack Engineer",
        "location": {
          "city": "Jakarta",
          "country": "Indonesia",
          "display": "Jakarta, Indonesia",
          "distanceKm": 3
        },
        "match": {
          "score": 99,
          "label": "Top Match"
        },
        "badges": [
          {
            "id": "badge_mvp",
            "label": "MVP",
            "icon": "rocket"
          }
        ],
        "bio": "Building a payments infrastructure for underbanked communities in Southeast Asia. Looking for a business-minded co-founder.",
        "startupIdea": "Neo-bank for micro-merchants",
        "interests": [
          { "id": "in_1", "name": "FinTech" },
          { "id": "in_2", "name": "AI/ML" },
          { "id": "in_3", "name": "SaaS" },
          { "id": "avail_1", "name": "Full-time", "type": "availability" }
        ],
        "skills": [
          { "id": "sk_10", "name": "React" },
          { "id": "sk_11", "name": "Node.js" },
          { "id": "sk_12", "name": "PostgreSQL" }
        ],
        "experience": [
          {
            "id": "exp_1",
            "title": "Senior Full-Stack Engineer",
            "organization": "Gojek",
            "period": "2021 – 2024"
          },
          {
            "id": "exp_2",
            "title": "Co-Founder & CTO",
            "organization": "PayKecil (acquired)",
            "period": "2019 – 2021"
          }
        ],
        "education": [
          {
            "id": "edu_1",
            "degree": "B.S. Computer Science",
            "school": "Universitas Indonesia"
          }
        ],
        "languages": ["English", "Bahasa Indonesia"]
      }
    ],
    "nextCursor": "card_002",
    "hasMore": true
  }
}
```

### Full Response Example: `building_team`

```json
{
  "success": true,
  "message": "Discovery cards fetched successfully",
  "data": {
    "items": [
      {
        "entityType": "profile",
        "id": "card_002",
        "profileId": "usr_maya_002",
        "photoUrl": "https://cdn.connectx.app/profiles/maya.jpg",
        "name": "Maya Chen",
        "age": 30,
        "headline": "Product Strategist",
        "location": {
          "city": "Singapore",
          "country": "Singapore",
          "display": "Singapore, Singapore",
          "distanceKm": 5
        },
        "match": {
          "score": 96,
          "label": "Top Match"
        },
        "badges": [
          {
            "id": "badge_builder",
            "label": "Builder",
            "icon": "sparkles"
          }
        ],
        "bio": "Obsessed with founder-product fit, early retention loops, and crisp execution. Excited about products that reduce operational chaos for growing teams.",
        "startupIdea": "Ops command center for cross-border commerce teams",
        "interests": [
          { "id": "in_4", "name": "B2B SaaS" },
          { "id": "in_5", "name": "Marketplaces" },
          { "id": "avail_2", "name": "Part-time", "type": "availability" }
        ],
        "skills": [
          { "id": "sk_20", "name": "Product" },
          { "id": "sk_21", "name": "Research" },
          { "id": "sk_22", "name": "Growth" }
        ],
        "experience": [
          {
            "id": "exp_3",
            "title": "Lead Product Strategist",
            "organization": "Carousell",
            "period": "2020 – 2024"
          }
        ],
        "education": [
          {
            "id": "edu_2",
            "degree": "B.A. Economics",
            "school": "National University of Singapore"
          }
        ],
        "languages": ["English", "Mandarin"]
      }
    ],
    "nextCursor": "card_003",
    "hasMore": true
  }
}
```

### Full Response Example: `explore_startups`

```json
{
  "success": true,
  "message": "Discovery cards fetched successfully",
  "data": {
    "items": [
      {
        "entityType": "startup",
        "id": "startup_card_payflow_ai",
        "startupId": "startup_payflow_ai",
        "name": "PayFlow AI",
        "logoUrl": null,
        "badge": {
          "label": "MVP"
        },
        "founder": {
          "name": "Sarah Chen",
          "title": "Founder"
        },
        "match": {
          "score": 94,
          "label": "Perfect Match"
        },
        "industry": {
          "primary": "Fintech",
          "secondary": "AI",
          "display": "Fintech / AI"
        },
        "team": {
          "memberCount": 2,
          "display": "2 members"
        },
        "summary": "Building an AI-powered payment infrastructure for Southeast Asian SMEs.",
        "openRoles": [
          {
            "id": "startup_payflow_ai_technical_co_founder",
            "title": "Technical Co-Founder"
          },
          {
            "id": "startup_payflow_ai_backend_engineer",
            "title": "Backend Engineer"
          }
        ],
        "lookingFor": ["Co-Founder", "Team members"],
        "teamStage": {
          "teamSize": 2,
          "stage": "MVP",
          "industry": "Fintech / AI",
          "hiringCount": 2
        },
        "journey": {
          "currentStage": "mvp",
          "stages": [
            { "id": "idea", "label": "Idea", "state": "completed" },
            { "id": "mvp", "label": "MVP", "state": "current" },
            { "id": "pre_seed", "label": "Pre-Seed", "state": "upcoming" },
            { "id": "seed", "label": "Seed", "state": "upcoming" }
          ]
        }
      }
    ],
    "nextCursor": "startup_card_solidarity_health",
    "hasMore": true
  }
}
```

### Full Response Example: `joining_startups`

```json
{
  "success": true,
  "message": "Discovery cards fetched successfully",
  "data": {
    "items": [
      {
        "entityType": "startup",
        "id": "startup_card_solidarity_health",
        "startupId": "startup_solidarity_health",
        "name": "Solidarity Health",
        "logoUrl": null,
        "badge": {
          "label": "Pre-Seed"
        },
        "founder": {
          "name": "Nadia Rahman",
          "title": "Founder"
        },
        "match": {
          "score": 91,
          "label": "Strong Match"
        },
        "industry": {
          "primary": "Healthtech",
          "secondary": "Ops",
          "display": "Healthtech / Ops"
        },
        "team": {
          "memberCount": 4,
          "display": "4 members"
        },
        "summary": "Creating AI-assisted clinic workflows for underserved primary care operators.",
        "openRoles": [
          {
            "id": "startup_solidarity_health_founding_product_designer",
            "title": "Founding Product Designer"
          },
          {
            "id": "startup_solidarity_health_clinical_ops_lead",
            "title": "Clinical Ops Lead"
          }
        ],
        "lookingFor": ["Design partner", "Operator"],
        "teamStage": {
          "teamSize": 4,
          "stage": "Pre-Seed",
          "industry": "Healthtech / Ops",
          "hiringCount": 2
        },
        "journey": {
          "currentStage": "pre_seed",
          "stages": [
            { "id": "idea", "label": "Idea", "state": "completed" },
            { "id": "mvp", "label": "MVP", "state": "completed" },
            { "id": "pre_seed", "label": "Pre-Seed", "state": "current" },
            { "id": "seed", "label": "Seed", "state": "upcoming" }
          ]
        }
      }
    ],
    "nextCursor": "startup_card_cargo_os",
    "hasMore": true
  }
}
```

## Swipe Action Contract

### Endpoint

```http
POST /api/v1/discovery/cards/:targetId/action
```

### Request

```json
{
  "action": "like"
}
```

Allowed values:
- `like`
- `pass`
- `super_like`

### Response

```json
{
  "success": true,
  "message": "Swipe action recorded successfully",
  "data": {
    "id": "card_001",
    "targetId": "usr_ardi_001",
    "profileId": "usr_ardi_001",
    "startupId": null,
    "action": "like",
    "isMatch": true,
    "matchId": "match_123"
  }
}
```

For startup targets:

```json
{
  "success": true,
  "message": "Swipe action recorded successfully",
  "data": {
    "id": "startup_card_payflow_ai",
    "targetId": "startup_payflow_ai",
    "profileId": null,
    "startupId": "startup_payflow_ai",
    "action": "like",
    "isMatch": false,
    "matchId": null
  }
}
```

## Validation Notes
- `pagination.limit` maximum is `20`.
- Do not return the current user in discovery results.
- Do not return targets already swiped by the current user.
- Backend computes `match.score`.
- Backend computes `location.distanceKm`.
- `targetId` is the route identifier for the discovery target.
- `profileId` is populated only for profile-card actions.
- `startupId` is populated only for startup-card actions.
- `id` remains the discovery card/session item id.
- Unknown filter ids, field ids, or option ids should be rejected.
- Premium-only filters should be rejected for unauthorized users with `PREMIUM_REQUIRED`.
- Backend should validate filters by `context.mode`.

## Known Errors

### Premium filters without entitlement

```json
{
  "success": false,
  "message": "Premium subscription required to use advanced discovery filters",
  "error": {
    "code": "PREMIUM_REQUIRED"
  }
}
```

### Super like boost requirement
See `CON-64` for the dedicated `super_like` behavior and boost-specific error handling.

### Rewind behavior
See `CON-65` for the dedicated rewind contract.
