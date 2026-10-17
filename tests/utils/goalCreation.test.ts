import { stubFetch } from '../helpers/fetch';
import { afterEach, beforeEach, expect, test } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope, ref, type EffectScope } from 'vue';
import { useUserStore } from '../../src/stores/auth';
import { useGoalCreation } from '../../src/composables/useGoalCreation';
import { useSubTypes } from '../../src/composables/useSubTypes';
import { goalPeriodParams, type GoalTimeframe } from '../../src/utils/goalTimeframe';

const storage = globalThis.localStorage;
const fetchOriginal = globalThis.fetch;
let scope: EffectScope;
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
  globalThis.localStorage = storage;
  globalThis.fetch = fetchOriginal;
});
const period: GoalTimeframe = {
  temporal_type: 'monthly',
  year: 2026,
  month: 10,
  week: 42,
  is_all_months: false,
  weekly_scope: 'specific_week',
};

test('subtype initialization survives lookup loading, and a parent change clears it synchronously', () => {
  const types = ref<Array<{ id: number; sub_types: Array<{ id: number; name: string }> }>>([]);
  const type = ref<number | null>(1);
  const subType = ref<number | null>(10);
  const available = scope.run(() => useSubTypes(types, type, subType))!;
  expect(subType.value).toBe(10);
  types.value = [
    { id: 1, sub_types: [{ id: 10, name: 'Road' }] },
    { id: 2, sub_types: [{ id: 20, name: 'Trail' }] },
  ];
  expect(available.value.map((item) => item.id)).toEqual([10]);
  type.value = 2;
  expect(subType.value).toBeNull();
  expect(available.value.map((item) => item.id)).toEqual([20]);
  subType.value = 20;
  type.value = null;
  expect(subType.value).toBeNull();
  expect(available.value).toEqual([]);
});

test.each([
  [{ temporal_type: 'yearly' }, null, null],
  [{ temporal_type: 'monthly' }, 10, null],
  [{ temporal_type: 'monthly', is_all_months: true }, null, null],
  [{ temporal_type: 'weekly', weekly_scope: 'specific_week' }, null, 42],
  [{ temporal_type: 'weekly', weekly_scope: 'all_in_month' }, 10, null],
  [{ temporal_type: 'weekly', weekly_scope: 'all_in_year' }, null, null],
] as const)(
  'goal period conversion keeps only the selected scope (%#)',
  (overrides, month, week) => {
    expect(goalPeriodParams({ ...period, ...overrides })).toEqual({
      temporal_type: overrides.temporal_type,
      year: 2026,
      month,
      week,
    });
  }
);

test('both goal kinds prevent duplicate submission and preserve a visible failure for retry', async () => {
  const draft = ref({ ...period, name: 'Visits', description: '', target: 3 });
  const state = scope.run(() => useGoalCreation(draft))!;
  let complete!: (response: Response) => void;
  const requests: RequestInit[] = [];
  globalThis.fetch = stubFetch((_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      requests.push(init);
      return new Promise<Response>((resolve) => {
        complete = resolve;
      });
    }
    return Promise.resolve(Response.json({ data: [], count: 0 }));
  });
  const options = {
    type: 'location' as const,
    aggregation: 'count' as const,
    constraints: { location_id: 'location-1' },
  };
  const pending = state.submit(options);
  expect(state.isSaving.value).toBe(true);
  expect(await state.submit(options)).toBe(false);
  expect(requests).toHaveLength(1);
  complete(Response.json({ detail: 'Try later.' }, { status: 503 }));
  expect(await pending).toBe(false);
  expect(state.error.value).toBe('Try later.');
  expect(draft.value.name).toBe('Visits');
  const retry = state.submit({ type: 'activity', aggregation: 'total_distance' });
  complete(Response.json({ data: [] }));
  expect(await retry).toBe(true);
  expect(state.error.value).toBeNull();
  expect(JSON.parse(String(requests[0]?.body))).toMatchObject({
    type: 'location',
    month: 10,
    week: null,
    constraints: { location_id: 'location-1' },
  });
});

test('weekly validation is shared by location and activity creation', async () => {
  const draft = ref({
    ...period,
    temporal_type: 'weekly' as const,
    week: 54,
    name: 'Visits',
    description: '',
    target: 1,
  });
  const state = scope.run(() => useGoalCreation(draft))!;
  let requested = false;
  globalThis.fetch = stubFetch(async () => {
    requested = true;
    return Response.json({});
  });
  expect(await state.submit({ type: 'location', aggregation: 'count' })).toBe(false);
  expect(state.errors.value.week).toBeTruthy();
  expect(requested).toBe(false);
});
