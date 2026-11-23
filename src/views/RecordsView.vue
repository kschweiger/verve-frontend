<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { CalendarDays, ChevronLeft, ChevronRight, Filter, Medal, Trophy } from '@lucide/vue';
import { useRecordsStore } from '@/stores/records';
import { useSettingsStore } from '@/stores/settings';
import { useTypeStore } from '@/stores/types';
import type { ActivityHighlight, HighlightMetric } from '@/services/records';
import {
  formatRecordActivityDate,
  formatRecordValue,
  recordMetricDefinitions,
  type RecordMetricGroupId,
} from '@/utils/records';

const recordsStore = useRecordsStore();
const settingsStore = useSettingsStore();
const typeStore = useTypeStore();
const { locale, t } = useI18n();

const {
  scope,
  year,
  typeId,
  groups,
  selectedMetric,
  selectedGroup,
  activitySummaries,
  isLoading,
  isLoadingSummaries,
  error,
} = storeToRefs(recordsStore);
const { activityTypes } = storeToRefs(typeStore);

const metricSections: RecordMetricGroupId[] = ['endurance', 'speed', 'power'];

const groupsByMetric = computed(() => new Map(groups.value.map((group) => [group.metric, group])));

const visibleMetricSections = computed(() =>
  metricSections
    .map((id) => ({
      id,
      metrics: recordMetricDefinitions
        .filter((definition) => definition.group === id)
        .map((definition) => ({
          definition,
          group: groupsByMetric.value.get(definition.metric),
        }))
        .filter((item) => item.group !== undefined),
    }))
    .filter((section) => section.metrics.length > 0)
);

const wholeNumber = computed(() => new Intl.NumberFormat(locale.value, { useGrouping: false }));
const errorMessage = computed(() =>
  error.value?.detail
    ? t('records.errors.loadDetail', { detail: error.value.detail })
    : error.value && t(`records.errors.${error.value.reason}`)
);

function selectMetric(metric: HighlightMetric) {
  void recordsStore.selectMetric(metric);
}

function setScope(nextScope: 'yearly' | 'lifetime') {
  if (scope.value === nextScope) return;
  void recordsStore.setScope(nextScope);
}

function stepYear(delta: number) {
  void recordsStore.setYear(year.value + delta);
}

function setYearFromInput(event: Event) {
  const value = Number((event.target as HTMLInputElement).value);
  if (Number.isInteger(value) && value > 0) {
    void recordsStore.setYear(value);
  }
}

function setTypeFromSelect(event: Event) {
  const value = Number((event.target as HTMLSelectElement).value);
  if (Number.isInteger(value)) {
    void recordsStore.setTypeId(value);
  }
}

function resolveInitialRecordsTypeId(): number | null {
  const recordsTypeId = settingsStore.userSettings?.records_settings?.default_activity_type;
  if (recordsTypeId && activityTypes.value.some((activityType) => activityType.id === recordsTypeId)) {
    return recordsTypeId;
  }

  const appDefaultTypeId = settingsStore.userSettings?.default_type_id;
  if (appDefaultTypeId && activityTypes.value.some((activityType) => activityType.id === appDefaultTypeId)) {
    return appDefaultTypeId;
  }

  return activityTypes.value[0]?.id ?? null;
}

function activityTitle(record: ActivityHighlight): string {
  const activity = activitySummaries.value[record.activity_id];
  return activity?.name || formatRecordActivityDate(activity, record.activity_id, locale.value);
}

function activitySubtitle(record: ActivityHighlight): string {
  const activity = activitySummaries.value[record.activity_id];
  if (!activity?.name) return rankLabel(record.rank);
  return formatRecordActivityDate(activity, record.activity_id, locale.value);
}

function rankLabel(rank: number): string {
  return t('records.rank', { rank: wholeNumber.value.format(rank) });
}

function rankClasses(rank: number): string {
  if (rank === 1) return 'bg-verve-orange text-white border-verve-orange';
  if (rank === 2) return 'bg-verve-light text-verve-brown border-verve-dark/20';
  return 'bg-white text-verve-brown border-verve-medium';
}

