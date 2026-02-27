# Istiqoma API Reference

Base URL: `https://your-app-url.replit.app`

All API endpoints (except auth) require authentication. The API uses JSON for request and response bodies.

## Authentication

Istiqoma uses Replit Auth (OpenID Connect). For a mobile app connecting to this backend:

1. The web app uses session-based auth with cookies managed by `express-session`
2. For mobile clients, you would need to implement token-based auth (e.g., JWT) or use the existing session cookies
3. All protected endpoints return `401 { "message": "..." }` when unauthenticated

### GET /api/auth/user

Returns the currently authenticated user's profile.

**Response 200:**
```json
{
  "id": "string",
  "email": "string | null",
  "firstName": "string | null",
  "lastName": "string | null",
  "profileImageUrl": "string | null"
}
```

---

## Deeds (Activities)

Deeds are the core activity records. Each deed belongs to a category and earns points automatically calculated by the backend.

### GET /api/deeds

Returns all deeds for the authenticated user, ordered by creation date (newest first).

**Response 200:**
```json
[
  {
    "id": 1,
    "userId": "user-abc",
    "description": "Sholat Subuh",
    "deedType": "good",
    "category": "Sholat",
    "points": 100,
    "quantity": 1,
    "dzikirType": null,
    "sholatType": "fardhu",
    "fastingType": null,
    "isJamaah": true,
    "quranUnit": null,
    "sedekahType": null,
    "customUnit": null,
    "createdAt": "2026-02-27T08:00:00.000Z"
  }
]
```

### POST /api/deeds

Creates a new deed. Points are calculated automatically by the backend based on category, quantity, and type.

**Request Body:**
```json
{
  "description": "string (required)",
  "category": "string (required)",
  "deedType": "good | bad (optional, defaults to 'good')",
  "quantity": "number (optional, defaults to 1)",
  "dzikirType": "string (optional, for Dzikir category)",
  "sholatType": "string (optional, for Sholat category)",
  "fastingType": "string (optional, for Puasa category)",
  "isJamaah": "boolean (optional, for Sholat category)",
  "quranUnit": "ayat | halaman | surat | juz (optional, for Baca Quran category)",
  "sedekahType": "uang | hitungan (optional, for Shodaqoh category)",
  "customUnit": "hitungan | ayat | halaman | surat | juz | rakaat | hari | uang | times | days (optional, for custom categories)",
  "createdAt": "ISO date string (optional, defaults to now)"
}
```

**Response 201:** The created deed object (same shape as GET response item).

**Response 400:**
```json
{
  "message": "Validation error description",
  "field": "fieldName"
}
```

### PATCH /api/deeds/:id

Updates an existing deed. Points are recalculated automatically.

**Request Body:** Same as POST /api/deeds.

**Response 200:** The updated deed object.

### DELETE /api/deeds/:id

Deletes a deed.

**Response 204:** No content.

---

## Categories

Categories group deeds. Some categories are "protected" (system-defined) and cannot be edited or deleted.

Built-in protected categories: Dzikir, Sholat, Puasa, Baca Quran, Shodaqoh.

### GET /api/categories

Returns all categories for the authenticated user, ordered by `sortOrder`.

**Response 200:**
```json
[
  {
    "id": 1,
    "userId": "user-abc",
    "name": "Sholat",
    "sortOrder": 0,
    "isProtected": true,
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
]
```

### POST /api/categories

Creates a new custom category.

**Request Body:**
```json
{
  "name": "string (required)",
  "isProtected": "boolean (optional, defaults to false)"
}
```

**Response 201:** The created category object.

### PATCH /api/categories/:id

Updates a category's name. Protected categories cannot be edited (returns 403).

**Request Body:**
```json
{
  "name": "string (required)"
}
```

**Response 200:** The updated category object.

**Response 403:**
```json
{
  "message": "Cannot edit protected category"
}
```

### DELETE /api/categories/:id

Deletes a category. Protected categories cannot be deleted (returns 403).

**Response 204:** No content.

**Response 403:**
```json
{
  "message": "Cannot delete protected category"
}
```

