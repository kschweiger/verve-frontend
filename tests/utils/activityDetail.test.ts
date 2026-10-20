import { stubFetch } from '../helpers/fetch';
import { afterEach, beforeEach, expect, test } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope, nextTick, ref, watch, type EffectScope, type Ref } from 'vue';
import { useUserStore } from '../../src/stores/auth';
import { useActivityDetail } from '../../src/composables/useActivityDetail';
import { useActivitySegments } from '../../src/composables/useActivitySegments';
import { useEquipmentStore } from '../../src/stores/equipment';
import { useHighlightStore } from '../../src/stores/highlights';
import { useLocationStore } from '../../src/stores/location';
import { useActivityStore } from '../../src/stores/activity';

const originalFetch = globalThis.fetch;
const originalStorage = globalThis.localStorage;
const scopes: EffectScope[] = [];
const firstId = '00000000-0000-4000-8000-000000000001';
const secondId = '00000000-0000-4000-8000-000000000002';
const setId = '00000000-0000-4000-8000-000000000003';
const activity = (id: string, name = 'Activity') => ({
  id,
  name,
  start: '2026-10-01T12:00:00Z',
  created_at: '2026-10-01T12:00:00Z',
  timezone: 'Europe/Berlin',
  duration: 'PT10M',
  distance: 1,
  type_id: 1,
  sub_type_id: null,
  tags: [],
});
const point = (id: number, seconds: number) => ({
  id,
  segment_id: 1,
  latitude: null,
  longitude: null,
  elevation: null,
  time: `2026-10-01T12:00:${String(seconds).padStart(2, '0')}Z`,
  diff_time: seconds === 0 ? null : 10,
  diff_distance: seconds === 0 ? null : 10,
  cum_distance: seconds,
  speed: null,
  heartrate: null,
  cadence: null,
  power: null,
});
const trackResponse = {
  data: [point(10, 0), point(20, 10), point(30, 20), point(40, 30)],
  count: 4,
};
const track = ref([
  { id: 10, lat: null, lon: null, ele: null, time: '2026-10-01T12:00:00Z', dist: 0 },
  { id: 20, lat: null, lon: null, ele: null, time: '2026-10-01T12:00:10Z', dist: 10 },
  { id: 30, lat: null, lon: null, ele: null, time: '2026-10-01T12:00:20Z', dist: 20 },
  { id: 40, lat: null, lon: null, ele: null, time: '2026-10-01T12:00:30Z', dist: 30 },
]);
const statistics = (cuts: number[]) => ({
  segment_set_id: setId,
  name: 'Intervals',
  cuts,
  segments: [],
  display_metadata: {
    primary_metric: 'speed',
    display_metrics: ['speed'],
    speed_unit: 'km/h',
    pace_unit: 'min/km',
  },
});
function inScope<T>(setup: () => T): T {
  const scope = effectScope();
  scopes.push(scope);
  return scope.run(setup)!;
}
async function settled(loading: Readonly<Ref<boolean>>): Promise<void> {
  if (!loading.value) return;
  await new Promise<void>((resolve) => {
    const stop = watch(loading, (value) => {
      if (!value) {
        stop();
        resolve();
      }
    });
  });
}
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
  scopes.splice(0).forEach((scope) => scope.stop());
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalStorage;
});

test('activity data becomes usable while optional segment loading is still pending', async () => {
  globalThis.fetch = stubFetch(async (input: RequestInfo | URL) => {
    const url = input.toString();
    if (url.includes('/track/segments/')) return new Promise<Response>(() => undefined);
    return Response.json(url.includes('/track/') ? trackResponse : activity(firstId));
  });
  const detail = inScope(() => useActivityDetail(ref(firstId)));
  const segments = inScope(() => useActivitySegments(ref(firstId), track, ref(null)));
  await settled(detail.isLoading);
  expect(detail.activity.value?.id).toBe(firstId);
  expect(detail.trackData.value.map((value) => value.id)).toEqual([10, 20, 30, 40]);
  expect(segments.isLoadingSegmentSets.value).toBe(true);
});

