<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStatisticsStore } from '@/stores/statistics';
import { useTypeStore } from '@/stores/types';
import { useActivityStore } from '@/stores/activity';
import { formatDuration } from '@/utils/datetime';
import WeeklyBarChart from '@/components/charts/WeeklyBarChart.vue';
import SubTypePieChart from '@/components/charts/SubTypePieChart.vue';
import { CHART_COLORS, CHART_HOVER_COLORS, VERVE_COLORS } from '@/utils/colors';

const statisticsStore = useStatisticsStore();
const typeStore = useTypeStore();
const activityStore = useActivityStore();
const { locale, t, n } = useI18n();

const selectedActivityTypeId = ref<number | null>(null);
const metrics = ['distance', 'effective_duration', 'duration', 'elevation_gain'] as const;
const selectedMetric = ref<typeof metrics[number]>('distance');
const selectedMetricLabel = computed(() => t(`stats.metrics.${selectedMetric.value}`));
const weekday = computed(() => new Intl.DateTimeFormat(locale.value, { weekday: 'short', timeZone: 'UTC' }));
const wholeNumber = computed(() => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 0 }));
const periodNumber = computed(() => new Intl.NumberFormat(locale.value, { useGrouping: false }));
const currentDate = ref(new Date());

const selectedMetricTotal = computed(() => {
  const stats = statisticsStore.weeklyStats;
  const metric = selectedMetric.value;
  if (!stats || !stats[metric]) return { value: 0, unit: '' };

  const total = stats[metric].total;

  switch (metric) {
    case 'distance':
      return { value: wholeNumber.value.format(total), unit: 'km' };
    case 'effective_duration':
    case 'duration':
      return { value: formatDuration(total, locale.value), unit: '' };
    case 'elevation_gain':
      return { value: wholeNumber.value.format(total), unit: t('stats.week.elevationUnit') };
    default:
      return { value: 0, unit: '' };
  }
});

const weekAndYear = computed(() => {
  const date = new Date(currentDate.value.valueOf());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const week =
    1 +
    Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return { week, year: date.getFullYear() };
});

const barChartData = computed(() => {
  const data = statisticsStore.weeklyStats?.[selectedMetric.value]?.per_day;
  if (!data) return { labels: [], datasets: [] };

  return {
    labels: Object.keys(data).map((date) => weekday.value.format(new Date(date))),
    datasets: [
      {
        label: selectedMetricLabel.value,
        backgroundColor: VERVE_COLORS.orange,
        borderRadius: 6,
        barPercentage: 0.6,
        data: Object.values(data).map((val) => val ?? 0),
      },
    ],
  };
});

const pieChartData = computed(() => {
  const data = statisticsStore.weeklyStats?.[selectedMetric.value]?.pie_data;
  const primaryType = typeStore.activityTypes.find((t) => t.id === selectedActivityTypeId.value);

  if (!data || !primaryType) return { labels: [], datasets: [] };

  const labels = Object.keys(data).map((subTypeIdStr) => {
    const subType = primaryType.sub_types.find((st) => st.id === parseInt(subTypeIdStr));
    return subType?.name ?? t('stats.subTypeFallback', { id: subTypeIdStr });
  });

  const pieColors = [...CHART_COLORS.slice(1), CHART_COLORS[0]];
  const pieHoverColors = [...CHART_HOVER_COLORS.slice(1), CHART_HOVER_COLORS[0]];

  return {
    labels,
    datasets: [
      {
        backgroundColor: pieColors,
        hoverBackgroundColor: pieHoverColors,
        borderWidth: 0,
        data: Object.values(data),
      },
    ],
  };
});

const goToPreviousWeek = () =>
  (currentDate.value = new Date(currentDate.value.setDate(currentDate.value.getDate() - 7)));
const goToNextWeek = () =>
  (currentDate.value = new Date(currentDate.value.setDate(currentDate.value.getDate() + 7)));

// --- WATCHERS ---
watch(
  [weekAndYear, selectedActivityTypeId],
  ([newWeek, newType]) => {
    if (newType) {
      statisticsStore.fetchWeeklyStats(newWeek.year, newWeek.week, newType);
    }
  },
  { immediate: true }
);

