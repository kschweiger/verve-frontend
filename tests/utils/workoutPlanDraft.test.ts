import { expect, test } from 'bun:test';
import { draftEntries, planChanges, serializeEntries } from '../../src/utils/workoutPlanDraft';

const plan = {
  id: 'p',
  name: 'Plan',
  entries: [{ id: 1, exercise_id: 'e', sets: 3, repetitions: null, weight: 0 }],
};
test('blank targets become null while zero weight is preserved', () => {
  const draft = draftEntries(plan.entries);
  draft[0]!.sets = '';
  expect(serializeEntries(draft)).toEqual([
    { exercise_id: 'e', sets: null, repetitions: null, weight: 0 },
  ]);
});
test('unchanged entries are omitted and removing all entries sends an empty array', () => {
  expect(planChanges(plan, 'Renamed', draftEntries(plan.entries))).toEqual({ name: 'Renamed' });
  expect(planChanges(plan, 'Plan', [])).toEqual({ entries: [] });
});
