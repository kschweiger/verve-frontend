# Swimming Metadata Activity Detail Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display imported swimming metadata in the activity detail view through a read-only widget that shows general swim information and set-level information.

**Architecture:** Preserve backend `ActivityPublic.meta_data` as an unknown object at the API boundary, parse only the swimming backend core shape in a focused utility, then render the normalized data through a standalone activity-detail widget. The widget is display-only and does not change existing activity detail behavior for non-swim activities.

**Tech Stack:** Vue 3 Composition API with `<script setup lang="ts">`, TypeScript strict types, Pinia activity model, Tailwind CSS v4 utilities, Bun validation.

---

## Success Check

A backend activity response with `meta_data.target === "SwimmingMetaData"` renders a swim widget on the activity detail page, while activities with no swim metadata render exactly as they do today.

## Task 1: Preserve `meta_data` on Activities

**Files:**
- Modify: `src/services/api.ts`
- Modify: `src/stores/activity.ts`
- Modify: `src/stores/location.ts`

- [x] Add `meta_data?: Record<string, unknown> | null` to `ApiActivity`.
- [x] Add `metaData: Record<string, unknown> | null` to `Activity`.
- [x] Update activity mappers to copy `apiActivity.meta_data ?? null`.
- [x] Keep the mappers generic; do not interpret swimming metadata here.

## Task 2: Add Swimming Metadata Parsing

**Files:**
- Create: `src/utils/swimmingMetadata.ts`
- Create: `tests/utils/swimmingMetadata.test.ts`
- Add fixture: `tests/fixtures/swimming_verve_file.json`

- [x] Write Bun tests first for:
  - backend swim metadata with general fields and sets normalizes correctly,
  - non-swim metadata returns `null`,
  - empty or malformed swim metadata returns `null`,
  - malformed set entries are ignored without crashing.
- [x] Run `bun test tests/utils/swimmingMetadata.test.ts` and confirm it fails because the parser file does not exist yet.
- [x] Define local frontend types `SwimmingMetaData` and `SwimmingSetMeta`.
- [x] Parse only the backend core representation from `docs/product-specs/verve-swimming-metadata.md`.
- [x] Require `target === "SwimmingMetaData"`.
- [x] Support backend field names: `pool_length_meters`, `total_stroke_count`, `avg_swofl`, `lap_count`, `set_count`, `styles`, `sets`.
- [x] Normalize set fields: `durations` to `durationSeconds`, `rest_after` to `restAfterSeconds`, `avg_swofl` to `averageSwolf`, `distance_meters` to `distanceMeters`.
- [x] Use `unknown` and type guards; do not introduce `any`.
- [x] Return `null` for non-swim metadata or swim metadata with no meaningful display fields.
- [x] Run `bun test tests/utils/swimmingMetadata.test.ts` and confirm the tests pass.

## Task 3: Build the Widget

**Files:**
- Create: `src/components/widgets/SwimmingMetadataWidget.vue`

- [x] Add prop type `{ metadata: SwimmingMetaData }`.
- [x] Render a full-width card matching existing activity detail styling.
- [x] Header: title `Swimming`; stroke-style chips for `styles` when present.
- [x] General stat grid: `Pool`, `Laps`, `Sets`, `Strokes`, `Avg SWOLF`.
- [x] Sets section renders only when `metadata.sets.length > 0`.
- [x] Use an overflow-safe table on desktop with columns `#`, `Distance`, `Duration`, `Laps`, `Style`, `Strokes`, `Avg SWOLF`, `Rest`.
- [x] Sort sets by `index`; display user-facing numbering as `index + 1`.
- [x] Use `-` for missing optional values.
- [x] Keep the widget read-only with no edit controls and no API calls.

## Task 4: Mount the Widget in Activity Detail

**Files:**
- Modify: `src/views/ActivityDetailView.vue`

- [x] Import `SwimmingMetadataWidget`.
- [x] Import `parseSwimmingMetadata`.
- [x] Add computed `swimmingMetadata` from `activity.value?.metaData`.
- [x] Render `<SwimmingMetadataWidget v-if="swimmingMetadata" :metadata="swimmingMetadata" />` after the top metrics card and before `ActivityHighlights`.
- [x] Leave existing segment-set UI, map, charts, gallery, tags, locations, and equipment behavior unchanged.

## Task 5: Update Product Spec Index

**Files:**
- Modify: `docs/product-specs/index.md`

- [x] Add `verve-swimming-metadata.md` to the index table.
- [x] Purpose text: swimming metadata contract for imported/exported activity metadata and backend `meta_data`.

## Widget Shape

The widget should feel like an analysis card, not a form.

Top row:
- `Swimming` title on the left.
- Stroke style chips on the right or wrapped below on mobile.

Main body:
- Compact stat grid, using the same quiet metric-card language as the activity header.
- Labels should be domain-level, not implementation-level: `Pool`, `Laps`, `Sets`, `Strokes`, `Avg SWOLF`.

Sets:
- A table because set comparison is scan-heavy.
- Keep rows dense and stable.
- Use `-` for unknown fields rather than hiding columns per row.

## Validation Plan

- [x] Run `bun test tests/utils/swimmingMetadata.test.ts`.
- [x] Run `bun run type-check`.
- [x] Run `bun run check`.
- [x] Run `bun run diff:distribution`.
- [x] Browser/manual scenarios reviewed by user against initial version:
  - no `meta_data`: widget hidden,
  - `target` not `SwimmingMetaData`: widget hidden,
  - swim metadata with only general fields: stat grid shown, no broken set table,
  - swim metadata with sets: set table shown and sorted,
  - missing optional set fields: row renders with `-`,
  - malformed `sets`: no crash.

## Assumptions

- The widget consumes backend `Activity.meta_data`, not the Verve file envelope.
- The backend spelling `avg_swofl` remains canonical for now.
- Lap-level display is out of scope for this first step.
- Legacy manual swim `segments` metadata is not migrated in this change.
- The repo has no configured app-level unit test script, so focused parser tests use `bun test` directly.
