<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { CalendarDays, ChevronLeft, ChevronRight, Filter, Medal, Trophy } from 'lucide-vue-next';
import { useRecordsStore } from '@/stores/records';
import { useTypeStore } from '@/stores/types';
import type { ActivityHighlight, HighlightMetric } from '@/services/records';
import {
  formatRecordActivityDate,
  formatRecordValue,
  getRecordMetricDefinition,
  recordMetricDefinitions,
  type RecordMetricGroupId,
} from '@/utils/records';

const recordsStore = useRecordsStore();
const typeStore = useTypeStore();

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

interface MetricSection {
  id: RecordMetricGroupId;
  label: string;
}

const metricSections: MetricSection[] = [
  { id: 'endurance', label: 'Endurance' },
  { id: 'speed', label: 'Speed' },
  { id: 'power', label: 'Power' },
];

const groupsByMetric = computed(() => new Map(groups.value.map((group) => [group.metric, group])));

const visibleMetricSections = computed(() =>
  metricSections
    .map((section) => ({
      ...section,
      metrics: recordMetricDefinitions
        .filter((definition) => definition.group === section.id)
        .map((definition) => ({
          definition,
          group: groupsByMetric.value.get(definition.metric),
        }))
        .filter((item) => item.group !== undefined),
    }))
    .filter((section) => section.metrics.length > 0)
);

const selectedMetricDefinition = computed(() =>
  selectedMetric.value ? getRecordMetricDefinition(selectedMetric.value) : null
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
  const value = (event.target as HTMLSelectElement).value;
  void recordsStore.setTypeId(value === '' ? null : Number(value));
}

function activityTitle(record: ActivityHighlight): string {
  const activity = activitySummaries.value[record.activity_id];
  return activity?.name || formatRecordActivityDate(activity, record.activity_id);
}

function activitySubtitle(record: ActivityHighlight): string {
  const activity = activitySummaries.value[record.activity_id];
  if (!activity?.name) return `Rank #${record.rank}`;
  return formatRecordActivityDate(activity, record.activity_id);
}

function rankClasses(rank: number): string {
  if (rank === 1) return 'bg-verve-orange text-white border-verve-orange';
  if (rank === 2) return 'bg-verve-light text-verve-brown border-verve-dark/20';
  return 'bg-white text-verve-brown border-verve-medium';
}

onMounted(() => {
  void typeStore.fetchActivityTypes();
  void recordsStore.fetchOverview();
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
            <h1 class="text-3xl font-bold text-verve-brown">Records</h1>
            <p class="text-sm text-verve-brown/65">Trophy case</p>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-3">
          <div class="inline-flex rounded-lg border border-verve-brown/15 bg-white p-1" aria-label="Record scope">
            <button
              type="button"
              class="px-4 py-2 rounded-md text-sm font-semibold transition-colors"
              :class="scope === 'yearly' ? 'bg-verve-brown text-white' : 'text-verve-brown hover:bg-verve-light'"
              @click="setScope('yearly')"
            >
              Yearly
            </button>
            <button
              type="button"
              class="px-4 py-2 rounded-md text-sm font-semibold transition-colors"
              :class="scope === 'lifetime' ? 'bg-verve-brown text-white' : 'text-verve-brown hover:bg-verve-light'"
              @click="setScope('lifetime')"
            >
              Lifetime
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
              aria-label="Previous year"
              @click="stepYear(-1)"
            >
              <ChevronLeft class="size-4" aria-hidden="true" />
            </button>
            <input
              :value="year"
              type="number"
              min="1900"
              class="w-20 border-0 bg-transparent text-center text-sm font-bold text-verve-brown focus:ring-0"
              aria-label="Records year"
              @change="setYearFromInput"
            />
            <button
              type="button"
              class="size-8 rounded-md hover:bg-verve-light text-verve-brown grid place-items-center"
              aria-label="Next year"
              @click="stepYear(1)"
            >
              <ChevronRight class="size-4" aria-hidden="true" />
            </button>
          </div>

          <label class="flex items-center gap-2 rounded-lg border border-verve-brown/15 bg-white px-3 py-2">
            <Filter class="size-4 text-verve-brown/55" aria-hidden="true" />
            <select
              :value="typeId ?? ''"
              class="min-w-44 border-0 bg-transparent p-0 text-sm font-semibold text-verve-brown focus:ring-0"
              aria-label="Activity type"
              @change="setTypeFromSelect"
            >
              <option value="">All activity types</option>
              <option v-for="activityType in activityTypes" :key="activityType.id" :value="activityType.id">
                {{ activityType.name }}
              </option>
            </select>
          </label>
        </div>
      </header>

      <div class="grid gap-6 lg:grid-cols-[minmax(260px,360px)_1fr]">
        <aside class="space-y-5">
          <div v-if="isLoading" class="bg-white rounded-lg border border-verve-brown/10 p-5 text-sm text-verve-brown/60">
            Loading records...
          </div>

          <div
            v-else-if="visibleMetricSections.length > 0"
            v-for="section in visibleMetricSections"
            :key="section.id"
            class="space-y-2"
          >
            <h2 class="text-xs font-bold uppercase tracking-wider text-verve-brown/50">{{ section.label }}</h2>
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
              @click="selectMetric(item.definition.metric)"
            >
              <span class="flex items-center justify-between gap-4">
                <span class="min-w-0">
                  <span class="block text-sm font-bold truncate">{{ item.definition.label }}</span>
                  <span
                    class="block text-xs mt-1"
                    :class="selectedMetric === item.definition.metric ? 'text-white/70' : 'text-verve-brown/55'"
                  >
                    {{ item.group?.records.length ?? 0 }} of 3 saved
                  </span>
                </span>
                <span class="text-lg font-bold whitespace-nowrap">
                  <template v-if="item.group?.records[0]">
                    {{ formatRecordValue(item.definition.metric, item.group.records[0].value) }}
                  </template>
                </span>
              </span>
            </button>
          </div>

          <div v-else class="bg-white rounded-lg border border-verve-brown/10 p-5 text-sm text-verve-brown/60">
            No records found for this filter.
          </div>
        </aside>

        <main class="min-w-0">
          <div v-if="error" class="rounded-lg bg-red-50 border border-red-100 p-4 text-sm text-red-700">
            {{ error }}
          </div>

          <section v-else class="space-y-4">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-sm font-semibold text-verve-brown/55">
                  {{ scope === 'yearly' ? year : 'Lifetime' }}
                </p>
                <h2 class="text-2xl font-bold text-verve-brown">
                  {{ selectedMetricDefinition?.label ?? 'Records' }}
                </h2>
              </div>
              <p v-if="isLoadingSummaries" class="text-sm text-verve-brown/55">Loading activity details...</p>
            </div>

            <div v-if="isLoading" class="rounded-lg bg-white border border-verve-brown/10 p-10 text-center">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-verve-brown mx-auto mb-3"></div>
              <p class="text-sm text-verve-brown/60">Loading trophy case...</p>
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
                    #{{ record.rank }}
                  </div>
                  <p class="text-2xl font-bold text-verve-orange">
                    {{ formatRecordValue(record.metric, record.value) }}
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
              <p class="font-bold text-verve-brown">No records found</p>
              <p class="text-sm text-verve-brown/60 mt-1">Try another year, scope, or activity type.</p>
            </div>
          </section>
        </main>
      </div>
    </div>
  </div>
</template>
