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

test('activity snapshot requests use the activity path and bodyless plan query', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  globalThis.fetch = (async (input, init) => {
    calls.push({ url: String(input), init });
    return Response.json({ id: 'snapshot', activity_id: 'activity', entries: [] });
  }) as typeof fetch;
  const { fetchActivityExercisePlan, applyWorkoutPlan } =
    await import('../../src/services/workoutPlans');
  const snapshot = await fetchActivityExercisePlan('activity');
  await applyWorkoutPlan('activity', 'plan & one');
  expect(snapshot.entries).toEqual([]);
  expect(calls[0]?.url).toContain('/activity_exercise_plans/activity');
  expect(calls[1]?.url).toContain('/activity_exercise_plans/activity?plan_id=plan+%26+one');
  expect(calls[1]?.init?.method).toBe('POST');
  expect(calls[1]?.init?.body).toBeUndefined();
  expect(calls[1]?.init?.headers).toEqual({ Authorization: 'Bearer test-token' });
});

test('activity snapshot replacement sends authenticated entries including clearing', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  globalThis.fetch = (async (input, init) => {
    calls.push({ url: String(input), init });
    return Response.json({ id: 'snapshot', activity_id: 'activity', entries: [] });
  }) as typeof fetch;
  const { updateActivityExercisePlan } = await import('../../src/services/workoutPlans');
  await updateActivityExercisePlan('activity', [
    { exercise_id: 'exercise', sets: null, repetitions: 5, weight: 0 },
  ]);
  await updateActivityExercisePlan('activity', []);
  expect(calls.map((call) => JSON.parse(String(call.init?.body)))).toEqual([
    { entries: [{ exercise_id: 'exercise', sets: null, repetitions: 5, weight: 0 }] },
    { entries: [] },
  ]);
  expect(calls[0]?.url).toContain('/activity_exercise_plans/activity');
  expect(calls[0]?.init?.method).toBe('PATCH');
  expect(calls[0]?.init?.headers).toEqual({
    Authorization: 'Bearer test-token',
    'Content-Type': 'application/json',
  });
});

test('saving an activity as a plan posts only its name with authentication', async () => {
  let url = '';
  let options: RequestInit | undefined;
  globalThis.fetch = (async (input, init) => {
    url = String(input);
    options = init;
    return Response.json({ id: 'new-plan', name: 'My plan', entries: [] }, { status: 201 });
  }) as typeof fetch;
  const { saveActivityAsWorkoutPlan } = await import('../../src/services/workoutPlans');
  const result = await saveActivityAsWorkoutPlan('activity/one', 'My plan');
  expect(url).toContain('/activity_exercise_plans/activity%2Fone/save_as_template');
  expect(options?.method).toBe('POST');
  expect(options?.headers).toEqual({
    Authorization: 'Bearer test-token',
    'Content-Type': 'application/json',
  });
  expect(JSON.parse(String(options?.body))).toEqual({ name: 'My plan' });
  expect(result.id).toBe('new-plan');
});
