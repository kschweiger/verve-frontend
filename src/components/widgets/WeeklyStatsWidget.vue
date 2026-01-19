<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { useWeeklyStore } from '@/stores/weekly';
import { useTypeStore } from '@/stores/types';
import { formatDuration } from '@/utils/datetime';
import WeeklyBarChart from '@/components/charts/WeeklyBarChart.vue';
import SubTypePieChart from '@/components/charts/SubTypePieChart.vue';
import { CHART_COLORS, CHART_HOVER_COLORS, VERVE_COLORS } from '@/utils/colors'; // <--- Import VERVE_COLORS

// Get store instances
const weeklyStore = useWeeklyStore();
const typeStore = useTypeStore();

// --- LOCAL UI STATE ---
const selectedActivityTypeId = ref<number | null>(null);
const selectedMetric = ref<'distance' | 'duration' | 'elevation_gain'>('distance');
const currentDate = ref(new Date());

// --- COMPUTED PROPERTIES ---
const selectedMetricTotal = computed(() => {
  const stats = weeklyStore.weeklyData;
  const metric = selectedMetric.value;
  if (!stats || !stats[metric]) return { value: 0, unit: '' };

  const total = stats[metric].total;

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
      backgroundColor: VERVE_COLORS.orange,
      borderRadius: 6,
      barPercentage: 0.6,
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
      borderWidth: 0, // Cleaner pie
      data: Object.values(data),
    }],
  };
});

// --- METHODS ---
const goToPreviousWeek = () => currentDate.value = new Date(currentDate.value.setDate(currentDate.value.getDate() - 7));
const goToNextWeek = () => currentDate.value = new Date(currentDate.value.setDate(currentDate.value.getDate() + 7));

// --- WATCHERS ---
watch([weekAndYear, selectedActivityTypeId], ([newWeek, newType]) => {
  if (newType) {
    weeklyStore.fetchWeeklyStats(newWeek.year, newWeek.week, newType);
  }
}, { immediate: true });

watch(() => typeStore.activityTypes, (newTypes) => {
  if (newTypes.length > 0 && newTypes[0] && !selectedActivityTypeId.value) {
    selectedActivityTypeId.value = newTypes[0].id;
  }
});

onMounted(() => typeStore.fetchActivityTypes());
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-verve-medium/30 p-6 col-span-full">
    <h3 class="text-xl font-bold text-verve-brown mb-6">Weekly Activity</h3>

    <!-- CONTROLS -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <!-- Activity Type -->
      <select v-model="selectedActivityTypeId"
        class="w-full border-verve-medium rounded-xl text-sm py-2.5 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white">
        <option v-for="t in typeStore.activityTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>

      <!-- Metric Selector -->
      <select v-model="selectedMetric"
        class="w-full border-verve-medium rounded-xl text-sm py-2.5 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white">
        <option value="distance">Distance</option>
        <option value="duration">Duration</option>
        <option value="elevation_gain">Elevation Gain</option>
      </select>

      <!-- Week Navigation -->
      <div class="flex items-center justify-between bg-verve-light/30 border border-verve-medium/20 p-1 rounded-xl">
        <button @click="goToPreviousWeek"
          class="p-1.5 hover:bg-white rounded-lg text-verve-brown/60 hover:text-verve-brown transition-colors shadow-sm">&lt;</button>
        <p class="text-sm font-bold text-verve-brown">Week {{ weekAndYear.week }}, <span
            class="font-normal opacity-60">{{ weekAndYear.year }}</span></p>
        <button @click="goToNextWeek"
          class="p-1.5 hover:bg-white rounded-lg text-verve-brown/60 hover:text-verve-brown transition-colors shadow-sm">&gt;</button>
      </div>
    </div>

    <!-- CHARTS & DATA -->
    <div v-if="weeklyStore.isLoading" class="text-center py-16 text-verve-brown/60">
      <span class="animate-pulse">Loading stats...</span>
    </div>

    <div v-else-if="weeklyStore.error"
      class="text-center py-16 text-red-600 bg-red-50 rounded-xl border border-red-100">
      {{ weeklyStore.error }}
    </div>

    <div v-else-if="weeklyStore.weeklyData" class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">

      <!-- Bar Chart & Total Display -->
      <div class="lg:col-span-2">
        <div class="mb-4 flex items-baseline">
          <span class="text-4xl font-bold text-verve-orange tracking-tight mr-1">{{ selectedMetricTotal.value }}</span>
          <span v-if="selectedMetricTotal.unit" class="text-lg font-medium text-verve-brown/60">{{
            selectedMetricTotal.unit }}</span>
          <span class="ml-3 text-xs font-bold text-verve-brown/30 uppercase tracking-widest mb-1">this week</span>
        </div>
        <div class="h-64">
          <WeeklyBarChart :chart-data="barChartData" />
        </div>
      </div>

      <!-- Pie Chart -->
      <div class="h-64 lg:border-l border-verve-medium/20 lg:pl-8 flex flex-col justify-center">
        <p class="text-xs font-bold text-verve-brown/40 uppercase tracking-wider mb-2 text-center lg:text-left">
          Breakdown</p>
        <div class="h-56">
          <SubTypePieChart :chart-data="pieChartData" />
        </div>
      </div>

    </div>
  </div>
</template>