test.each([200, 503])(
  'route ID changes replace all core data and discard an old response (%i)',
  async (status) => {
    const activityId = ref(firstId);
    globalThis.fetch = stubFetch(async (input: RequestInfo | URL) =>
      Response.json(input.toString().includes('/track/') ? trackResponse : activity(firstId))
    );
    const detail = inScope(() => useActivityDetail(activityId));
    await settled(detail.isLoading);
    const old: Array<{ url: string; complete: (response: Response) => void }> = [];
    globalThis.fetch = stubFetch((input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.endsWith(secondId))
        return Promise.resolve(
          Response.json(
            url.includes('/track/') ? { data: [point(99, 0)], count: 1 } : activity(secondId)
          )
        );
      return new Promise<Response>((complete) => old.push({ url, complete }));
    });
    const obsolete = detail.reload();
    activityId.value = secondId;
    await nextTick();
    await settled(detail.isLoading);
    expect(detail.activity.value?.id).toBe(secondId);
    expect(detail.trackData.value[0]?.id).toBe(99);
    for (const request of old)
      request.complete(
        Response.json(request.url.includes('/track/') ? trackResponse : activity(firstId), {
          status,
        })
      );
    await obsolete;
    expect(detail.activity.value?.id).toBe(secondId);
    expect(detail.trackData.value[0]?.id).toBe(99);
    expect(detail.error.value).toBeNull();
    expect(detail.isLoading.value).toBe(false);
  }
);

test('summary refresh preserves the track and failed background refresh preserves the usable activity', async () => {
  const requests: string[] = [];
  globalThis.fetch = stubFetch(async (input: RequestInfo | URL) => {
    requests.push(input.toString());
    return Response.json(input.toString().includes('/track/') ? trackResponse : activity(firstId));
  });
  const detail = inScope(() => useActivityDetail(ref(firstId)));
  await settled(detail.isLoading);
  globalThis.fetch = stubFetch(async (input: RequestInfo | URL) => {
    requests.push(input.toString());
    return Response.json(activity(firstId, 'Edited'));
  });
  await detail.refreshSummary();
  expect(detail.activity.value?.name).toBe('Edited');
  expect(detail.trackData.value).toHaveLength(4);
  expect(requests.filter((url) => url.includes('/track/'))).toHaveLength(1);
  globalThis.fetch = stubFetch(async () => Response.json({}, { status: 503 }));
  await expect(detail.refresh()).rejects.toThrow();
  expect(detail.activity.value?.name).toBe('Edited');
  expect(detail.error.value).toBeNull();
});

test('segment editing submits track-point IDs and refreshes backend statistics', async () => {
  let savedCuts = [20];
  let patch: unknown;
  globalThis.fetch = stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString();
    if (init?.method === 'PATCH') {
      patch = JSON.parse(String(init.body));
      savedCuts = [30];
      return Response.json({});
    }
    return Response.json(
      url.includes('/sets/') ? { data: [setId], count: 1 } : statistics(savedCuts)
    );
  });
  const segments = inScope(() => useActivitySegments(ref(firstId), track, ref(null)));
  await settled(segments.isLoadingSegmentSets);
  segments.startSegmentCutEdit();
  segments.nudgeEditableCutByPoints(0, 1);
  expect(segments.editableSegmentCuts.value).toEqual([30]);
  expect(segments.visibleSegmentCutIndices.value).toEqual([2]);
  await segments.saveSegmentCutChanges();
  expect(patch).toEqual({ cuts: [30] });
  expect(segments.selectedSegmentStatistics.value?.cuts).toEqual([30]);
  expect(segments.isEditingSegmentCuts.value).toBe(false);
});

test('a failed segment load is local to the segment panel', async () => {
  globalThis.fetch = stubFetch(async () => Response.json({}, { status: 503 }));
  const segments = inScope(() => useActivitySegments(ref(firstId), track, ref(null)));
  await settled(segments.isLoadingSegmentSets);
  expect(segments.segmentSetError.value).toBe('Failed to fetch segment sets.');
  expect(segments.segmentSetIds.value).toEqual([]);
  expect(segments.canStartNewSegmentSet.value).toBe(true);
});

test('segment statistics accept an empty display-metrics list from the API', async () => {
  globalThis.fetch = stubFetch(async (input: RequestInfo | URL) =>
    Response.json(
      input.toString().includes('/sets/')
        ? { data: [setId] }
        : { ...statistics([]), display_metadata: { primary_metric: 'speed', display_metrics: [] } }
    )
  );
  const segments = inScope(() => useActivitySegments(ref(firstId), track, ref(null)));
  await settled(segments.isLoadingSegmentSets);
  expect(segments.segmentSetError.value).toBeNull();
  expect(segments.selectedSegmentStatistics.value?.displayMetadata.speedUnit).toBe('km/h');
  expect(segments.displayMetrics.value).toEqual(['speed']);
});

