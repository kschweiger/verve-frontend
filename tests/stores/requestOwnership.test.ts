import { stubFetch } from '../helpers/fetch';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '../../src/stores/auth';
import { useActivityStore } from '../../src/stores/activity';
import { useStatisticsStore } from '../../src/stores/statistics';
import { useGoalStore } from '../../src/stores/goals';
import { useHeatmapStore } from '../../src/stores/heatmap';
import { useEquipmentStore } from '../../src/stores/equipment';
import { useLocationStore } from '../../src/stores/location';
import { useHighlightStore } from '../../src/stores/highlights';
import { useTagsStore } from '../../src/stores/tags';
import { useRecordsStore } from '../../src/stores/records';
import { mapApiActivity } from '../../src/services/api';

const originalFetch = globalThis.fetch;
const originalStorage = globalThis.localStorage;
const id = '00000000-0000-4000-8000-000000000001';
const activity = (version: number) => ({
  id,
  name: `Activity ${version}`,
  start: '2026-10-01T12:00:00Z',
  created_at: '2026-10-01T12:00:00Z',
  timezone: 'Europe/Berlin',
  duration: 'PT10M',
  distance: version,
  type_id: 1,
  sub_type_id: null,
  tags: [],
});
const page = (version: number) => ({ data: [activity(version)], count: 1 });
const equipment = (version: number) => ({
  id,
  name: `Equipment ${version}`,
  equipment_type: 'shoes',
  brand: null,
  model: null,
  description: null,
  purchase_date: null,
});
const goal = (version: number) => ({
  id,
  name: `Goal ${version}`,
  description: null,
  target: 10,
  current: version,
  progress: version / 10,
  reached: false,
  temporal_type: 'yearly',
  year: 2026,
  month: null,
  week: null,
  current_updated: null,
  upper_bound: true,
  active: true,
  type: 'manual',
  aggregation: 'count',
  constraints: {},
});
const summary = (version: number) => ({ total: version, per_type: {} });
const weekMetric = (version: number) => ({ total: version, per_day: {}, pie_data: {} });
const yearStats = (version: number) => ({
  distance: summary(version),
  duration: summary(version),
  effective_duration: summary(version),
  count: summary(version),
});
const weekStats = (version: number) => ({
  distance: weekMetric(version),
  duration: weekMetric(version),
  effective_duration: weekMetric(version),
  elevation_gain: weekMetric(version),
});
const calendar = (month: number) => ({
  year: 2026,
  month,
  weeks: Array.from({ length: 4 }, (_, week) => ({
    days: Array.from({ length: 7 }, (_, day) => ({
      date: `2026-${String(month).padStart(2, '0')}-${String(week * 7 + day + 1).padStart(2, '0')}`,
      is_in_month: true,
      items: [],
      active_type_ids: [],
      total: { count: 0, distance: 0, duration: 0, effective_duration: 0, elevation_gain: 0 },
    })),
    week_summary: { count: 0, distance: 0, duration: 0, effective_duration: 0, elevation_gain: 0 },
  })),
});
const location = (version: number) => ({
  id,
  name: `Location ${version}`,
  description: null,
  latitude: version,
  longitude: 11,
  created_at: '2026-10-01T12:00:00Z',
  type_id: 1,
  sub_type_id: 1,
});

