# Discovery Startup Card Contract

This document defines the updated startup card payload for home discovery.

Endpoint:

```txt
POST /api/v1/discovery/cards
```

## Scope

This contract applies only to discovery card items where:

```json
{
  "entityType": "startup"
}
```

Startup cards are returned for these discovery modes:

- `explore_startups`
- `joining_startups`

Profile cards, `/api/v1/me/profile`, and profile edit payloads are not changed by this contract.

The existing discovery cards response envelope remains unchanged.

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

## Startup Card Shape

Backend should keep all existing startup card fields and add the new fields below.

```ts
type DiscoveryStartupCard = {
  entityType: "startup";
  id: string;
  startupId: string;
  name: string;
  logoUrl: string | null;
  badge?: {
    id?: string;
    label: string;
    icon?: string;
    color?: string;
  };
  businessStage: {
    value: "idea" | "mvp" | "live" | "scale" | string;
    label: string;
  };
  description: {
    intro?: string | null;
    problem?: string | null;
    solution?: string | null;
    targetUsers?: string | null;
  };
  industry: {
    primary: string;
    secondary?: string;
    display: string;
  };
  interests?: {
    id: string;
    name: string;
    type?: string;
  }[];
  workArrangement: {
    id: "remote" | "hybrid" | "onsite" | string;
    label: string;
  }[];
  founder: {
    name: string;
    title?: string;
  };
  match: {
    score: number;
    label?: string;
  };
  team: {
    memberCount: number;
    display: string;
  };
  summary: string;
  openRoles: {
    id: string;
    title: string;
  }[];
  lookingFor: string[];
  premium: {
    locked: boolean;
    unlockMessage: string;
    fields: {
      traction?: PremiumField<StartupTraction>;
      links?: PremiumField<StartupLink[]>;
      teamComposition?: PremiumField<StartupTeamComposition>;
      compensation?: PremiumField<StartupCompensation>;
    };
  };
  teamStage: {
    teamSize: number;
    stage: string;
    industry: string;
    hiringCount: number;
  };
  journey: {
    currentStage: string;
    stages: {
      id: string;
      label: string;
      state: "completed" | "current" | "upcoming";
    }[];
  };
};

type PremiumField<T> =
  | {
      locked: true;
      label: string;
      preview?: string | null;
    }
  | {
      locked: false;
      label: string;
      value: T;
    };

type StartupTraction = {
  stage: string;
  items: {
    id: string;
    label: string;
    value: string | number | string[] | null;
  }[];
};

type StartupLink = {
  label: string;
  url: string;
};

type StartupTeamComposition = {
  founderCount?: "solo" | "two" | "three_plus" | string | null;
  founderCountLabel?: string | null;
  coveredRoles?: string[];
  hasTeam?: boolean | null;
  teamSize?: string | number | null;
  teamRoles?: string[];
  joinedMemberCount?: number;
};

type StartupCompensation = {
  equityAvailable?: boolean | null;
  equityRange?: string | null;
  salaryAvailable?: boolean | null;
  salaryRange?: string | null;
  notes?: string | null;
};
```

## Premium Rules

Backend owns premium access. Frontend reads `premium.locked` and each premium field's `locked`
state.

For non-premium users:

- Do not include hidden premium values in the response.
- Return locked placeholders for premium rows.
- Each locked field may include `label` and optional `preview`, but must not include `value`.
- Set `premium.locked` to `true`.

For premium users:

- Return premium field values.
- Set `premium.locked` to `false`.
- Each unlocked field must include `value`.

Recommended upgrade copy:

```txt
Upgrade to premium to see all information.
```

## Backend Mapping Notes

Use the existing startup onboarding answers where available.

