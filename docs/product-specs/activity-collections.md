# Activity Collections

## Flows

- Authenticated routes provide a list (`/collections`), manual creation (`/collections/new`), detail (`/collections/:id`), and editing (`/collections/:id/edit`). Collections is reachable from Training navigation.
- Users create a collection by naming it and selecting activities; description is optional.
- The list shows backend overview metrics and sorts collections by start descending. Detail shows totals and activities ordered by start ascending.
- Collection track points are grouped by `activity_id`, with a separate colored map polyline for each activity. Omit the map and its placeholder when no coordinate data exists.
- Collection track cadence is already classified separately by the backend for each activity. Preserve its full precision, zero/null values, and activity ID; never scale samples or aggregate different cadence units. The current collection UI displays no cadence statistics.
- Opening a collection refetches its detail and track, including updated cadence after member activity type/subtype edits; collection track data is not persisted between views.
- The activity picker has its own pagination/filter state so collection flows do not disturb the Activities page.
- Deletion requires confirmation.

## Membership Policy

- The beta UI creates collections manually and allows editing name/description and appending activities.
- Removing, replacing, and reordering membership are deferred. Do not submit `replace_activities` from the append flow.
- Automatic collection generation is not part of the current API/UI flow.

## API

Use the collection list/create, detail/update/delete, and collection track endpoints under `/api/v1/collection` in `backend_openapi.json`. Parse responses before rendering; backend totals remain authoritative.