interface QueryCase {
  name: string;
  load: (version: number) => Promise<unknown>;
  response: (version: number) => unknown;
  read: () => unknown;
  expected: unknown;
}
const cases: QueryCase[] = [
  {
    name: 'calendar month',
    load: (v) => useStatisticsStore().fetchCalendar(2026, v),
    response: calendar,
    read: () => useStatisticsStore().calendarData?.month,
    expected: 2,
  },
  {
    name: 'records filters',
    load: (v) => {
      const store = useRecordsStore();
      store.setInitialTypeId(1);
      store.activitySummaries[id] = mapApiActivity(activity(v));
      return store.setYear(2024 + v);
    },
    response: (v) => ({
      data: {
        distance: [
          {
            activity_id: id,
            type_id: 1,
            metric: 'distance',
            scope: 'yearly',
            year: 2024 + v,
            value: v,
            rank: 1,
            track_id: null,
          },
        ],
      },
    }),
    read: () => useRecordsStore().groups[0]?.records[0]?.value,
    expected: 2,
  },
  {
    name: 'equipment sets',
    load: () => useEquipmentStore().fetchAllSets(),
    response: (v) => ({ data: [{ id, name: `Set ${v}`, items: [] }], count: 1 }),
    read: () => useEquipmentStore().equipmentSets[0]?.name,
    expected: 'Set 2',
  },
  {
    name: 'dashboard highlight metric',
    load: (v) =>
      useHighlightStore().fetchDashboardHighlights(v === 1 ? 'duration' : 'distance', 2026),
    response: (v) => ({
      data: [
        {
          activity_id: id,
          type_id: 1,
          metric: v === 1 ? 'duration' : 'distance',
          scope: 'yearly',
          year: 2026,
          value: v,
          rank: 1,
          track_id: null,
        },
      ],
      count: 1,
    }),
    read: () => useHighlightStore().dashboardHighlights[0]?.value,
    expected: 2,
  },
  {
    name: 'activity filters',
    load: (v) => useActivityStore().fetchActivities({ year: 2024 + v }),
    response: page,
    read: () => useActivityStore().paginatedActivities[0]?.name,
    expected: 'Activity 2',
  },
  {
    name: 'recent activity refresh',
    load: () => useActivityStore().fetchRecentActivities(),
    response: page,
    read: () => useActivityStore().recentActivities[0]?.name,
    expected: 'Activity 2',
  },
  {
    name: 'activity images',
    load: (v) => useActivityStore().fetchActivityImages(String(v)),
    response: (v) => ({ data: [{ id, url: `/image-${v}.jpg` }], count: 1 }),
    read: () => useActivityStore().activityImages[0]?.url,
    expected: '/image-2.jpg',
  },
  {
    name: 'year statistics',
    load: (v) => useStatisticsStore().fetchYearlyStats(2024 + v),
    response: yearStats,
    read: () => useStatisticsStore().yearlyStats?.distance.total,
    expected: 2,
  },
  {
    name: 'week statistics',
    load: (v) => useStatisticsStore().fetchWeeklyStats(2026, v, 1),
    response: weekStats,
    read: () => useStatisticsStore().weeklyStats?.distance.total,
    expected: 2,
  },
  {
    name: 'activity grid',
    load: (v) => useStatisticsStore().fetchActivityGrid(v),
    response: (v) => ({
      weeks: [],
      scale_max: { activity_count: v, duration_seconds: v, effective_duration_seconds: v },
      totals: {
        activity_count: v,
        duration_seconds: v,
        effective_duration_seconds: v,
        active_days: v,
      },
      summary: { last_active_day: null, week_activity_streak: 0, activities_this_month: v },
    }),
    read: () => useStatisticsStore().activityGrid?.totals.activity_count,
    expected: 2,
  },
  {
    name: 'goal period',
    load: (v) => useGoalStore().fetchGoals(2024 + v),
    response: (v) => ({ data: [goal(v)], count: 1 }),
    read: () => useGoalStore().goals[0]?.name,
    expected: 'Goal 2',
  },
  {
    name: 'heatmap filters',
    load: (v) => useHeatmapStore().fetchHeatmapData({ year: 2024 + v }),
    response: (v) => ({ points: [[v, 11, 1]], center: [v, 11] }),
    read: () => useHeatmapStore().heatmapCenter?.[0],
    expected: 2,
  },
  {
    name: 'equipment refresh',
    load: () => useEquipmentStore().fetchAllEquipment(),
    response: (v) => ({ data: [equipment(v)], count: 1 }),
    read: () => useEquipmentStore().allEquipment[0]?.name,
    expected: 'Equipment 2',
  },
  {
    name: 'activity equipment',
    load: (v) => useEquipmentStore().fetchEquipmentForActivity(String(v)),
    response: (v) => ({ data: [equipment(v)], count: 1 }),
    read: () => useEquipmentStore().activityEquipment[0]?.name,
    expected: 'Equipment 2',
  },
  {
    name: 'location bounds',
    load: (v) =>
      useLocationStore().fetchLocationsInBounds({
        latMin: v,
        latMax: v + 1,
        lngMin: 10,
        lngMax: 11,
      }),
    response: (v) => ({ data: [location(v)], count: 1 }),
    read: () => useLocationStore().visibleLocations[0]?.name,
    expected: 'Location 2',
  },
  {
    name: 'activity locations',
    load: (v) => useLocationStore().fetchLocationsForActivity(String(v)),
    response: (v) => ({ data: [location(v)], count: 1 }),
    read: () => useLocationStore().currentActivityLocations[0]?.name,
    expected: 'Location 2',
  },
  {
    name: 'activity highlights',
    load: (v) => useHighlightStore().fetchHighlightsForActivity(String(v)),
    response: (v) => ({
      data: [
        {
          activity_id: id,
          type_id: 1,
          metric: 'distance',
          scope: 'yearly',
          year: 2026,
          value: v,
          rank: 1,
          track_id: null,
        },
      ],
      count: 1,
    }),
    read: () => useHighlightStore().activityHighlights[0]?.value,
    expected: 2,
  },
  {
    name: 'tag refresh',
    load: () => useTagsStore().fetchAll(),
    response: (v) => ({ tags: [{ id: v, name: `Tag ${v}`, category_id: null }], categories: [] }),
    read: () => useTagsStore().tags[0]?.name,
    expected: 'Tag 2',
  },
];

