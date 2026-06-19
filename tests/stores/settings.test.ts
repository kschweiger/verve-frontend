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
          is_active: true,
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
          is_active: true,
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
