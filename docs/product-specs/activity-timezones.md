# Activity Timezones

## Display

- Activity detail and shared activity rows display dates and times in the activity's assigned IANA timezone. The browser locale controls formatting, not the timezone.
- Detail always shows the timestamp and full timezone identifier, including for unnamed activities. Its fallback title uses the activity-local date. Standard and compact rows include a short timezone label; their accessible time description and tooltip provide the full identifier.
- API timestamps remain instants with `Z` or an explicit numeric offset. Formatting uses `Intl.DateTimeFormat` with `timeZone`; it does not rewrite timestamps or apply offsets manually.
- If the browser cannot format a contract-valid zone, show Local time unavailable together with the original timestamp and zone. Never substitute the browser or user's timezone.
- Calendars, grouping, period filters, statistics, and goals use the user timezone. Their frontend adoption and separate Records date labels are later work; activity-local labels do not change grouping.

## Correction

- Edit Activity provides a timezone selector initialized from the saved activity. Options come from the OpenAPI timezone enum shared with user settings.
- Send changed timezone as `timezone` in the JSON body of `PATCH /api/v1/activity/{id}`. Omit `timezone_name`, and do not send `start` or track timestamps. Unchanged fields are omitted; a timezone-only edit submits only timezone.
- Compare edits against the initial displayed distance and duration precision so timezone changes do not round stored values accidentally.
- Parse the returned `ActivityPublic`, confirm its ID, synchronize matching recent and paginated activities, and trigger the existing update notification before returning to detail.
- Save failures remain inline in the open form with edits preserved for retry. Unchanged submissions return to detail without a PATCH.
- Backend timezone corrections preserve existing activity and track instants. They alter local display time, not elapsed duration.

## API Boundaries and Elapsed Time

- `backend_openapi.json` is canonical. `ActivityPublic` and `ActivityCorePublic` require a supported, non-null timezone, aware start and creation timestamps, ID, duration, distance, type/subtype, name, and tags. Parse consumed fields and nested tags before mapping unknown responses from detail, lists, collections, and updates.
- Reject malformed activity responses and invalid or offsetless activity/track timestamps rather than guessing a timezone. Missing optional activity metrics retain existing normalization to null.
- Charts and segment cut editing calculate elapsed seconds from timestamp instants through the shared helper. A repeated DST hour does not reverse plot positions or change elapsed durations. Duration parsing supports whole days as well as hours/minutes/seconds.

## Fixtures and Validation

- `tests/fixtures/timezones` contains the backend's unchanged fixture files. `tests/fixtures/timezones.sha256` records the published backend SHA from the last successful download. Raw GPX/Verve uploads document scenarios; frontend tests consume the manifest's expected API instants, zones, heart rates, and elapsed positions. Upload zone inference remains backend behavior.
- Run `bun run sync:timezone-fixtures` to check backend `main`. The pre-commit hook always runs this check (requires network access and `unzip`). Compare the saved SHA with the published SHA; download the ZIP on first run or when they differ, replace the fixtures, then save the published SHA. No local SHA is calculated. Archive contents are checked before replacing the fixture folder. Removed upstream files are removed locally too. Download or archive failures stop the commit without replacing fixtures. An update stops the commit for review, affected tests, and staging the fixtures plus SHA; nothing is staged automatically.
- Automated cases cover summer/winter, travel, declared/request-selected zones, explicit offsets, DST fallback, reactive date changes, invalid responses, unsupported browser zones, corrections and cache synchronization, failed saves, unchanged and combined edits, and preservation of timestamp instants and duration precision.
