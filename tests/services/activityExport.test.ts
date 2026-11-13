import { afterEach, expect, test } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { stubFetch } from '../helpers/fetch';
import { useUserStore } from '../../src/stores/auth';
import { fetchActivityExport } from '../../src/services/api';

const originalFetch = globalThis.fetch;
const originalStorage = globalThis.localStorage;
afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalStorage;
});
function authenticate() {
  globalThis.localStorage = {
    getItem: () => null,
    setItem() {},
    removeItem() {},
    clear() {},
    key: () => null,
    length: 0,
  };
  setActivePinia(createPinia());
  useUserStore().token = 'test-token';
}
for (const format of ['geojson', 'gpx'] as const) {
  test(`downloads unchanged ${format} with authentication`, async () => {
    authenticate();
    const content = format === 'gpx' ? '<gpx>\n</gpx>' : '{"type":"FeatureCollection"}';
    globalThis.fetch = stubFetch(
      async (url: Parameters<typeof fetch>[0], init: Parameters<typeof fetch>[1]) => {
        expect(String(url)).toEndWith(`/activity/activity-1/export?output_format=${format}`);
        expect(init?.method).toBe('GET');
        expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-token');
        return new Response(content);
      }
    );
    expect(await (await fetchActivityExport('activity-1', format)).text()).toBe(content);
  });
}
test('reports unsupported data and network errors', async () => {
  authenticate();
  globalThis.fetch = stubFetch(async () => new Response(null, { status: 422 }));
  await expect(fetchActivityExport('activity-1', 'gpx')).rejects.toThrow(
    'Failed to export activity.'
  );
  globalThis.fetch = stubFetch(async () => {
    throw new Error('Offline');
  });
  await expect(fetchActivityExport('activity-1', 'geojson')).rejects.toThrow('Offline');
});
