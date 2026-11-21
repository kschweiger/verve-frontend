import type { PlanEntry, PlanEntryInput, PlanUpdate, WorkoutPlan } from '@/services/workoutPlans';

export interface DraftEntry {
  key: number;
  exercise_id: string;
  sets: number | '';
  repetitions: number | '';
  weight: number | '';
}
let nextKey = 0;
export function newDraftEntry(exerciseId: string): DraftEntry {
  return { key: ++nextKey, exercise_id: exerciseId, sets: '', repetitions: '', weight: '' };
}
export function draftEntries(entries: PlanEntry[]): DraftEntry[] {
  return entries.map((entry) => ({
    ...newDraftEntry(entry.exercise_id),
    sets: entry.sets ?? '',
    repetitions: entry.repetitions ?? '',
    weight: entry.weight ?? '',
  }));
}
export function serializeEntries(entries: DraftEntry[]): PlanEntryInput[] {
  return entries.map(({ exercise_id, sets, repetitions, weight }) => ({
    exercise_id,
    sets: sets === '' ? null : sets,
    repetitions: repetitions === '' ? null : repetitions,
    weight: weight === '' ? null : weight,
  }));
}
export function planChanges(plan: WorkoutPlan, name: string, entries: DraftEntry[]): PlanUpdate {
  const result: PlanUpdate = {};
  if (name !== plan.name) result.name = name;
  const updated = serializeEntries(entries);
  if (JSON.stringify(updated) !== JSON.stringify(serializeEntries(draftEntries(plan.entries)))) {
    result.entries = updated;
  }
  return result;
}
