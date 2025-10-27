<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { useStatisticsStore } from '@/stores/statistics';
import { useTypeStore } from '@/stores/types'; // <-- We need this for the names
import { formatDuration } from '@/utils/datetime';

const statisticsStore = useStatisticsStore();
const typeStore = useTypeStore(); // <-- Get an instance of the type store

const currentYear = new Date().getFullYear();
const selectedYear = ref<number | 'all'>(currentYear);
const availableYears = Array.from({ length: 10 }, (_, i) => currentYear - i);

// --- NEW: A computed property to process and structure the data for display ---
const statsByType = computed(() => {
  const stats = statisticsStore.yearlyStats;
  if (!stats) return []; // Return empty array if no stats are loaded

  // The keys of the 'per_type' object are the type IDs (as strings)
  const typeIds = Object.keys(stats.count.per_type);

  return typeIds.map(typeIdStr => {
    const typeId = parseInt(typeIdStr, 10);

    // Look up the name of the activity type from the typeStore
    const typeInfo = typeStore.activityTypes.find(t => t.id === typeId);
    const name = typeInfo ? typeInfo.name : `Type #${typeId}`;

    return {
      id: typeId,
      name: name,
      distance: stats.distance.per_type[typeId] || 0,
      duration: stats.duration.per_type[typeId] || 0,
      count: stats.count.per_type[typeId] || 0,
    };
  }).sort((a, b) => b.distance - a.distance); // Sort by distance descending
});

watch(selectedYear, (newYear) => {
  statisticsStore.fetchYearlyStats(newYear === 'all' ? null : newYear);
}, { immediate: true });

// Ensure the activity types are loaded so we can display their names
onMounted(() => {
  typeStore.fetchActivityTypes();
});
</script>

<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-bold text-gray-800">Yearly Summary</h3>
      <select v-model="selectedYear" class="block pl-3 pr-8 py-1 text-base border-gray-300 rounded-md">
        <option value="all">All Time</option>
        <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
      </select>
    </div>

    <div v-if="statisticsStore.isLoading" class="text-center text-gray-500 py-8">
      <p>Loading stats...</p>
    </div>
    <div v-else-if="statisticsStore.error" class="text-center text-red-500 py-8">
      <p>{{ statisticsStore.error }}</p>
    </div>

    <!-- NEW: Display a table of stats per type -->
    <div v-else-if="statsByType.length > 0">
      <table class="w-full text-left">
        <thead>
          <tr class="border-b">
            <th class="py-2 font-semibold text-gray-600">Activity Type</th>
            <th class="py-2 font-semibold text-gray-600 text-right">Distance</th>
            <th class="py-2 font-semibold text-gray-600 text-right">Duration</th>
            <th class="py-2 font-semibold text-gray-600 text-right">Count</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="stat in statsByType" :key="stat.id" class="border-b last:border-b-0">
            <td class="py-3 font-medium text-gray-800">{{ stat.name }}</td>
            <td class="py-3 text-gray-700 text-right">{{ stat.distance.toFixed(0) }} km</td>
            <td class="py-3 text-gray-700 text-right">{{ formatDuration(stat.duration) }}</td>
            <td class="py-3 text-gray-700 text-right">{{ stat.count }}</td>
          </tr>
        </tbody>
        <!-- Optional: Add a total row at the bottom -->

        <tfoot v-if="statsByType.length > 1">
          <tr class="border-t-2">
            <td class="pt-3 font-bold text-gray-900">Total</td>
            <td class="pt-3 font-bold text-gray-900 text-right">{{
              statisticsStore.yearlyStats?.distance.total.toFixed(0) }} km</td>
            <td class="pt-3 font-bold text-gray-900 text-right">{{
              formatDuration(statisticsStore.yearlyStats?.duration.total ?? 0) }}</td>
            <td class="pt-3 font-bold text-gray-900 text-right">{{ statisticsStore.yearlyStats?.count.total }}</td>
          </tr>
        </tfoot>

      </table>
    </div>

    <div v-else class="text-center text-gray-500 py-8">
      <p>No activity data found for the selected period.</p>
    </div>
  </div>
</template>
