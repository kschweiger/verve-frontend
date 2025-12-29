<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useTypeStore } from '@/stores/types';
import QuickAddBase from './quick-add/QuickAddBase.vue';

const typeStore = useTypeStore();

interface QuickAddDefinition {
  name: string;
  typeName: string;
  subTypeName: string;
  distanceMode: 'REQUIRED' | 'OPTIONAL' | 'NOT_APPLICABLE';
}

// Static definitions (no resolved IDs here)
const definitions: QuickAddDefinition[] = [
  {
    name: 'Elliptical',
    typeName: 'Indoor Cardio',
    subTypeName: 'Elliptical',
    distanceMode: 'OPTIONAL'
  },
  {
    name: 'Weight Training',
    typeName: 'Strength Training',
    subTypeName: 'Weight Training',
    distanceMode: 'NOT_APPLICABLE'
  },
  {
    name: 'Yoga',
    typeName: 'Fitness & Flexibility',
    subTypeName: 'Yoga',
    distanceMode: 'NOT_APPLICABLE'
  }
];

const activeConfigs = computed(() => {
  if (typeStore.activityTypes.length === 0) return [];

  return definitions.map(def => {
    const type = typeStore.activityTypes.find(t => t.name === def.typeName);
    if (!type) return null;

    const sub = type.sub_types.find(st => st.name === def.subTypeName);
    // Only return config if we found the IDs
    if (type && sub) {
      return {
        ...def,
        resolvedTypeId: type.id,
        resolvedSubTypeId: sub.id
      };
    }
    return null;
  }).filter(c => c !== null) as (QuickAddDefinition & { resolvedTypeId: number, resolvedSubTypeId: number })[];
});

onMounted(() => {
  // Trigger the fetch. We don't need to await it because the computed prop above
  // will reactively update the UI whenever the data arrives.
  typeStore.fetchActivityTypes();
});
</script>

<template>
  <div class="bg-white rounded-lg shadow-md p-6 h-full">
    <h3 class="text-xl font-bold text-gray-800 mb-4">Quick Add</h3>

    <!-- Loading State: Show if we have no resolved configs yet -->
    <div v-if="activeConfigs.length === 0" class="text-gray-400 text-sm animate-pulse">
      Loading types...
    </div>

    <div v-else class="space-y-3">
      <QuickAddBase v-for="(cfg, idx) in activeConfigs" :key="idx" :title="cfg.name" :type-id="cfg.resolvedTypeId"
        :sub-type-id="cfg.resolvedSubTypeId" :distance-mode="cfg.distanceMode" />
    </div>
  </div>
</template>
