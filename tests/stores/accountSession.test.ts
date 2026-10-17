import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createPinia, setActivePinia, type StoreGeneric } from 'pinia';
import { useUserStore } from '../../src/stores/auth';
import { useActivityStore } from '../../src/stores/activity';
import { useStatisticsStore } from '../../src/stores/statistics';
import { useEquipmentStore } from '../../src/stores/equipment';
import { useGoalStore } from '../../src/stores/goals';
import { useHeatmapStore } from '../../src/stores/heatmap';
import { useHighlightStore } from '../../src/stores/highlights';
import { useLocationStore } from '../../src/stores/location';
import { useTagsStore } from '../../src/stores/tags';
import { useRecordsStore } from '../../src/stores/records';
import { useSettingsStore } from '../../src/stores/settings';

const originalFetch = globalThis.fetch;
const originalStorage = globalThis.localStorage;
const activity = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Previous account',
  start: '2026-10-01T12:00:00Z',
  created_at: '2026-10-01T12:00:00Z',
  timezone: 'Europe/Berlin',
  duration: 'PT10M',
  distance: 1,
  type_id: 1,
  sub_type_id: null,
  tags: [],
};
const equipment = {
  id: activity.id,
  name: 'Previous shoes',
  equipment_type: 'shoes',
  brand: null,
  model: null,
  description: null,
  purchase_date: null,
};
const highlight = {
  activity_id: activity.id,
  type_id: 1,
  metric: 'duration',
  scope: 'yearly',
  year: 2026,
  value: 'PT10M',
  track_id: null,
  rank: 1,
};
const goal = {
  id: activity.id,
  name: 'Previous goal',
  target: 10,
  current: 1,
  progress: 0.1,
  reached: false,
  temporal_type: 'yearly',
  year: 2026,
  month: null,
  week: null,
  type: 'manual',
  aggregation: 'count',
  constraints: {},
  description: null,
  current_updated: null,
  active: true,
  upper_bound: true,
};
const location = {
  id: activity.id,
  name: 'Previous location',
  description: null,
  latitude: 48,
  longitude: 11,
  created_at: activity.created_at,
  type_id: null,
  sub_type_id: null,
};
const grid = {
  weeks: [],
  scale_max: { activity_count: 1, duration_seconds: 600, effective_duration_seconds: 600 },
  totals: {
    activity_count: 1,
    duration_seconds: 600,
    effective_duration_seconds: 600,
    active_days: 1,
  },
  summary: { last_active_day: '2026-10-01', week_activity_streak: 1, activities_this_month: 1 },
};

interface AccountStoreCase {
  name: string;
  create: () => StoreGeneric;
  load: () => Promise<unknown>;
  response: unknown;
  populated: Record<string, unknown>;
  cleared: Record<string, unknown>;
}

