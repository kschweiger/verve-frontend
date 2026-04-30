# Segment Set Activity Detail Execution Plan

## Objective
Add activity-detail support for backend segment sets so users can inspect interval-style per-segment statistics and edit segment cut points from the track view.

## Current Status
- Frontend implementation is complete for the first pass and remains active pending backend/manual testing.
- Backend contract is represented in `backend_openapi.json` and summarized in `docs/generated/backend-openapi-summary.json`.
- `bun run check:api` passes after the OpenAPI update.
- `TrackPointResponse.id` is available and is the cut ID submitted back to the backend.
- `SegmentStatisticsResponse.cuts` is available for initializing edit mode from existing segment sets.
- `bun run check` passed after the implementation.
- `bun run diff:distribution` was run after the implementation.

## Backend Contract
Use these OpenAPI paths and schemas as the source of truth:

- `GET /api/v1/track/{activity_id}` returns `ListResponse_TrackPointResponse_` with `TrackPointResponse.id`.
- `GET /api/v1/track/segments/sets/{activity_id}` returns `ListResponse_UUID_` of segment set IDs.
- `GET /api/v1/track/segments/set/{segment_set_id}` returns `SegmentStatisticsResponse` with `segment_set_id`, `name`, `segments`, and `cuts`.
- `POST /api/v1/track/segments/set` accepts `SegementSetCreate` with `name`, `activity_id`, and `cuts`.
- `PATCH /api/v1/track/segments/set/{segment_set_id}` accepts `UpdateSegmentSet` with optional `name` and `cuts`.
- `DELETE /api/v1/track/segments/set/{segment_set_id}` deletes a segment set.

## Implementation Record
1. Extend API parsing in `src/services/api.ts`. Complete.
   - Add `id: number` to `TrackPoint`.
   - Parse `TrackPointResponse.id` from unknown response data.
   - Add explicit types for segment metrics, segment stats, and segment set payloads.
   - Add functions for listing segment set IDs, fetching segment statistics, creating, updating, and deleting segment sets.

2. Add segment set state to `src/views/ActivityDetailView.vue`. Complete.
   - Load segment set IDs after activity and track data are available.
   - Fetch details for available IDs so the selector can show names.
   - Keep the segment feature isolated from the existing activity, map, chart, tags, locations, gallery, and equipment flows.
   - Treat missing or failed segment-set data as a non-blocking panel error.

3. Add the segment statistics UI. Complete.
   - Show a compact selector when multiple segment sets exist.
   - Provide a toggle to show or hide per-segment statistics.
   - Render a table/cards with segment number, distance, duration, elevation gain/loss, pace, speed, heart rate, power, and cadence when available.
   - Use backend units from `SegmentResponse`: meters, seconds, meters per second, bpm, watts, rpm, and seconds per kilometer.

4. Add cut editing mode. Complete.
   - Initialize editable cuts from `SegmentStatisticsResponse.cuts`.
   - Build a `TrackPoint.id -> track index` map and never assume array index equals cut ID.
   - Let users add, remove, and move cuts using track-position sliders.
   - Store editable cuts as track point IDs, sorted by current track order.
   - Disable save when there are no valid cuts or when cuts reference missing track points.

5. Show edit markers on existing visualizations. Complete.
   - Display cut markers on the map when points have coordinates.
   - Display cut annotations on charts where practical.
   - Keep marker display optional so activities without location data can still edit cuts through sliders.

6. Save and refresh. Complete.
   - PATCH existing sets with `{ cuts }`.
   - POST new sets with `{ name, activity_id, cuts }`.
   - Refetch segment statistics after save because the PATCH response body is not typed in OpenAPI.
   - Keep user edits local until save succeeds.

## Implemented Files
- `src/services/api.ts` parses track point IDs and exposes segment-set API helpers.
- `src/views/ActivityDetailView.vue` loads segment sets, renders statistics, edits cuts, creates sets, updates sets, deletes sets, and refetches stats after mutations.
- `src/components/LeafletMap.vue` displays passive cut markers when cut points have coordinates.
- `src/components/ElevationChart.vue` displays dashed cut annotations.
- `src/components/CombinedMetricsChart.vue` displays dashed cut annotations.

## Pending Backend Test Loop
- User will update or run backend behavior needed for end-to-end testing.
- Verify `GET /track/segments/sets/{activity_id}` returns expected IDs for real activities.
- Verify `GET /track/segments/set/{segment_set_id}` returns `cuts` matching `TrackPointResponse.id` values.
- Verify `POST /track/segments/set` accepts sorted cut IDs from the frontend and returns a public set with `id`, `name`, and `activity_id`.
- Verify `PATCH /track/segments/set/{segment_set_id}` accepts `{ cuts }` and recalculates segment stats.
- Verify `DELETE /track/segments/set/{segment_set_id}` removes the set and the list endpoint no longer returns it.
- Refine frontend UX or API parsing after backend/manual findings.

## Acceptance Checks
- Done: `bun run check:api` passes before implementation uses the new contract.
- Pending manual/backend: Activity detail loads unchanged for activities with no track data.
- Pending manual/backend: Activity detail loads unchanged for activities with track data but no segment sets.
- Pending manual/backend: Users can select among multiple segment sets and toggle the statistics view.
- Pending manual/backend: Existing cuts are restored from `SegmentStatisticsResponse.cuts` in edit mode.
- Pending manual/backend: Saved cuts are submitted as `TrackPointResponse.id` values, not array indices.
- Pending manual/backend: After saving, the segment statistics refetch and reflect backend-calculated results.
- Done: `bun run type-check` passes after API and component changes.
- Done: Final handoff runs `bun run check` and `bun run diff:distribution`.

## Decision Log
- Fetch segment details for each returned UUID because the list endpoint returns IDs only.
- Refetch after PATCH because the update response has no typed response schema.
- Keep segment editing in the activity detail flow because the main use case is interval analysis while viewing the activity track.
- Use sliders as the baseline edit control because they work for tracks without coordinates and map markers can be layered on top.
- Keep the plan active until backend/manual testing confirms the end-to-end contract and UX.

## Non-Goals
- Do not change backend behavior from the frontend implementation.
- Do not add a browser automation harness in this feature pass.
- Do not redesign unrelated activity detail sections.
