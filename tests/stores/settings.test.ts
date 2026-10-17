import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '../../src/stores/auth';
import { useSettingsStore } from '../../src/stores/settings';

const originalFetch = globalThis.fetch;
const originalLocalStorage = globalThis.localStorage;

const jsonResponse = (body: unknown, init?: ResponseInit): Response =>
  new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

const localStorageStub = (): Storage =>
  ({
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    length: 0,
  }) as Storage;

beforeEach(() => {
  setActivePinia(createPinia());
  globalThis.localStorage = localStorageStub();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalLocalStorage;
});

const settingsFixture = (timezone: unknown = 'Europe/Berlin') => ({
  settings: {
    default_type_id: 1,
    defautl_sub_type_id: null,
    locale: 'en',
    heatmap_settings: { excluded_activity_types: [] },
    records_settings: { default_activity_type: 1 },
    timezone,
  },
});

describe('shared timezone settings', () => {
  beforeEach(() => useUserStore().setToken('token-123'));

  test('shares pending loads and caches settings without loading the profile', async () => {
    let requests = 0;
    globalThis.fetch = mock(async () => {
      requests++;
      return jsonResponse(settingsFixture('America/New_York'));
    }) as typeof fetch;
    const store = useSettingsStore();
    const results = await Promise.all([store.ensureSettings(), store.ensureSettings()]);
    expect(results.every((settings) => settings.timezone === 'America/New_York')).toBe(true);
    expect(store.timezone).toBe('America/New_York');
    await store.ensureSettings();
    expect(requests).toBe(1);
    expect(store.userProfile).toBeNull();
  });

  test('uses the contract default when timezone is omitted', async () => {
    const { timezone: omitted, ...settings } = settingsFixture().settings;
    void omitted;
    globalThis.fetch = mock(async () => jsonResponse({ settings })) as typeof fetch;
    expect((await useSettingsStore().ensureSettings()).timezone).toBe('Europe/Berlin');
  });

  test('clears cached settings on logout', async () => {
    globalThis.fetch = mock(async () => jsonResponse(settingsFixture())) as typeof fetch;
    const store = useSettingsStore();
    await store.ensureSettings();
    useUserStore().logout();
    expect(store.userSettings).toBeNull();
    expect(store.timezone).toBeNull();
  });

  test('normalizes omitted nested preference fields with documented defaults', async () => {
    globalThis.fetch = mock(async () =>
      jsonResponse({
        settings: {
          default_type_id: 1,
          defautl_sub_type_id: null,
          heatmap_settings: {},
          records_settings: {},
        },
      })
    ) as typeof fetch;
    const settings = await useSettingsStore().ensureSettings();
    expect(settings.locale).toBe('en');
    expect(settings.heatmap_settings.excluded_activity_types).toEqual([]);
    expect(settings.records_settings?.default_activity_type).toBe(1);
  });

  test('retries a failed initial load', async () => {
    globalThis.fetch = mock(async () => jsonResponse({}, { status: 503 })) as typeof fetch;
    const store = useSettingsStore();
    await expect(store.ensureSettings()).rejects.toThrow();
    globalThis.fetch = mock(async () =>
      jsonResponse(settingsFixture('Asia/Tokyo'))
    ) as typeof fetch;
    expect((await store.ensureSettings()).timezone).toBe('Asia/Tokyo');
  });

  test('ignores an old account response', async () => {
    let resolveResponse!: (response: Response) => void;
    globalThis.fetch = mock(
      () =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        })
    ) as typeof fetch;
    const store = useSettingsStore();
    const pending = store.ensureSettings();
    useUserStore().logout();
    resolveResponse(jsonResponse(settingsFixture('Asia/Tokyo')));
    await expect(pending).rejects.toThrow();
    expect(store.userSettings).toBeNull();
  });

  test('saves timezone as an encoded query parameter and refreshes shared settings', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ url: input.toString(), init });
      return init?.method === 'PATCH'
        ? jsonResponse({})
        : jsonResponse(settingsFixture('Etc/GMT+1'));
    }) as typeof fetch;
    const store = useSettingsStore();
    expect(await store.updateTimezone('Etc/GMT+1')).toBe(true);
    expect(requests[0]?.url.endsWith('/users/me/timezone?timezone_name=Etc%2FGMT%2B1')).toBe(true);
    expect(requests[0]?.init).toEqual({
      method: 'PATCH',
      headers: { Authorization: 'Bearer token-123' },
    });
    expect(store.timezone).toBe('Etc/GMT+1');
  });

  test('preserves saved timezone and exposes a save failure', async () => {
    globalThis.fetch = mock(async () => jsonResponse(settingsFixture())) as typeof fetch;
    const store = useSettingsStore();
    await store.ensureSettings();
    globalThis.fetch = mock(async () => jsonResponse({}, { status: 422 })) as typeof fetch;
    expect(await store.updateTimezone('Asia/Tokyo')).toBe(false);
    expect(store.timezone).toBe('Europe/Berlin');
    expect(store.timezoneError).toBeTruthy();
    expect(store.isSavingTimezone).toBe(false);
  });

  test('reloads after saving even if a pre-save load fails', async () => {
    let rejectOldLoad!: (error: Error) => void;
    let getCount = 0;
    globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PATCH') return jsonResponse({});
      getCount++;
      if (getCount === 1)
        return new Promise<Response>((_resolve, reject) => {
          rejectOldLoad = reject;
        });
      return jsonResponse(settingsFixture('Asia/Tokyo'));
    }) as typeof fetch;
    const store = useSettingsStore();
    const oldLoad = store.ensureSettings().catch(() => undefined);
    const save = store.updateTimezone('Asia/Tokyo');
    await Promise.resolve();
    await Promise.resolve();
    rejectOldLoad(new Error('Old request failed.'));
    await oldLoad;
    expect(await save).toBe(true);
    expect(store.timezone).toBe('Asia/Tokyo');
  });
});

