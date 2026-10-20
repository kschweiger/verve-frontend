# Activity Segment Sets

## Review

- Activity detail supports named segment sets for interval analysis. List returned set IDs and fetch each set's details to expose names and statistics.
- Cadence values are displayed directly from the API without scaling: Foot Sports with Run, Trail Run, or Treadmill uses total steps/min (both feet); Cycling uses RPM; other classifications, including Walk or missing subtypes, use counts/min. Resolve names from the activity type catalog, using counts/min while classification is unavailable and updating labels when it loads.
- Preserve fractional cadence in state and display up to one decimal with trailing zeros removed. Reported zero stays visible; unavailable samples leave chart gaps and missing segment values display as unavailable.
- Chart axes/tooltips and segment minimum, average, and maximum use the same activity-specific unit.
- Users can select among sets and show/hide statistics. Display available distance, duration, elevation gain/loss, pace, speed, heart rate, power, and cadence using backend units.
- Segment review and editing have an independent loading and error state in their own panel. The activity summary and track become usable without waiting for segment requests. Changing activity IDs reloads core data, images, locations, equipment, highlights, and segments, clears drafts and modal state, and ignores work from the previous activity or disposed view.
- Missing or failed segment-set data is a non-blocking panel state. Activities without tracks or segment sets remain usable.

## Editing

- Initialize cuts from `SegmentStatisticsResponse.cuts`.
- Cuts refer to `TrackPointResponse.id`, never the point's array index. Map IDs to track positions and submit cuts sorted in track order.
- Users can add, remove, and move cuts with track-position sliders. Editing works without coordinates; show optional map markers and chart annotations when data permits.
- Disable saving when there are no valid cuts or any cut references a missing point.
- Create sets with name, activity ID, and cuts; update existing sets with cuts. Keep edits local until save succeeds.
- Refetch backend-calculated statistics after saving, including PATCH whose response has no typed statistics schema. Deletion removes the set from the available list.

## API and Validation Status

Use track and segment-set endpoints under `/api/v1/track` in `backend_openapi.json`, including the canonical schema spelling `SegementSetCreate`.

The original implementation record still required real-backend/manual validation of list/detail responses, cut IDs, create/update/delete, and recalculated statistics. This spec preserves that outstanding status.

## Cadence Refresh and Rollout

- Editing an activity's type/subtype navigates back to a new detail view, which refetches the summary, track, and segment statistics together with their current classification. Cadence and segment data live in component memory; no persisted cadence cache requires migration.
- Deploy alongside the backend cadence response change. Earlier running Verve imports require backend reprocessing from original files; do not infer conversions from value ranges or correct historical data in the frontend.
- Verve 1.0 file cadence samples remain integers, although API responses retain fractional values. Activity-level cadence summary fields are not available.
