import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '../../src/stores/auth';
import {
  buildRecordsQuery,
  fetchRecordsOverview,
  parseHighlightsByMetricResponse,
} from '../../src/services/records';

const originalFetch = globalThis.fetch;
const originalLocalStorage = globalThis.localStorage;

const jsonResponse = (body: unknown, init?: ResponseInit): Response =>
  new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

const validRecord = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  activity_id: 'activity-1',
  type_id: 1,
  metric: 'distance',
  scope: 'yearly',
  year: 2026,
  value: 12345,
  track_id: 10,
  rank: 1,
  ...overrides,
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

describe('records service', () => {
  test('builds query strings with year and type_id', () => {
    expect(buildRecordsQuery({ year: 2026, typeId: 3 })).toBe('year=2026&type_id=3');
  });

  test('omits year when year is null for lifetime records', () => {
    expect(buildRecordsQuery({ year: null, typeId: 3 })).toBe('type_id=3');
  });

  test('parses a valid overview dictionary into metric groups', () => {
    const result = parseHighlightsByMetricResponse({
      data: {
        distance: [
          validRecord({ activity_id: 'activity-2', rank: 2 }),
          validRecord({ activity_id: 'activity-1', rank: 1 }),
        ],
      },
    });

    expect(result).toEqual([
      {
        metric: 'distance',
        records: [
          {
            activity_id: 'activity-1',
            type_id: 1,
            metric: 'distance',
            scope: 'yearly',
            year: 2026,
            value: 12345,
            track_id: 10,
            rank: 1,
          },
          {
            activity_id: 'activity-2',
            type_id: 1,
            metric: 'distance',
            scope: 'yearly',
            year: 2026,
            value: 12345,
            track_id: 10,
            rank: 2,
          },
        ],
      },
    ]);
  });

  test('maps missing nullable fields to null', () => {
    const result = parseHighlightsByMetricResponse({
      data: {
        distance: [validRecord({ year: undefined, track_id: undefined })],
      },
    });

    expect(result[0]?.records[0]?.year).toBeNull();
    expect(result[0]?.records[0]?.track_id).toBeNull();
  });

  test('rejects unknown metric keys', () => {
    expect(() =>
      parseHighlightsByMetricResponse({
        data: {
          calories: [validRecord({ metric: 'calories' })],
        },
      })
    ).toThrow('Unknown records metric');
  });

  test('rejects invalid record fields and malformed response data', () => {
    expect(() =>
      parseHighlightsByMetricResponse({ data: { distance: [validRecord({ scope: 'monthly' })] } })
    ).toThrow('Invalid activity highlight');
    expect(() =>
      parseHighlightsByMetricResponse({ data: { distance: [validRecord({ rank: 0 })] } })
    ).toThrow('Invalid activity highlight');
    expect(() =>
      parseHighlightsByMetricResponse({ data: { distance: [validRecord({ value: false })] } })
    ).toThrow('Invalid activity highlight');
    expect(() =>
      parseHighlightsByMetricResponse({ data: { distance: [validRecord({ activity_id: undefined })] } })
    ).toThrow('Invalid activity highlight');
    expect(() => parseHighlightsByMetricResponse({ data: [] })).toThrow('Invalid records response');
  });

  test('rejects records whose metric does not match the containing metric key', () => {
    expect(() =>
      parseHighlightsByMetricResponse({
        data: {
          distance: [validRecord({ metric: 'duration' })],
        },
      })
    ).toThrow('Record metric does not match group metric');
  });

  test('fetches the overview with auth headers and parses the response', async () => {
    const userStore = useUserStore();
    userStore.setToken('token-123');
    const fetchMock = mock(async () =>
      jsonResponse({
        data: {
          distance: [validRecord()],
        },
      })
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const result = await fetchRecordsOverview({ year: 2026, typeId: 2 });

    expect(fetchMock).toHaveBeenCalledWith(
      `${import.meta.env.VITE_API_BASE_URL}/highlights/?year=2026&type_id=2`,
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-123' },
      })
    );
    expect(result[0]?.metric).toBe('distance');
  });
});