describe('settings store records settings', () => {
  test('loads records_settings from user settings', async () => {
    const userStore = useUserStore();
    userStore.setToken('token-123');
    const fetchMock = mock(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.endsWith('/users/me')) {
        return jsonResponse({
          name: 'runner',
          email: 'runner@example.com',
          full_name: null,
          id: '00000000-0000-4000-8000-000000000001',
        });
      }
      return jsonResponse({
        settings: {
          default_type_id: 1,
          defautl_sub_type_id: null,
          locale: 'en',
          heatmap_settings: { excluded_activity_types: [] },
          records_settings: { default_activity_type: 2 },
        },
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const settingsStore = useSettingsStore();
    await settingsStore.fetchAllSettings();

    expect(settingsStore.userSettings?.records_settings).toEqual({
      default_activity_type: 2,
    });
  });

  test('patches records settings and refreshes settings', async () => {
    const userStore = useUserStore();
    userStore.setToken('token-123');
    const fetchMock = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      if (url.endsWith('/users/me/records_settings')) {
        expect(init).toEqual(
          expect.objectContaining({
            method: 'PATCH',
            headers: {
              Authorization: 'Bearer token-123',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ default_activity_type: 3 }),
          })
        );
        return jsonResponse({});
      }
      if (url.endsWith('/users/me')) {
        return jsonResponse({
          name: 'runner',
          email: 'runner@example.com',
          full_name: null,
          id: '00000000-0000-4000-8000-000000000001',
        });
      }
      return jsonResponse({
        settings: {
          default_type_id: 1,
          defautl_sub_type_id: null,
          locale: 'en',
          heatmap_settings: { excluded_activity_types: [] },
          records_settings: { default_activity_type: 3 },
        },
      });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const settingsStore = useSettingsStore();
    await expect(settingsStore.updateRecordsSettings(3)).resolves.toBe(true);
    expect(settingsStore.userSettings?.records_settings?.default_activity_type).toBe(3);
  });
});
