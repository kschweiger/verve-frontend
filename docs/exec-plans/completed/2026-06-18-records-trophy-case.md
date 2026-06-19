# Records Trophy Case Implementation Plan

> **For agentic workers:** Implement this task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated records overview page that feels like a trophy case and shows the saved top 3 highlights per metric.

**Architecture:** Backend keeps the current highlights resource model and adds optional `type_id` filtering to the existing highlights routes. Frontend owns labels, metric grouping, value formatting, activity summary caching, selected metric state, type/year filters, and split-detail trophy-case layout. No pagination or load-more behavior in v1 because the database only stores top 3 records.

**Tech Stack:** Vue 3 Composition API, Vue Router, Pinia, TypeScript, Bun tests, Vite, Tailwind CSS v4, Lucide icons.

**Status:** Done on 2026-06-19. Backend `type_id` work is owned separately; this plan covers frontend implementation after that backend contract lands.

**Primary success check:** `/records` is reachable from the Statistics navbar, defaults to current-year records for all activity types, shows grouped metrics and a selected metric top-3 trophy list, and supports activity type filtering through `type_id`.

---

## Repo Rules

- Follow Vue 3 `<script setup lang="ts">`.
- Do not introduce `any`; parse unknown API data before using it.
- Treat `backend_openapi.json` as the source of truth after backend `type_id` support lands.
- Save this active plan only under `docs/exec-plans/active/`.
- Keep the existing dashboard Records widget unchanged for v1.
- Run `bun run check` and `bun run diff:distribution` before handoff.

## Backend Contract Required Before Frontend Work

Backend should extend existing endpoints with optional `type_id`; no new endpoint, pagination, or load-more API is needed for v1.

### Overview Endpoint

```http
GET /api/v1/highlights/
```

Query parameters:

```ts
year?: number;    // existing; omitted means lifetime/all-time scope
type_id?: number; // new optional activity type filter
```

Response stays the current dict shape:

```ts
{
  data: Record<HighlightMetric, ActivityHighlightPublic[]>
}
```

Backend behavior:

- Return only metrics that have saved top-3 records.
- Sort each metric list by `rank ASC`.
- Apply `type_id` before returning records.
- When `year` is omitted, return lifetime/all-time highlights.

Frontend overview examples:

```text
/highlights/?year=2026
/highlights/?year=2026&type_id=1
/highlights/
```

### Metric Endpoint

```http
GET /api/v1/highlights/metric/{metric}
```

Query parameters:

```ts
year?: number;    // existing; omitted means lifetime/all-time scope
type_id?: number; // new optional activity type filter
```

Response stays the current list shape:

```ts
{
  data: ActivityHighlightPublic[]
}
```

Frontend v1 does not need this route for the Records page because the overview endpoint already returns top 3 for every metric. Keep `type_id` support here for API consistency and for any later metric-specific surfaces.

## Task 1: Update Backend Contract Artifacts

**Files:**
- Modify: `backend_openapi.json`
- Modify: `docs/generated/backend-openapi-summary.json`

- [x] Verify `backend_openapi.json` already contains the backend contract that extends:
  - `GET /api/v1/highlights/` with `type_id`;
  - `GET /api/v1/highlights/metric/{metric}` with `type_id`.
- [x] Run:

```bash
bun run generate:api-summary
```

- [x] Verify the summary includes the new parameter:

```bash
rg -n '"type_id"|"/api/v1/highlights/metric/{metric}"|"/api/v1/highlights/"' backend_openapi.json docs/generated/backend-openapi-summary.json
```

Expected: `backend_openapi.json` shows `type_id` on both highlights routes.

## Task 2: Add Records API Service

**Files:**
- Create: `src/services/records.ts`
- Test: `tests/services/records.test.ts`

- [x] Create `src/services/records.ts` with strict exported types:

