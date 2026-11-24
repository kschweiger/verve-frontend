<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTypeStore } from '@/stores/types';
import QuickAddBase from './quick-add/QuickAddBase.vue';
import { quickAddDefinitions, type QuickAddDefinition } from './quick-add/definitions';

const typeStore = useTypeStore();
const { t } = useI18n();

interface ResolvedQuickAdd extends QuickAddDefinition {
  resolvedTypeId: number;
  resolvedSubTypeId: number;
}

const activeConfigs = computed<ResolvedQuickAdd[]>(() => {
  return quickAddDefinitions
    .map((def) => {
      const type = typeStore.englishActivityTypes.find((t) => t.name === def.typeName);
      const subType = type?.sub_types.find((sub) => sub.name === def.subTypeName);
      if (!type || !subType) return null;
      return {
        ...def,
        resolvedTypeId: type.id,
        resolvedSubTypeId: subType.id,
      };
    })
    .filter((c): c is ResolvedQuickAdd => c !== null);
});

onMounted(() => {
  void typeStore.fetchActivityTypes();
  void typeStore.fetchEnglishActivityTypes();
});
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-verve-medium/30 p-6 h-full">
    <h3 class="text-xl font-bold text-verve-brown mb-4">{{ t('manualEntry.quickAdd') }}</h3>

    <!-- Loading State -->
    <div
      v-if="activeConfigs.length === 0"
      class="text-verve-brown/60 text-sm animate-pulse py-4 text-center"
    >
      {{ t('manualEntry.loadingTypes') }}
    </div>

    <div v-else class="space-y-3">
      <QuickAddBase
        v-for="cfg in activeConfigs"
        :key="cfg.key"
        :title="t(`manualEntry.presets.${cfg.key}`)"
        :type-id="cfg.resolvedTypeId"
        :sub-type-id="cfg.resolvedSubTypeId"
        :distance-mode="cfg.distanceMode"
      />
    </div>
  </div>
</template>