const cases: AccountStoreCase[] = [
  {
    name: 'activities',
    create: useActivityStore,
    load: () => useActivityStore().fetchActivities({}),
    response: { data: [activity], count: 1 },
    populated: {
      recentActivities: [activity],
      paginatedActivities: [activity],
      activityImages: [{ id: activity.id, url: '/old.jpg' }],
      currentFilters: { year: 2025 },
      isListLoading: true,
    },
    cleared: {
      recentActivities: [],
      paginatedActivities: [],
      activityImages: [],
      currentFilters: {},
      isListLoading: false,
    },
  },
  {
    name: 'statistics',
    create: useStatisticsStore,
    load: () => useStatisticsStore().fetchActivityGrid(),
    response: grid,
    populated: {
      activityGrid: grid,
      calendarData: { year: 2026, month: 10, weeks: [] },
      isActivityGridLoading: true,
    },
    cleared: { activityGrid: null, calendarData: null, isActivityGridLoading: false },
  },
  {
    name: 'equipment',
    create: useEquipmentStore,
    load: () => useEquipmentStore().fetchAllEquipment(),
    response: { data: [equipment], count: 1 },
    populated: {
      allEquipment: [equipment],
      activityEquipment: [equipment],
      equipmentSets: [{ id: activity.id, name: 'Old set', items: [activity.id] }],
      isLoading: true,
    },
    cleared: { allEquipment: [], activityEquipment: [], equipmentSets: [], isLoading: false },
  },
  {
    name: 'goals',
    create: useGoalStore,
    load: () => useGoalStore().fetchGoals(2026),
    response: { data: [goal], count: 1 },
    populated: {
      goals: [goal],
      yearlyGoals: [goal],
      monthlyGoals: [goal],
      weeklyGoals: [goal],
      isLoading: true,
    },
    cleared: { goals: [], yearlyGoals: [], monthlyGoals: [], weeklyGoals: [], isLoading: false },
  },
  {
    name: 'heatmap',
    create: useHeatmapStore,
    load: () => useHeatmapStore().fetchHeatmapData({}),
    response: { points: [[48, 11, 1]], center: [48, 11] },
    populated: { heatmapPoints: [[48, 11, 1]], heatmapCenter: [48, 11], isLoading: true },
    cleared: { heatmapPoints: [], heatmapCenter: [0, 0], isLoading: false },
  },
  {
    name: 'highlights',
    create: useHighlightStore,
    load: () => useHighlightStore().fetchHighlightsForActivity(activity.id),
    response: { data: [highlight], count: 1 },
    populated: {
      activityHighlights: [highlight],
      dashboardHighlights: [highlight],
      isLoading: true,
    },
    cleared: { activityHighlights: [], dashboardHighlights: [], isLoading: false },
  },
  {
    name: 'locations',
    create: useLocationStore,
    load: () => useLocationStore().fetchAllLocations(),
    response: { data: [location], count: 1 },
    populated: {
      visibleLocations: [location],
      availableLocations: [location],
      selectedLocation: location,
      selectedLocationActivities: [activity],
      currentActivityLocations: [location],
      isLoading: true,
    },
    cleared: {
      visibleLocations: [],
      availableLocations: [],
      selectedLocation: null,
      selectedLocationActivities: [],
      currentActivityLocations: [],
      isLoading: false,
    },
  },
  {
    name: 'tags',
    create: useTagsStore,
    load: () => useTagsStore().fetchAll(),
    response: {
      tags: [{ id: 1, name: 'Old tag', category_id: null }],
      categories: [{ id: 1, name: 'Old category' }],
    },
    populated: {
      tags: [{ id: 1, name: 'Old tag', category_id: null }],
      categories: [{ id: 1, name: 'Old category' }],
      isLoading: true,
    },
    cleared: { tags: [], categories: [], isLoading: false },
  },
  {
    name: 'records',
    create: useRecordsStore,
    load: () => {
      const store = useRecordsStore();
      store.setInitialTypeId(1);
      return store.fetchOverview();
    },
    response: { duration: [highlight] },
    populated: {
      groups: [{ metric: 'duration', records: [highlight] }],
      activitySummaries: { [activity.id]: activity },
      selectedMetric: 'duration',
      typeId: 1,
      isLoading: true,
    },
    cleared: {
      groups: [],
      activitySummaries: {},
      selectedMetric: null,
      typeId: null,
      isLoading: false,
    },
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
  useUserStore().setToken('account-a');
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalStorage;
});

for (const entry of cases) {
  describe(`${entry.name} account isolation`, () => {
    test.each(['logout', 'replacement'])('clears account-owned state on %s', (change) => {
      const store = entry.create();
      store.$patch(entry.populated);
      if (change === 'logout') useUserStore().logout();
      else useUserStore().setToken('account-b');
      for (const [key, value] of Object.entries(entry.cleared))
        expect(store.$state[key]).toEqual(value);
    });

    test('discards a response from a previous account', async () => {
      let complete!: (response: Response) => void;
      globalThis.fetch = (() =>
        new Promise<Response>((resolve) => {
          complete = resolve;
        })) as typeof fetch;
      const store = entry.create();
      const request = entry.load();
      // Attach before resolving: actions may reject or swallow a cancelled session.
      const settled = Promise.allSettled([request]);
      useUserStore().logout();
      useUserStore().setToken('account-b');
      complete(Response.json(entry.response));
      await settled;
      for (const [key, value] of Object.entries(entry.cleared))
        expect(store.$state[key]).toEqual(value);
    });
  });
}