beforeEach(() => {
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    length: 0,
  };
  setActivePinia(createPinia());
  useUserStore().setToken('test-token');
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalStorage;
});

for (const entry of cases) {
  describe(entry.name, () => {
    test('a slower old query cannot overwrite the latest result', async () => {
      const pending: Array<(response: Response) => void> = [];
      globalThis.fetch = stubFetch(() => new Promise<Response>((resolve) => pending.push(resolve)));
      const oldRequest = entry.load(1);
      const latestRequest = entry.load(2);
      expect(pending).toHaveLength(2);
      pending[1]!(Response.json(entry.response(2)));
      await latestRequest;
      expect(entry.read()).toEqual(entry.expected);
      pending[0]!(Response.json(entry.response(1)));
      await oldRequest;
      expect(entry.read()).toEqual(entry.expected);
    });
  });
}

test('an outdated filter failure cannot finish the current request or show its error', async () => {
  const pending: Array<(response: Response) => void> = [];
  globalThis.fetch = stubFetch(() => new Promise<Response>((resolve) => pending.push(resolve)));
  const store = useActivityStore();
  const oldRequest = store.fetchActivities({ year: 2025 });
  const latestRequest = store.fetchActivities({ year: 2026 });
  pending[0]!(Response.json({}, { status: 503 }));
  await oldRequest;
  expect(store.isListLoading).toBe(true);
  expect(store.listError).toBeNull();
  pending[1]!(Response.json(page(2)));
  await latestRequest;
  expect(store.isListLoading).toBe(false);
});

test('duplicate load-more actions request and append a page only once', async () => {
  globalThis.fetch = stubFetch(async () =>
    Response.json({
      data: Array.from({ length: 5 }, (_, i) => ({
        ...activity(1),
        id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
      })),
      count: 6,
    })
  );
  const store = useActivityStore();
  await store.fetchActivities({});
  const pending: Array<(response: Response) => void> = [];
  const urls: string[] = [];
  globalThis.fetch = stubFetch((input: RequestInfo | URL) => {
    urls.push(input.toString());
    return new Promise<Response>((resolve) => pending.push(resolve));
  });
  const first = store.fetchActivities({}, true);
  const second = store.fetchActivities({}, true);
  expect(urls).toHaveLength(1);
  expect(new URL(urls[0]!, 'https://api.example.test').searchParams.get('offset')).toBe('5');
  pending[0]!(
    Response.json({
      data: [{ ...activity(2), id: '00000000-0000-4000-8000-000000000006' }],
      count: 6,
    })
  );
  await Promise.all([first, second]);
  expect(store.paginatedActivities).toHaveLength(6);
  expect(store.canLoadMore).toBe(false);
});

test('the goal dashboard keeps the latest selected period', async () => {
  const pending: Array<(response: Response) => void> = [];
  globalThis.fetch = stubFetch(() => new Promise<Response>((resolve) => pending.push(resolve)));
  const store = useGoalStore();
  const oldRequest = store.fetchAllGoalsForView(2025, 1);
  const latestRequest = store.fetchAllGoalsForView(2026, 2);
  expect(pending).toHaveLength(4);
  pending[2]!(Response.json({ data: [goal(2)], count: 1 }));
  pending[3]!(Response.json({ data: [], count: 0 }));
  await latestRequest;
  pending[0]!(Response.json({ data: [goal(1)], count: 1 }));
  pending[1]!(Response.json({ data: [], count: 0 }));
  await oldRequest;
  expect(store.yearlyGoals[0]?.name).toBe('Goal 2');
});

test('selecting a new location prevents the previous detail request from replacing it', async () => {
  const pending: Array<(response: Response) => void> = [];
  globalThis.fetch = stubFetch((input: RequestInfo | URL) =>
    input.toString().endsWith('/activities')
      ? Promise.resolve(Response.json({ data: [], count: 0 }))
      : new Promise<Response>((resolve) => pending.push(resolve))
  );
  const store = useLocationStore();
  const oldRequest = store.selectLocation('old-location');
  const latestRequest = store.selectLocation('new-location');
  pending[1]!(Response.json(location(2)));
  await latestRequest;
  pending[0]!(Response.json(location(1)));
  await oldRequest;
  expect(store.selectedLocation?.name).toBe('Location 2');
});

