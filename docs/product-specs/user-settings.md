# User Settings

## Timezone

- All timezone fields share a searchable picker. Search readable city names or exact IANA identifiers, ignoring case and treating spaces, underscores, and slashes alike. Results retain the canonical backend values and aliases. An empty search pins the saved user timezone without duplicates; file uploads additionally offer No override.
- Typing never commits a value. Select a result with pointer or keyboard; Arrow keys and Home/End navigate, Enter selects without submitting, and Escape or leaving the control cancels the search. Saving disables the picker. Results expand within the form with bounded scrolling to fit drawers and dialogs.

- Settings displays the saved IANA timezone in a dedicated section with Edit, Save, and Cancel controls.
- The selector uses the allowed names from `UserSettingsPublic.timezone` in `backend_openapi.json`. `src/services/timezones.ts` contains the derived list; update it when that contract changes.
- Load settings through `GET /api/v1/users/me/settings`. Read the response using the OpenAPI-derived types and trust the backend contract. An omitted timezone uses the contract default, `Europe/Berlin`.
- Save through `PATCH /api/v1/users/me/timezone` with the required `timezone_name` query parameter and no request body. Reload settings after success; the PATCH response has no defined shape.
- While saving, disable the editor controls. On failure, keep the editor open and display an inline error. Close it only after the refreshed settings are available.
- The shared Pinia store exposes `timezone` as a reactive string or null before loading. Views call `await settingsStore.ensureSettings()` to obtain settings without fetching the profile. Concurrent loads share a request and subsequent calls use cached settings. `ensureSettings(true)` explicitly refreshes them.
- The loader rejects on authentication, transport, or account-change errors. Consumers must handle those errors before processing dates; they must not substitute the browser timezone for the user's preference.
- Changing the authentication token clears all account-owned caches, selections, loading flags, and errors. Pending work from the previous session cannot populate the new account, finish its loading state, or issue follow-up requests under its credentials. Public activity/location type lookups may remain cached.
- This stage provides the saved preference and editor. Individual activity views adopt it in subsequent timezone updates.
