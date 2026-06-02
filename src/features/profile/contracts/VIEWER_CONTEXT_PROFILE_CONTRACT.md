# Profile Viewer Context - Backend Contract Change

## Summary

`GET /api/v1/me/profile` must accept a required `viewer_context` query parameter.

This supports accounts that have both:

- a startup profile; and
- a personal talent profile.

The backend must return the normalized profile representation for the requested context. The frontend should not need to render from `userRaw`, `startupRaw`, or raw LinkedIn fields.

## Request

```http
GET /api/v1/me/profile?viewer_context=startup
Authorization: Bearer <access_token>
```

or:

```http
GET /api/v1/me/profile?viewer_context=talent
Authorization: Bearer <access_token>
```

```ts
type ViewerContext = 'startup' | 'talent';
```

## Validation

Reject missing or unsupported `viewer_context` values with HTTP `422`.

Example:

```json
{
  "success": false,
  "message": "The selected viewer_context is invalid.",
  "errors": {
    "viewer_context": [
      "The selected viewer_context is invalid."
    ]
  }
}
```

## Startup Response

For `viewer_context=startup`:

- Return the user's startup-facing profile.
- Include `data.startup`.
- Set `data.sections.about.kind` to `startupIdea`.
- Omit talent-only sections such as `experience`, `education`, and `personalityAndHobbies`, unless product requirements change.

## Talent Response

For `viewer_context=talent`:

- Return the user's personal talent-facing profile.
- Omit `data.startup`, even if the user also owns a startup.
- Set `data.sections.about.kind` to `personalDescription`.
- Return normalized `data.sections.experience` and `data.sections.education`.
- Do not require the frontend to parse raw LinkedIn payloads.

Example normalized talent sections:

```json
{
  "sections": {
    "experience": {
      "title": "Experience",
      "items": [
        {
          "id": "exp_123",
          "title": "IT Career Advisor",
          "organization": "BLOOMTECH, Inc",
          "period": "Apr 2025 - Present",
          "location": "Tokyo",
          "isCurrent": true,
          "companyLogo": "https://cdn.example.com/company-logo.png",
          "description": null
        }
      ]
    },
    "education": {
      "title": "Education",
      "items": [
        {
          "id": "edu_123",
          "degree": "Bachelor of Engineering",
          "school": "Aoyama Gakuin University",
          "field": "Mechanical Engineering",
          "period": null,
          "schoolLogo": "https://cdn.example.com/school-logo.png",
          "description": null
        }
      ]
    }
  }
}
```

## Normalization Rules

When the source is LinkedIn data, map raw fields before returning the API response:

| Raw LinkedIn field | Normalized profile field |
| --- | --- |
| `experience[].position` | `sections.experience.items[].title` |
| `experience[].companyName` | `sections.experience.items[].organization` |
| `experience[].duration` or formatted dates | `sections.experience.items[].period` |
| `experience[].companyLogo.url` | `sections.experience.items[].companyLogo` |
| `education[].schoolName` | `sections.education.items[].school` |
| `education[].fieldOfStudy` | `sections.education.items[].field` |
| `education[].schoolLogo.url` | `sections.education.items[].schoolLogo` |

Return empty normalized sections when there is no data:

```json
{
  "experience": {
    "title": "Experience",
    "items": []
  },
  "education": {
    "title": "Education",
    "items": []
  }
}
```

## Compatibility

The frontend now sends `viewer_context` for every `GET /api/v1/me/profile` request and caches startup and talent responses separately.

During rollout, the backend may continue returning `userRaw` and `startupRaw` for debugging or edit-form compatibility. They must not replace normalized `sections`.