test('an old failed request cannot end the new account loading state', async () => {
  let completeOld!: (response: Response) => void;
  let completeNew!: (response: Response) => void;
  globalThis.fetch = (() =>
    new Promise<Response>((resolve) => {
      completeOld = resolve;
    })) as typeof fetch;
  const store = useActivityStore();
  const oldRequest = store.fetchActivities({});
  useUserStore().setToken('account-b');
  globalThis.fetch = (() =>
    new Promise<Response>((resolve) => {
      completeNew = resolve;
    })) as typeof fetch;
  const newRequest = store.fetchActivities({});
  completeOld(Response.json({}, { status: 503 }));
  await oldRequest;
  expect(store.isListLoading).toBe(true);
  expect(store.listError).toBeNull();
  completeNew(Response.json({ data: [], count: 0 }));
  await newRequest;
  expect(store.isListLoading).toBe(false);
});

test('a manual activity creation cannot attach its track under a different account', async () => {
  let complete!: (response: Response) => void;
  const requests: string[] = [];
  globalThis.fetch = ((input: RequestInfo | URL) => {
    requests.push(input.toString());
    if (requests.length > 1)
      return Promise.reject(new Error('Unexpected request after account change.'));
    return new Promise<Response>((resolve) => {
      complete = resolve;
    });
  }) as typeof fetch;
  const request = useActivityStore().createManualActivity(
    {
      name: 'Manual',
      start: activity.start,
      duration: 'PT10M',
      type_id: 1,
      add_default_equipment: false,
    },
    new File(['track'], 'activity.gpx')
  );
  useUserStore().setToken('account-b');
  complete(Response.json(activity));
  expect((await request).success).toBe(false);
  expect(requests).toHaveLength(1);
});

const settingsMutations = [
  {
    name: 'profile',
    run: () => useSettingsStore().updateUserProfile({ name: 'Old account name' }),
  },
  {
    name: 'password',
    run: () => useSettingsStore().updatePassword({ old_password: 'old', new_password: 'new' }),
  },
  { name: 'default types', run: () => useSettingsStore().updateDefaultTypes(1, null) },
  { name: 'heatmap settings', run: () => useSettingsStore().updateHeatmapSettings([]) },
  { name: 'records settings', run: () => useSettingsStore().updateRecordsSettings(1) },
];

test('a queued account change cannot slip between a body check and a store write', async () => {
  let completeBody!: (value: unknown) => void;
  let notifyBodyStarted!: () => void;
  const bodyStarted = new Promise<void>((resolve) => {
    notifyBodyStarted = resolve;
  });
  const body = new Promise<unknown>((resolve) => {
    completeBody = resolve;
  });
  const response = Response.json({});
  response.json = () => {
    notifyBodyStarted();
    return body;
  };
  globalThis.fetch = (() => Promise.resolve(response)) as typeof fetch;
  const store = useTagsStore();
  const request = store.fetchAll();
  await bodyStarted;
  completeBody({ tags: [{ id: 1, name: 'Old tag', category_id: null }], categories: [] });
  queueMicrotask(() => useUserStore().setToken('account-b'));
  await request;
  expect(useUserStore().token).toBe('account-b');
  expect(store.tags).toEqual([]);
});

for (const mutation of settingsMutations) {
  test(`an old ${mutation.name} save cannot affect the new account`, async () => {
    let complete!: (response: Response) => void;
    const requests: string[] = [];
    globalThis.fetch = ((input: RequestInfo | URL) => {
      requests.push(input.toString());
      if (requests.length === 1)
        return new Promise<Response>((resolve) => {
          complete = resolve;
        });
      return Promise.resolve(
        Response.json(
          input.toString().endsWith('/settings')
            ? {
                settings: {
                  default_type_id: 1,
                  defautl_sub_type_id: null,
                  locale: 'en',
                  timezone: 'Europe/Berlin',
                  heatmap_settings: { excluded_activity_types: [] },
                  records_settings: null,
                },
              }
            : {
                id: activity.id,
                name: 'New account',
                email: 'new@example.com',
                full_name: null,
                is_admin: false,
              }
        )
      );
    }) as typeof fetch;
    const store = useSettingsStore();
    const request = mutation.run();
    useUserStore().setToken('account-b');
    useUserStore().setUserInfo({ name: 'New account' });
    complete(Response.json({}));
    await request;
    expect(useUserStore().token).toBe('account-b');
    expect(useUserStore().user_name).toBe('New account');
    expect(store.userProfile).toBeNull();
    expect(store.userSettings).toBeNull();
    expect(requests).toHaveLength(1);
  });
}