test('a segment draft cannot start while the available sets are still loading', async () => {
  let complete!: (response: Response) => void;
  globalThis.fetch = stubFetch(
    () =>
      new Promise<Response>((resolve) => {
        complete = resolve;
      })
  );
  const segments = inScope(() => useActivitySegments(ref(firstId), track, ref(null)));
  expect(segments.canStartNewSegmentSet.value).toBe(false);
  complete(Response.json({ data: [], count: 0 }));
  await settled(segments.isLoadingSegmentSets);
  expect(segments.canStartNewSegmentSet.value).toBe(true);
});

const activityCaches = [
  {
    name: 'equipment',
    setup: () => {
      const store = useEquipmentStore();
      store.activityEquipment = [
        {
          id: firstId,
          name: 'Old equipment',
          equipment_type: 'shoes',
          brand: null,
          model: null,
          description: null,
          purchase_date: null,
        },
      ];
      return {
        load: () => store.fetchEquipmentForActivity(secondId),
        read: () => store.activityEquipment,
      };
    },
  },
  {
    name: 'highlights',
    setup: () => {
      const store = useHighlightStore();
      const old = {
        activity_id: firstId,
        type_id: 1,
        metric: 'distance' as const,
        scope: 'yearly' as const,
        year: 2026,
        value: 1,
        rank: 1 as const,
        track_id: null,
      };
      store.activityHighlights = [old];
      return {
        load: () => store.fetchHighlightsForActivity(secondId),
        read: () => store.activityHighlights,
      };
    },
  },
  {
    name: 'locations',
    setup: () => {
      const store = useLocationStore();
      store.currentActivityLocations = [
        {
          id: firstId,
          name: 'Old location',
          description: null,
          created_at: '2026-10-01T12:00:00Z',
          latitude: 48,
          longitude: 11,
          type_id: 1,
          sub_type_id: 1,
        },
      ];
      return {
        load: () => store.fetchLocationsForActivity(secondId),
        read: () => store.currentActivityLocations,
      };
    },
  },
];
for (const entry of activityCaches) {
  test(`previous activity ${entry.name} are cleared before the next activity loads`, async () => {
    let complete!: (response: Response) => void;
    globalThis.fetch = stubFetch(
      () =>
        new Promise<Response>((resolve) => {
          complete = resolve;
        })
    );
    const cache = entry.setup();
    const request = cache.load();
    expect(cache.read()).toEqual([]);
    complete(Response.json({ data: [], count: 0 }));
    await request;
  });
}

const mutationRefreshes = [
  [
    'equipment add',
    () => {
      const store = useEquipmentStore();
      return {
        mutate: () => store.addEquipmentToActivity(setId, firstId),
        load: (id: string) => store.fetchEquipmentForActivity(id),
      };
    },
  ],
  [
    'equipment remove',
    () => {
      const store = useEquipmentStore();
      return {
        mutate: () => store.removeEquipmentFromActivity(setId, firstId),
        load: (id: string) => store.fetchEquipmentForActivity(id),
      };
    },
  ],
  [
    'equipment set add',
    () => {
      const store = useEquipmentStore();
      return {
        mutate: () => store.addSetToActivity(setId, firstId),
        load: (id: string) => store.fetchEquipmentForActivity(id),
      };
    },
  ],
  [
    'equipment set remove',
    () => {
      const store = useEquipmentStore();
      return {
        mutate: () => store.removeSetFromActivity(setId, firstId),
        load: (id: string) => store.fetchEquipmentForActivity(id),
      };
    },
  ],
  [
    'location add',
    () => {
      const store = useLocationStore();
      return {
        mutate: () => store.addLocationToActivity(firstId, setId),
        load: (id: string) => store.fetchLocationsForActivity(id),
      };
    },
  ],
  [
    'location remove',
    () => {
      const store = useLocationStore();
      return {
        mutate: () => store.removeLocationFromActivity(firstId, setId),
        load: (id: string) => store.fetchLocationsForActivity(id),
      };
    },
  ],
  [
    'image upload',
    () => {
      const store = useActivityStore();
      return {
        mutate: () => store.uploadActivityImage(firstId, new File(['image'], 'image.png')),
        load: (id: string) => store.fetchActivityImages(id),
      };
    },
  ],
] as const;
for (const [name, setup] of mutationRefreshes) {
  test.each([true, false])(
    `a pending ${name} refreshes only its displayed activity (navigated: %s)`,
    async (navigated) => {
      const cache = setup();
      globalThis.fetch = stubFetch(async () => Response.json({ data: [], count: 0 }));
      await cache.load(firstId);
      let complete!: (response: Response) => void;
      const loads: string[] = [];
      globalThis.fetch = stubFetch((input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method && init.method !== 'GET')
          return new Promise<Response>((resolve) => {
            complete = resolve;
          });
        loads.push(input.toString());
        return Promise.resolve(Response.json({ data: [], count: 0 }));
      });
      const pending = cache.mutate();
      await cache.load(navigated ? secondId : firstId);
      complete(new Response(null, { status: 204 }));
      await pending;
      expect(loads).toHaveLength(navigated ? 1 : 2);
      expect(loads.every((url) => url.includes(navigated ? secondId : firstId))).toBe(true);
    }
  );
}

