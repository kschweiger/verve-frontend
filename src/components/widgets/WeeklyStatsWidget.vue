<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { useWeeklyStore } from '@/stores/weekly';
import { useTypeStore } from '@/stores/types';
import { formatDuration } from '@/utils/datetime';
import WeeklyBarChart from '@/components/charts/WeeklyBarChart.vue';
import SubTypePieChart from '@/components/charts/SubTypePieChart.vue';
import { CHART_COLORS, CHART_HOVER_COLORS } from '@/utils/colors';

// Get store instances
const weeklyStore = useWeeklyStore();
const typeStore = useTypeStore();

// --- LOCAL UI STATE ---
const selectedActivityTypeId = ref<number | null>(null);
const selectedMetric = ref<'distance' | 'duration' | 'elevation_gain'>('distance');
const currentDate = ref(new Date()); // Source of truth for the current week

// --- COMPUTED PROPERTIES ---
const selectedMetricTotal = computed(() => {
  const stats = weeklyStore.weeklyData;
  const metric = selectedMetric.value;
  if (!stats || !stats[metric]) return { value: 0, unit: '' };

  const total = stats[metric].total;

  // Return the value and its unit for easy display
  switch (metric) {
    case 'distance':
      return { value: total.toFixed(0), unit: 'km' };
    case 'duration':
      return { value: formatDuration(total), unit: '' };
    case 'elevation_gain':
      return { value: total.toFixed(0), unit: 'm gain' };
    default:
      return { value: 0, unit: '' };
  }
});



// Calculate week/year from the current date
const weekAndYear = computed(() => {
  const date = new Date(currentDate.value.valueOf());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  const week = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return { week, year: date.getFullYear() };
});

// Format data for the bar chart
const barChartData = computed(() => {
  const data = weeklyStore.weeklyData?.[selectedMetric.value]?.per_day;
  if (!data) return { labels: [], datasets: [] };
  return {
    labels: Object.keys(data).map(d => new Date(d).toLocaleDateString(undefined, { weekday: 'short' })),
    datasets: [{
      backgroundColor: '#4f46e5',
      data: Object.values(data).map(val => val ?? 0),
    }],
  };
});

// Format data for the pie chart
const pieChartData = computed(() => {
  const data = weeklyStore.weeklyData?.[selectedMetric.value]?.pie_data;
  const primaryType = typeStore.activityTypes.find(t => t.id === selectedActivityTypeId.value);
  if (!data || !primaryType) return { labels: [], datasets: [] };

  const labels = Object.keys(data).map(subTypeIdStr => {
    const subType = primaryType.sub_types.find(st => st.id === parseInt(subTypeIdStr));
    return subType?.name ?? `Sub-Type #${subTypeIdStr}`;
  });

  return {
    labels,
    datasets: [{
      backgroundColor: CHART_COLORS,
      hoverBackgroundColor: CHART_HOVER_COLORS,

      data: Object.values(data),
    }],
  };
});

// --- METHODS ---
const goToPreviousWeek = () => currentDate.value = new Date(currentDate.value.setDate(currentDate.value.getDate() - 7));
const goToNextWeek = () => currentDate.value = new Date(currentDate.value.setDate(currentDate.value.getDate() + 7));

// --- WATCHERS ---
// Fetch data whenever the week or selected type changes
watch([weekAndYear, selectedActivityTypeId], ([newWeek, newType]) => {
  if (newType) {
    weeklyStore.fetchWeeklyStats(newWeek.year, newWeek.week, newType);
  }
}, { immediate: true });

// Set a default activity type once the types are loaded
watch(() => typeStore.activityTypes, (newTypes) => {
  if (newTypes.length > 0 && newTypes[0] && !selectedActivityTypeId.value) {
    selectedActivityTypeId.value = newTypes[0].id;
  }
});

onMounted(() => typeStore.fetchActivityTypes());
</script>

<template>
  <div class="bg-white rounded-lg shadow-md p-6 col-span-full">
    <h3 class="text-xl font-bold text-gray-800 mb-4">Weekly Activity</h3>

    <!-- CONTROLS -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <!-- Activity Type -->
      <select v-model="selectedActivityTypeId" class="w-full border-gray-300 rounded-md">
        <option v-for="t in typeStore.activityTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>
      <!-- Metric Selector -->
      <select v-model="selectedMetric" class="w-full border-gray-300 rounded-md">
        <option value="distance">Distance</option>
        <option value="duration">Duration</option>
        <option value="elevation_gain">Elevation Gain</option>
      </select>
      <!-- Week Navigation -->
      <div class="flex items-center justify-between bg-gray-50 p-1 rounded-md">
        <button @click="goToPreviousWeek" class="px-3 py-1 rounded hover:bg-gray-200">&lt;</button>
        <p class="text-sm font-medium">Week {{ weekAndYear.week }}, {{ weekAndYear.year }}</p>
        <button @click="goToNextWeek" class="px-3 py-1 rounded hover:bg-gray-200">&gt;</button>
      </div>
    </div>

    <!-- CHARTS & DATA -->
    <div v-if="weeklyStore.isLoading" class="text-center py-16">Loading...</div>
    <div v-else-if="weeklyStore.error" class="text-center py-16 text-red-500">{{ weeklyStore.error }}</div>
    <div v-else-if="weeklyStore.weeklyData" class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
      <!-- Bar Chart & Total Display -->
      <div class="lg:col-span-2">
        <!-- --- NEW: Display the total above the chart --- -->
        <div class="mb-2">
          <span class="text-3xl font-bold text-gray-800">{{ selectedMetricTotal.value }}</span>
          <span v-if="selectedMetricTotal.unit" class="ml-1 text-gray-500">{{ selectedMetricTotal.unit }}</span>
          <span class="ml-2 text-sm text-gray-500">this week</span>
        </div>
        <div class="h-56"> <!-- Adjusted height slightly to make room for the total -->
          <WeeklyBarChart :chart-data="barChartData" />
        </div>
      </div>
      <!-- Pie Chart -->
      <div class="h-64">
        <SubTypePieChart :chart-data="pieChartData" />
      </div>
    </div>
  </div>
</template>
