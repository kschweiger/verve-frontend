import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '../../src/stores/auth';
import { useRecordsStore } from '../../src/stores/records';

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

describe('records store type filter', () => {
  test('uses a concrete type_id for overview fetches', async () => {
    const userStore = useUserStore();
    userStore.setToken('token-123');
    const fetchMock = mock(async () => jsonResponse({ data: {} }));
    globalThis.fetch = fetchMock as typeof fetch;

    const recordsStore = useRecordsStore();
    recordsStore.setInitialTypeId(2);
    await recordsStore.fetchOverview();

    expect(fetchMock).toHaveBeenCalledWith(
      `${import.meta.env.VITE_API_BASE_URL}/highlights/?year=${new Date().getFullYear()}&type_id=2`,
      expect.objectContaining({
        headers: { Authorization: 'Bearer token-123' },
      })
    );
  });

  test('does not fetch overview without a concrete type_id', async () => {
    const fetchMock = mock(async () => jsonResponse({ data: {} }));
    globalThis.fetch = fetchMock as typeof fetch;

    const recordsStore = useRecordsStore();
    await recordsStore.fetchOverview();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(recordsStore.error).toBe('Choose an activity type to view records.');
  });
});
