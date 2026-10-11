import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '../../src/stores/auth';
import { useActivityStore } from '../../src/stores/activity';
import {
  fetchActivitySummary,
  fetchActivityPage,
  fetchActivityTrack,
  mapApiActivity,
} from '../../src/services/api';
import * as datetime from '../../src/utils/datetime';
import cases from '../fixtures/timezones/cases.json';

const originalFetch = globalThis.fetch;
const originalLocalStorage = globalThis.localStorage;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const activityResponse = (overrides: Record<string, unknown> = {}) => ({
  id: '00000000-0000-4000-8000-000000000001',
  start: '2026-08-10T16:00:00Z',
  timezone: 'America/Los_Angeles',
  created_at: '2026-08-10T16:00:00Z',
  duration: 'PT10M',
  distance: 1,
  type_id: 1,
  sub_type_id: null,
  name: 'Hike',
  tags: [],
  ...overrides,
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
  useUserStore().setToken('token-123');
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalLocalStorage;
});

describe('validated activity timezone responses', () => {
  test.each(cases.cases)('$id preserves the API timezone and instant', ({ expected }) => {
    const result = mapApiActivity(
      activityResponse({ start: expected.start, timezone: expected.timezone })
    );
    expect(result.timezone).toBe(expected.timezone);
    expect(result.start).toBe(expected.start);
    expect(result.durationSeconds).toBe(600);
  });

  test.each([undefined, null, '', 'Mars/Olympus_Mons', 12])(
    'rejects invalid required timezone %p',
    (timezone) => {
      expect(() => mapApiActivity(activityResponse({ timezone }))).toThrow();
    }
  );

  test.each(['2026-08-10T16:00:00', 'invalid', '2026-02-30T16:00:00Z'])(
    'rejects invalid start %p',
    (start) => {
      expect(() => mapApiActivity(activityResponse({ start }))).toThrow();
    }
  );

  test('rejects malformed nested tags instead of trusting a type assertion', () => {
    expect(() =>
      mapApiActivity(activityResponse({ tags: [{ id: 'bad', name: 'tag' }] }))
    ).toThrow();
  });

  test('retains durations spanning whole days in the API duration format', () => {
    const result = mapApiActivity(
      activityResponse({ duration: 'P1DT2H30M', moving_duration: 'P1D' })
    );
    expect(result.durationSeconds).toBe(95400);
    expect(result.movingDurationSeconds).toBe(86400);
  });

  test('uses validated data in detail, page, and both store loaders', async () => {
    globalThis.fetch = mock(async (input: RequestInfo | URL) =>
      json(
        input.toString().includes('/activity/?')
          ? { data: [activityResponse()] }
          : activityResponse()
      )
    ) as typeof fetch;
    expect((await fetchActivitySummary('activity-id')).timezone).toBe('America/Los_Angeles');
    expect((await fetchActivityPage({}))[0]?.timezone).toBe('America/Los_Angeles');
    const store = useActivityStore();
    await store.fetchRecentActivities();
    await store.fetchActivities({});
    expect(store.recentActivities[0]?.timezone).toBe('America/Los_Angeles');
    expect(store.paginatedActivities[0]?.timezone).toBe('America/Los_Angeles');
  });

  test('maps DST track data without changing heart rates or elapsed positions', async () => {
    const scenario = cases.cases.find((item) => item.id === 'berlin-dst-fallback')!;
    globalThis.fetch = mock(async () =>
      json({
        data: scenario.expected.point_times.map((time, i) => ({
          id: i + 1,
          segment_id: 1,
          latitude: 52.5,
          longitude: 13.4,
          elevation: 50,
          time,
          diff_time: i === 0 ? null : 300,
          diff_distance: null,
          cum_distance: i * 500,
          speed: null,
          heartrate: scenario.expected.heart_rates[i],
          cadence: null,
          power: null,
        })),
      })
    ) as typeof fetch;
    const points = await fetchActivityTrack('activity-id');
    expect(points.map((point) => point.time)).toEqual(scenario.expected.point_times);
    expect(points.map((point) => point.hr)).toEqual([96, 108, 120]);
    expect(
      points.map((point) => datetime.elapsedSecondsBetweenInstants(points[0]!.time, point.time))
    ).toEqual([0, 300, 600]);
  });
});

describe('activity timezone correction', () => {
  test('sends only the changed zone and synchronizes matching cached activities', async () => {
    const store = useActivityStore();
    const initial = mapApiActivity(activityResponse());
    store.recentActivities = [initial];
    store.paginatedActivities = [initial];
    let request: RequestInit | undefined;
    let requestUrl = '';
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      requestUrl = input.toString();
      request = init;
      return json(activityResponse({ timezone: 'Europe/Berlin' }));
    }) as typeof fetch;
    expect(await store.updateActivity(initial.id, { timezone: 'Europe/Berlin' })).toBe(true);
    expect(requestUrl.endsWith(`/activity/${initial.id}`)).toBe(true);
    expect(request?.body).toBe(JSON.stringify({ timezone: 'Europe/Berlin' }));
    expect(request?.method).toBe('PATCH');
    expect(store.recentActivities[0]?.timezone).toBe('Europe/Berlin');
    expect(store.paginatedActivities[0]?.timezone).toBe('Europe/Berlin');
    expect(store.recentActivities[0]?.start).toBe('2026-08-10T16:00:00Z');
    expect(store.recentActivities[0]?.durationSeconds).toBe(600);
  });

  test.each([422, 200])(
    'keeps caches intact after failed or malformed PATCH response (%p)',
    async (status) => {
      const store = useActivityStore();
      const initial = mapApiActivity(activityResponse());
      store.recentActivities = [initial];
      const lastUpdate = store.lastUpdate;
      globalThis.fetch = mock(async () => json({}, status)) as typeof fetch;
      expect(await store.updateActivity(initial.id, { timezone: 'Europe/Berlin' })).toBe(false);
      expect(store.recentActivities[0]?.timezone).toBe('America/Los_Angeles');
      expect(store.lastUpdate).toBe(lastUpdate);
    }
  );
});