```ts
export type HighlightMetric =
  | 'duration'
  | 'distance'
  | 'elevation_change_up'
  | 'avg_speed'
  | 'avg_power'
  | 'max_speed'
  | 'max_power'
  | 'avg_power1min'
  | 'avg_power2min'
  | 'avg_power5min'
  | 'avg_power10min'
  | 'avg_power20min'
  | 'avg_power30min'
  | 'avg_power60min';

export type HighlightTimeScope = 'yearly' | 'lifetime';

export interface ActivityHighlight {
  activity_id: string;
  type_id: number;
  metric: HighlightMetric;
  scope: HighlightTimeScope;
  year: number | null;
  value: number | string;
  track_id: number | null;
  rank: number;
}

export interface RecordsMetricGroup {
  metric: HighlightMetric;
  records: ActivityHighlight[];
}

export interface RecordsQueryParams {
  year?: number | null;
  typeId?: number | null;
}
```

- [x] Add local parser helpers:

```ts
const highlightMetrics = [
  'duration',
  'distance',
  'elevation_change_up',
  'avg_speed',
  'avg_power',
  'max_speed',
  'max_power',
  'avg_power1min',
  'avg_power2min',
  'avg_power5min',
  'avg_power10min',
  'avg_power20min',
  'avg_power30min',
  'avg_power60min',
] as const;

const highlightScopes = ['yearly', 'lifetime'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isHighlightMetric = (value: unknown): value is HighlightMetric =>
  typeof value === 'string' && highlightMetrics.includes(value as HighlightMetric);

const isHighlightScope = (value: unknown): value is HighlightTimeScope =>
  typeof value === 'string' && highlightScopes.includes(value as HighlightTimeScope);
```

- [x] Add query builder:

```ts
export function buildRecordsQuery(params: RecordsQueryParams): string {
  const query = new URLSearchParams();

  if (params.year != null) query.set('year', params.year.toString());
  if (params.typeId != null) query.set('type_id', params.typeId.toString());

  return query.toString();
}
```

- [x] Add parsers:
  - `parseActivityHighlight(value: unknown): ActivityHighlight`
  - `parseHighlightsByMetricResponse(value: unknown): RecordsMetricGroup[]`
- [x] Parser requirements:
  - reject unknown metric keys;
  - reject invalid `metric`, `scope`, `activity_id`, `type_id`, `rank`, and `value`;
  - allow `year` and `track_id` to be missing or null, mapped to `null`;
  - sort each group by `rank ASC`;
  - only keep records whose `metric` matches the containing metric key.
- [x] Add API function with auth headers from `useUserStore()`:

```ts
export async function fetchRecordsOverview(params: RecordsQueryParams): Promise<RecordsMetricGroup[]> {
  const query = buildRecordsQuery(params);
  const url = `${import.meta.env.VITE_API_BASE_URL}/highlights/${query ? `?${query}` : ''}`;
  // fetch, check ok, parse unknown JSON with parseHighlightsByMetricResponse(...)
}
```

- [x] Write `tests/services/records.test.ts` covering:
  - query builder includes `year` and `type_id`;
  - query builder omits `year` when `year` is null for lifetime;
  - valid overview dict response parses into groups;
  - unknown metric key rejects;
  - invalid `scope`, `rank`, `value`, missing `activity_id`, and malformed `data` reject;
  - records are sorted by rank;
  - records with mismatched metric are rejected.
- [x] Run:

```bash
bun test tests/services/records.test.ts
```

Expected: new service tests pass.

## Task 3: Add Records Formatting And Grouping Utilities

**Files:**
- Create: `src/utils/records.ts`
- Test: `tests/utils/records.test.ts`

- [x] Create metric group metadata:

```ts
import type { ActivityHighlight, HighlightMetric, RecordsMetricGroup } from '@/services/records';

export type RecordMetricGroupId = 'endurance' | 'speed' | 'power';

export interface RecordMetricDefinition {
  metric: HighlightMetric;
  label: string;
  group: RecordMetricGroupId;
  unit: 'duration' | 'kilometers' | 'meters' | 'speed' | 'watts';
}
```

- [x] Define all backend metrics:

