<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useHeatmapStore } from '@/stores/heatmap';
import type { ActivityFilters } from '@/stores/activity';
import ActivityFilter from '@/components/ActivityFilter.vue';
import HeatmapLayer from '@/components/HeatmapLayer.vue';

const heatmapStore = useHeatmapStore();

const initialFilters = ref<ActivityFilters>({
  year: new Date().getFullYear()
});
// Initial data load when the page is visited
onMounted(() => {
  // If data is already loaded, don't re-fetch
  if (heatmapStore.heatmapPoints.length > 0) return;

  // Load with the current year by default
  const currentYear = new Date().getFullYear();
  heatmapStore.fetchHeatmapData({ year: currentYear });
});
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8">
    <div class="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Activity Heatmap</h1>
        <p class="mt-1 text-gray-500">A global view of all your recorded activities.</p>
      </div>

      <!-- Reuse the filter component! -->
      <ActivityFilter :initial-filters="initialFilters" @filter-change="heatmapStore.fetchHeatmapData" />

      <!-- Loading and Error states -->
      <div v-if="heatmapStore.isLoading" class="text-center py-10">
        <p class="text-gray-500">Generating heatmap...</p>
      </div>
      <div v-else-if="heatmapStore.error" class="p-4 bg-red-100 text-red-700 rounded-md">
        <p>Error: {{ heatmapStore.error }}</p>
      </div>

      <!-- The Heatmap Component -->
      <HeatmapLayer v-else :points="heatmapStore.heatmapPoints" :center="heatmapStore.heatmapCenter" />
    </div>
  </div>
</template>
