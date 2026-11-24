import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { stubFetch } from '../helpers/fetch';
import { useTypeStore } from '../../src/stores/types';

const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;

function response(name: string) {
  return {
    ok: true,
    json: async () => ({ data: [{ id: 1, name, sub_types: [] }] }),
  } as Response;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

describe('type catalog localization', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    globalThis.fetch = stubFetch(mock(() => Promise.resolve(response(''))));
    console.error = mock();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
  });

  test('requests active locale and keeps displayed catalog until replacement resolves', async () => {
    const store = useTypeStore();
    const next = deferred<Response>();
    globalThis.fetch = stubFetch(mock().mockResolvedValueOnce(response('Run')).mockImplementationOnce(() => next.promise));

    await store.fetchActivityTypes();
    expect(store.activityTypes[0]?.name).toBe('Run');

    store.setLocale('de');
    const loadGerman = store.fetchActivityTypes();
    await Promise.resolve();
    expect(store.activityTypes[0]?.name).toBe('Run');
    expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining('locale=de'), { method: 'GET' });

    next.resolve(response('Laufen'));
    await loadGerman;
    expect(store.activityTypes[0]?.name).toBe('Laufen');
  });

  test('shares English activity request between display and reference catalog', async () => {
    const store = useTypeStore();
    globalThis.fetch = stubFetch(mock().mockResolvedValue(response('Run')));

    await Promise.all([store.fetchActivityTypes(), store.fetchEnglishActivityTypes()]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(store.activityTypes).toEqual(store.englishActivityTypes);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('locale=en'), { method: 'GET' });
  });

  test('ignores stale locale responses', async () => {
    const store = useTypeStore();
    const german = deferred<Response>();
    globalThis.fetch = stubFetch(mock()
      .mockResolvedValueOnce(response('Run'))
      .mockImplementationOnce(() => german.promise)
      .mockResolvedValueOnce(response('Ride')));
    await store.fetchActivityTypes();

    store.setLocale('de');
    const oldLoad = store.fetchActivityTypes();
    store.setLocale('en');
    const retry = store.fetchActivityTypes();
    await retry;
    german.resolve(response('Laufen'));
    await oldLoad;
    expect(store.activityTypes[0]?.name).toBe('Run');
  });

  test('retries a failed catalog request', async () => {
    const store = useTypeStore();
    globalThis.fetch = stubFetch(mock()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(response('Laufen')));
    store.setLocale('de');
    await store.fetchActivityTypes();
    await store.fetchActivityTypes();
    expect(store.activityTypes[0]?.name).toBe('Laufen');
  });

  test('refreshes only catalogs requested for display on locale changes', async () => {
    const store = useTypeStore();
    globalThis.fetch = stubFetch(mock().mockResolvedValue(response('Run')));
    await store.fetchActivityTypes();

    store.setLocale('de');
    await Promise.resolve();

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining('/resolve/activity_types?locale=de'), { method: 'GET' });
  });

  test('refreshes requested location types while retaining their displayed values', async () => {
    const store = useTypeStore();
    const next = deferred<Response>();
    globalThis.fetch = stubFetch(mock().mockResolvedValueOnce(response('Home')).mockImplementationOnce(() => next.promise));

    await store.fetchLocationTypes();
    store.setLocale('de');
    await Promise.resolve();

    expect(store.locationTypes[0]?.name).toBe('Home');
    expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining('/resolve/location_types?locale=de'), { method: 'GET' });
    next.resolve(response('Zuhause'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.locationTypes[0]?.name).toBe('Zuhause');
  });
});
