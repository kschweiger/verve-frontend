import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '../../src/stores/auth';
import { fetchActivityPage, mapApiActivity } from '../../src/services/api';

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
  test('maps moving duration as primary effective duration when available', () => {
    const result = mapApiActivity({
      id: 'activity-1',
      start: '2026-06-01T08:00:00Z',
      duration: 'PT1H',
      moving_duration: 'PT45M',
      distance: 10,
      type_id: 1,
      sub_type_id: null,
      name: 'Morning ride',
      created_at: '2026-06-01T09:00:00Z',
      tags: [],
    });

    expect(result.duration).toBe('1h 0m');
    expect(result.durationSeconds).toBe(3600);
    expect(result.movingDuration).toBe('45m 0s');
    expect(result.movingDurationSeconds).toBe(2700);
    expect(result.effectiveDuration).toBe('45m 0s');
    expect(result.effectiveDurationSeconds).toBe(2700);
  });

  test('falls back to total duration for effective duration when moving duration is missing or zero', () => {
    const missingMoving = mapApiActivity({
      id: 'activity-1',
      start: '2026-06-01T08:00:00Z',
      duration: 'PT1H',
      moving_duration: null,
      distance: 10,
      type_id: 1,
      sub_type_id: null,
      name: 'Manual entry',
      created_at: '2026-06-01T09:00:00Z',
      tags: [],
    });
    const zeroMoving = mapApiActivity({
      id: 'activity-2',
      start: '2026-06-01T08:00:00Z',
      duration: 'PT1H',
      moving_duration: 'PT0S',
      distance: 10,
      type_id: 1,
      sub_type_id: null,
      name: 'Zero moving import',
      created_at: '2026-06-01T09:00:00Z',
      tags: [],
    });

    expect(missingMoving.movingDuration).toBeNull();
    expect(missingMoving.effectiveDurationSeconds).toBe(3600);
    expect(missingMoving.effectiveDuration).toBe('1h 0m');
    expect(zeroMoving.movingDurationSeconds).toBe(0);
    expect(zeroMoving.effectiveDurationSeconds).toBe(3600);
    expect(zeroMoving.effectiveDuration).toBe('1h 0m');
  });

  test('maps available average and max activity metrics', () => {
    const result = mapApiActivity({
      id: 'activity-1',
      start: '2026-06-01T08:00:00Z',
      duration: 'PT1H',
      distance: 10,
      type_id: 1,
      sub_type_id: null,
      name: 'Power ride',
      created_at: '2026-06-01T09:00:00Z',
      avg_speed: 24.6,
      max_speed: 51.2,
      avg_heartrate: 142,
      max_heartrate: 178,
      avg_power: 210,
      max_power: 612,
      tags: [],
    });

    expect(result.avg_speed).toBe(24.6);
    expect(result.max_speed).toBe(51.2);
    expect(result.avg_heartrate).toBe(142);
    expect(result.max_heartrate).toBe(178);
    expect(result.avg_power).toBe(210);
    expect(result.max_power).toBe(612);
  });

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
