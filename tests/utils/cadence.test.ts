import { afterEach, beforeEach, expect, test } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope, nextTick, ref, type EffectScope } from 'vue';
import { useCadence, formatCadence } from '../../src/composables/useCadence';
import { useTypeStore } from '../../src/stores/types';
import { stubFetch } from '../helpers/fetch';

const originalFetch = globalThis.fetch;
const scopes: EffectScope[] = [];
const types = [
  {
    id: 90,
    name: 'Foot Sports',
    sub_types: [
      { id: 91, name: 'Run' },
      { id: 92, name: 'Trail Run' },
      { id: 93, name: 'Treadmill' },
      { id: 94, name: 'Walk' },
    ],
  },
  { id: 50, name: 'Cycling', sub_types: [] },
  { id: 20, name: 'Indoor Cardio', sub_types: [{ id: 91, name: 'Run' }] },
];
beforeEach(() => {
  setActivePinia(createPinia());
  useTypeStore().activityTypes = structuredClone(types);
});
afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop());
  globalThis.fetch = originalFetch;
});
function inScope<T>(setup: () => T): T {
  const scope = effectScope();
  scopes.push(scope);
  return scope.run(setup)!;
}
test.each([
  [90, 91, 'steps/min'],
  [90, 92, 'steps/min'],
  [90, 93, 'steps/min'],
  [90, 94, 'counts/min'],
  [90, null, 'counts/min'],
  [90, 999, 'counts/min'],
  [50, null, 'RPM'],
  [20, 91, 'counts/min'],
  [999, 91, 'counts/min'],
] as const)('cadence units for type %s and subtype %s are %s', (typeId, subTypeId, unit) => {
  const cadenceUnit = inScope(() => useCadence({ type_id: typeId, sub_type_id: subTypeId }));
  expect(cadenceUnit.value).toBe(unit);
});
test('classification edits update cadence units reactively', () => {
  const activity = ref({ type_id: 90, sub_type_id: 91 as number | null });
  const unit = inScope(() => useCadence(activity));
  expect(unit.value).toBe('steps/min');
  activity.value = { type_id: 50, sub_type_id: null };
  expect(unit.value).toBe('RPM');
});
test('a delayed type catalog replaces the generic cadence unit', async () => {
  useTypeStore().activityTypes = [];
  let complete!: (response: Response) => void;
  globalThis.fetch = stubFetch(
    () =>
      new Promise<Response>((resolve) => {
        complete = resolve;
      })
  );
  const unit = inScope(() => useCadence({ type_id: 90, sub_type_id: 91 }));
  expect(unit.value).toBe('counts/min');
  complete(Response.json({ data: types }));
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await nextTick();
  expect(unit.value).toBe('steps/min');
});
test('an absent activity uses generic cadence units', () => {
  expect(inScope(() => useCadence(null)).value).toBe('counts/min');
});
test.each([
  [171, '171 steps/min'],
  [171.5, '171.5 steps/min'],
  [171.567, '171.6 steps/min'],
  [0, '0 steps/min'],
  [null, '-'],
] as const)('formats running cadence %s without scaling', (value, expected) => {
  expect(formatCadence(value, 'steps/min')).toBe(expected);
});
test('fractional cycling cadence uses RPM', () => {
  expect(formatCadence(85.5, 'RPM')).toBe('85.5 RPM');
});