```ts
export const recordMetricDefinitions: RecordMetricDefinition[] = [
  { metric: 'duration', label: 'Duration', group: 'endurance', unit: 'duration' },
  { metric: 'distance', label: 'Distance', group: 'endurance', unit: 'kilometers' },
  { metric: 'elevation_change_up', label: 'Elevation gain', group: 'endurance', unit: 'meters' },
  { metric: 'avg_speed', label: 'Average speed', group: 'speed', unit: 'speed' },
  { metric: 'max_speed', label: 'Max speed', group: 'speed', unit: 'speed' },
  { metric: 'avg_power', label: 'Average power', group: 'power', unit: 'watts' },
  { metric: 'max_power', label: 'Max power', group: 'power', unit: 'watts' },
  { metric: 'avg_power1min', label: '1 min power', group: 'power', unit: 'watts' },
  { metric: 'avg_power2min', label: '2 min power', group: 'power', unit: 'watts' },
  { metric: 'avg_power5min', label: '5 min power', group: 'power', unit: 'watts' },
  { metric: 'avg_power10min', label: '10 min power', group: 'power', unit: 'watts' },
  { metric: 'avg_power20min', label: '20 min power', group: 'power', unit: 'watts' },
  { metric: 'avg_power30min', label: '30 min power', group: 'power', unit: 'watts' },
  { metric: 'avg_power60min', label: '60 min power', group: 'power', unit: 'watts' },
];
```

- [x] Add helpers:
  - `getRecordMetricDefinition(metric)`
  - `formatRecordValue(metric, value)`
  - `sortRecordGroups(groups)`
  - `formatRecordActivityDate(record)`
- [x] Format values:
  - duration string: parse with `parseISODuration`, format with `formatDuration`;
  - duration number: format as seconds with `formatDuration`;
  - distance: `12.34 km`;
  - elevation: `123 m`;
  - speed: `12.3 km/h`;
  - power: `321 W`.
- [x] `sortRecordGroups(groups)` order:
  - Endurance metrics first, Speed second, Power third;
  - within a group, use `recordMetricDefinitions` order;
  - within records, sort by `rank ASC`.
- [x] Write `tests/utils/records.test.ts` covering all value formatters, all metric definitions, deterministic group sorting, and date formatting.
- [x] Run:

```bash
bun test tests/utils/records.test.ts
```

Expected: new utility tests pass.

## Task 4: Add Pinia Records Store

**Files:**
- Create: `src/stores/records.ts`

- [x] Create state:

```ts
const currentYear = new Date().getFullYear();

const scope = ref<HighlightTimeScope>('yearly');
const year = ref(currentYear);
const typeId = ref<number | null>(null);
const groups = ref<RecordsMetricGroup[]>([]);
const selectedMetric = ref<HighlightMetric | null>(null);
const activitySummaries = ref<Record<string, Activity>>({});
const isLoading = ref(false);
const isLoadingSummaries = ref(false);
const error = ref<string | null>(null);
```

- [x] Add computed selected group:

```ts
const selectedGroup = computed(() =>
  groups.value.find((group) => group.metric === selectedMetric.value) ?? null
);
```

- [x] Add request year helper:

```ts
const requestYear = computed(() => (scope.value === 'yearly' ? year.value : null));
```

- [x] Add `fetchOverview()`:
  - set loading state;
  - call `fetchRecordsOverview({ year: requestYear.value, typeId: typeId.value })`;
  - sort and store returned groups;
  - keep current selected metric if still present, otherwise select first group metric;
  - clear activity summary cache for records no longer visible;
  - call `fetchSelectedActivitySummaries()`;
  - set readable error on failure.
- [x] Add `setScope(nextScope)`, `setYear(nextYear)`, and `setTypeId(nextTypeId)`:
  - update state;
  - call `fetchOverview()`.
- [x] Add `selectMetric(metric)`:
  - update `selectedMetric`;
  - call `fetchSelectedActivitySummaries()`.
- [x] Add `fetchSelectedActivitySummaries()`:
  - read current selected group records;
  - find activity ids not already in `activitySummaries`;
  - fetch selected metric activity summaries with existing `fetchActivitySummary(activityId)`;
  - cache successful summaries by activity id;
  - ignore missing activity summaries in page rendering by falling back to date/activity id display.
- [x] Export all state, computed values, and actions.

## Task 5: Add Records Page

**Files:**
- Create: `src/views/RecordsView.vue`

- [x] Create `<script setup lang="ts">` that imports:
  - `computed`, `onMounted`;
  - `Trophy`, `CalendarDays`, `Medal`, `Filter`;
  - `useRecordsStore`;
  - `useTypeStore`;
  - helpers from `src/utils/records.ts`.