| Response field | Source |
| --- | --- |
| `logoUrl` | Startup logo URL if available, otherwise `null` |
| `businessStage` | `q_startup_stage` |
| `description.intro` | Startup tagline, summary, or existing intro field |
| `description.problem` | `q_problem` |
| `description.solution` | `q_solution` |
| `description.targetUsers` | `q_target_users` |
| `industry` | Primary/secondary/display labels from `q_industries_interest` |
| `interests` | Selected values from `q_industries_interest` |
| `workArrangement` | Remote/work preference answers or equivalent startup work arrangement data |
| `premium.fields.links` | `q_website`, `q_startup_linkedin`, `q_twitter`, `q_instagram`, `q_pitch_deck` |
| `premium.fields.traction` | Stage-specific `step_traction` answers |
| `premium.fields.teamComposition` | `q_founder_count`, `q_covered_roles`, `q_has_team`, `q_team_size`, `q_team_roles`, and joined member count if available |
| `premium.fields.compensation` | Startup opportunity equity/salary data if available |

Stage-specific traction mapping:

| Startup stage | Traction answer ids |
| --- | --- |
| `idea` | `q_has_prototype`, `q_prototype_link`, `q_waitlist_size`, `q_validation_methods` |
| `mvp` | `q_user_count`, `q_mau`, `q_mvp_revenue`, `q_growth_rate` |
| `live` | `q_mrr`, `q_live_users`, `q_retention`, `q_key_metrics` |
| `scale` | `q_funding_raised`, `q_investors`, `q_scale_team_size`, `q_arr` |

If compensation data does not exist yet, backend may omit `premium.fields.compensation` or return a
locked placeholder for non-premium users.