onMounted(async () => {
  await Promise.all([
    typeStore.fetchActivityTypes(),
    settingsStore.fetchAllSettings(),
  ]);

  const initialTypeId = resolveInitialRecordsTypeId();
  if (initialTypeId !== null) {
    recordsStore.setInitialTypeId(initialTypeId);
  }

  await recordsStore.fetchOverview();
});
</script>

<template>
  <div class="bg-verve-medium min-h-[calc(100vh-64px)]">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      <header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="flex items-center gap-3">
          <div class="size-11 rounded-lg bg-white border border-verve-brown/10 flex items-center justify-center">
            <Trophy class="size-6 text-verve-orange" aria-hidden="true" />
          </div>
          <div>
            <h1 class="text-3xl font-bold text-verve-brown">{{ t('navigation.records') }}</h1>
            <p class="text-sm text-verve-brown/65">{{ t('records.trophyCase') }}</p>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-3">
          <div
            class="inline-flex rounded-lg border border-verve-brown/15 bg-white p-1"
            role="group"
            :aria-label="t('records.scope')"
          >
            <button
              type="button"
              class="px-4 py-2 rounded-md text-sm font-semibold transition-colors"
              :class="scope === 'yearly' ? 'bg-verve-brown text-white' : 'text-verve-brown hover:bg-verve-light'"
              :aria-pressed="scope === 'yearly'"
              @click="setScope('yearly')"
            >
              {{ t('records.yearly') }}
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-md text-sm font-semibold transition-colors"
              :class="scope === 'lifetime' ? 'bg-verve-brown text-white' : 'text-verve-brown hover:bg-verve-light'"
              :aria-pressed="scope === 'lifetime'"
              @click="setScope('lifetime')"
            >
              {{ t('records.lifetime') }}
            </button>
          </div>

          <div
            v-if="scope === 'yearly'"
            class="flex items-center gap-2 rounded-lg border border-verve-brown/15 bg-white px-2 py-1"
          >
            <CalendarDays class="size-4 text-verve-brown/55" aria-hidden="true" />
            <button
              type="button"
              class="size-8 rounded-md hover:bg-verve-light text-verve-brown grid place-items-center"
              :aria-label="t('records.previousYear')"
              @click="stepYear(-1)"
            >
              <ChevronLeft class="size-4" aria-hidden="true" />
            </button>
            <input
              :value="year"
              type="number"
              min="1900"
              class="w-20 border-0 bg-transparent text-center text-sm font-bold text-verve-brown focus:ring-0"
              :aria-label="t('records.year')"
              @change="setYearFromInput"
            />
            <button
              type="button"
              class="size-8 rounded-md hover:bg-verve-light text-verve-brown grid place-items-center"
              :aria-label="t('records.nextYear')"
              @click="stepYear(1)"
            >
              <ChevronRight class="size-4" aria-hidden="true" />
            </button>
          </div>

          <label class="flex items-center gap-2 rounded-lg border border-verve-brown/15 bg-white px-3 py-2">
            <Filter class="size-4 text-verve-brown/55" aria-hidden="true" />
            <select
              :value="typeId"
              class="min-w-44 border-0 bg-transparent p-0 text-sm font-semibold text-verve-brown focus:ring-0"
              :aria-label="t('records.activityType')"
              @change="setTypeFromSelect"
            >
              <option v-for="activityType in activityTypes" :key="activityType.id" :value="activityType.id">
                {{ activityType.name }}
              </option>
            </select>
          </label>
        </div>
      </header>

      <div class="grid gap-6 lg:grid-cols-[minmax(260px,360px)_1fr]">
        <aside class="space-y-5" :aria-label="t('records.metricList')">
          <div v-if="isLoading" class="bg-white rounded-lg border border-verve-brown/10 p-5 text-sm text-verve-brown/60">
            {{ t('records.loading') }}
          </div>

          <div
            v-else-if="visibleMetricSections.length > 0"
            v-for="section in visibleMetricSections"
            :key="section.id"
            class="space-y-2"
          >
            <h2 class="text-xs font-bold uppercase tracking-wider text-verve-brown/50">
              {{ t(`records.groups.${section.id}`) }}
            </h2>
            <button
              v-for="item in section.metrics"
              :key="item.definition.metric"
              type="button"
              class="w-full rounded-lg border p-4 text-left transition-colors"
              :class="
                selectedMetric === item.definition.metric
                  ? 'bg-verve-brown text-white border-verve-brown'
                  : 'bg-white text-verve-brown border-verve-brown/10 hover:bg-verve-light'
              "
              :aria-pressed="selectedMetric === item.definition.metric"
              @click="selectMetric(item.definition.metric)"
            >
              <span class="flex items-center justify-between gap-4">
                <span class="min-w-0">
                  <span class="block text-sm font-bold hyphens-auto wrap-anywhere">
                    {{ t(`records.metrics.${item.definition.metric}`) }}
                  </span>
                  <span
                    class="block text-xs mt-1"
                    :class="selectedMetric === item.definition.metric ? 'text-white/70' : 'text-verve-brown/55'"
                  >
                    {{ t('records.savedCount', { count: wholeNumber.format(item.group?.records.length ?? 0) }) }}
                  </span>
                </span>
                <span class="text-lg font-bold whitespace-nowrap">
                  <template v-if="item.group?.records[0]">
                    {{ formatRecordValue(item.definition.metric, item.group.records[0].value, locale) }}
                  </template>
                </span>
              </span>
            </button>
          </div>

          <div v-else class="bg-white rounded-lg border border-verve-brown/10 p-5 text-sm text-verve-brown/60">
            {{ t('records.emptyFilter') }}
          </div>
        </aside>

        <main class="min-w-0">
          <div v-if="errorMessage" class="rounded-lg bg-red-50 border border-red-100 p-4 text-sm text-red-700" role="alert">
            {{ errorMessage }}
          </div>

          <section v-else class="space-y-4">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-sm font-semibold text-verve-brown/55">
                  {{ scope === 'yearly' ? wholeNumber.format(year) : t('records.lifetime') }}
                </p>
                <h2 class="text-2xl font-bold text-verve-brown">
                  {{ selectedMetric ? t(`records.metrics.${selectedMetric}`) : t('navigation.records') }}
                </h2>
              </div>
              <p v-if="isLoadingSummaries" class="text-sm text-verve-brown/55" role="status">
                {{ t('records.loadingDetails') }}
              </p>
            </div>

            <div v-if="isLoading" class="rounded-lg bg-white border border-verve-brown/10 p-10 text-center" role="status">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-verve-brown mx-auto mb-3"></div>
              <p class="text-sm text-verve-brown/60">{{ t('records.loadingTrophies') }}</p>
            </div>

            <div
              v-else-if="selectedGroup && selectedGroup.records.length > 0"
              class="grid gap-3 xl:grid-cols-3"
            >
              <router-link
                v-for="record in selectedGroup.records"
                :key="`${record.metric}-${record.rank}-${record.activity_id}`"
                :to="{ name: 'activity-detail', params: { id: record.activity_id } }"
                class="block rounded-lg border border-verve-brown/10 bg-white p-5 shadow-sm hover:border-verve-orange/50 hover:shadow-md transition-all"
              >
                <div class="flex items-start justify-between gap-4">
                  <div
                    class="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-sm font-bold"
                    :class="rankClasses(record.rank)"
                  >
                    <Medal class="size-4" aria-hidden="true" />
                    <span aria-hidden="true">{{ t('records.rankBadge', { rank: wholeNumber.format(record.rank) }) }}</span>
                    <span v-if="activitySummaries[record.activity_id]?.name" class="sr-only">{{ rankLabel(record.rank) }}</span>
                  </div>
                  <p class="text-2xl font-bold text-verve-orange">
                    {{ formatRecordValue(record.metric, record.value, locale) }}
                  </p>
                </div>
                <div class="mt-8">
                  <p class="font-bold text-verve-brown truncate">{{ activityTitle(record) }}</p>
                  <p class="text-sm text-verve-brown/55 mt-1">{{ activitySubtitle(record) }}</p>
                </div>
              </router-link>
            </div>

            <div v-else class="rounded-lg bg-white border border-verve-brown/10 p-10 text-center">
              <Trophy class="size-10 text-verve-brown/25 mx-auto mb-3" aria-hidden="true" />
              <p class="font-bold text-verve-brown">{{ t('records.empty') }}</p>
              <p class="text-sm text-verve-brown/60 mt-1">{{ t('records.tryAnotherFilter') }}</p>
            </div>
          </section>
        </main>
      </div>
    </div>
  </div>
</template>
