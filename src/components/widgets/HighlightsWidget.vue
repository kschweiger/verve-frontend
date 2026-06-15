<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Trophy } from 'lucide-vue-next';
import { useHighlightStore } from '@/stores/highlights';
import { type Activity } from '@/stores/activity';
import { fetchActivitySummary } from '@/services/api';
import { formatDuration, parseISODuration } from '@/utils/datetime';

const highlightStore = useHighlightStore();

interface CuratedRecordDefinition {
  metric: string;
  label: string;
}

interface CuratedRecord {
  metric: string;
  label: string;
  activity: Activity;
  value: number | string;
}

const definitions: CuratedRecordDefinition[] = [
  { metric: 'duration', label: 'Longest duration' },
  { metric: 'distance', label: 'Longest distance' },
  { metric: 'elevation_change_up', label: 'Most elevation' },
];

const records = ref<CuratedRecord[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

const currentYear = new Date().getFullYear();

async function loadCuratedRecords() {
  isLoading.value = true;
  error.value = null;
  records.value = [];

  try {
    const loaded: CuratedRecord[] = [];

    for (const definition of definitions) {
      await highlightStore.fetchDashboardHighlights(definition.metric, currentYear);
      const first = highlightStore.dashboardHighlights[0];
      if (!first) continue;

      const activity = await fetchActivitySummary(first.activity_id);
      loaded.push({
        metric: definition.metric,
        label: definition.label,
        activity,
        value: first.value,
      });
    }

    records.value = loaded;
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    isLoading.value = false;
  }
}

function formatValue(value: number | string, metric: string): string {
  if (metric === 'duration' && typeof value === 'string') {
    return formatDuration(parseISODuration(value));
  }

  const numericValue = typeof value === 'number' ? value : 0;

  if (metric === 'duration') return formatDuration(numericValue);
  if (metric === 'distance') return `${numericValue.toFixed(2)} km`;
  if (metric === 'elevation_change_up') return `${numericValue.toFixed(0)} m`;
  return numericValue.toString();
}

const hasRecords = computed(() => records.value.length > 0);

onMounted(loadCuratedRecords);
</script>

<template>
  <section class="bg-white rounded-xl shadow-sm border border-verve-medium/30 p-6">
    <div class="flex items-center gap-2 mb-4">
      <Trophy class="size-5 text-verve-orange" aria-hidden="true" />
      <div>
        <h3 class="text-xl font-bold text-verve-brown">Records</h3>
        <p class="text-sm text-verve-brown/60">This year's highlights</p>
      </div>
    </div>

    <div v-if="isLoading" class="text-center py-8 text-verve-brown/60 text-sm">
      Loading records...
    </div>

    <div v-else-if="error" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
      {{ error }}
    </div>

    <div v-else-if="hasRecords" class="space-y-2">
      <router-link
        v-for="record in records"
        :key="record.metric"
        :to="{ name: 'activity-detail', params: { id: record.activity.id } }"
        class="block p-3 rounded-xl hover:bg-verve-light/50 border border-transparent hover:border-verve-medium/30 transition-all"
      >
        <div class="flex items-center justify-between gap-4">
          <div class="min-w-0">
            <p class="text-xs font-bold uppercase tracking-wider text-verve-brown/45">
              {{ record.label }}
            </p>
            <p class="font-bold text-verve-brown text-sm truncate">
              {{ record.activity.name || new Date(record.activity.start).toLocaleDateString() }}
            </p>
          </div>
          <p class="text-lg font-bold text-verve-orange whitespace-nowrap">
            {{ formatValue(record.value, record.metric) }}
          </p>
        </div>
      </router-link>
    </div>

    <div v-else class="text-center py-8 text-verve-brown/60 text-sm italic">
      No records found yet.
    </div>
  </section>
</template>
