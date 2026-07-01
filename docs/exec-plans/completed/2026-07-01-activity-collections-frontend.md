# Activity Collections Frontend Implementation Plan

> **For agentic workers:** Implement this task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Use `superpowers:executing-plans` or an equivalent task-by-task execution workflow before editing runtime code.

**Goal:** Add beta frontend support for activity collections: list, create from selected activities, detail overview, colored multi-activity map, metadata edit, append activities, and delete.

**Architecture:** Keep collection API integration in a dedicated service with strict `unknown` parsing at the backend boundary. Keep collection UI as route-level Vue views plus small collection-specific components, with local view state rather than a new Pinia store because collection state is not shared across the app yet. Reuse existing activity, date, duration, Leaflet, Lucide, and confirmation-modal patterns.

**Tech Stack:** Vue 3 Composition API, `<script setup lang="ts">`, Vue Router, Pinia auth, TypeScript, Bun tests, Leaflet, Tailwind CSS v4, backend OpenAPI contract.

**Primary success check:** A logged-in user can open `/collections`, create a collection from manually selected activities, view collection totals plus a colored map grouped by activity, append more activities or edit metadata from `/collections/:id/edit`, delete a collection with confirmation, and pass `bun run check` plus `bun run diff:distribution`.

---

## Current Status

- OpenAPI collection endpoints are present in `backend_openapi.json` and `docs/generated/backend-openapi-summary.json`.
- Existing changed files from the user branch must be preserved:
  - `backend_openapi.json`
  - `docs/generated/backend-openapi-summary.json`
  - untracked `diff.txt`, `main_logo.svg`, `small_logo.png`
- This plan intentionally does not implement backend generation because the OpenAPI contract has no auto-generate endpoint.

Implementation update:

- Runtime implementation, tests, route wiring, navigation, and collection views/components are complete.
- Manual browser QA was performed by the user, including the post-QA change to omit the no-map placeholder box when no coordinate data exists.
- Validation completed: `bun test tests/services/api.test.ts tests/services/collections.test.ts`, `bun run type-check`, `bun run check`, and `bun run diff:distribution`.
- `bun run diff:distribution` reported only `diff.txt`, `main_logo.svg`, and `small_logo.png` because the implementation files are staged and the script reports unstaged modified/untracked files via `git ls-files --modified --others --exclude-standard`.

## Backend Contract Facts

Confirmed in `backend_openapi.json`:

```http
GET /api/v1/collection
POST /api/v1/collection
GET /api/v1/collection/{id}
PATCH /api/v1/collection/{id}
DELETE /api/v1/collection/{id}
GET /api/v1/collection/{id}/track
```

Request and response shapes to honor:

```ts
interface ActivityCollectionCreate {
  name: string;
  description?: string | null;
  activity_ids: string[];
}

interface CollectionUpdate {
  name?: string | null;
  description?: string | null;
  activity_ids?: string[] | null;
  replace_activities?: boolean;
}

interface CollectionOverview {
  id: string;
  activity_ids: string[];
  name: string;
  description?: string | null;
  count: number;
  distance: number | null;
  moving_duration: string | null;
  duration: string;
  start: string;
  end: string;
  elevation_change_up?: number | null;
  elevation_change_down?: number | null;
}

interface CollectionDetailResponse {
  id: string;
  name: string;
  description?: string | null;
  activities: ApiActivity[];
  total_distance: number | null;
  total_duration: string;
  total_moving_duration: string | null;
  total_elevation_change_up: number | null;
  total_elevation_change_down: number | null;
}

interface CollectionTrackPointResponse {
  id: number;
  segment_id: number;
  latitude: number | null;
  longitude: number | null;
  time: string;
  elevation: number | null;
  diff_time: number | null;
  diff_distance: number | null;
  cum_distance: number | null;
  speed: number | null;
  heartrate: number | null;
  cadence: number | null;
  power: number | null;
  activity_id: string;
  activity_index: number;
  collection_cum_distance: number | null;
}
```

Beta policy decisions:

- Creation is manual selection from activities, not automatic backend generation.
- Editing can change name and description and append activities.
- Removing, replacing, and reordering activity ids is out of scope for this beta UI because it requires presenting `replace_activities` safely.
- UI sorts collection overviews by `start` descending and collection activities by `start` ascending.

## File Map

Create:

- `src/services/collections.ts` - collection types, response parsers, fetch/create/update/delete functions.
- `tests/services/collections.test.ts` - parser and request tests for collection service.
- `tests/services/api.test.ts` - request tests for the activity-page helper used by the picker.
- `src/components/collections/CollectionActivityPicker.vue` - filterable activity selector for create/edit flows.
- `src/components/collections/CollectionListItem.vue` - collection row/card for the list view.
- `src/components/collections/CollectionMap.vue` - Leaflet map with one colored polyline per activity.
- `src/views/CollectionListView.vue` - collection index at `/collections`.
- `src/views/CollectionCreateView.vue` - create flow at `/collections/new`.
- `src/views/CollectionDetailView.vue` - collection detail at `/collections/:id`.
- `src/views/CollectionEditView.vue` - metadata edit and append flow at `/collections/:id/edit`.

Modify:

- `src/services/api.ts` - export `mapApiActivity` and add a page fetch helper for activity picker use.
- `src/router/index.ts` - add collection routes.
- `src/components/Navbar.vue` - add Collections to Training menu on desktop and mobile.

## Task 1: Add Activity Page Helper Tests

**Files:**
- Test: `tests/services/api.test.ts`
- Modify later: `src/services/api.ts`

- [x] Create `tests/services/api.test.ts` with direct request tests for the activity picker helper.