watch(() => activityStore.lastUpdate, () => {
  if (selectedActivityTypeId.value) {
    statisticsStore.fetchWeeklyStats(weekAndYear.value.year, weekAndYear.value.week, selectedActivityTypeId.value);
  }
});

watch(
  () => typeStore.activityTypes,
  (newTypes) => {
    if (newTypes.length > 0 && newTypes[0] && !selectedActivityTypeId.value) {
      selectedActivityTypeId.value = newTypes[0].id;
    }
  }
);

onMounted(() => typeStore.fetchActivityTypes());
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-verve-medium/30 p-6 col-span-full">
    <h3 class="text-xl font-bold text-verve-brown mb-6">{{ t('stats.week.title') }}</h3>

    <!-- CONTROLS -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <!-- Activity Type -->
      <select v-model="selectedActivityTypeId" :aria-label="t('stats.activityType')"
        class="w-full border-verve-medium rounded-xl text-sm py-2.5 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white">
        <option v-for="t in typeStore.activityTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>

      <!-- Metric Selector -->
      <select v-model="selectedMetric" :aria-label="t('stats.metric')"
        class="w-full border-verve-medium rounded-xl text-sm py-2.5 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white">
        <option v-for="metric in metrics" :key="metric" :value="metric">{{ t(`stats.metrics.${metric}`) }}</option>
      </select>

      <!-- Week Navigation -->
      <div class="flex items-center justify-between bg-verve-light/30 border border-verve-medium/20 p-1 rounded-xl">
        <button type="button" :aria-label="t('stats.week.previous')" @click="goToPreviousWeek"
          class="p-1.5 hover:bg-white rounded-lg text-verve-brown/60 hover:text-verve-brown transition-colors shadow-sm focus-visible:outline-2 focus-visible:outline-verve-orange">
          &lt;
        </button>
        <p class="text-sm font-bold text-verve-brown">
          {{ t('stats.week.period', { week: n(weekAndYear.week), year: periodNumber.format(weekAndYear.year) }) }}
        </p>
        <button type="button" :aria-label="t('stats.week.next')" @click="goToNextWeek"
          class="p-1.5 hover:bg-white rounded-lg text-verve-brown/60 hover:text-verve-brown transition-colors shadow-sm focus-visible:outline-2 focus-visible:outline-verve-orange">
          &gt;
        </button>
      </div>
    </div>

    <!-- CHARTS & DATA -->
    <div v-if="statisticsStore.isWeeklyLoading" role="status" class="text-center py-16 text-verve-brown/60">
      <span class="animate-pulse">{{ t('stats.loading') }}</span>
    </div>

    <div v-else-if="statisticsStore.weeklyError" role="alert"
      class="text-center py-16 text-red-600 bg-red-50 rounded-xl border border-red-100">
      {{ statisticsStore.weeklyError.detail ?? t(`stats.${statisticsStore.weeklyError.reason}`) }}
    </div>

    <div v-else-if="statisticsStore.weeklyStats" class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
      <!-- Bar Chart & Total Display -->
      <div class="lg:col-span-2">
        <div class="mb-4 flex items-baseline">
          <span class="text-4xl font-bold text-verve-orange tracking-tight mr-1">
            {{ selectedMetricTotal.value }}
          </span>
          <span v-if="selectedMetricTotal.unit" class="text-lg font-medium text-verve-brown/60">
            {{ selectedMetricTotal.unit }}
          </span>
          <span class="ml-3 text-xs font-bold text-verve-brown/30 uppercase tracking-widest mb-1">
            {{ t('stats.week.currentTotal') }}
          </span>
        </div>
        <div class="h-64">
          <WeeklyBarChart :chart-data="barChartData" :aria-label="t('stats.week.dailyChart', { metric: selectedMetricLabel })" />
        </div>
      </div>

      <!-- Pie Chart -->
      <div class="h-64 lg:border-l border-verve-medium/20 lg:pl-8 flex flex-col justify-center">
        <p class="text-xs font-bold text-verve-brown/40 uppercase tracking-wider mb-2 text-center lg:text-left">
          {{ t('stats.week.breakdown') }}
        </p>
        <div class="h-56">
          <SubTypePieChart :chart-data="pieChartData" :aria-label="t('stats.week.breakdownChart', { metric: selectedMetricLabel })" />
        </div>
      </div>
    </div>
  </div>
</template>
