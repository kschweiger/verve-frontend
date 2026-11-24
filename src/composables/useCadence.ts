import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import type { Activity } from '../stores/activity';
import { useTypeStore } from '../stores/types';

export type CadenceUnit = 'steps/min' | 'RPM' | 'counts/min';
type ActivityClassification = Pick<Activity, 'type_id' | 'sub_type_id'>;

export function useCadence(activity: MaybeRefOrGetter<ActivityClassification | null>) {
  const typeStore = useTypeStore();
  if (typeStore.englishActivityTypes.length === 0) void typeStore.fetchEnglishActivityTypes();

  return computed<CadenceUnit>(() => {
    const classification = toValue(activity);
    const type = typeStore.englishActivityTypes.find((item) => item.id === classification?.type_id);
    if (type?.name === 'Cycling') return 'RPM';
    if (type?.name === 'Foot Sports') {
      const subType = type.sub_types.find((item) => item.id === classification?.sub_type_id);
      if (subType && ['Run', 'Trail Run', 'Treadmill'].includes(subType.name)) return 'steps/min';
    }
    return 'counts/min';
  });
}

export function formatCadenceValue(value: number, locale?: string): string {
  const rounded = Number(value.toFixed(1));
  return locale ? rounded.toLocaleString(locale, { maximumFractionDigits: 1 }) : rounded.toString();
}

export function formatCadence(value: number | null, unit: CadenceUnit, locale?: string): string {
  return value === null ? '-' : `${formatCadenceValue(value, locale)} ${unit}`;
}
