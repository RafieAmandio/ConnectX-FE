# ConnectX Profile — Backend Contract

## Summary

Profile endpoints are authenticated with the app bearer token. Backend must resolve the current user from the token, not from a user ID sent by the client.

Base URL:

```txt
/api/v1
```

Auth:

```http
Authorization: Bearer <access_token>
```

All timestamps are ISO-8601 UTC strings.

---

## Endpoint List

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/me/profile` | Fetch authenticated user's editable profile. |
| PATCH | `/me/profile` | Update authenticated user's profile fields. |
| GET | `/profile-options` | Fetch selectable edit-profile options. |
| POST | `/me/account/pause` | Pause/deactivate authenticated user's account. |
| POST | `/me/account/activate` | Reactivate authenticated user's account. |
| POST | `/me/account/deletion-requests` | Request account deletion. |

---

## Core Types

```ts
type ProfileType = 'founder' | 'builder' | 'investor' | 'operator' | 'student';

type ProfileLocation = {
  id?: string;
  city: string;
  country: string;
  display: string;
};

type ProfileNamedItem = {
  id: string;
  name: string;
};

type ProfileAboutKind = 'startupIdea' | 'personalDescription';

type ProfileAboutSection = {
  kind: ProfileAboutKind;
  title: string;
  value: string;
};

