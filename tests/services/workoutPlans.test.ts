import { afterEach, beforeEach, expect, test } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '../../src/stores/auth';
import { duplicateWorkoutPlan, updateWorkoutPlan } from '../../src/services/workoutPlans';

const originalFetch = globalThis.fetch;
const originalStorage = globalThis.localStorage;
beforeEach(() => {
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  } as Storage;
  setActivePinia(createPinia());
  useUserStore().setToken('test-token');
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalStorage;
});
test('renaming omits entries and clearing sends an empty array', async () => {
  const bodies: unknown[] = [];
  globalThis.fetch = (async (_url, init) => {
    bodies.push(JSON.parse(String(init?.body)));
    return Response.json({ id: 'id', name: 'Name', entries: [] });
  }) as typeof fetch;
  await updateWorkoutPlan('id', { name: 'Name' });
  await updateWorkoutPlan('id', { entries: [] });
  expect(bodies).toEqual([{ name: 'Name' }, { entries: [] }]);
});
test('duplicate uses a bodyless POST with the encoded name', async () => {
  let url = '';
  let options: RequestInit | undefined;
  globalThis.fetch = (async (input, init) => {
    url = String(input);
    options = init;
    return Response.json({ id: 'copy', name: 'Copy & more', entries: [] });
  }) as typeof fetch;
  await duplicateWorkoutPlan('id', 'Copy & more');
  expect(url).toContain('/exercise_plans/id?name=Copy+%26+more');
  expect(options?.method).toBe('POST');
  expect(options?.body).toBeUndefined();
});
