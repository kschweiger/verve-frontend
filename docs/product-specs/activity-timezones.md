# Activity Timezones

## Display

- Activity detail and shared activity rows display dates and times in the activity's assigned IANA timezone. The browser locale controls formatting, not the timezone.
- Detail always shows the timestamp and full timezone identifier, including for unnamed activities. Its fallback title uses the activity-local date. Standard and compact rows include a short timezone label; their accessible time description and tooltip provide the full identifier.
- API timestamps remain instants with `Z` or an explicit numeric offset. Formatting uses `Intl.DateTimeFormat` with `timeZone`; it does not rewrite timestamps or apply offsets manually.
- If the browser cannot format a contract-valid zone, show Local time unavailable together with the original timestamp and zone. Never substitute the browser or user's timezone.
- Calendars, grouping, period filters, statistics, and goals use the user timezone. Their frontend adoption and separate Records date labels are later work; activity-local labels do not change grouping.

## Upload and Manual Entry

- Upload, manual entry, and activity editing use the shared searchable IANA picker described in the user settings spec. Search and suggestions do not change their defaults, date conversion, or request semantics.

- File upload offers an optional backend-supported IANA timezone selector. Its empty default omits `timezone_name`; an explicit selection is sent as a query parameter to the auto-upload endpoint for every file in the batch. Upload More clears the selection. Files and timestamps are unchanged by the frontend.
- Manual entry loads and preselects the saved user timezone. Date & Time starts at the current local time in that zone; changing zones preserves the entered wall time and interprets it in the new zone. The selected zone is shown beside the field.
- Native `Intl.DateTimeFormat` converts the manual wall time to an aware UTC `start`, independent of browser timezone. Repeated clock times use the earlier occurrence; nonexistent times shift forward by the clock-change gap. Invalid input or an unavailable timezone produces an inline error and preserves the form.
- Send manual `timezone_name` on creation and optional track attachment. Read the typed creation response and use its ID. Settings loading disables submission; a loading failure stays inline and permits an explicit timezone selection. No external date library is required.

## Correction

- Edit Activity provides a timezone selector initialized from the saved activity. Options come from the OpenAPI timezone enum shared with user settings.
- Send changed timezone as `timezone` in the JSON body of `PATCH /api/v1/activity/{id}`. Omit `timezone_name`, and do not send `start` or track timestamps. Unchanged fields are omitted; a timezone-only edit submits only timezone.
- Compare edits against the initial displayed distance and duration precision so timezone changes do not round stored values accidentally.
- Read the returned `ActivityPublic`, synchronize matching recent and paginated activities, and trigger the existing update notification before returning to detail.
- Save failures remain inline in the open form with edits preserved for retry. Unchanged submissions return to detail without a PATCH.
- Backend timezone corrections preserve existing activity and track instants. They alter local display time, not elapsed duration.

## API Boundaries and Elapsed Time

- `backend_openapi.json` is canonical. `ActivityPublic` and `ActivityCorePublic` require a supported, non-null timezone, aware start and creation timestamps, ID, duration, distance, type/subtype, name, and tags. Use shared contract-derived response types for detail, lists, collections, and updates.
- Trust backend responses to conform to the contract, including aware activity/track timestamps and assigned timezones. Map optional metrics and tag categories to null for display; do not duplicate backend response validation.
- Charts and segment cut editing calculate elapsed seconds from timestamp instants through the shared helper. A repeated DST hour does not reverse plot positions or change elapsed durations. Duration parsing supports whole days as well as hours/minutes/seconds.

## Fixtures and Validation

- `tests/fixtures/timezones` contains the backend's unchanged fixture files. `tests/fixtures/timezones.sha256` records the published backend SHA from the last successful download. Raw GPX/Verve uploads document scenarios; frontend tests consume the manifest's expected API instants, zones, heart rates, and elapsed positions. Upload zone inference remains backend behavior.
- Run `bun run sync:timezone-fixtures` to check backend `main`. The pre-commit hook always runs this check (requires network access and `unzip`). Compare the saved SHA with the published SHA; download the ZIP on first run or when they differ, replace the fixtures, then save the published SHA. No local SHA is calculated. Archive contents are checked before replacing the fixture folder. Removed upstream files are removed locally too. Download or archive failures stop the commit without replacing fixtures. An update stops the commit for review, affected tests, and staging the fixtures plus SHA; nothing is staged automatically.
- Automated cases cover summer/winter, travel, declared/request-selected zones, explicit offsets, DST fallback, reactive date changes, unsupported browser zones, corrections and cache synchronization, failed saves, unchanged and combined edits, and preservation of timestamp instants and duration precision.

## Activity Photos

- Photo thumbnails are named buttons and open with keyboard or pointer input. The photo viewer uses a native modal dialog with an accessible name, a visible close button, Escape closing, and focus contained in the dialog. Closing returns focus to the invoking thumbnail; deletion falls back to Add Photo.
