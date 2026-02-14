<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useTypeStore } from '@/stores/types';
import QuickAddBase from './quick-add/QuickAddBase.vue';

const typeStore = useTypeStore();

interface QuickAddDefinition {
  name: string;
  typeName: string;
  subTypeName: string;
  distanceMode: 'REQUIRED' | 'OPTIONAL' | 'NOT_APPLICABLE';
}

interface ResolvedQuickAdd extends QuickAddDefinition {
  resolvedTypeId: number;
  resolvedSubTypeId: number;
}

// Static definitions
const definitions: QuickAddDefinition[] = [
  {
    name: 'Elliptical',
    typeName: 'Indoor Cardio',
    subTypeName: 'Elliptical',
    distanceMode: 'OPTIONAL',
  },
  {
    name: 'Weight Training',
    typeName: 'Strength Training',
    subTypeName: 'Weight Training',
    distanceMode: 'NOT_APPLICABLE',
  },
  {
    name: 'Yoga',
    typeName: 'Fitness & Flexibility',
    subTypeName: 'Yoga',
    distanceMode: 'NOT_APPLICABLE',
  },
];

const activeConfigs = computed<ResolvedQuickAdd[]>(() => {
  if (typeStore.activityTypes.length === 0) return [];

  return definitions
    .map((def) => {
      const type = typeStore.activityTypes.find((t) => t.name === def.typeName);
      if (!type) return null;

      const sub = type.sub_types.find((st) => st.name === def.subTypeName);

      if (type && sub) {
        return {
          ...def,
          resolvedTypeId: type.id,
          resolvedSubTypeId: sub.id,
        };
      }
      return null;
    })
    .filter((c): c is ResolvedQuickAdd => c !== null);
});

onMounted(() => {
  typeStore.fetchActivityTypes();
});
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-verve-medium/30 p-6 h-full">
    <h3 class="text-xl font-bold text-verve-brown mb-4">Quick Add</h3>

    <!-- Loading State -->
    <div v-if="activeConfigs.length === 0" class="text-verve-brown/60 text-sm animate-pulse py-4 text-center">
      Loading types...
    </div>

    <div v-else class="space-y-3">
      <QuickAddBase v-for="(cfg, idx) in activeConfigs" :key="idx" :title="cfg.name" :type-id="cfg.resolvedTypeId"
        :sub-type-id="cfg.resolvedSubTypeId" :distance-mode="cfg.distanceMode" />
    </div>
  </div>
</template>
