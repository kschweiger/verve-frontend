# Activity Segment Sets

## Review

- Activity detail supports named segment sets for interval analysis. List returned set IDs and fetch each set's details to expose names and statistics.
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