### POST /api/categories/reorder

Updates the display order of all categories.

**Request Body:**
```json
{
  "orderedIds": [3, 1, 5, 2, 4]
}
```

**Response 200:** Array of all categories with updated `sortOrder`.

---

## Targets (Goals)

Targets represent spiritual goals users want to achieve. They can be recurring (daily/weekly/monthly) or one-time goals.

### GET /api/targets

Returns all targets for the authenticated user.

**Response 200:**
```json
[
  {
    "id": 1,
    "userId": "user-abc",
    "name": "Read 10 pages of Quran daily",
    "category": "Baca Quran",
    "targetValue": 10,
    "period": "daily",
    "targetType": "achievement",
    "recurrence": "recurring",
    "startDate": null,
    "dueDate": null,
    "completedAt": null,
    "manualProgress": 0,
    "unitLabel": "halaman",
    "dzikirType": null,
    "sholatType": null,
    "fastingType": null,
    "isJamaah": null,
    "quranUnit": "halaman",
    "sedekahType": null,
    "customUnit": null,
    "notificationTimes": ["06:00", "20:00"],
    "isActive": true,
    "createdAt": "2026-01-15T00:00:00.000Z"
  }
]
```

### GET /api/targets/progress

Returns all targets with real-time progress calculations.

**Response 200:**
```json
[
  {
    "id": 1,
    "name": "Read 10 pages of Quran daily",
    "category": "Baca Quran",
    "targetValue": 10,
    "currentValue": 7,
    "percentComplete": 70,
    "...other target fields"
  }
]
```

### POST /api/targets

Creates a new target.

**Request Body:**
```json
{
  "name": "string (required, min 1 char)",
  "category": "string (required, min 1 char)",
  "targetValue": "number (required, min 0)",
  "period": "daily | weekly | monthly (optional)",
  "targetType": "achievement | limit (optional, defaults to 'achievement')",
  "recurrence": "recurring | oneTime (optional, defaults to 'recurring')",
  "startDate": "ISO date string (optional)",
  "dueDate": "ISO date string (optional)",
  "unitLabel": "string (optional)",
  "dzikirType": "string (optional)",
  "sholatType": "string (optional)",
  "fastingType": "string (optional)",
  "isJamaah": "boolean (optional)",
  "quranUnit": "ayat | halaman | surat | juz (optional)",
  "sedekahType": "uang | hitungan (optional)",
  "customUnit": "hitungan | ayat | halaman | surat | juz | rakaat | hari | uang | times | days (optional)",
  "notificationTimes": "string[] (optional, max 5, format 'HH:mm', defaults to [])"
}
```

**Response 201:** The created target object.

### PATCH /api/targets/:id

Updates a target. All fields are optional (partial update).

**Request Body:** Same fields as POST, all optional.

**Response 200:** The updated target object.

### DELETE /api/targets/:id

Deletes a target and its history.

**Response 204:** No content.

### GET /api/targets/:id/history

Returns the last 7 periods of history and current streak for a target.

**Response 200:**
```json
{
  "history": [
    {
      "id": 1,
      "targetId": 1,
      "userId": "user-abc",
      "category": "Baca Quran",
      "dzikirType": null,
      "sholatType": null,
      "fastingType": null,
      "periodStart": "2026-02-20T00:00:00.000Z",
      "periodEnd": "2026-02-21T00:00:00.000Z",
      "achievedValue": 12,
      "targetValue": 10,
      "targetType": "achievement",
      "completed": true,
      "capturedAt": "2026-02-27T00:00:00.000Z"
    }
  ],
  "currentStreak": 5
}
```

### GET /api/targets/:id/detail

Returns comprehensive detail for a target including 90-day history, streaks, and accumulated stats.

**Response 200:**
```json
{
  "target": { "...target with progress fields" },
  "currentStreak": 5,
  "longestStreak": 12,
  "totalAccumulated": 450,
  "totalQuantity": 150,
  "totalPoints": 1500,
  "averagePercentage": 78,
  "history": [ "...array of target history records" ]
}
```

### PATCH /api/targets/:id/progress

