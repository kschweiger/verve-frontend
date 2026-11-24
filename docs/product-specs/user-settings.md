# User Settings

## Account language

- The interface uses the saved account language once settings are loaded. Before that, it uses the first supported browser language and falls back to English.
- Settings lets users choose English (`en`) or German (`de`) as their saved account language. Account settings load in the background after authentication and are cleared on account changes.
- Save through `PATCH /api/v1/users/me/locale` with the required `locale` query parameter and no body, then refresh shared settings. Keep the editor open and show an error if saving or refreshing fails; disable controls while saving.
- Navigation, authentication, settings, and the shared timezone picker use the active language; backend diagnostics and user-entered values remain unchanged. The document language follows the active selection.
- Activity and location type labels, including subtypes, come from the corresponding resolver with the active `locale`. Filters and forms retain their selected IDs during language changes. The English activity catalog supplies the type IDs for Quick Add, swimming and strength-training controls, activity icons, and cadence units.

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
