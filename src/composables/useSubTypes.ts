import { computed, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue';
import type { CategoryType } from '../stores/types';

export function useSubTypes(
  types: MaybeRefOrGetter<readonly Pick<CategoryType, 'id' | 'sub_types'>[]>,
  typeId: Ref<number | null>,
  subTypeId: Ref<number | null>
) {
  watch(
    typeId,
    () => {
      subTypeId.value = null;
    },
    { flush: 'sync' }
  );
  return computed(() => toValue(types).find((type) => type.id === typeId.value)?.sub_types ?? []);
}