test('segment cadence uses activity units without scaling or losing fractions and zero', async () => {
  globalThis.fetch = stubFetch(async (input: RequestInfo | URL) => Response.json(
    input.toString().includes('/sets/') ? { data: [setId] } : {
      ...statistics([]),
      display_metadata: { primary_metric: 'cadence', display_metrics: ['cadence'] },
      segments: [{
        distance_m: null, duration_s: 60, elevation_gain: null, elevation_loss: null,
        cadence: { min: 160, avg: 171.5, max: 180 },
      }],
    }
  ));
  const unit = ref<'steps/min' | 'RPM'>('steps/min');
  const segments = inScope(() => useActivitySegments(ref(firstId), track, ref(null), unit));
  await settled(segments.isLoadingSegmentSets);
  const segment = segments.selectedSegmentStatistics.value!.segments[0]!;
  expect(segments.formatSegmentMetricAverage(segment, 'cadence')).toBe('171.5 steps/min');
  expect(segments.formatSegmentMetric('cadence', segment.cadence!.min)).toBe('160 steps/min');
  expect(segments.formatSegmentMetric('cadence', segment.cadence!.max)).toBe('180 steps/min');
  expect(segments.formatSegmentMetric('cadence', 0)).toBe('0 steps/min');
  expect(segments.formatSegmentMetric('cadence', null)).toBe('-');
  expect(segments.formatSegmentMetricAverage({
    ...segment, cadence: { min: null, avg: 0, max: null },
  }, 'cadence')).toBe('0 steps/min');
  unit.value = 'RPM';
  expect(segments.formatSegmentMetric('cadence', 85.5)).toBe('85.5 RPM');
});

test('returning from a classification edit refetches track and segment cadence', async () => {
  let running = false;
  globalThis.fetch = stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString();
    if (init?.method === 'PATCH') running = true;
    const summary = { ...activity(firstId), type_id: 90, sub_type_id: running ? 91 : 94 };
    const cadence = running ? 171 : 85.5;
    if (url.includes('/track/segments/sets/')) return Response.json({ data: [setId] });
    if (url.includes('/track/segments/set/')) return Response.json({
      ...statistics([]),
      segments: [{
        distance_m: null, duration_s: 60, elevation_gain: null, elevation_loss: null,
        cadence: { min: cadence, avg: cadence, max: cadence },
      }],
    });
    return Response.json(url.includes('/track/')
      ? { data: [{ ...point(1, 0), cadence }] } : summary);
  });
  function mountDetail() {
    const scope = effectScope();
    scopes.push(scope);
    const result = scope.run(() => {
      const detail = useActivityDetail(ref(firstId));
      return { detail, segments: useActivitySegments(ref(firstId), detail.trackData, ref(null)) };
    })!;
    return { ...result, scope };
  }
  const before = mountDetail();
  await settled(before.detail.isLoading);
  await settled(before.segments.isLoadingSegmentSets);
  expect(before.detail.trackData.value[0]?.cad).toBe(85.5);
  before.scope.stop();
  expect(await useActivityStore().updateActivity(firstId, { sub_type_id: 91 })).toBe(true);
  const after = mountDetail();
  await settled(after.detail.isLoading);
  await settled(after.segments.isLoadingSegmentSets);
  expect(after.detail.activity.value?.sub_type_id).toBe(91);
  expect(after.detail.trackData.value[0]?.cad).toBe(171);
  expect(after.segments.selectedSegmentStatistics.value?.segments[0]?.cadence?.avg).toBe(171);
});
