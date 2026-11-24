<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStatisticsStore } from '@/stores/statistics';
import { useTypeStore } from '@/stores/types';
import { useActivityStore } from '@/stores/activity';
import { formatDuration } from '@/utils/datetime';

const statisticsStore = useStatisticsStore();
const typeStore = useTypeStore();
const activityStore = useActivityStore();
const { locale, t, n } = useI18n();
const yearNumber = computed(() => new Intl.NumberFormat(locale.value, { useGrouping: false }));
const wholeNumber = computed(() => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 0 }));

const currentYear = new Date().getFullYear();
const selectedYear = ref<number | 'all'>(currentYear);
const availableYears = Array.from({ length: 10 }, (_, i) => currentYear - i);

interface YearlyStatRow {
  id: number;
  name: string;
  distance: number;
  duration: number;
  count: number;
}

const statsByType = computed<YearlyStatRow[]>(() => {
  const stats = statisticsStore.yearlyStats;
  if (!stats) return [];

  const typeIds = Object.keys(stats.count.per_type);

  return typeIds
    .map((typeIdStr) => {
      const typeId = parseInt(typeIdStr, 10);
      const typeInfo = typeStore.activityTypes.find((t) => t.id === typeId);
      const name = typeInfo?.name ?? t('stats.activityTypeFallback', { id: typeId });

      return {
        id: typeId,
        name: name,
        distance: stats.distance.per_type[typeId] || 0,
        duration: stats.effective_duration.per_type[typeId] || 0,
        count: stats.count.per_type[typeId] || 0,
      };
    })
    .sort((a, b) => b.distance - a.distance);
});

const loadStats = () => {
  statisticsStore.fetchYearlyStats(selectedYear.value === 'all' ? null : selectedYear.value);
};

watch(selectedYear, loadStats, { immediate: true });

watch(() => activityStore.lastUpdate, loadStats);

onMounted(() => {
  typeStore.fetchActivityTypes();
});
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-verve-medium/30 p-6 h-full">
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-xl font-bold text-verve-brown">{{ t('stats.year.title') }}</h3>
      <select v-model="selectedYear" :aria-label="t('stats.year.select')"
        class="block pl-3 pr-8 py-1.5 text-sm border-verve-medium rounded-xl text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white cursor-pointer">
        <option value="all">{{ t('stats.year.all') }}</option>
        <option v-for="year in availableYears" :key="year" :value="year">{{ yearNumber.format(year) }}</option>
      </select>
    </div>

    <div v-if="statisticsStore.isLoading" role="status" class="text-center text-verve-brown/60 py-8 text-sm">
      <span class="animate-pulse">{{ t('stats.loading') }}</span>
    </div>

    <div v-else-if="statisticsStore.error" role="alert"
      class="text-center text-red-600 bg-red-50 rounded-xl border border-red-100 py-4 text-sm">
      <p>{{ statisticsStore.error.detail ?? t(`stats.${statisticsStore.error.reason}`) }}</p>
    </div>

    <div v-else-if="statsByType.length > 0">
      <table class="w-full text-left">
        <thead>
          <tr class="border-b border-verve-medium/20">
            <th class="py-2 font-bold text-xs text-verve-brown/50 uppercase tracking-wider">
              {{ t('stats.activityType') }}
            </th>
            <th class="py-2 font-bold text-xs text-verve-brown/50 uppercase tracking-wider text-right">
              {{ t('stats.metrics.distance') }}
            </th>
            <th class="py-2 font-bold text-xs text-verve-brown/50 uppercase tracking-wider text-right">
              {{ t('stats.metrics.effective_duration') }}
            </th>
            <th class="py-2 font-bold text-xs text-verve-brown/50 uppercase tracking-wider text-right">
              {{ t('stats.year.count') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="stat in statsByType" :key="stat.id"
            class="border-b border-verve-medium/10 last:border-b-0 hover:bg-verve-light/10 transition-colors">
            <td class="py-3 font-bold text-verve-brown text-sm">{{ stat.name }}</td>
            <td class="py-3 text-verve-brown/80 text-right text-sm font-mono">
              {{ wholeNumber.format(stat.distance) }} km
            </td>
            <td class="py-3 text-verve-brown/80 text-right text-sm font-mono">
              {{ formatDuration(stat.duration, locale) }}
            </td>
            <td class="py-3 text-verve-brown/80 text-right text-sm font-mono">{{ n(stat.count) }}</td>
          </tr>
        </tbody>

        <tfoot v-if="statsByType.length > 1">
          <tr class="border-t-2 border-verve-medium/20">
            <td class="pt-3 font-bold text-verve-brown">{{ t('stats.year.total') }}</td>
            <td class="pt-3 font-bold text-verve-brown text-right font-mono">
              {{ wholeNumber.format(statisticsStore.yearlyStats?.distance.total ?? 0) }} km
            </td>
            <td class="pt-3 font-bold text-verve-brown text-right font-mono">
              {{ formatDuration(statisticsStore.yearlyStats?.effective_duration.total ?? 0, locale) }}
            </td>
            <td class="pt-3 font-bold text-verve-brown text-right font-mono">
              {{ n(statisticsStore.yearlyStats?.count.total ?? 0) }}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div v-else
      class="text-center text-verve-brown/40 py-8 italic text-sm border border-dashed border-verve-medium/30 rounded-xl bg-verve-light/10">
      <p>{{ t('stats.year.empty') }}</p>
    </div>
  </div>
</template>