- [x] On mount:
  - call `typeStore.fetchActivityTypes()`;
  - call `recordsStore.fetchOverview()`.
- [x] Template structure:
  - page wrapper `bg-verve-medium min-h-[calc(100vh-64px)]`;
  - max-width container;
  - header with `Records` title and `Trophy case` subtitle;
  - segmented Yearly/Lifetime buttons;
  - year control only for Yearly scope;
  - activity type select with `All activity types` default;
  - left metric rail grouped by Endurance, Speed, Power;
  - right selected metric detail.
- [x] Year control:
  - decrement button sets `year - 1`;
  - number input updates `year`;
  - increment button sets `year + 1`;
  - controls call `recordsStore.setYear(...)`.
- [x] Type filter:
  - options from `typeStore.activityTypes`;
  - empty value maps to `null`;
  - selected type calls `recordsStore.setTypeId(...)`.
- [x] Metric rail item content:
  - metric label;
  - best value from first record;
  - loaded count, expected to be 1 to 3;
  - selected state using Verve palette.
- [x] Detail content:
  - loading state;
  - error state;
  - empty state;
  - podium/list cards for `selectedGroup.records`;
  - rank badge `#1`, `#2`, `#3`;
  - value formatted with `formatRecordValue`;
  - activity title from cached activity summary name, cached activity date, or activity id fallback;
  - router-link to `activity-detail`.
- [x] Do not add `Show more`; v1 only shows saved top 3.
- [x] Keep card radius at `rounded-lg` or less unless matching existing component card patterns.
- [x] Do not use `v-html`.

## Task 6: Add Route And Navigation

**Files:**
- Modify: `src/router/index.ts`
- Modify: `src/components/Navbar.vue`

- [x] Add route under authenticated `MainLayout` children:

```ts
{
  path: 'records',
  name: 'records',
  component: () => import('@/views/RecordsView.vue'),
},
```

- [x] Add desktop Statistics dropdown link before Heatmap:

```vue
<router-link
  to="/records"
  class="block px-4 py-2 hover:bg-verve-light text-verve-brown/80 hover:text-verve-brown"
>
  Records
</router-link>
```

- [x] Add mobile Statistics link before Heatmap:

```vue
<router-link
  to="/records"
  class="block pl-6 pr-3 py-2 text-sm font-medium text-verve-brown hover:bg-verve-light"
>
  Records
</router-link>
```

## Task 7: Validation And Handoff

**Files:**
- Review changed files only.

- [x] Run focused tests:

```bash
bun test tests/services/records.test.ts tests/utils/records.test.ts
```

Expected: all records tests pass.

- [x] Run TypeScript check:

```bash
bun run type-check
```

Expected: no type errors.

- [x] Run full repository gate:

```bash
bun run check
```

Expected: all harness, link, API, agent-rules, ESLint-baseline, type-check, and build gates pass.

- [x] Run diff distribution:

```bash
bun run diff:distribution
```

Expected: report source, test, docs, and other change counts for final handoff.

- [x] Manual browser check:
  - log in;
  - open Statistics > Records;
  - verify current year is default;
  - switch Lifetime and confirm request omits year;
  - choose an activity type and confirm overview refetches with `type_id`;
  - select at least one Endurance, Speed, and Power metric;
  - verify no load-more control appears;
  - open an activity record link and confirm it routes to activity detail.

Note: Manual browser verification was completed by the user. Starting the local Vite dev server from this sandbox failed with `listen EPERM` on `127.0.0.1:5173`; automated build and type validation passed.

## Assumptions

- Backend `type_id` support lands before frontend implementation and `backend_openapi.json` is updated from that backend.
- Backend keeps current response shapes for `/highlights/` and `/highlights/metric/{metric}`.
- Backend stores and returns only top 3 records per metric for v1.
- Backend owns ranking.
- Frontend fetches and caches activity summaries for visible selected metric rows via existing `fetchActivitySummary`.
- Frontend exposes activity type filtering because backend will add `type_id`.
- No pagination or load-more behavior in v1.
- No dashboard widget redesign in v1.
- No activity-detail achievement redesign in v1.