Manually updates a target's progress value.

**Request Body:**
```json
{
  "progress": 5
}
```

**Response 200:** The updated target object.

### POST /api/targets/:id/complete

Marks a target as completed for the current period.

**Response 200:** The updated target object.

---

## Streak

### GET /api/streak

Calculates the user's overall activity streak (consecutive days with at least one deed) and weekly activity status.

**Response 200:**
```json
{
  "streakCount": 7,
  "weekDays": [true, true, true, false, true, true, true],
  "hasActivityToday": true
}
```

`weekDays` is an array of 7 booleans representing Monday through Sunday of the current week, indicating whether the user recorded any deed on that day.

---

## Push Notifications

Web Push notification management. These endpoints handle subscription and preference management.

### GET /api/push/status

Returns the current push notification configuration and subscription status.

**Response 200:**
```json
{
  "configured": true,
  "subscribed": true,
  "settings": {
    "dailyReminder": true,
    "reminderTime": "08:00",
    "targetAlerts": true
  }
}
```

`settings` is `null` if the user has no active subscription.

### POST /api/push/subscribe

Saves a new push notification subscription.

**Request Body:**
```json
{
  "endpoint": "string (required, Web Push endpoint URL)",
  "p256dh": "string (required, public key)",
  "auth": "string (required, auth secret)",
  "dailyReminder": "boolean (optional, defaults to true)",
  "reminderTime": "string (optional, defaults to '08:00')",
  "timezone": "string (optional, defaults to 'Asia/Jakarta')",
  "targetAlerts": "boolean (optional, defaults to true)"
}
```

**Response 201:**
```json
{
  "success": true,
  "subscription": { "...subscription object" }
}
```

### PATCH /api/push/settings

Updates notification preferences for an existing subscription.

**Request Body:**
```json
{
  "dailyReminder": "boolean (optional)",
  "reminderTime": "string (optional)",
  "timezone": "string (optional)",
  "targetAlerts": "boolean (optional)"
}
```

**Response 200:**
```json
{
  "success": true,
  "subscription": { "...updated subscription object" }
}
```

### DELETE /api/push/unsubscribe

Removes the user's push notification subscription.

**Response 204:** No content.

### POST /api/push/test

Sends a test notification to the user.

**Response 200:**
```json
{
  "success": true
}
```

---

## Error Format

All errors follow a consistent JSON format:

**400 Validation Error:**
```json
{
  "message": "Description of the validation error",
  "field": "fieldName (optional)"
}
```

**401 Unauthorized:**
```json
{
  "message": "Not authenticated"
}
```

**403 Forbidden:**
```json
{
  "message": "Cannot edit protected category"
}
```

**404 Not Found:**
```json
{
  "message": "Resource not found"
}
```

---

## Typed API Contract

The complete typed API contract is defined in `shared/routes.ts`. This file contains:

- Every endpoint's HTTP method, path, input schema (Zod), and response schemas
- Can be imported and used by any TypeScript client for type-safe API calls
- Input schemas are validated using Zod on both client and server

To use in a new project:
1. Copy the `shared/` directory (contains `schema.ts`, `routes.ts`, and `models/auth.ts`)
2. Install dependencies: `zod`, `drizzle-orm`, `drizzle-zod`
3. Import `api` from `shared/routes.ts` for typed path references and input validation
4. Import types from `shared/schema.ts` for TypeScript type safety

## Point Calculation

Points are calculated automatically by the backend. The logic is in `server/calculatePoints.ts`:

| Category | Points |
|----------|--------|
| Dzikir | 10 per session (flat) |
| Shodaqoh/Sedekah | 100 per session (flat) |
| Custom categories | 50 per session (flat) |
| Sholat Fardhu | 100 × quantity (+50 if jamaah) |
| Sholat Sunnah | 50 × quantity (+50 if jamaah) |
| Puasa Fardhu | 500 × quantity |
| Puasa Sunnah | 250 × quantity |
| Baca Quran (ayat) | 1 × quantity |
| Baca Quran (halaman) | 10 × quantity |
| Baca Quran (juz/surat) | 200 × quantity |
