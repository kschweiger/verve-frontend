# Records

## Trophy Case

- `/records` is reachable from Statistics navigation and displays saved top-three highlights per metric, ordered by rank.
- Group metrics into Endurance, Speed, and Power. Selecting a metric shows its trophy list and associated activity summaries.
- Default to the current year. Users can select another year or lifetime scope; lifetime requests omit `year`.
- The overview comes from `GET /api/v1/highlights/`. The backend owns ranking and filtering; the frontend owns grouping, labels, formatting, and activity summary caching.
- No pagination or load-more flow is needed for the saved top-three records.

## Activity Type Settings

- Load user settings and activity types before the initial highlights request.
- Require a concrete `type_id` on Records page requests. There is no All activity types option.
- Choose the saved `records_settings.default_activity_type` when valid, then the app default activity type, then the first available type. If no type exists, show an empty/error state instead of requesting mixed-type records.
- Users can switch among concrete activity types on the page.
- Settings saves the records default through `PATCH /api/v1/users/me/records_settings` and refreshes user settings after success.
- These rules concern the Records page; the dashboard curated-records widget has its own existing behavior.
