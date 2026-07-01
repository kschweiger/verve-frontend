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
