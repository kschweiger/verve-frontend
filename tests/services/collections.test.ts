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
