import { afterEach, beforeEach, expect, test } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '../../src/stores/auth';
import { fetchActivityTrack, fetchSegmentStatistics } from '../../src/services/api';
import { fetchCollection, fetchCollectionTrack } from '../../src/services/collections';
import type { TrackPointResponse } from '../../src/types/api';
import { stubFetch } from '../helpers/fetch';

const originalFetch = globalThis.fetch;
const originalStorage = globalThis.localStorage;
const point = (cadence: number | null, id: number): TrackPointResponse => ({
  id,
  segment_id: 1,
  latitude: null,
  longitude: null,
  time: '2026-10-01T12:00:00Z',
  elevation: null,
  diff_time: null,
  diff_distance: null,
  cum_distance: null,
  speed: null,
  heartrate: null,
  cadence,
  power: null,
});
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
test('track API adapters preserve cadence precision, zero, and null without scaling', async () => {
  globalThis.fetch = stubFetch(async () =>
    Response.json({
      data: [171, 171.5, 171.567, 85.5, 0, null].map(point),
    })
  );
  expect((await fetchActivityTrack('run')).map((sample) => sample.cad)).toEqual([
    171,
    171.5,
    171.567,
    85.5,
    0,
    null,
  ]);
});
test('mixed collection samples retain their activity identity and reported cadence', async () => {
  globalThis.fetch = stubFetch(async () =>
    Response.json({
      data: [
        { ...point(171.567, 1), activity_id: 'run', activity_index: 0, collection_cum_distance: 0 },
        { ...point(85.5, 2), activity_id: 'ride', activity_index: 1, collection_cum_distance: 1 },
        { ...point(0, 3), activity_id: 'run', activity_index: 0, collection_cum_distance: 2 },
        { ...point(null, 4), activity_id: 'ride', activity_index: 1, collection_cum_distance: 3 },
      ],
    })
  );
  expect(
    (await fetchCollectionTrack('mixed')).map(({ activityId, cad }) => ({ activityId, cad }))
  ).toEqual([
    { activityId: 'run', cad: 171.567 },
    { activityId: 'ride', cad: 85.5 },
    { activityId: 'run', cad: 0 },
    { activityId: 'ride', cad: null },
  ]);
});
test.each([
  undefined,
  null,
  { min: 160, avg: 171.567, max: 180 },
  { min: null, avg: 0, max: null },
])('segment API adapters preserve optional cadence metrics: %j', async (cadence) => {
  globalThis.fetch = stubFetch(async () =>
    Response.json({
      segment_set_id: 'set',
      name: 'Intervals',
      cuts: [],
      display_metadata: { primary_metric: 'cadence', display_metrics: ['cadence'] },
      segments: [
        { distance_m: null, duration_s: 60, elevation_gain: null, elevation_loss: null, cadence },
      ],
    })
  );
  expect((await fetchSegmentStatistics('set')).segments[0]?.cadence).toEqual(cadence ?? null);
});

test('reopening a collection fetches the member classification and cadence again', async () => {
  let running = false;
  globalThis.fetch = stubFetch(async (input: RequestInfo | URL) => {
    if (input.toString().endsWith('/track'))
      return Response.json({
        data: [
          {
            ...point(running ? 171 : 85.5, 1),
            activity_id: 'foot-activity',
            activity_index: 0,
            collection_cum_distance: 0,
          },
        ],
      });
    return Response.json({
      id: 'collection',
      name: 'Trip',
      activities: [
        {
          id: 'foot-activity',
          name: 'Foot activity',
          type_id: 90,
          sub_type_id: running ? 91 : 94,
          start: '2026-10-01T12:00:00Z',
          created_at: '2026-10-01T12:00:00Z',
          timezone: 'Europe/Berlin',
          duration: 'PT1M',
          distance: null,
          tags: [],
        },
      ],
      total_distance: null,
      total_duration: 'PT1M',
      total_moving_duration: null,
      total_elevation_change_up: null,
      total_elevation_change_down: null,
    });
  });
  const before = await Promise.all([
    fetchCollection('collection'),
    fetchCollectionTrack('collection'),
  ]);
  expect(before[0].activities[0]?.sub_type_id).toBe(94);
  expect(before[1][0]?.cad).toBe(85.5);
  running = true;
  const after = await Promise.all([
    fetchCollection('collection'),
    fetchCollectionTrack('collection'),
  ]);
  expect(after[0].activities[0]?.sub_type_id).toBe(91);
  expect(after[1][0]?.cad).toBe(171);
});
