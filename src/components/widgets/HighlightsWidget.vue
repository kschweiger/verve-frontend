<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useHighlightStore } from '@/stores/highlights';
import { useActivityStore, type Activity } from '@/stores/activity'; // Need this to show activity details
import { fetchActivitySummary } from '@/services/api'; // Reuse our service
import { formatDuration, parseISODuration } from '@/utils/datetime';

const highlightStore = useHighlightStore();

// --- LOCAL STATE ---
const selectedMetric = ref<string>('distance');
const selectedScope = ref<'yearly' | 'lifetime'>('yearly');
const selectedYear = ref(new Date().getFullYear());
// This will hold the detailed activity info for our top 3 highlights
const highlightedActivities = ref<(Activity & { rank: number; value: number })[]>([]);

// --- WATCHERS ---
// This watcher combines all our filters and triggers the main data fetch
watch([selectedMetric, selectedScope, selectedYear], async ([metric, scope, year]) => {
  const yearToFetch = scope === 'yearly' ? year : null;
  await highlightStore.fetchDashboardHighlights(metric, yearToFetch);

  // After fetching highlights, we need to fetch the details for each activity
  highlightedActivities.value = []; // Clear previous
  const activityPromises = highlightStore.dashboardHighlights.map(h => fetchActivitySummary(h.activity_id));
  const activities = await Promise.all(activityPromises);

  // Combine the activity details with the rank from the highlight
  highlightedActivities.value = activities.map(act => {
    const highlight = highlightStore.dashboardHighlights.find(h => h.activity_id === act.id);
    return {
      ...act,
      rank: highlight!.rank,
      value: highlight!.value, // <-- Pass the value through
    };
  }).sort((a, b) => a.rank - b.rank);

}, { immediate: true });

onMounted(() => {
  highlightStore.fetchAvailableMetrics();
});

const formatValue = (value: number | string, metric: string): string => {
  if (metric.includes('duration') && typeof value === 'string') {
    console.log(value)
    return formatDuration(parseISODuration(value)); // e.g., "1h 30m 15s"
  }

  const numValue = typeof value === 'number' ? value : 0;

  if (metric.includes('distance')) {
    return `${(numValue).toFixed(2)} km`;
  }
  if (metric.includes('elevation')) {
    return `${numValue.toFixed(0)} m`;
  }
  if (metric.includes('speed')) {
    return `${numValue.toFixed(1)} km/h`;
  }
  if (metric.includes('power')) {
    return `${numValue.toFixed(0)} W`;
  }
  return numValue.toString();// Fallback
};

const rankIcon = {
  1: '🥇', // Gold
  2: '🥈', // Silver
  3: '🥉', // Bronze
};
</script>

<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <h3 class="text-xl font-bold text-gray-800 mb-4">Personal Records</h3>
    <!-- CONTROLS -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <select v-model="selectedMetric" class="w-full border-gray-300 rounded-md">
        <option v-for="m in highlightStore.availableMetrics" :key="m" :value="m">{{ m.replace(/_/g, ' ') }}</option>
      </select>
      <select v-model="selectedScope" class="w-full border-gray-300 rounded-md">
        <option value="yearly">This Year</option>
        <option value="lifetime">All Time</option>
      </select>
      <select v-if="selectedScope === 'yearly'" v-model="selectedYear" class="w-full border-gray-300 rounded-md">
        <option v-for="y in 5" :key="y" :value="new Date().getFullYear() - y + 1">{{ new Date().getFullYear() - y + 1 }}
        </option>
      </select>
    </div>

    <!-- RESULTS -->
    <div v-if="highlightStore.isLoading" class="text-center py-8">Loading records...</div>
    <div v-else-if="highlightedActivities.length > 0" class="space-y-3">
      <!-- --- MODIFIED: The v-for loop now includes the value --- -->
      <router-link v-for="activity in highlightedActivities" :key="activity.id"
        :to="{ name: 'activity-detail', params: { id: activity.id } }" class="block p-3 rounded-md hover:bg-gray-50">
        <div class="flex items-center justify-between">
          <!-- Left side: Icon and Activity Info -->
          <div class="flex items-center space-x-4">
            <span class="text-2xl">{{ rankIcon[activity.rank] }}</span>
            <div>
              <p class="font-semibold text-gray-800">{{ activity.name || new Date(activity.start).toLocaleDateString()
                }}</p>
              <p class="text-sm text-gray-500">{{ new Date(activity.start).toLocaleDateString() }}</p>
            </div>
          </div>
          <!-- Right side: The record value -->
          <div class="text-right">
            <p class="text-lg font-bold text-indigo-600">
              {{ formatValue(activity.value, selectedMetric) }}
            </p>
          </div>
        </div>
      </router-link>
    </div>
    <div v-else class="text-center py-8 text-gray-500">No records found for this selection.</div>
  </div>
</template>
