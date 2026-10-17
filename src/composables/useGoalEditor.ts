import { onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { useGoalStore, type Goal } from '../stores/goals';
import { useAccountSession } from './useAccountSession';

export function useGoalEditor(goal: MaybeRefOrGetter<Goal>) {
  const store = useGoalStore();
  const readFields = () => {
    const value = toValue(goal);
    return { name: value.name, description: value.description ?? '', target: value.target };
  };
  const form = ref(readFields());
  let saved = readFields();
  const isSaving = ref(false);
  const error = ref<string | null>(null);
  let active = true;
  const captureSession = useAccountSession(() => {
    form.value = { name: '', description: '', target: 0 };
    isSaving.value = false;
    error.value = null;
  });
  watch(
    () => toValue(goal).id,
    () => {
      form.value = readFields();
      saved = readFields();
      isSaving.value = false;
      error.value = null;
    },
    { flush: 'sync' }
  );
  onScopeDispose(() => {
    active = false;
  });

  async function save(): Promise<boolean> {
    if (isSaving.value || !active) return false;
    const isCurrentSession = captureSession();
    const id = toValue(goal).id;
    const isCurrent = () => active && isCurrentSession() && toValue(goal).id === id;
    const changes = { ...form.value };
    isSaving.value = true;
    error.value = null;
    try {
      for (const attribute of ['name', 'description', 'target'] as const) {
        if (changes[attribute] === saved[attribute]) continue;
        const success = await store.updateGoal(id, attribute, changes[attribute]);
        if (!isCurrent()) return false;
        if (!success) {
          error.value = store.updateError ?? 'Failed to update goal.';
          return false;
        }
        saved = { ...saved, [attribute]: changes[attribute] };
      }
      return true;
    } catch (cause: unknown) {
      if (isCurrent())
        error.value = cause instanceof Error ? cause.message : 'Failed to update goal.';
      return false;
    } finally {
      if (isCurrent()) isSaving.value = false;
    }
  }
  return { form, isSaving, error, save };
}
