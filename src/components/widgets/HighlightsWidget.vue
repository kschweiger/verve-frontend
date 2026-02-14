<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useHighlightStore } from '@/stores/highlights';
import { type Activity } from '@/stores/activity';
import { fetchActivitySummary } from '@/services/api';
import { formatDuration, parseISODuration } from '@/utils/datetime';

const highlightStore = useHighlightStore();

// --- LOCAL STATE ---
const selectedMetric = ref<string>('distance');
const selectedScope = ref<'yearly' | 'lifetime'>('yearly');
const selectedYear = ref(new Date().getFullYear());

// Extended type for local display
type HighlightedActivity = Activity & { rank: number; value: number };

const highlightedActivities = ref<HighlightedActivity[]>([]);

// --- WATCHERS ---
watch(
  [selectedMetric, selectedScope, selectedYear],
  async ([metric, scope, year]) => {
    const yearToFetch = scope === 'yearly' ? year : null;
    await highlightStore.fetchDashboardHighlights(metric, yearToFetch);

    highlightedActivities.value = [];

    // Fetch details for each highlighted activity ID
    const activityPromises = highlightStore.dashboardHighlights.map((h) =>
      fetchActivitySummary(h.activity_id)
    );
    const activities = await Promise.all(activityPromises);

    highlightedActivities.value = activities
      .map((act) => {
        const highlight = highlightStore.dashboardHighlights.find(
          (h) => h.activity_id === act.id
        );
        // Non-null assertion safe here because we just used the IDs from the highlights list
        return {
          ...act,
          rank: highlight!.rank,
          value: highlight!.value,
        };
      })
      .sort((a, b) => a.rank - b.rank);
  },
  { immediate: true }
);

onMounted(() => {
  highlightStore.fetchAvailableMetrics();
});

const formatValue = (value: number | string, metric: string): string => {
  if (metric.includes('duration') && typeof value === 'string') {
    return formatDuration(parseISODuration(value));
  }

  const numValue = typeof value === 'number' ? value : 0;

  if (metric.includes('distance')) {
    return `${numValue.toFixed(2)} km`;
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
  return numValue.toString();
};

const rankIcon: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-verve-medium/30 p-6 h-full">
    <h3 class="text-xl font-bold text-verve-brown mb-4">Personal Records</h3>

    <!-- CONTROLS -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
      <select v-model="selectedMetric"
        class="w-full border-verve-medium rounded-xl text-sm text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white">
        <option v-for="m in highlightStore.availableMetrics" :key="m" :value="m">
          {{ m.replace(/_/g, ' ') }}
        </option>
      </select>

      <select v-model="selectedScope"
        class="w-full border-verve-medium rounded-xl text-sm text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white">
        <option value="yearly">This Year</option>
        <option value="lifetime">All Time</option>
      </select>

      <select v-if="selectedScope === 'yearly'" v-model="selectedYear"
        class="w-full border-verve-medium rounded-xl text-sm text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white">
        <option v-for="y in 5" :key="y" :value="new Date().getFullYear() - y + 1">
          {{ new Date().getFullYear() - y + 1 }}
        </option>
      </select>
    </div>

    <!-- RESULTS -->
    <div v-if="highlightStore.isLoading" class="text-center py-8 text-verve-brown/60 text-sm">
      Loading records...
    </div>

    <div v-else-if="highlightedActivities.length > 0" class="space-y-2">
      <router-link v-for="activity in highlightedActivities" :key="activity.id"
        :to="{ name: 'activity-detail', params: { id: activity.id } }"
        class="block p-3 rounded-xl hover:bg-verve-light/50 border border-transparent hover:border-verve-medium/30 transition-all">
        <div class="flex items-center justify-between">
          <!-- Left side: Icon and Activity Info -->
          <div class="flex items-center gap-4">
            <span class="text-2xl">{{ rankIcon[activity.rank] }}</span>
            <div class="overflow-hidden">
              <p class="font-bold text-verve-brown text-sm truncate max-w-[120px] sm:max-w-[150px]">
                {{ activity.name || new Date(activity.start).toLocaleDateString() }}
              </p>
              <p class="text-xs text-verve-brown/60">
                {{ new Date(activity.start).toLocaleDateString() }}
              </p>
            </div>
          </div>

          <!-- Right side: The record value -->
          <div class="text-right whitespace-nowrap">
            <p class="text-lg font-bold text-verve-orange">
              {{ formatValue(activity.value, selectedMetric) }}
            </p>
          </div>
        </div>
      </router-link>
    </div>

    <div v-else class="text-center py-8 text-verve-brown/60 text-sm italic">
      No records found for this selection.
    </div>
  </div>
</template>
