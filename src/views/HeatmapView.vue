<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useHeatmapStore } from '@/stores/heatmap';
import type { ActivityFilters } from '@/stores/activity';
import ActivityFilter from '@/components/ActivityFilter.vue';
import HeatmapLayer from '@/components/HeatmapLayer.vue';

const heatmapStore = useHeatmapStore();

const initialFilters = ref<ActivityFilters>({
  year: new Date().getFullYear()
});

const hasData = computed(() => heatmapStore.heatmapPoints.length > 0);
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
  <div class="p-4 sm:p-6 lg:p-8 bg-verve-medium min-h-[calc(100vh-64px)]">
    <div class="max-w-7xl mx-auto space-y-6">

      <!-- Header -->
      <div>
        <h1 class="text-3xl font-bold text-verve-brown">Activity Heatmap</h1>
        <p class="mt-2 text-verve-brown/60">A global view of all your recorded activities.</p>
      </div>

      <!-- Filter Component -->
      <ActivityFilter :initial-filters="initialFilters" @filter-change="heatmapStore.fetchHeatmapData" />

      <!-- Loading State -->
      <div v-if="heatmapStore.isLoading" class="text-center py-12 text-verve-brown/60">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-verve-brown mx-auto mb-3"></div>
        <p>Generating heatmap...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="heatmapStore.error" class="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 shadow-sm">
        <p>Error: {{ heatmapStore.error }}</p>
      </div>

      <!-- The Heatmap Component -->
      <div v-else
        class="relative w-full h-[600px] bg-white rounded-xl shadow-sm border border-verve-medium/30 overflow-hidden">
        <!-- Map -->
        <HeatmapLayer v-if="hasData" :points="heatmapStore.heatmapPoints" :center="heatmapStore.heatmapCenter" />

        <!-- Empty State -->
        <div v-else class="flex flex-col items-center justify-center h-full text-verve-brown/40 italic bg-white">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24"
            stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No activity data found for the selected filters.</p>
        </div>
      </div>
    </div>
  </div>
</template>
