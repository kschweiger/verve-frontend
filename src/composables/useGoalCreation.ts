import { onScopeDispose, ref, type Ref } from 'vue';
import { useGoalStore, type Goal } from '../stores/goals';
import { goalPeriodParams, type GoalTimeframe } from '../utils/goalTimeframe';
import { useAccountSession } from './useAccountSession';

export interface GoalDraft extends GoalTimeframe {
  name: string;
  description: string;
  target: number;
}
export function useGoalCreation(form: Readonly<Ref<GoalDraft>>) {
  const store = useGoalStore();
  const isSaving = ref(false);
  const error = ref<string | null>(null);
  const errors = ref<Record<string, string>>({});
  let active = true;
  const captureSession = useAccountSession(() => {
    isSaving.value = false;
    error.value = null;
    errors.value = {};
  });
  onScopeDispose(() => {
    active = false;
  });

  async function submit(
    options: Pick<Goal, 'type' | 'aggregation'> & { constraints?: Record<string, unknown> }
  ): Promise<boolean> {
    if (isSaving.value || !active) return false;
    const value = form.value;
    errors.value = {};
    if (!value.name.trim()) errors.value.name = 'Goal name is required.';
    if (!Number.isFinite(value.target) || value.target <= 0)
      errors.value.target = 'Target must be greater than 0.';
    if (
      value.temporal_type === 'weekly' &&
      value.weekly_scope === 'specific_week' &&
      (!Number.isInteger(value.week) || value.week < 1 || value.week > 53)
    )
      errors.value.week = 'Week must be between 1 and 53.';
    if (Object.keys(errors.value).length) return false;

    const isCurrentSession = captureSession();
    const isCurrent = () => active && isCurrentSession();
    isSaving.value = true;
    error.value = null;
    try {
      const success = await store.createGoal({
        name: value.name,
        description: value.description || undefined,
        target: value.target,
        ...goalPeriodParams(value),
        ...options,
      });
      if (!isCurrent()) return false;
      if (!success) error.value = store.creationError ?? 'Failed to create goal.';
      return success;
    } catch (cause: unknown) {
      if (isCurrent())
        error.value = cause instanceof Error ? cause.message : 'Failed to create goal.';
      return false;
    } finally {
      if (isCurrent()) isSaving.value = false;
    }
  }
  return { errors, error, isSaving, submit };
}
