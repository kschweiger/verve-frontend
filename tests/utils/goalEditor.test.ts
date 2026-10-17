import { afterEach, beforeEach, expect, test } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope, ref, type EffectScope } from 'vue';
import { useUserStore } from '../../src/stores/auth';
import { useGoalStore, type Goal } from '../../src/stores/goals';
import { useGoalEditor } from '../../src/composables/useGoalEditor';

const originalFetch = globalThis.fetch;
const originalStorage = globalThis.localStorage;
let scope: EffectScope;
const goal: Goal = {
  id: 'goal-1',
  name: 'Run',
  description: null,
  target: 10,
  current: 2,
  progress: 20,
  reached: false,
  temporal_type: 'monthly',
  year: 2026,
  month: 10,
  type: 'activity',
  aggregation: 'total_distance',
  constraints: {},
};
beforeEach(() => {
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    length: 0,
  };
  setActivePinia(createPinia());
  useUserStore().setToken('test-token');
  scope = effectScope();
});
afterEach(() => {
  scope.stop();
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalStorage;
});
function editor() {
  return scope.run(() => useGoalEditor(ref({ ...goal })))!;
}

test('failed goal saves preserve edits and report backend errors', async () => {
  const state = editor();
  state.form.value.name = 'Updated';
  globalThis.fetch = (async () =>
    Response.json({ detail: 'Goal cannot be edited.' }, { status: 422 })) as typeof fetch;
  expect(await state.save()).toBe(false);
  expect(state.form.value.name).toBe('Updated');
  expect(state.error.value).toBe('Goal cannot be edited.');
  expect(state.isSaving.value).toBe(false);
});

test('goal edits are sequential, update all caches, and retry only unsaved fields', async () => {
  const store = useGoalStore();
  store.goals = [{ ...goal }];
  store.yearlyGoals = [{ ...goal }];
  store.monthlyGoals = [{ ...goal }];
  store.weeklyGoals = [{ ...goal }];
  const state = editor();
  state.form.value.name = 'Updated';
  state.form.value.target = 20;
  const attributes: string[] = [];
  let fail = true;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const attribute = new URL(input.toString(), 'https://api.test').searchParams.get('attribute')!;
    attributes.push(attribute);
    if (attribute === 'target' && fail) return Response.json({}, { status: 503 });
    return Response.json({ ...goal, name: 'Updated', target: attribute === 'target' ? 20 : 10 });
  }) as typeof fetch;
  expect(await state.save()).toBe(false);
  expect(attributes).toEqual(['name', 'target']);
  expect(store.goals[0]?.name).toBe('Updated');
  expect(store.goals[0]?.target).toBe(10);
  fail = false;
  expect(await state.save()).toBe(true);
  expect(attributes).toEqual(['name', 'target', 'target']);
  for (const cache of [store.goals, store.yearlyGoals, store.monthlyGoals, store.weeklyGoals]) {
    expect(cache[0]?.target).toBe(20);
  }
  expect(state.error.value).toBeNull();
});

test('pending goal saves ignore duplicate submissions and cannot finish a disposed editor', async () => {
  const state = editor();
  state.form.value.name = 'Updated';
  let complete!: (response: Response) => void;
  let requests = 0;
  globalThis.fetch = (() => {
    requests++;
    return new Promise<Response>((resolve) => {
      complete = resolve;
    });
  }) as typeof fetch;
  const pending = state.save();
  expect(state.isSaving.value).toBe(true);
  expect(await state.save()).toBe(false);
  expect(requests).toBe(1);
  scope.stop();
  complete(Response.json({ ...goal, name: 'Updated' }));
  expect(await pending).toBe(false);
});