type ProfileListSection = {
  title: string;
  items: ProfileNamedItem[];
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

type ProfileExperienceSection = {
  title: string;
  items: ProfileExperienceItem[];
};

type ProfileEducationSection = {
  title: string;
  items: ProfileEducationItem[];
};

type ProfileStartupStageValue = 'idea' | 'mvp' | 'live' | 'scale';

type ProfileStartupStageDetail = {
  id: string;
  label: string;
  value: string | number | string[] | null;
};

type ProfileStartupData = {
  name: string;
  tagline: string;
  stage: {
    value: ProfileStartupStageValue;
    label: string;
    details: ProfileStartupStageDetail[];
  };
  industries: ProfileNamedItem[];
  links: {
    label: string;
    url: string;
  }[];
};
```

---

## GET `/api/v1/me/profile`

Fetch the authenticated user's profile.

### Response

```ts
type MyProfileResponse = {
  success: boolean;
  message: string;
  data: {
    id: string;
    teamId: string;
    profileType: ProfileType;
    name: string;
    headline: string;
    photoUrl: string | null;
    location: ProfileLocation;
    stats: {
      connections: number;
      teamsJoined: number;
      matches: number;
    };
    badges: {
      id: string;
      label: string;
    }[];
    startup?: ProfileStartupData;
    sections: {
      about?: ProfileAboutSection;
      personalityAndHobbies?: ProfileListSection;
      skills?: ProfileListSection;
      interests?: ProfileListSection;
      experience?: ProfileExperienceSection;
      education?: ProfileEducationSection;
      highlights?: {
        items: string[];
      };
    };
    createdAt: string;
    updatedAt: string;
  };
};
```

### Startup vs Individual Rules

If the user owns or represents a startup:

- Include `data.startup`.
- `sections.about.kind` should be `startupIdea`.
- Frontend will not render `sections.personalityAndHobbies`, even if returned.
- Backend should not require personality/hobby tags for startup-owner profiles.

If the user is an individual / non-startup profile:

- Omit `data.startup`.
- `sections.about.kind` should be `personalDescription`.
- `sections.personalityAndHobbies` may be returned.
- `sections.experience` and `sections.education` may be returned and will render as two tabs.

---

## Example `GET /me/profile` Response

```json
{
  "success": true,
  "message": "Profile fetched successfully",
  "data": {
    "id": "usr_789012",
    "teamId": "team_connectx_002",
    "profileType": "builder",
    "name": "Maya Santoso",
    "headline": "Product-minded growth operator",
    "photoUrl": null,
    "location": {
      "id": "bandung",
      "city": "Bandung",
      "country": "Indonesia",
      "display": "Bandung, Indonesia"
    },
    "stats": {
      "connections": 32,
      "teamsJoined": 1,
      "matches": 84
    },
    "badges": [
      { "id": "top-builder", "label": "Top Builder" },
      { "id": "open-source", "label": "Open Source" }
    ],
    "sections": {
      "about": {
        "kind": "personalDescription",
        "title": "About",
        "value": "Product-minded operator looking to join an early-stage team and help scale go-to-market systems."
      },
      "personalityAndHobbies": {
        "title": "Personality & Hobbies",
        "items": [
          { "id": "ph_2", "name": "Problem Solver" },
          { "id": "ph_13", "name": "Connector" }
        ]
      },
      "skills": {
        "title": "Skills",
        "items": [
          { "id": "sk_growth", "name": "Growth" },
          { "id": "sk_ops", "name": "Operations" }
        ]
      },
      "interests": {
        "title": "Interests",
        "items": [
          { "id": "in_saas", "name": "SaaS" }
        ]
      },
      "experience": {
        "title": "Experience",
        "items": [
          {
            "id": "exp_maya_1",
            "title": "Growth Operations Lead",
            "organization": "KaryaCloud",
            "period": "2023 - Present",
            "location": "Bandung, Indonesia",
            "isCurrent": true,
            "companyLogo": "https://logo.clearbit.com/notion.so",
            "description": null
          }
        ]
      },
      "education": {
        "title": "Education",
        "items": [
          {
            "id": "edu_maya_1",
            "degree": "Bachelor of Business Administration",
            "school": "Institut Teknologi Bandung",
            "field": "Business & Management",
            "period": "2017 - 2021",
            "schoolLogo": "https://logo.clearbit.com/itb.ac.id",
            "description": null
          }
        ]
      },
      "highlights": {
        "items": [
          "4+ years building growth systems",
          "Led ops for a 12-person startup team"
        ]
      }
    },
    "createdAt": "2026-04-14T09:30:00.000Z",
    "updatedAt": "2026-04-14T09:30:00.000Z"
  }
}
```

---

## PATCH `/api/v1/me/profile`

Update the authenticated user's profile.

### Request

```ts
type UpdateMyProfileRequest = {
  name: string;
  headline: string;
  locationId: string;
  about: string;
  personalityAndHobbyIds?: string[];
  experience: ProfileExperienceItem[];
  education: ProfileEducationItem[];
};
```

### Important PATCH Rules

- `locationId` must match one of `GET /profile-options.data.locations[].value`.
- `experience` is a full replacement array.
- `education` is a full replacement array.
- `personalityAndHobbyIds` is sent only for non-startup / individual profiles.
- For startup-owner profiles, frontend omits `personalityAndHobbyIds`.
- Backend decides whether `about` updates startup idea or personal description based on ownership state.
- Frontend does not send `about.kind`.

### Example PATCH Request for Individual Profile

```json
{
  "name": "Maya Santoso",
  "headline": "Product-minded growth operator",
  "locationId": "bandung",
  "about": "Product-minded operator looking to join an early-stage team and help scale go-to-market systems.",
  "personalityAndHobbyIds": ["ph_2", "ph_13"],
  "experience": [
    {
      "id": "exp_maya_1",
      "title": "Growth Operations Lead",
      "organization": "KaryaCloud",
      "period": "2023 - Present",
      "location": "Bandung, Indonesia",
      "isCurrent": true,
      "companyLogo": "https://logo.clearbit.com/notion.so",
      "description": null
    }
  ],
  "education": [
    {
      "id": "edu_maya_1",
      "degree": "Bachelor of Business Administration",
      "school": "Institut Teknologi Bandung",
      "field": "Business & Management",
      "period": "2017 - 2021",
      "schoolLogo": "https://logo.clearbit.com/itb.ac.id",
      "description": null
    }
  ]
}
```

### Example PATCH Request for Startup Owner

```json
{
  "name": "John Carter",
  "headline": "Startup Founder",
  "locationId": "jakarta",
  "about": "AI-powered supply chain platform that optimizes logistics for SMEs across Southeast Asia.",
  "experience": [],
  "education": []
}
```

### PATCH Response

```ts
type UpdateMyProfileResponse = {
  success: boolean;
  message: string;
  data: {
    id: string;
    name: string;
    headline: string;
    photoUrl: string | null;
    location: ProfileLocation;
    sections: {
      about: ProfileAboutSection;
      personalityAndHobbies?: ProfileListSection;
      experience?: ProfileExperienceSection;
      education?: ProfileEducationSection;
    };
    updatedAt: string;
  };
};
```

### Example PATCH Response

```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "usr_789012",
    "name": "Maya Santoso",
    "headline": "Product-minded growth operator",
    "photoUrl": null,
    "location": {
      "id": "bandung",
      "city": "Bandung",
      "country": "Indonesia",
      "display": "Bandung, Indonesia"
    },
    "sections": {
      "about": {
        "kind": "personalDescription",
        "title": "About",
        "value": "Product-minded operator looking to join an early-stage team and help scale go-to-market systems."
      },
      "personalityAndHobbies": {
        "title": "Personality & Hobbies",
        "items": [
          { "id": "ph_2", "name": "Problem Solver" },
          { "id": "ph_13", "name": "Connector" }
        ]
      },
      "experience": {
        "title": "Experience",
        "items": []
      },
      "education": {
        "title": "Education",
        "items": []
      }
    },
    "updatedAt": "2026-05-12T06:40:00.000Z"
  }
}
```

---

## GET `/api/v1/profile-options`

Fetch selectable options for Edit Profile.

### Response

```ts
type ProfileOptionsResponse = {
  success: boolean;
  data: {
    locations: {
      id: string;
      label: string;
      value: string;
      group?: string | null;
    }[];
    personalityAndHobbies: ProfileNamedItem[];
  };
};
```

### Example Response

```json
{
  "success": true,
  "data": {
    "locations": [
      {
        "id": "opt_city_jakarta",
        "label": "Jakarta, Indonesia",
        "value": "jakarta",
        "group": "Indonesia"
      },
      {
        "id": "opt_city_bandung",
        "label": "Bandung, Indonesia",
        "value": "bandung",
        "group": "Indonesia"
      },
      {
        "id": "opt_city_singapore",
        "label": "Singapore, Singapore",
        "value": "singapore",
        "group": "Singapore"
      }
    ],
    "personalityAndHobbies": [
      { "id": "ph_1", "name": "Goal-Oriented" },
      { "id": "ph_2", "name": "Problem Solver" },
      { "id": "ph_3", "name": "Coffee Enthusiast" },
      { "id": "ph_4", "name": "Avid Reader" }
    ]
  }
}
```

---

## Validation Notes

```txt
name: required string, max 100
headline: required string, max 120
locationId: required string, must exist in profile-options locations
about: required string, max 500
personalityAndHobbyIds: optional string[], max 6 selected, non-startup profiles only
experience[].title: required string
experience[].organization: required string
education[].degree: required string
education[].school: required string
```

Unknown extra response fields are safe. Frontend ignores fields it does not use.

---

## Account Actions

These endpoints are called from Settings.

### POST `/api/v1/me/account/pause`

Request body:

```json
{}
```

Response:

```json
{
  "success": true,
  "message": "Account paused successfully",
  "data": {
    "userId": "usr_123456",
    "status": "paused",
    "pausedAt": "2026-05-12T06:40:00.000Z"
  }
}
```

### POST `/api/v1/me/account/activate`

Request body:

```json
{}
```

Response:

```json
{
  "success": true,
  "message": "Account activated successfully",
  "data": {
    "userId": "usr_123456",
    "status": "active",
    "activatedAt": "2026-05-12T06:40:00.000Z"
  }
}
```

### POST `/api/v1/me/account/deletion-requests`

Request body:

```json
{}
```

Response:

```json
{
  "success": true,
  "message": "Account deletion requested successfully",
  "data": {
    "deletionRequestId": "del_123456",
    "userId": "usr_123456",
    "status": "scheduled",
    "requestedAt": "2026-05-12T06:40:00.000Z",
    "scheduledDeletionAt": null
  }
}
```

### Account Action Expectations

- Pause success keeps the user signed in.
- Activate success keeps the user signed in.
- Deletion request success signs the user out.
- `GET /api/v1/auth/session` should return updated `data.user.is_active` after pause or activate.
- Backend should return a business error when an account action cannot be applied.
