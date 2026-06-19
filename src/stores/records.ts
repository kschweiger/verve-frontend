import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { fetchActivitySummary } from '../services/api';
import type { Activity } from './activity';
import {
  fetchRecordsOverview,
  type HighlightMetric,
  type HighlightTimeScope,
  type RecordsMetricGroup,
} from '../services/records';
import { sortRecordGroups } from '../utils/records';

const currentYear = new Date().getFullYear();

export const useRecordsStore = defineStore('records', () => {
  const scope = ref<HighlightTimeScope>('yearly');
  const year = ref(currentYear);
  const typeId = ref<number | null>(null);
  const groups = ref<RecordsMetricGroup[]>([]);
  const selectedMetric = ref<HighlightMetric | null>(null);
  const activitySummaries = ref<Record<string, Activity>>({});
  const isLoading = ref(false);
  const isLoadingSummaries = ref(false);
  const error = ref<string | null>(null);

  const selectedGroup = computed(
    () => groups.value.find((group) => group.metric === selectedMetric.value) ?? null
  );
  const requestYear = computed(() => (scope.value === 'yearly' ? year.value : null));

  function pruneActivitySummaryCache() {
    const visibleActivityIds = new Set(
      groups.value.flatMap((group) => group.records.map((record) => record.activity_id))
    );
    activitySummaries.value = Object.fromEntries(
      Object.entries(activitySummaries.value).filter(([activityId]) => visibleActivityIds.has(activityId))
    );
  }

  async function fetchSelectedActivitySummaries() {
    const records = selectedGroup.value?.records ?? [];
    const missingActivityIds = records
      .map((record) => record.activity_id)
      .filter((activityId) => activitySummaries.value[activityId] === undefined);

    if (missingActivityIds.length === 0) return;

    isLoadingSummaries.value = true;
    try {
      const results = await Promise.allSettled(
        missingActivityIds.map(async (activityId) => ({
          activityId,
          activity: await fetchActivitySummary(activityId),
        }))
      );

      const nextSummaries = { ...activitySummaries.value };
      for (const result of results) {
        if (result.status === 'fulfilled') {
          nextSummaries[result.value.activityId] = result.value.activity;
        }
      }
      activitySummaries.value = nextSummaries;
    } finally {
      isLoadingSummaries.value = false;
    }
  }

  async function fetchOverview() {
    if (typeId.value === null) {
      groups.value = [];
      selectedMetric.value = null;
      error.value = 'Choose an activity type to view records.';
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const nextGroups = sortRecordGroups(
        await fetchRecordsOverview({ year: requestYear.value, typeId: typeId.value })
      );
      groups.value = nextGroups;
      selectedMetric.value =
        nextGroups.find((group) => group.metric === selectedMetric.value)?.metric ?? nextGroups[0]?.metric ?? null;
      pruneActivitySummaryCache();
      await fetchSelectedActivitySummaries();
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load records.';
      groups.value = [];
      selectedMetric.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  async function setScope(nextScope: HighlightTimeScope) {
    scope.value = nextScope;
    await fetchOverview();
  }

  async function setYear(nextYear: number) {
    year.value = nextYear;
    await fetchOverview();
  }

  function setInitialTypeId(nextTypeId: number) {
    typeId.value = nextTypeId;
  }

  async function setTypeId(nextTypeId: number) {
    typeId.value = nextTypeId;
    await fetchOverview();
  }

  async function selectMetric(metric: HighlightMetric) {
    selectedMetric.value = metric;
    await fetchSelectedActivitySummaries();
  }

  return {
    scope,
    year,
    typeId,
    groups,
    selectedMetric,
    selectedGroup,
    requestYear,
    activitySummaries,
    isLoading,
    isLoadingSummaries,
    error,
    fetchOverview,
    setScope,
    setYear,
    setInitialTypeId,
    setTypeId,
    selectMetric,
    fetchSelectedActivitySummaries,
  };
});