```ts
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '../../src/stores/auth';
import { fetchActivityPage } from '../../src/services/api';

const originalFetch = globalThis.fetch;
const originalLocalStorage = globalThis.localStorage;

const jsonResponse = (body: unknown, init?: ResponseInit): Response =>
  new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

beforeEach(() => {
  setActivePinia(createPinia());
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    length: 0,
  } as Storage;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalLocalStorage;
});

describe('activity API page helper', () => {
  test('fetches a filtered activity page with auth headers', async () => {
    const userStore = useUserStore();
    userStore.setToken('token-123');
    const fetchMock = mock(async () =>
      jsonResponse({
        data: [
          {
            id: 'activity-1',
            start: '2026-06-01T08:00:00Z',
            duration: 'PT1H',
            distance: 10,
            type_id: 1,
            sub_type_id: null,
            name: 'Morning run',
            created_at: '2026-06-01T09:00:00Z',
            tags: [],
          },
        ],
      })
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const result = await fetchActivityPage({
      limit: 25,
      offset: 50,
      year: 2026,
      month: 6,
      type_id: 1,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${import.meta.env.VITE_API_BASE_URL}/activity/?limit=25&offset=50&year=2026&month=6&type_id=1`,
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'Bearer token-123' },
      })
    );
    expect(result[0]?.id).toBe('activity-1');
    expect(result[0]?.duration).toBe('1h 0m');
  });

  test('throws when not authenticated', async () => {
    await expect(fetchActivityPage({ limit: 10, offset: 0 })).rejects.toThrow('Not authenticated');
  });
});
```

- [x] Run the test and confirm it fails because `fetchActivityPage` is not exported yet.

```bash
bun test tests/services/api.test.ts
```

Expected: fail with an import/export error for `fetchActivityPage`.

## Task 2: Add Activity Page Helper

**Files:**
- Modify: `src/services/api.ts`
- Test: `tests/services/api.test.ts`

- [x] Export the existing mapper so collection detail can reuse the current activity shape.

Change:

```ts
const mapApiActivity = (apiActivity: ApiActivity): Activity => {
```

To:

```ts
export const mapApiActivity = (apiActivity: ApiActivity): Activity => {
```

- [x] Add a page-query type near `ApiActivity`.

```ts
export interface ActivityPageParams {
  limit?: number;
  offset?: number;
  year?: number | null;
  month?: number | null;
  type_id?: number | null;
  sub_type_id?: number | null;
  category_id?: number | null;
  tag_id?: number | null;
}
```

- [x] Add a query builder and fetch helper near `fetchActivitySummary`.

```ts
const appendNullableNumberParam = (
  params: URLSearchParams,
  key: string,
  value: number | null | undefined
) => {
  if (value !== null && value !== undefined) {
    params.set(key, value.toString());
  }
};

export function buildActivityPageQuery(params: ActivityPageParams): string {
  const query = new URLSearchParams();

  query.set('limit', (params.limit ?? 20).toString());
  query.set('offset', (params.offset ?? 0).toString());
  appendNullableNumberParam(query, 'year', params.year);
  appendNullableNumberParam(query, 'month', params.month);
  appendNullableNumberParam(query, 'type_id', params.type_id);
  appendNullableNumberParam(query, 'sub_type_id', params.sub_type_id);
  appendNullableNumberParam(query, 'category_id', params.category_id);
  appendNullableNumberParam(query, 'tag_id', params.tag_id);

  return query.toString();
}

export async function fetchActivityPage(params: ActivityPageParams): Promise<Activity[]> {
  const query = buildActivityPageQuery(params);
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/activity/?${query}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw new Error('Failed to fetch activities.');

  const responseData: unknown = await response.json();
  if (!isRecord(responseData) || !Array.isArray(responseData.data)) {
    throw new Error('Invalid activities response.');
  }

  return responseData.data
    .filter(isRecord)
    .map((activity) => mapApiActivity(activity as unknown as ApiActivity));
}
```

- [x] If TypeScript rejects the cast in the final line, add `parseApiActivity(value: unknown): ApiActivity` instead of using a cast. The parser must check required fields from `ActivityPublic`: `id`, `start`, `duration`, `type_id`, `sub_type_id`, `name`, and `tags`.

- [x] Run the focused test.

```bash
bun test tests/services/api.test.ts
```

Expected: pass.

## Task 3: Write Collection Service Tests

**Files:**
- Create: `tests/services/collections.test.ts`
- Implement later: `src/services/collections.ts`

- [x] Create parser fixtures at the top of `tests/services/collections.test.ts`.

```ts
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '../../src/stores/auth';
import {
  createCollection,
  deleteCollection,
  fetchCollection,
  fetchCollectionTrack,
  fetchCollections,
  parseCollectionDetailResponse,
  parseCollectionListResponse,
  parseCollectionTrackResponse,
  updateCollection,
} from '../../src/services/collections';

const originalFetch = globalThis.fetch;
const originalLocalStorage = globalThis.localStorage;

const jsonResponse = (body: unknown, init?: ResponseInit): Response =>
  new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

const apiActivity = (id: string, start: string) => ({
  id,
  start,
  duration: 'PT1H30M',
  distance: 20,
  type_id: 1,
  sub_type_id: null,
  name: `Activity ${id}`,
  created_at: start,
  tags: [],
});

const overview = {
  id: 'collection-1',
  activity_ids: ['activity-2', 'activity-1'],
  name: 'Weekend ride',
  description: 'Two linked rides',
  count: 2,
  distance: 45,
  moving_duration: 'PT2H10M',
  duration: 'PT2H30M',
  start: '2026-06-01T08:00:00Z',
  end: '2026-06-02T10:30:00Z',
  elevation_change_up: 600,
  elevation_change_down: 580,
};

beforeEach(() => {
  setActivePinia(createPinia());
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    length: 0,
  } as Storage;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalLocalStorage;
});
```

- [x] Add parser tests for list/detail/track response shapes.

```ts
describe('collection response parsing', () => {
  test('parses collection list responses and sorts by start descending', () => {
    const result = parseCollectionListResponse({
      data: [
        { ...overview, id: 'older', start: '2026-05-01T08:00:00Z' },
        { ...overview, id: 'newer', start: '2026-06-01T08:00:00Z' },
      ],
    });

    expect(result.map((item) => item.id)).toEqual(['newer', 'older']);
    expect(result[0]?.durationSeconds).toBe(9000);
    expect(result[0]?.movingDurationSeconds).toBe(7800);
  });

  test('parses detail responses and sorts activities by start ascending', () => {
    const result = parseCollectionDetailResponse({
      id: 'collection-1',
      name: 'Trip',
      description: null,
      activities: [
        apiActivity('activity-2', '2026-06-02T08:00:00Z'),
        apiActivity('activity-1', '2026-06-01T08:00:00Z'),
      ],
      total_distance: 40,
      total_duration: 'PT3H',
      total_moving_duration: null,
      total_elevation_change_up: 500,
      total_elevation_change_down: 490,
    });

    expect(result.activities.map((activity) => activity.id)).toEqual(['activity-1', 'activity-2']);
    expect(result.totalDuration).toBe('3h 0m');
  });

  test('parses collection track points with activity grouping fields', () => {
    const result = parseCollectionTrackResponse({
      data: [
        {
          id: 1,
          segment_id: 10,
          latitude: 47.1,
          longitude: 8.1,
          time: '2026-06-01T08:00:00Z',
          elevation: 500,
          diff_time: null,
          diff_distance: null,
          cum_distance: 0,
          speed: null,
          heartrate: null,
          cadence: null,
          power: null,
          activity_id: 'activity-1',
          activity_index: 0,
          collection_cum_distance: 0,
        },
      ],
    });

    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 1,
        lat: 47.1,
        lon: 8.1,
        activityId: 'activity-1',
        activityIndex: 0,
        collectionDist: 0,
      })
    );
  });

  test('rejects malformed collection response shapes', () => {
    expect(() => parseCollectionListResponse({ data: {} })).toThrow('Invalid collection list response');
    expect(() => parseCollectionDetailResponse({ activities: [] })).toThrow('Invalid collection detail response');
    expect(() => parseCollectionTrackResponse({ data: [{ id: 'bad' }] })).toThrow('Invalid collection track point');
  });
});
```

- [x] Add request tests.

```ts
describe('collection API requests', () => {
  test('fetches collection list with pagination filters', async () => {
    const userStore = useUserStore();
    userStore.setToken('token-123');
    const fetchMock = mock(async () => jsonResponse({ data: [overview] }));
    globalThis.fetch = fetchMock as typeof fetch;

    await fetchCollections({ limit: 20, offset: 40, year: 2026, month: 6 });

    expect(fetchMock).toHaveBeenCalledWith(
      `${import.meta.env.VITE_API_BASE_URL}/collection?limit=20&offset=40&year=2026&month=6`,
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'Bearer token-123' },
      })
    );
  });

  test('creates a collection with activity ids', async () => {
    const userStore = useUserStore();
    userStore.setToken('token-123');
    const fetchMock = mock(async () =>
      jsonResponse({
        id: 'collection-1',
        name: 'Trip',
        description: null,
        created_at: '2026-06-01T08:00:00Z',
        activity_ids: ['activity-1'],
      })
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const result = await createCollection({
      name: 'Trip',
      description: null,
      activityIds: ['activity-1'],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${import.meta.env.VITE_API_BASE_URL}/collection`,
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Trip',
          description: null,
          activity_ids: ['activity-1'],
        }),
      })
    );
    expect(result.id).toBe('collection-1');
  });

  test('updates collection metadata and appends activity ids', async () => {
    const userStore = useUserStore();
    userStore.setToken('token-123');
    const fetchMock = mock(async () =>
      jsonResponse({
        id: 'collection-1',
        name: 'Trip updated',
        description: 'Updated',
        created_at: '2026-06-01T08:00:00Z',
        activity_ids: ['activity-1', 'activity-2'],
      })
    );
    globalThis.fetch = fetchMock as typeof fetch;

    await updateCollection('collection-1', {
      name: 'Trip updated',
      description: 'Updated',
      activityIds: ['activity-2'],
      replaceActivities: false,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${import.meta.env.VITE_API_BASE_URL}/collection/collection-1`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Trip updated',
          description: 'Updated',
          activity_ids: ['activity-2'],
          replace_activities: false,
        }),
      })
    );
  });

  test('fetches detail, track, and deletes collections', async () => {
    const userStore = useUserStore();
    userStore.setToken('token-123');
    const fetchMock = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.endsWith('/collection/collection-1/track')) {
        return jsonResponse({ data: [] });
      }
      if (url.endsWith('/collection/collection-1') && init?.method === 'DELETE') {
        return new Response(null, { status: 204 });
      }
      return jsonResponse({
        id: 'collection-1',
        name: 'Trip',
        description: null,
        activities: [apiActivity('activity-1', '2026-06-01T08:00:00Z')],
        total_distance: 20,
        total_duration: 'PT1H',
        total_moving_duration: null,
        total_elevation_change_up: null,
        total_elevation_change_down: null,
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(fetchCollection('collection-1')).resolves.toEqual(
      expect.objectContaining({ id: 'collection-1' })
    );
    await expect(fetchCollectionTrack('collection-1')).resolves.toEqual([]);
    await expect(deleteCollection('collection-1')).resolves.toBeUndefined();
  });
});
```

- [x] Run the test and confirm it fails because `src/services/collections.ts` does not exist yet.

```bash
bun test tests/services/collections.test.ts
```

Expected: fail with a missing module error.

## Task 4: Implement Collection Service

**Files:**
- Create: `src/services/collections.ts`
- Test: `tests/services/collections.test.ts`

- [x] Create `src/services/collections.ts` with exported types.

```ts
import { useUserStore } from '../stores/auth';
import type { Activity } from '../stores/activity';
import {
  mapApiActivity,
  type ApiActivity,
  type TrackPoint,
} from './api';
import { formatDuration, parseISODuration } from '../utils/datetime';

