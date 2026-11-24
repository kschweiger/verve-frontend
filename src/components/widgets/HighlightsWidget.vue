<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Trophy } from '@lucide/vue';
import { useDashboardLoadError } from '@/composables/useDashboardLoadError';
import type { HighlightMetric } from '@/services/records';
import { useHighlightStore } from '@/stores/highlights';
import { type Activity } from '@/stores/activity';
import { fetchActivitySummary } from '@/services/api';
import { ApiResponseError } from '@/services/authHeaders';
import { formatDuration, parseISODuration } from '@/utils/datetime';

const highlightStore = useHighlightStore();
const { t, n, locale } = useI18n();
const formatLoadError = useDashboardLoadError();

const metrics = ['duration', 'distance', 'elevation_change_up'] as const satisfies readonly HighlightMetric[];
type CuratedMetric = (typeof metrics)[number];

interface CuratedRecord {
  metric: CuratedMetric;
  activity: Activity;
  value: number | string;
}

const records = ref<CuratedRecord[]>([]);
const isLoading = ref(false);
const error = ref<{ reason: 'loadFailed'; detail?: string } | null>(null);

const currentYear = new Date().getFullYear();

async function loadCuratedRecords() {
  isLoading.value = true;
  error.value = null;
  records.value = [];

  try {
    const loaded: CuratedRecord[] = [];

    for (const metric of metrics) {
      await highlightStore.fetchDashboardHighlights(metric, currentYear);
      const first = highlightStore.dashboardHighlights[0];
      if (!first) continue;

      const activity = await fetchActivitySummary(first.activity_id);
      loaded.push({
        metric,
        activity,
        value: first.value,
      });
    }

    records.value = loaded;
  } catch (e: unknown) {
    error.value = {
      reason: 'loadFailed',
      detail: e instanceof ApiResponseError ? e.detail : undefined,
    };
  } finally {
    isLoading.value = false;
  }
}

function formatValue(value: number | string, metric: CuratedMetric): string {
  if (metric === 'duration') {
    return formatDuration(typeof value === 'string' ? parseISODuration(value) : value, locale.value);
  }

  const numericValue = typeof value === 'number' ? value : 0;

  if (metric === 'distance') {
    return n(numericValue, {
      style: 'unit', unit: 'kilometer', unitDisplay: 'short', minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
  }
  return n(numericValue, { style: 'unit', unit: 'meter', unitDisplay: 'short', maximumFractionDigits: 0 });
}

const hasRecords = computed(() => records.value.length > 0);

onMounted(loadCuratedRecords);
</script>

<template>
  <section class="bg-white rounded-xl shadow-sm border border-verve-medium/30 p-6">
    <div class="flex items-center gap-2 mb-4">
      <Trophy class="size-5 text-verve-orange" aria-hidden="true" />
      <div>
        <h3 class="text-xl font-bold text-verve-brown">{{ t('dashboard.records.title') }}</h3>
        <p class="text-sm text-verve-brown/60">{{ t('dashboard.records.subtitle') }}</p>
      </div>
    </div>

    <div v-if="isLoading" class="text-center py-8 text-verve-brown/60 text-sm">
      {{ t('dashboard.records.loading') }}
    </div>

    <div v-else-if="error" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
      {{ formatLoadError('records', error) }}
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
              {{ t(`dashboard.records.metrics.${record.metric}`) }}
            </p>
            <p class="font-bold text-verve-brown text-sm truncate">
              {{ record.activity.name || new Date(record.activity.start).toLocaleDateString(locale) }}
            </p>
          </div>
          <p class="text-lg font-bold text-verve-orange whitespace-nowrap">
            {{ formatValue(record.value, record.metric) }}
          </p>
        </div>
      </router-link>
    </div>

    <div v-else class="text-center py-8 text-verve-brown/60 text-sm italic">
      {{ t('dashboard.records.empty') }}
    </div>
  </section>
</template>