## Non-Premium Response Example

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
        "businessStage": {
          "value": "mvp",
          "label": "MVP"
        },
        "description": {
          "intro": "AI-powered payment infrastructure for Southeast Asian SMEs.",
          "problem": "Small merchants still rely on fragmented payment and reconciliation tools.",
          "solution": "PayFlow AI automates payment routing, settlement, and cashflow insights.",
          "targetUsers": "SME merchants, finance teams, and marketplace operators."
        },
        "industry": {
          "primary": "Fintech",
          "secondary": "AI",
          "display": "Fintech / AI"
        },
        "interests": [
          {
            "id": "ind_fintech",
            "name": "Fintech"
          },
          {
            "id": "ind_ai",
            "name": "AI"
          }
        ],
        "workArrangement": [
          {
            "id": "remote",
            "label": "Remote"
          },
          {
            "id": "hybrid",
            "label": "Hybrid"
          }
        ],
        "founder": {
          "name": "Sarah Chen",
          "title": "Founder"
        },
        "match": {
          "score": 94,
          "label": "Perfect Match"
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
        "premium": {
          "locked": true,
          "unlockMessage": "Upgrade to premium to see all information.",
          "fields": {
            "traction": {
              "locked": true,
              "label": "Traction",
              "preview": "User metrics and growth details"
            },
            "links": {
              "locked": true,
              "label": "Website & social links",
              "preview": "Website, LinkedIn, X, Instagram, pitch deck"
            },
            "teamComposition": {
              "locked": true,
              "label": "Team composition",
              "preview": "Founder setup and joined team details"
            },
            "compensation": {
              "locked": true,
              "label": "Equity & salary",
              "preview": "Compensation expectations and offer details"
            }
          }
        },
        "teamStage": {
          "teamSize": 2,
          "stage": "MVP",
          "industry": "Fintech / AI",
          "hiringCount": 2
        },
        "journey": {
          "currentStage": "mvp",
          "stages": [
            {
              "id": "idea",
              "label": "Idea",
              "state": "completed"
            },
            {
              "id": "mvp",
              "label": "MVP",
              "state": "current"
            },
            {
              "id": "pre_seed",
              "label": "Pre-Seed",
              "state": "upcoming"
            },
            {
              "id": "seed",
              "label": "Seed",
              "state": "upcoming"
            }
          ]
        }
      }
    ],
    "nextCursor": "startup_card_solidarity_health",
    "hasMore": true
  }
}
```

## Premium Response Example

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
        "logoUrl": "https://cdn.connectx.app/startups/payflow-ai.png",
        "badge": {
          "label": "MVP"
        },
        "businessStage": {
          "value": "mvp",
          "label": "MVP"
        },
        "description": {
          "intro": "AI-powered payment infrastructure for Southeast Asian SMEs.",
          "problem": "Small merchants still rely on fragmented payment and reconciliation tools.",
          "solution": "PayFlow AI automates payment routing, settlement, and cashflow insights.",
          "targetUsers": "SME merchants, finance teams, and marketplace operators."
        },
        "industry": {
          "primary": "Fintech",
          "secondary": "AI",
          "display": "Fintech / AI"
        },
        "interests": [
          {
            "id": "ind_fintech",
            "name": "Fintech"
          },
          {
            "id": "ind_ai",
            "name": "AI"
          }
        ],
        "workArrangement": [
          {
            "id": "remote",
            "label": "Remote"
          },
          {
            "id": "hybrid",
            "label": "Hybrid"
          }
        ],
        "founder": {
          "name": "Sarah Chen",
          "title": "Founder"
        },
        "match": {
          "score": 94,
          "label": "Perfect Match"
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
        "premium": {
          "locked": false,
          "unlockMessage": "Upgrade to premium to see all information.",
          "fields": {
            "traction": {
              "locked": false,
              "label": "Traction",
              "value": {
                "stage": "mvp",
                "items": [
                  {
                    "id": "q_user_count",
                    "label": "Users",
                    "value": 1200
                  },
                  {
                    "id": "q_mau",
                    "label": "Monthly active users",
                    "value": 640
                  },
                  {
                    "id": "q_mvp_revenue",
                    "label": "Revenue",
                    "value": "$500 MRR"
                  },
                  {
                    "id": "q_growth_rate",
                    "label": "Growth rate",
                    "value": "20% MoM"
                  }
                ]
              }
            },
            "links": {
              "locked": false,
              "label": "Website & social links",
              "value": [
                {
                  "label": "Website",
                  "url": "https://payflow.ai"
                },
                {
                  "label": "LinkedIn",
                  "url": "https://linkedin.com/company/payflow-ai"
                },
                {
                  "label": "X",
                  "url": "https://x.com/payflow_ai"
                },
                {
                  "label": "Pitch deck",
                  "url": "https://pitch.com/payflow-ai"
                }
              ]
            },
            "teamComposition": {
              "locked": false,
              "label": "Team composition",
              "value": {
                "founderCount": "two",
                "founderCountLabel": "2 Founders",
                "coveredRoles": ["Technical", "Business"],
                "hasTeam": true,
                "teamSize": "small",
                "teamRoles": ["Engineering", "Operations"],
                "joinedMemberCount": 2
              }
            },
            "compensation": {
              "locked": false,
              "label": "Equity & salary",
              "value": {
                "equityAvailable": true,
                "equityRange": "1% - 5%",
                "salaryAvailable": false,
                "salaryRange": null,
                "notes": "Equity-heavy founding role until seed funding."
              }
            }
          }
        },
        "teamStage": {
          "teamSize": 2,
          "stage": "MVP",
          "industry": "Fintech / AI",
          "hiringCount": 2
        },
        "journey": {
          "currentStage": "mvp",
          "stages": [
            {
              "id": "idea",
              "label": "Idea",
              "state": "completed"
            },
            {
              "id": "mvp",
              "label": "MVP",
              "state": "current"
            },
            {
              "id": "pre_seed",
              "label": "Pre-Seed",
              "state": "upcoming"
            },
            {
              "id": "seed",
              "label": "Seed",
              "state": "upcoming"
            }
          ]
        }
      }
    ],
    "nextCursor": "startup_card_solidarity_health",
    "hasMore": true
  }
}
```

## Compatibility Requirements

- Existing startup card fields must remain present during rollout.
- Frontend should tolerate the new fields being absent until backend deploy is complete.
- Backend should not change profile card payloads as part of this update.
- Backend should not change `/api/v1/me/profile` as part of this update.