export interface CollectionListFilters {
  limit?: number;
  offset?: number;
  year?: number | null;
  month?: number | null;
}

export interface CollectionOverview {
  id: string;
  activityIds: string[];
  name: string;
  description: string | null;
  count: number;
  distance: number | null;
  movingDuration: string | null;
  movingDurationSeconds: number | null;
  duration: string;
  durationSeconds: number;
  start: string;
  end: string;
  elevationGain: number | null;
  elevationLoss: number | null;
}

export interface CollectionDetail {
  id: string;
  name: string;
  description: string | null;
  activities: Activity[];
  totalDistance: number | null;
  totalDuration: string;
  totalDurationSeconds: number;
  totalMovingDuration: string | null;
  totalMovingDurationSeconds: number | null;
  totalElevationGain: number | null;
  totalElevationLoss: number | null;
}

export interface CollectionCreatePayload {
  name: string;
  description: string | null;
  activityIds: string[];
}

export interface CollectionUpdatePayload {
  name?: string | null;
  description?: string | null;
  activityIds?: string[];
  replaceActivities?: boolean;
}

export interface CollectionMutationResult {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  activityIds: string[];
}

export interface CollectionTrackPoint extends TrackPoint {
  activityId: string;
  activityIndex: number;
  collectionDist: number | null;
}
```

- [x] Add parser helpers and public parser functions.

```ts
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

const toNumber = (value: unknown): number | null =>
  typeof value === 'number' ? value : null;

const toNullableNumber = (value: unknown): number | null =>
  typeof value === 'number' ? value : null;

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const parseDuration = (duration: string) => ({
  label: formatDuration(parseISODuration(duration)),
  seconds: parseISODuration(duration),
});

function parseOverview(value: unknown): CollectionOverview {
  if (!isRecord(value)) throw new Error('Invalid collection overview.');

  const id = toString(value.id);
  const name = toString(value.name);
  const activityIds = toStringArray(value.activity_ids);
  const count = toNumber(value.count);
  const duration = toString(value.duration);
  const start = toString(value.start);
  const end = toString(value.end);

  if (
    id === null ||
    name === null ||
    activityIds.length === 0 ||
    count === null ||
    duration === null ||
    start === null ||
    end === null
  ) {
    throw new Error('Invalid collection overview.');
  }

  const parsedDuration = parseDuration(duration);
  const movingDuration = toString(value.moving_duration);
  const parsedMovingDuration = movingDuration === null ? null : parseDuration(movingDuration);

  return {
    id,
    activityIds,
    name,
    description: toString(value.description),
    count,
    distance: toNullableNumber(value.distance),
    movingDuration: parsedMovingDuration?.label ?? null,
    movingDurationSeconds: parsedMovingDuration?.seconds ?? null,
    duration: parsedDuration.label,
    durationSeconds: parsedDuration.seconds,
    start,
    end,
    elevationGain: toNullableNumber(value.elevation_change_up),
    elevationLoss: toNullableNumber(value.elevation_change_down),
  };
}

export function parseCollectionListResponse(value: unknown): CollectionOverview[] {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new Error('Invalid collection list response.');
  }

  return value.data
    .map(parseOverview)
    .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
}
```

- [x] Add detail and track parsers.

```ts
export function parseCollectionDetailResponse(value: unknown): CollectionDetail {
  if (!isRecord(value) || !Array.isArray(value.activities)) {
    throw new Error('Invalid collection detail response.');
  }

  const id = toString(value.id);
  const name = toString(value.name);
  const totalDuration = toString(value.total_duration);

  if (id === null || name === null || totalDuration === null) {
    throw new Error('Invalid collection detail response.');
  }

  const parsedDuration = parseDuration(totalDuration);
  const movingDuration = toString(value.total_moving_duration);
  const parsedMovingDuration = movingDuration === null ? null : parseDuration(movingDuration);
  const activities = value.activities
    .filter(isRecord)
    .map((activity) => mapApiActivity(activity as unknown as ApiActivity))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return {
    id,
    name,
    description: toString(value.description),
    activities,
    totalDistance: toNullableNumber(value.total_distance),
    totalDuration: parsedDuration.label,
    totalDurationSeconds: parsedDuration.seconds,
    totalMovingDuration: parsedMovingDuration?.label ?? null,
    totalMovingDurationSeconds: parsedMovingDuration?.seconds ?? null,
    totalElevationGain: toNullableNumber(value.total_elevation_change_up),
    totalElevationLoss: toNullableNumber(value.total_elevation_change_down),
  };
}