test('year and calendar requests keep independent loading and error state', async () => {
  const pending: Array<(response: Response) => void> = [];
  globalThis.fetch = stubFetch(() => new Promise<Response>((resolve) => pending.push(resolve)));
  const store = useStatisticsStore();
  const year = store.fetchYearlyStats(2026);
  const month = store.fetchCalendar(2026, 2);
  pending[0]!(Response.json({}, { status: 503 }));
  await year;
  expect(store.isCalendarLoading).toBe(true);
  expect(store.calendarError).toBeNull();
  pending[1]!(Response.json(calendar(2)));
  await month;
  expect(store.isCalendarLoading).toBe(false);
  expect(store.calendarError).toBeNull();
  expect(store.calendarData?.month).toBe(2);
});

test('location bounds loading cannot finish selected-location loading', async () => {
  const pending: Array<(response: Response) => void> = [];
  globalThis.fetch = stubFetch((input: RequestInfo | URL) =>
    input.toString().endsWith('/activities')
      ? Promise.resolve(Response.json({ data: [], count: 0 }))
      : new Promise<Response>((resolve) => pending.push(resolve))
  );
  const store = useLocationStore();
  const bounds = store.fetchLocationsInBounds({ latMin: 0, latMax: 1, lngMin: 0, lngMax: 1 });
  const detail = store.selectLocation(id);
  pending[0]!(Response.json({ data: [], count: 0 }));
  await bounds;
  expect(store.isDetailLoading).toBe(true);
  expect(store.detailError).toBeNull();
  pending[1]!(Response.json(location(2)));
  await detail;
  expect(store.isDetailLoading).toBe(false);
});

test('general goals and dashboard periods keep independent request status', async () => {
  const pending: Array<(response: Response) => void> = [];
  globalThis.fetch = stubFetch(() => new Promise<Response>((resolve) => pending.push(resolve)));
  const store = useGoalStore();
  const general = store.fetchGoals(2025);
  const periods = store.fetchAllGoalsForView(2026, 2);
  pending[0]!(Response.json({}, { status: 503 }));
  await general;
  expect(store.isLoadingPeriods).toBe(true);
  expect(store.periodsError).toBeNull();
  pending[1]!(Response.json({ data: [], count: 0 }));
  pending[2]!(Response.json({ data: [], count: 0 }));
  await periods;
  expect(store.isLoadingPeriods).toBe(false);
  expect(store.periodsError).toBeNull();
});

test('goal creation cannot own the loading and error state of a period query', async () => {
  let completeCreation!: (response: Response) => void;
  globalThis.fetch = stubFetch((_input: RequestInfo | URL, init?: RequestInit) =>
    init?.method === 'PUT'
      ? new Promise<Response>((resolve) => {
          completeCreation = resolve;
        })
      : Promise.resolve(Response.json({ data: [], count: 0 }))
  );
  const store = useGoalStore();
  const creation = store.createGoal({
    name: 'Read',
    target: 10,
    type: 'manual',
    aggregation: 'count',
    temporal_type: 'yearly',
    year: 2026,
  });
  await store.fetchAllGoalsForView(2026, 2);
  expect(store.isCreating).toBe(true);
  expect(store.isLoadingPeriods).toBe(false);
  completeCreation(Response.json({}, { status: 503 }));
  expect(await creation).toBe(false);
  expect(store.isCreating).toBe(false);
  expect(store.creationError).toBe('Failed to create goal');
  expect(store.periodsError).toBeNull();
});

test('activity highlights cannot end the loading state of dashboard highlights', async () => {
  const pending: Array<(response: Response) => void> = [];
  globalThis.fetch = stubFetch(() => new Promise<Response>((resolve) => pending.push(resolve)));
  const store = useHighlightStore();
  const detail = store.fetchHighlightsForActivity(id);
  const dashboard = store.fetchDashboardHighlights('distance', 2026);
  pending[0]!(Response.json({ data: [], count: 0 }));
  await detail;
  expect(store.isDashboardLoading).toBe(true);
  pending[1]!(Response.json({ data: [], count: 0 }));
  await dashboard;
  expect(store.isDashboardLoading).toBe(false);
});

test('a deletion-triggered sets refresh cannot replace a newer sets query', async () => {
  const pending: Array<(response: Response) => void> = [];
  let notifyRefreshStarted!: () => void;
  const refreshStarted = new Promise<void>((resolve) => {
    notifyRefreshStarted = resolve;
  });
  globalThis.fetch = stubFetch((_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'DELETE') return Promise.resolve(new Response(null, { status: 204 }));
    return new Promise<Response>((resolve) => {
      pending.push(resolve);
      notifyRefreshStarted();
    });
  });
  const store = useEquipmentStore();
  const deletion = store.deleteEquipment(id);
  await refreshStarted;
  const latest = store.fetchAllSets();
  pending[1]!(Response.json({ data: [{ id, name: 'New set', items: [] }], count: 1 }));
  await latest;
  pending[0]!(Response.json({ data: [{ id, name: 'Old set', items: [] }], count: 1 }));
  await deletion;
  expect(store.equipmentSets[0]?.name).toBe('New set');
});
