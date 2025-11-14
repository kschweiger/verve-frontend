<script setup lang="ts">
import { onMounted } from 'vue';
import { useHighlightStore } from '@/stores/highlights';

const props = defineProps<{ activityId: string }>();
const highlightStore = useHighlightStore();

// Helper to format the metric name for display
const formatMetricName = (metric: string) => {
  return metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const rankColors = {
  1: 'text-amber-400', // Gold
  2: 'text-gray-400',  // Silver
  3: 'text-orange-600' // Bronze
};

onMounted(() => {
  highlightStore.fetchHighlightsForActivity(props.activityId);
});
</script>
<template>
  <!-- This component will only render if there are highlights -->
  <div v-if="highlightStore.activityHighlights.length > 0" class="bg-white p-6 rounded-lg shadow-md">
    <h3 class="text-xl font-bold text-gray-800 mb-4">Achievements</h3>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      <div v-for="highlight in highlightStore.activityHighlights" :key="`${highlight.metric}-${highlight.scope}`"
        class="bg-gray-50 p-4 rounded-lg text-center">
        <p class="font-bold text-lg" :class="rankColors[highlight.rank]">
          #{{ highlight.rank }} Place
        </p>
        <p class="text-gray-800 font-semibold">{{ formatMetricName(highlight.metric) }}</p>
        <p class="text-sm text-gray-500">
          {{ highlight.scope === 'yearly' ? `For ${highlight.year}` : 'All Time' }}
        </p>
      </div>
    </div>
  </div>
</template>