function parseCollectionTrackPoint(value: unknown): CollectionTrackPoint {
  if (!isRecord(value)) throw new Error('Invalid collection track point.');

  const id = toNumber(value.id);
  const activityId = toString(value.activity_id);
  const activityIndex = toNumber(value.activity_index);
  const time = toString(value.time);

  if (id === null || activityId === null || activityIndex === null || time === null) {
    throw new Error('Invalid collection track point.');
  }

  return {
    id,
    lat: toNullableNumber(value.latitude),
    lon: toNullableNumber(value.longitude),
    ele: toNullableNumber(value.elevation),
    time,
    dist: toNullableNumber(value.cum_distance) ?? 0,
    speed: toNullableNumber(value.speed),
    hr: typeof value.heartrate === 'number' ? value.heartrate : null,
    cad: typeof value.cadence === 'number' ? value.cadence : null,
    power: typeof value.power === 'number' ? value.power : null,
    activityId,
    activityIndex,
    collectionDist: toNullableNumber(value.collection_cum_distance),
  };
}

export function parseCollectionTrackResponse(value: unknown): CollectionTrackPoint[] {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new Error('Invalid collection track response.');
  }

  return value.data.map(parseCollectionTrackPoint);
}
```

- [x] Add API functions.

```ts
const getAuthHeaders = (): HeadersInit => {
  const userStore = useUserStore();
  if (!userStore.token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${userStore.token}` };
};

const getJsonAuthHeaders = (): HeadersInit => ({
  ...getAuthHeaders(),
  'Content-Type': 'application/json',
});

const appendNullableNumberParam = (
  params: URLSearchParams,
  key: string,
  value: number | null | undefined
) => {
  if (value !== null && value !== undefined) {
    params.set(key, value.toString());
  }
};

const buildCollectionQuery = (filters: CollectionListFilters) => {
  const query = new URLSearchParams();
  query.set('limit', (filters.limit ?? 20).toString());
  query.set('offset', (filters.offset ?? 0).toString());
  appendNullableNumberParam(query, 'year', filters.year);
  appendNullableNumberParam(query, 'month', filters.month);
  return query.toString();
};

const parseMutationResult = (value: unknown): CollectionMutationResult => {
  if (!isRecord(value)) throw new Error('Invalid collection mutation response.');

  const id = toString(value.id);
  const name = toString(value.name);
  const createdAt = toString(value.created_at);

  if (id === null || name === null || createdAt === null) {
    throw new Error('Invalid collection mutation response.');
  }

  return {
    id,
    name,
    description: toString(value.description),
    createdAt,
    activityIds: toStringArray(value.activity_ids),
  };
};

export async function fetchCollections(filters: CollectionListFilters): Promise<CollectionOverview[]> {
  const query = buildCollectionQuery(filters);
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/collection?${query}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw new Error('Failed to fetch collections.');
  return parseCollectionListResponse(await response.json());
}

export async function createCollection(payload: CollectionCreatePayload): Promise<CollectionMutationResult> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/collection`, {
    method: 'POST',
    headers: getJsonAuthHeaders(),
    body: JSON.stringify({
      name: payload.name,
      description: payload.description,
      activity_ids: payload.activityIds,
    }),
  });

  if (!response.ok) throw new Error('Failed to create collection.');
  return parseMutationResult(await response.json());
}

export async function fetchCollection(collectionId: string): Promise<CollectionDetail> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/collection/${collectionId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw new Error('Failed to fetch collection.');
  return parseCollectionDetailResponse(await response.json());
}

export async function updateCollection(
  collectionId: string,
  payload: CollectionUpdatePayload
): Promise<CollectionMutationResult> {
  const body: Record<string, string | string[] | boolean | null> = {};
  if (payload.name !== undefined) body.name = payload.name;
  if (payload.description !== undefined) body.description = payload.description;
  if (payload.activityIds !== undefined) body.activity_ids = payload.activityIds;
  if (payload.replaceActivities !== undefined) body.replace_activities = payload.replaceActivities;

  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/collection/${collectionId}`, {
    method: 'PATCH',
    headers: getJsonAuthHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error('Failed to update collection.');
  return parseMutationResult(await response.json());
}

export async function deleteCollection(collectionId: string): Promise<void> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/collection/${collectionId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw new Error('Failed to delete collection.');
}

export async function fetchCollectionTrack(collectionId: string): Promise<CollectionTrackPoint[]> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/collection/${collectionId}/track`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw new Error('Failed to fetch collection track.');
  return parseCollectionTrackResponse(await response.json());
}
```

- [x] If `mapApiActivity(activity as unknown as ApiActivity)` is rejected by lint or type-check, replace it with a local parser that checks `ApiActivity` fields explicitly. Do not use `any`.

- [x] Run collection service tests.

```bash
bun test tests/services/collections.test.ts
```

Expected: pass.

## Task 5: Add Collection Routes

**Files:**
- Modify: `src/router/index.ts`

- [x] Add lazy routes under the authenticated `MainLayout` children.

```ts
{
  path: 'collections',
  name: 'collections',
  component: () => import('@/views/CollectionListView.vue'),
},
{
  path: 'collections/new',
  name: 'collection-create',
  component: () => import('@/views/CollectionCreateView.vue'),
},
{
  path: 'collections/:id',
  name: 'collection-detail',
  component: () => import('@/views/CollectionDetailView.vue'),
  props: true,
},
{
  path: 'collections/:id/edit',
  name: 'collection-edit',
  component: () => import('@/views/CollectionEditView.vue'),
  props: true,
},
```

- [x] Run type-check after route additions once placeholder views exist in later tasks. At this task alone, type-check will fail until the referenced views are created.

## Task 6: Add Collection Navigation

**Files:**
- Modify: `src/components/Navbar.vue`

- [x] Add Collections to the desktop Training dropdown after Activities.

```vue
<router-link to="/collections"
  class="block px-4 py-2 hover:bg-verve-light text-verve-brown/80 hover:text-verve-brown">
  Collections
</router-link>
```

- [x] Add Collections to the mobile Training group after Activities.

```vue
<router-link to="/collections"
  class="block pl-6 pr-3 py-2 text-sm font-medium text-verve-brown hover:bg-verve-light">
  Collections
</router-link>
```

- [x] Keep the existing dropdown state and mobile-menu close behavior unchanged.

## Task 7: Add Collection List Item Component

**Files:**
- Create: `src/components/collections/CollectionListItem.vue`

- [x] Create the component with a compact, scan-friendly route link.

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { Layers } from 'lucide-vue-next';
import type { CollectionOverview } from '@/services/collections';

const props = defineProps<{
  collection: CollectionOverview;
}>();

const dateRange = computed(() => {
  const start = new Date(props.collection.start).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const end = new Date(props.collection.end).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  return start === end ? start : `${start} - ${end}`;
});
</script>

<template>
  <router-link
    :to="{ name: 'collection-detail', params: { id: collection.id } }"
    class="block bg-white border-b border-verve-medium/10 first:rounded-t-xl last:rounded-b-xl p-5 transition-all duration-200 hover:bg-verve-light hover:border-l-4 hover:border-l-verve-orange"
  >
    <div class="grid grid-cols-2 gap-4 md:grid-cols-7 md:items-center">
      <div class="col-span-2 md:col-span-3">
        <div class="flex items-start gap-3">
          <div class="mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg bg-verve-light text-verve-brown">
            <Layers class="size-5" />
          </div>
          <div class="min-w-0">
            <p class="truncate text-lg font-bold leading-tight text-verve-brown">
              {{ collection.name }}
            </p>
            <p class="mt-1 line-clamp-2 text-sm text-verve-brown/60">
              {{ collection.description || dateRange }}
            </p>
          </div>
        </div>
      </div>

      <div>
        <p class="text-sm font-semibold text-verve-brown/80">{{ dateRange }}</p>
        <p class="text-xs font-bold uppercase tracking-wide text-verve-brown/40">Range</p>
      </div>

      <div>
        <p class="font-bold text-verve-brown">{{ collection.count }}</p>
        <p class="text-xs font-bold uppercase tracking-wide text-verve-brown/40">Activities</p>
      </div>

      <div>
        <p class="font-bold text-verve-brown">
          {{ collection.distance !== null ? collection.distance.toFixed(2) : '-' }}
          <span v-if="collection.distance !== null" class="text-xs font-normal text-verve-brown/50">km</span>
        </p>
        <p class="text-xs font-bold uppercase tracking-wide text-verve-brown/40">Distance</p>
      </div>

      <div class="text-left md:text-right">
        <p class="font-bold text-verve-brown">{{ collection.duration }}</p>
        <p class="text-xs font-bold uppercase tracking-wide text-verve-brown/40">Duration</p>
      </div>
    </div>
  </router-link>
</template>
```

