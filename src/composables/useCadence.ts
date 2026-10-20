import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import type { Activity } from '../stores/activity';
import { useTypeStore } from '../stores/types';

export type CadenceUnit = 'steps/min' | 'RPM' | 'counts/min';
type ActivityClassification = Pick<Activity, 'type_id' | 'sub_type_id'>;

export function useCadence(activity: MaybeRefOrGetter<ActivityClassification | null>) {
  const typeStore = useTypeStore();
  void typeStore.fetchActivityTypes();

  return computed<CadenceUnit>(() => {
    const classification = toValue(activity);
    const type = typeStore.activityTypes.find((item) => item.id === classification?.type_id);
    if (type?.name === 'Cycling') return 'RPM';
    if (type?.name === 'Foot Sports') {
      const subType = type.sub_types.find((item) => item.id === classification?.sub_type_id);
      if (subType && ['Run', 'Trail Run', 'Treadmill'].includes(subType.name)) return 'steps/min';
    }
    return 'counts/min';
  });
}

export function formatCadenceValue(value: number): string {
  return Number(value.toFixed(1)).toString();
}

export function formatCadence(value: number | null, unit: CadenceUnit): string {
  return value === null ? '-' : `${formatCadenceValue(value)} ${unit}`;
}
