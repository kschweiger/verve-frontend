import { stubFetch } from '../helpers/fetch';
import { afterEach, beforeEach, expect, test } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '../../src/stores/auth';
import { useGoalStore, type Goal } from '../../src/stores/goals';

const originalFetch = globalThis.fetch;
const originalStorage = globalThis.localStorage;
const goal: Goal = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Read',
  description: null,
  current: 4,
  target: 10,
  progress: 0.4,
  reached: false,
  temporal_type: 'yearly',
  year: 2026,
  month: null,
  type: 'manual',
  aggregation: 'count',
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
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalStorage;
});

test('manual progress sends direction and amount to the documented endpoint and updates every cache', async () => {
  const updated = { ...goal, current: 7, progress: 0.7 };
  const requests: Array<{ url: URL; method: string | undefined }> = [];
  globalThis.fetch = stubFetch(async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({
      url: new URL(input.toString(), 'https://api.example.test'),
      method: init?.method,
    });
    return Response.json(updated);
  });
  const store = useGoalStore();
  const other = { ...goal, id: '00000000-0000-4000-8000-000000000002', name: 'Other' };
  store.goals = [goal, other];
  store.yearlyGoals = [goal];
  store.monthlyGoals = [goal];
  store.weeklyGoals = [goal];
  expect(await store.modifyManualGoal(goal.id, true, 3)).toBe(true);
  expect(requests).toHaveLength(1);
  expect(requests[0]?.url.pathname.endsWith(`/goal/${goal.id}/modify_amount`)).toBe(true);
  expect(requests[0]?.url.searchParams.get('increase')).toBe('true');
  expect(requests[0]?.url.searchParams.get('amount')).toBe('3');
  expect(requests[0]?.method).toBe('GET');
  expect(store.goals).toEqual([updated, other]);
  expect(store.yearlyGoals).toEqual([updated]);
  expect(store.monthlyGoals).toEqual([updated]);
  expect(store.weeklyGoals).toEqual([updated]);
});

test('manual progress can decrease by the default amount of one', async () => {
  let requestUrl: URL | undefined;
  globalThis.fetch = stubFetch(async (input: RequestInfo | URL) => {
    requestUrl = new URL(input.toString(), 'https://api.example.test');
    return Response.json({ ...goal, current: 3, progress: 0.3 });
  });
  const store = useGoalStore();
  store.goals = [goal];
  expect(await store.modifyManualGoal(goal.id, false)).toBe(true);
  expect(requestUrl?.searchParams.get('increase')).toBe('false');
  expect(requestUrl?.searchParams.get('amount')).toBe('1');
  expect(store.goals[0]?.current).toBe(3);
});

test('failed manual progress keeps all cached goals and exposes the error', async () => {
  globalThis.fetch = stubFetch(async () => Response.json({}, { status: 503 }));
  const store = useGoalStore();
  store.goals = [goal];
  store.yearlyGoals = [goal];
  expect(await store.modifyManualGoal(goal.id, true, 3)).toBe(false);
  expect(store.goals).toEqual([goal]);
  expect(store.yearlyGoals).toEqual([goal]);
  expect(store.error).toBe('Failed to update goal');
});