- [x] If the project CSS setup does not support `line-clamp-2`, replace it with `truncate` or a normal paragraph. Do not add a Tailwind plugin for this component.

## Task 8: Add Collection List View

**Files:**
- Create: `src/views/CollectionListView.vue`

- [x] Create local pagination state and a `loadCollections` function.

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Plus } from 'lucide-vue-next';
import CollectionListItem from '@/components/collections/CollectionListItem.vue';
import { fetchCollections, type CollectionOverview } from '@/services/collections';

const COLLECTIONS_PER_PAGE = 20;

const collections = ref<CollectionOverview[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const offset = ref(0);
const canLoadMore = ref(true);

const sortedCollections = computed(() =>
  [...collections.value].sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
);

async function loadCollections(loadMore = false) {
  if (isLoading.value) return;

  isLoading.value = true;
  error.value = null;

  if (!loadMore) {
    collections.value = [];
    offset.value = 0;
    canLoadMore.value = true;
  }

  try {
    const page = await fetchCollections({
      limit: COLLECTIONS_PER_PAGE,
      offset: offset.value,
    });

    collections.value = loadMore ? [...collections.value, ...page] : page;
    offset.value += page.length;
    canLoadMore.value = page.length === COLLECTIONS_PER_PAGE;
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load collections.';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  loadCollections();
});
</script>
```

- [x] Add template matching existing page style.

```vue
<template>
  <div class="min-h-[calc(100vh-64px)] bg-verve-medium p-4 sm:p-6 lg:p-8">
    <div class="mx-auto max-w-7xl">
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold text-verve-brown">Activity Collections</h1>
          <p class="mt-2 text-sm text-verve-brown/60">
            Group related activities into trips, blocks, and multi-day efforts.
          </p>
        </div>

        <router-link
          :to="{ name: 'collection-create' }"
          class="inline-flex items-center justify-center gap-2 rounded-xl bg-verve-brown px-5 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-verve-brown/90"
        >
          <Plus class="size-4" />
          <span>New Collection</span>
        </router-link>
      </div>

      <div v-if="error" class="rounded-xl border border-red-100 bg-red-50 p-4 text-red-600">
        {{ error }}
      </div>

      <div v-else class="mt-6">
        <ul v-if="sortedCollections.length > 0" class="space-y-1">
          <li v-for="collection in sortedCollections" :key="collection.id">
            <CollectionListItem :collection="collection" />
          </li>
        </ul>

        <div v-else-if="!isLoading" class="bg-white p-12 text-center text-verve-brown/50">
          <p class="text-lg">No collections yet.</p>
        </div>
      </div>

      <div class="mt-8 pb-8 text-center">
        <div v-if="isLoading" class="py-4 text-verve-brown/60">
          <span class="animate-pulse">Loading collections...</span>
        </div>
        <button
          v-else-if="canLoadMore"
          type="button"
          class="rounded-xl bg-verve-brown px-8 py-3 font-bold text-white shadow-md transition-colors hover:bg-verve-brown/90"
          @click="loadCollections(true)"
        >
          Load More
        </button>
      </div>
    </div>
  </div>
</template>
```

- [x] Run type-check after all route target views are created.

## Task 9: Add Activity Picker Component

**Files:**
- Create: `src/components/collections/CollectionActivityPicker.vue`

- [x] Create props and emits.

```vue
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { Check, Plus, X } from 'lucide-vue-next';
import ActivityFilter from '@/components/ActivityFilter.vue';
import ActivityListItem from '@/components/ActivityListItem.vue';
import { fetchActivityPage, type ActivityPageParams } from '@/services/api';
import type { Activity, ActivityFilters } from '@/stores/activity';

const props = defineProps<{
  selectedActivities: Activity[];
  lockedActivityIds?: string[];
}>();

const emit = defineEmits<{
  (event: 'update:selectedActivities', value: Activity[]): void;
}>();

const ACTIVITIES_PER_PAGE = 10;

const activities = ref<Activity[]>([]);
const filters = ref<ActivityFilters>({});
const isLoading = ref(false);
const error = ref<string | null>(null);
const offset = ref(0);
const canLoadMore = ref(true);

const selectedIds = computed(() => new Set(props.selectedActivities.map((activity) => activity.id)));
const lockedIds = computed(() => new Set(props.lockedActivityIds ?? []));

const sortedSelectedActivities = computed(() =>
  [...props.selectedActivities].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
);
```

- [x] Add load and selection functions.

```ts
function toPageParams(nextOffset: number): ActivityPageParams {
  return {
    ...filters.value,
    limit: ACTIVITIES_PER_PAGE,
    offset: nextOffset,
  };
}

async function loadActivities(loadMore = false) {
  if (isLoading.value) return;

  isLoading.value = true;
  error.value = null;

  if (!loadMore) {
    activities.value = [];
    offset.value = 0;
    canLoadMore.value = true;
  }

  try {
    const page = await fetchActivityPage(toPageParams(offset.value));
    activities.value = loadMore ? [...activities.value, ...page] : page;
    offset.value += page.length;
    canLoadMore.value = page.length === ACTIVITIES_PER_PAGE;
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load activities.';
  } finally {
    isLoading.value = false;
  }
}

function handleFilterChange(nextFilters: ActivityFilters) {
  filters.value = nextFilters;
  loadActivities(false);
}

function addActivity(activity: Activity) {
  if (selectedIds.value.has(activity.id)) return;
  emit('update:selectedActivities', [...props.selectedActivities, activity]);
}

function removeActivity(activityId: string) {
  if (lockedIds.value.has(activityId)) return;
  emit(
    'update:selectedActivities',
    props.selectedActivities.filter((activity) => activity.id !== activityId)
  );
}

watch(
  () => props.selectedActivities,
  () => {
    emit('update:selectedActivities', sortedSelectedActivities.value);
  },
  { deep: true }
);

onMounted(() => {
  loadActivities(false);
});
</script>
```

- [x] Add template with selected list first and browser below.

```vue
<template>
  <div class="space-y-6">
    <section class="rounded-xl border border-verve-medium/30 bg-white p-5">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h2 class="text-lg font-bold text-verve-brown">Selected activities</h2>
          <p class="mt-1 text-sm text-verve-brown/60">
            {{ selectedActivities.length }} activities in chronological order.
          </p>
        </div>
      </div>

      <div v-if="sortedSelectedActivities.length > 0" class="mt-4 space-y-2">
        <div
          v-for="activity in sortedSelectedActivities"
          :key="activity.id"
          class="flex items-center gap-3 rounded-lg border border-verve-medium/30 bg-verve-light/20 p-3"
        >
          <div class="min-w-0 grow">
            <ActivityListItem :activity="activity" compact />
          </div>
          <button
            type="button"
            class="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="lockedIds.has(activity.id)"
            :aria-label="`Remove ${activity.name || 'activity'} from collection`"
            @click="removeActivity(activity.id)"
          >
            <X class="size-4" />
          </button>
        </div>
      </div>

      <p v-else class="mt-4 rounded-lg bg-verve-light/30 p-4 text-sm text-verve-brown/60">
        Select at least one activity.
      </p>
    </section>

    <section class="rounded-xl border border-verve-medium/30 bg-white p-5">
      <h2 class="text-lg font-bold text-verve-brown">Add activities</h2>
      <div class="mt-4">
        <ActivityFilter :initial-filters="filters" @filter-change="handleFilterChange" />
      </div>

      <div v-if="error" class="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
        {{ error }}
      </div>

      <div class="mt-4 space-y-2">
        <div
          v-for="activity in activities"
          :key="activity.id"
          class="flex items-center gap-3 rounded-lg border border-verve-medium/30 bg-white p-3"
        >
          <div class="min-w-0 grow">
            <ActivityListItem :activity="activity" compact />
          </div>
          <button
            v-if="selectedIds.has(activity.id)"
            type="button"
            disabled
            class="inline-flex items-center justify-center rounded-lg bg-verve-light p-2 text-verve-brown/60"
            :aria-label="`${activity.name || 'Activity'} already selected`"
          >
            <Check class="size-4" />
          </button>
          <button
            v-else
            type="button"
            class="inline-flex items-center justify-center rounded-lg bg-verve-brown p-2 text-white transition-colors hover:bg-verve-brown/90"
            :aria-label="`Add ${activity.name || 'activity'} to collection`"
            @click="addActivity(activity)"
          >
            <Plus class="size-4" />
          </button>
        </div>
      </div>

      <div class="mt-4 text-center">
        <button
          v-if="canLoadMore && !isLoading"
          type="button"
          class="rounded-xl border border-verve-medium bg-white px-5 py-2 text-sm font-semibold text-verve-brown transition-colors hover:bg-verve-light"
          @click="loadActivities(true)"
        >
          Load more activities
        </button>
        <p v-if="isLoading" class="py-3 text-sm text-verve-brown/60">
          Loading activities...
        </p>
      </div>
    </section>
  </div>
</template>
```

- [x] If the watcher causes repeated emits during manual testing, remove the watcher and sort only when parent submits. The emitted order is not required by backend, but visible order must remain chronological.

## Task 10: Add Collection Create View

**Files:**
- Create: `src/views/CollectionCreateView.vue`

- [x] Create form state and submit logic.

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import CollectionActivityPicker from '@/components/collections/CollectionActivityPicker.vue';
import { createCollection } from '@/services/collections';
import type { Activity } from '@/stores/activity';

const router = useRouter();

const name = ref('');
const description = ref('');
const selectedActivities = ref<Activity[]>([]);
const isSaving = ref(false);
const error = ref<string | null>(null);

const canSave = computed(() => name.value.trim().length > 0 && selectedActivities.value.length > 0 && !isSaving.value);

async function handleSubmit() {
  if (!canSave.value) return;

  isSaving.value = true;
  error.value = null;

  try {
    const created = await createCollection({
      name: name.value.trim(),
      description: description.value.trim().length > 0 ? description.value.trim() : null,
      activityIds: selectedActivities.value.map((activity) => activity.id),
    });
    router.push({ name: 'collection-detail', params: { id: created.id } });
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to create collection.';
  } finally {
    isSaving.value = false;
  }
}
</script>
```

- [x] Add template.

```vue
<template>
  <div class="min-h-[calc(100vh-64px)] bg-verve-light/30 p-4 sm:p-6 lg:p-8">
    <form class="mx-auto max-w-7xl space-y-6" @submit.prevent="handleSubmit">
      <div class="rounded-xl border border-verve-medium/30 bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 class="text-3xl font-bold text-verve-brown">New Collection</h1>
            <p class="mt-2 text-sm text-verve-brown/60">
              Select activities manually and save them as one collection.
            </p>
          </div>
          <div class="flex gap-3">
            <router-link
              :to="{ name: 'collections' }"
              class="rounded-xl border border-verve-medium bg-white px-4 py-2 text-sm font-semibold text-verve-brown transition-colors hover:bg-verve-light"
            >
              Cancel
            </router-link>
            <button
              type="submit"
              :disabled="!canSave"
              class="rounded-xl bg-verve-brown px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-verve-brown/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ isSaving ? 'Saving...' : 'Save Collection' }}
            </button>
          </div>
        </div>

        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <label class="block text-sm font-semibold text-verve-brown">
            Name
            <input
              v-model="name"
              type="text"
              class="mt-2 w-full px-3 py-2"
              required
              placeholder="Weekend ride block"
            />
          </label>

          <label class="block text-sm font-semibold text-verve-brown">
            Description
            <textarea
              v-model="description"
              rows="3"
              class="mt-2 w-full px-3 py-2"
              placeholder="Optional notes"
            ></textarea>
          </label>
        </div>

        <div v-if="error" class="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {{ error }}
        </div>
      </div>

      <CollectionActivityPicker v-model:selected-activities="selectedActivities" />
    </form>
  </div>
</template>
```

- [x] Run type-check after this view and the picker exist.

```bash
bun run type-check
```

Expected: pass or reveal route/component type errors to fix before continuing.

## Task 11: Add Collection Map Component

**Files:**
- Create: `src/components/collections/CollectionMap.vue`

- [x] Create a Leaflet component grouped by activity id.

```vue
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Activity } from '@/stores/activity';
import type { CollectionTrackPoint } from '@/services/collections';
import { CHART_COLORS, VERVE_COLORS } from '@/utils/colors';

const props = defineProps<{
  trackData: CollectionTrackPoint[];
  activities: Activity[];
}>();

const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let polylines: L.Polyline[] = [];

const activityById = computed(() => new Map(props.activities.map((activity) => [activity.id, activity])));

const activityColor = (activityId: string) => {
  const activity = activityById.value.get(activityId);
  const sortedIds = props.activities.map((item) => item.id);
  const index = Math.max(sortedIds.indexOf(activityId), 0);
  return CHART_COLORS[index % CHART_COLORS.length] ?? VERVE_COLORS.orange;
};

const groupedTrackData = computed(() => {
  const groups = new Map<string, CollectionTrackPoint[]>();
  for (const point of props.trackData) {
    if (point.lat === null || point.lon === null) continue;
    groups.set(point.activityId, [...(groups.get(point.activityId) ?? []), point]);
  }
  return groups;
});

const legendItems = computed(() =>
  Array.from(groupedTrackData.value.keys()).map((activityId) => ({
    activityId,
    label: activityById.value.get(activityId)?.name || new Date(activityById.value.get(activityId)?.start ?? '').toLocaleDateString(),
    color: activityColor(activityId),
  }))
);

function clearPolylines() {
  polylines.forEach((polyline) => polyline.remove());
  polylines = [];
}

function drawMap() {
  if (!map) return;
  clearPolylines();

  const bounds = L.latLngBounds([]);

  groupedTrackData.value.forEach((points, activityId) => {
    const latLngs = points.map((point) => [point.lat!, point.lon!] as L.LatLngExpression);
    if (latLngs.length < 2) return;

    const polyline = L.polyline(latLngs, {
      color: activityColor(activityId),
      weight: 4,
      opacity: 0.9,
    }).addTo(map!);

    polyline.bindTooltip(activityById.value.get(activityId)?.name || 'Activity');
    polylines.push(polyline);
    latLngs.forEach((latLng) => bounds.extend(latLng));
  });

  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [20, 20] });
  }
}

onMounted(() => {
  if (!mapContainer.value) return;

  map = L.map(mapContainer.value).setView([47.37, 8.54], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  drawMap();
});

onBeforeUnmount(() => {
  clearPolylines();
  map?.remove();
  map = null;
});

watch(
  () => [props.trackData, props.activities],
  () => drawMap(),
  { deep: true }
);
</script>
```

- [x] Add template.

```vue
<template>
  <div class="overflow-hidden rounded-xl border border-verve-medium/30 bg-white shadow-sm">
    <div ref="mapContainer" class="h-[28rem] w-full"></div>
    <div v-if="legendItems.length > 0" class="flex flex-wrap gap-3 border-t border-verve-medium/20 p-4">
      <div v-for="item in legendItems" :key="item.activityId" class="flex items-center gap-2 text-sm text-verve-brown">
        <span class="size-3 rounded-full" :style="{ backgroundColor: item.color }"></span>
        <span class="max-w-[14rem] truncate">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<style>
.leaflet-container {
  z-index: 0;
}
</style>
```

- [x] During manual QA, verify the map is nonblank and polylines use multiple colors for multiple activities.

## Task 12: Add Collection Detail View

**Files:**
- Create: `src/views/CollectionDetailView.vue`

- [x] Create state and loading functions.

```vue
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Edit, Trash2 } from 'lucide-vue-next';
import ActivityListItem from '@/components/ActivityListItem.vue';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal.vue';
import CollectionMap from '@/components/collections/CollectionMap.vue';
import {
  deleteCollection,
  fetchCollection,
  fetchCollectionTrack,
  type CollectionDetail,
  type CollectionTrackPoint,
} from '@/services/collections';

const props = defineProps<{
  id: string;
}>();

const router = useRouter();
const collection = ref<CollectionDetail | null>(null);
const trackData = ref<CollectionTrackPoint[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
const showDeleteModal = ref(false);
const isDeleting = ref(false);

const hasLocationData = computed(() =>
  trackData.value.some((point) => point.lat !== null && point.lon !== null)
);

const dateRange = computed(() => {
  const activities = collection.value?.activities ?? [];
  const first = activities[0];
  const last = activities[activities.length - 1];
  if (!first || !last) return '';

  const start = new Date(first.start).toLocaleDateString();
  const end = new Date(last.start).toLocaleDateString();
  return start === end ? start : `${start} - ${end}`;
});

async function loadCollection() {
  isLoading.value = true;
  error.value = null;

  try {
    const [detail, track] = await Promise.all([
      fetchCollection(props.id),
      fetchCollectionTrack(props.id),
    ]);
    collection.value = detail;
    trackData.value = track;
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load collection.';
  } finally {
    isLoading.value = false;
  }
}

async function handleDeleteConfirm() {
  isDeleting.value = true;
  try {
    await deleteCollection(props.id);
    router.replace({ name: 'collections' });
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to delete collection.';
  } finally {
    isDeleting.value = false;
    showDeleteModal.value = false;
  }
}

onMounted(loadCollection);
watch(() => props.id, loadCollection);
</script>
```

- [x] Add template.

```vue
<template>
  <div class="min-h-[calc(100vh-64px)] bg-verve-light/30 p-4 sm:p-6 lg:p-8">
    <div v-if="isLoading" class="py-12 text-center text-verve-brown/60">
      Loading collection...
    </div>

    <div v-else-if="error" class="rounded-xl border border-red-100 bg-red-50 p-4 text-red-600">
      {{ error }}
    </div>

    <div v-else-if="collection" class="mx-auto max-w-7xl space-y-8">
      <section class="rounded-xl border border-verve-medium/30 bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 class="text-3xl font-bold text-verve-brown">{{ collection.name }}</h1>
            <p class="mt-1 text-sm text-verve-brown/60">{{ dateRange }}</p>
            <p v-if="collection.description" class="mt-3 max-w-3xl text-sm text-verve-brown/75">
              {{ collection.description }}
            </p>
          </div>

          <div class="flex gap-3">
            <router-link
              :to="{ name: 'collection-edit', params: { id } }"
              class="inline-flex items-center justify-center gap-2 rounded-xl border border-verve-medium bg-white px-4 py-2 text-sm font-semibold text-verve-brown transition-colors hover:bg-verve-light"
            >
              <Edit class="size-4" />
              <span>Edit</span>
            </router-link>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-red-600 transition-colors hover:bg-red-50"
              aria-label="Delete collection"
              @click="showDeleteModal = true"
            >
              <Trash2 class="size-4" />
            </button>
          </div>
        </div>

        <div class="mt-6 grid grid-cols-2 gap-4 text-center md:grid-cols-5">
          <div class="rounded-lg bg-verve-light/20 p-4">
            <p class="text-2xl font-bold text-verve-brown">{{ collection.activities.length }}</p>
            <p class="mt-1 text-xs font-bold uppercase tracking-wider text-verve-brown/50">Activities</p>
          </div>
          <div class="rounded-lg bg-verve-light/20 p-4">
            <p class="text-2xl font-bold text-verve-brown">
              {{ collection.totalDistance !== null ? collection.totalDistance.toFixed(2) : '-' }}
            </p>
            <p class="mt-1 text-xs font-bold uppercase tracking-wider text-verve-brown/50">km</p>
          </div>
          <div class="rounded-lg bg-verve-light/20 p-4">
            <p class="text-2xl font-bold text-verve-brown">{{ collection.totalDuration }}</p>
            <p class="mt-1 text-xs font-bold uppercase tracking-wider text-verve-brown/50">Duration</p>
          </div>
          <div class="rounded-lg bg-verve-light/20 p-4">
            <p class="text-2xl font-bold text-verve-brown">{{ collection.totalElevationGain?.toFixed(0) ?? '-' }}</p>
            <p class="mt-1 text-xs font-bold uppercase tracking-wider text-verve-brown/50">m Gain</p>
          </div>
          <div class="rounded-lg bg-verve-light/20 p-4">
            <p class="text-2xl font-bold text-verve-brown">{{ collection.totalElevationLoss?.toFixed(0) ?? '-' }}</p>
            <p class="mt-1 text-xs font-bold uppercase tracking-wider text-verve-brown/50">m Loss</p>
          </div>
        </div>
      </section>

      <section v-if="hasLocationData">
        <CollectionMap :track-data="trackData" :activities="collection.activities" />
      </section>

      <section v-else class="rounded-xl border border-verve-medium/30 bg-white p-12 text-center text-verve-brown/50">
        No map data available for this collection.
      </section>

      <section class="rounded-xl border border-verve-medium/30 bg-white p-6 shadow-sm">
        <h2 class="text-xl font-bold text-verve-brown">Activities</h2>
        <ul class="mt-4 space-y-1">
          <li v-for="activity in collection.activities" :key="activity.id">
            <ActivityListItem :activity="activity" />
          </li>
        </ul>
      </section>
    </div>
  </div>

  <ConfirmDeleteModal
    :is-open="showDeleteModal"
    :is-deleting="isDeleting"
    title="Delete Collection"
    message="Are you sure you want to delete this collection? Activities stay in your account, but the collection will be removed."
    @close="showDeleteModal = false"
    @confirm="handleDeleteConfirm"
  />
</template>
```

- [x] Run type-check.

```bash
bun run type-check
```

Expected: pass or expose concrete component import/type issues.

## Task 13: Add Collection Edit View

**Files:**
- Create: `src/views/CollectionEditView.vue`

- [x] Create state and load existing collection.

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import CollectionActivityPicker from '@/components/collections/CollectionActivityPicker.vue';
import {
  fetchCollection,
  updateCollection,
  type CollectionDetail,
} from '@/services/collections';
import type { Activity } from '@/stores/activity';

const props = defineProps<{
  id: string;
}>();

const router = useRouter();
const collection = ref<CollectionDetail | null>(null);
const name = ref('');
const description = ref('');
const selectedActivities = ref<Activity[]>([]);
const originalActivityIds = ref<string[]>([]);
const isLoading = ref(true);
const isSaving = ref(false);
const error = ref<string | null>(null);

const canSave = computed(() => name.value.trim().length > 0 && selectedActivities.value.length > 0 && !isSaving.value);

const appendedActivityIds = computed(() => {
  const originalIds = new Set(originalActivityIds.value);
  return selectedActivities.value
    .map((activity) => activity.id)
    .filter((activityId) => !originalIds.has(activityId));
});

async function loadCollection() {
  isLoading.value = true;
  error.value = null;

  try {
    const detail = await fetchCollection(props.id);
    collection.value = detail;
    name.value = detail.name;
    description.value = detail.description ?? '';
    selectedActivities.value = detail.activities;
    originalActivityIds.value = detail.activities.map((activity) => activity.id);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load collection.';
  } finally {
    isLoading.value = false;
  }
}

async function handleSubmit() {
  if (!canSave.value) return;

  isSaving.value = true;
  error.value = null;

  try {
    await updateCollection(props.id, {
      name: name.value.trim(),
      description: description.value.trim().length > 0 ? description.value.trim() : null,
      activityIds: appendedActivityIds.value.length > 0 ? appendedActivityIds.value : undefined,
      replaceActivities: appendedActivityIds.value.length > 0 ? false : undefined,
    });
    router.push({ name: 'collection-detail', params: { id: props.id } });
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to update collection.';
  } finally {
    isSaving.value = false;
  }
}

onMounted(loadCollection);
</script>
```

- [x] Add template.

```vue
<template>
  <div class="min-h-[calc(100vh-64px)] bg-verve-light/30 p-4 sm:p-6 lg:p-8">
    <div v-if="isLoading" class="py-12 text-center text-verve-brown/60">
      Loading collection...
    </div>

    <form v-else class="mx-auto max-w-7xl space-y-6" @submit.prevent="handleSubmit">
      <div class="rounded-xl border border-verve-medium/30 bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 class="text-3xl font-bold text-verve-brown">Edit Collection</h1>
            <p class="mt-2 text-sm text-verve-brown/60">
              Update metadata or append activities. Existing activities are locked in beta.
            </p>
          </div>
          <div class="flex gap-3">
            <router-link
              :to="{ name: 'collection-detail', params: { id } }"
              class="rounded-xl border border-verve-medium bg-white px-4 py-2 text-sm font-semibold text-verve-brown transition-colors hover:bg-verve-light"
            >
              Cancel
            </router-link>
            <button
              type="submit"
              :disabled="!canSave"
              class="rounded-xl bg-verve-brown px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-verve-brown/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ isSaving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>

        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <label class="block text-sm font-semibold text-verve-brown">
            Name
            <input v-model="name" type="text" class="mt-2 w-full px-3 py-2" required />
          </label>

          <label class="block text-sm font-semibold text-verve-brown">
            Description
            <textarea v-model="description" rows="3" class="mt-2 w-full px-3 py-2"></textarea>
          </label>
        </div>

        <div v-if="error" class="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {{ error }}
        </div>
      </div>

      <CollectionActivityPicker
        v-model:selected-activities="selectedActivities"
        :locked-activity-ids="originalActivityIds"
      />
    </form>
  </div>
</template>
```

- [x] Manual QA must confirm existing activities cannot be removed from edit mode and newly added activities are submitted as appended ids only.

## Task 14: Focused Type And Test Pass

**Files:**
- Runtime and test files from Tasks 1-13

- [x] Run service tests.

```bash
bun test tests/services/api.test.ts tests/services/collections.test.ts
```

Expected: all tests pass.

- [x] Run TypeScript validation.

```bash
bun run type-check
```

Expected: pass.

- [x] Fix only failures introduced by this work. Do not clean unrelated lint or type issues outside the touched surface.

## Task 15: Manual Browser QA

**Files:**
- No code files unless QA reveals defects.

- [x] Start the dev server.

```bash
bun run dev
```

Expected: Vite prints a local URL, usually `http://localhost:5173/`.

- [x] In the app, verify:
  - `/collections` loads and shows empty, loading, error, and populated states.
  - Training menu links to Collections on desktop and mobile.
  - `/collections/new` prevents save with no name or no activities.
  - Creating a collection posts `name`, nullable `description`, and `activity_ids`, then routes to detail.
  - Detail shows totals, description, chronological activities, and colored map when track data exists.
  - Detail shows a no-map state when the track endpoint returns no usable coordinates.
  - `/collections/:id/edit` loads existing data, locks existing activities, appends new ids, and routes back to detail.
  - Delete confirmation removes only the collection and returns to `/collections`.

- [x] Stop the dev server before final handoff unless the user explicitly wants it left running.

## Task 16: Full Validation And Handoff

**Files:**
- All touched files

- [x] Run full repository check.

```bash
bun run check
```

Expected: pass.

- [x] Run diff distribution.

```bash
bun run diff:distribution
```

Expected: command completes and reports the changed-file distribution.

- [x] Inspect changed files.

```bash
git diff --stat
git diff -- src/services/api.ts src/services/collections.ts src/router/index.ts src/components/Navbar.vue
```

Expected: changes are limited to activity helper export, collection service, collection views/components, routes, nav, and tests.

- [x] Final handoff must include:
  - Summary of implemented collection surfaces.
  - Tests run and outcomes.
  - `bun run diff:distribution` result.
  - Any backend API caveats found during implementation.

## Acceptance Criteria

- `/collections` is authenticated and reachable from navigation.
- Collection list loads from `GET /api/v1/collection` and displays useful overview metrics.
- Create flow uses `POST /api/v1/collection` with manual selected activities.
- Detail flow uses `GET /api/v1/collection/{id}` and `GET /api/v1/collection/{id}/track`.
- Collection map colors each activity separately using `activity_id` grouping.
- Edit flow uses `PATCH /api/v1/collection/{id}` for name, description, and append-only `activity_ids`.
- Delete flow uses `DELETE /api/v1/collection/{id}` with confirmation.
- No `any`, no Options API, no `v-html`, no CommonJS `require`.
- `bun test tests/services/api.test.ts tests/services/collections.test.ts`, `bun run type-check`, `bun run check`, and `bun run diff:distribution` complete before handoff.

## Decision Log

- Manual picker is the beta generation flow because no OpenAPI auto-generate endpoint exists.
- Collection edit is a separate route to keep detail focused on review, totals, activity list, and map.
- Replace/remove/reorder activity membership is deferred from this plan because `replace_activities` needs a more deliberate UI and stronger user confirmation.
- A dedicated collection service is preferred over a collection Pinia store because the first beta does not need shared long-lived collection state.
- A new `fetchActivityPage` helper avoids reusing `useActivityStore.paginatedActivities` inside the picker, preventing the collection flow from disturbing the existing Activities page state.
