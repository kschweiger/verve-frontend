<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import type { Activity } from '@/stores/activity';
import { useActivityStore } from '@/stores/activity';
import {
  createSegmentSet,
  deleteSegmentSet,
  fetchActivitySegmentSetIds,
  fetchActivitySummary,
  fetchActivityTrack,
  fetchSegmentStatistics,
  updateSegmentSet,
  type SegmentStatistics,
  type TrackPoint,
} from '@/services/api';
import ActivityEquipment from '@/components/ActivityEquipment.vue';
import ActivityHighlights from '@/components/ActivityHighlights.vue';
import LeafletMap from '@/components/LeafletMap.vue';
import ElevationChart from '@/components/ElevationChart.vue';
import ActivityGallery from '@/components/ActivityGallery.vue';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal.vue';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Trash2,
} from 'lucide-vue-next';
import ActivityLocationsWidget from '@/components/widgets/ActivityLocationsWidget.vue';
import CombinedMetricsChart from '@/components/CombinedMetricsChart.vue';
import { useLocationStore } from '@/stores/location';
import ActivityTagsWidget from '@/components/widgets/ActivityTagsWidget.vue';

const props = defineProps<{
  id: string;
}>();

const router = useRouter();
const activityStore = useActivityStore();
const locationStore = useLocationStore();

// Local state for this view
const activity = ref<Activity | null>(null);
const trackData = ref<TrackPoint[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
const hoveredPointIndex = ref<number | null>(null);
const segmentSetIds = ref<string[]>([]);
const segmentStatisticsById = ref<Record<string, SegmentStatistics>>({});
const selectedSegmentSetId = ref<string | null>(null);
const isLoadingSegmentSets = ref(false);
const segmentSetError = ref<string | null>(null);
const showSegmentStats = ref(false);
const isEditingSegmentCuts = ref(false);
const editableSegmentCuts = ref<number[]>([]);
const isCreatingSegmentSet = ref(false);
const draftSegmentSetName = ref('');
const isSavingSegmentSet = ref(false);
const segmentMutationError = ref<string | null>(null);

function handlePointHover(index: number | null) {
  hoveredPointIndex.value = index;
}

const showDeleteModal = ref(false);
const isDeleting = ref(false);

async function loadData() {
  try {
    const [summaryResponse, trackResponse] = await Promise.all([
      fetchActivitySummary(props.id),
      fetchActivityTrack(props.id),
      activityStore.fetchActivityImages(props.id),
      locationStore.fetchLocationsForActivity(props.id),
    ]);
    activity.value = summaryResponse;
    trackData.value = trackResponse;
    await loadSegmentSets();
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    isLoading.value = false;
  }
}

async function loadSegmentSets() {
  isLoadingSegmentSets.value = true;
  segmentSetError.value = null;
  segmentSetIds.value = [];
  segmentStatisticsById.value = {};
  selectedSegmentSetId.value = null;
  showSegmentStats.value = false;
  cancelSegmentCutEdit();

  try {
    const ids = await fetchActivitySegmentSetIds(props.id);
    segmentSetIds.value = ids;

    if (ids.length === 0) return;

    const segmentStatistics = await Promise.all(ids.map((id) => fetchSegmentStatistics(id)));
    segmentStatisticsById.value = Object.fromEntries(
      segmentStatistics.map((statistics) => [statistics.segmentSetId, statistics])
    );
    selectedSegmentSetId.value = segmentStatistics[0]?.segmentSetId ?? ids[0] ?? null;
  } catch (e: unknown) {
    segmentSetError.value = e instanceof Error ? e.message : String(e);
  } finally {
    isLoadingSegmentSets.value = false;
  }
}

const selectedSegmentStatistics = computed(() => {
  if (selectedSegmentSetId.value === null) return null;
  return segmentStatisticsById.value[selectedSegmentSetId.value] ?? null;
});

const trackIndexByPointId = computed(() => {
  const indexById = new Map<number, number>();
  trackData.value.forEach((point, index) => {
    indexById.set(point.id, index);
  });
  return indexById;
});

const sortedEditableSegmentCuts = computed(() => {
  return [...editableSegmentCuts.value].sort((a, b) => {
    const indexA = trackIndexByPointId.value.get(a) ?? Number.MAX_SAFE_INTEGER;
    const indexB = trackIndexByPointId.value.get(b) ?? Number.MAX_SAFE_INTEGER;
    return indexA - indexB;
  });
});

const visibleSegmentCutIndices = computed(() => {
  const cutIds = isEditingSegmentCuts.value
    ? sortedEditableSegmentCuts.value
    : (selectedSegmentStatistics.value?.cuts ?? []);

  return cutIds
    .map((cutId) => trackIndexByPointId.value.get(cutId))
    .filter((index): index is number => typeof index === 'number');
});

const hasInvalidSegmentCuts = computed(() => {
  return editableSegmentCuts.value.some((cutId) => !trackIndexByPointId.value.has(cutId));
});

const hasDuplicateSegmentCuts = computed(() => {
  return new Set(editableSegmentCuts.value).size !== editableSegmentCuts.value.length;
});

const canUseSegmentCutEdit = computed(() => {
  return (
    trackData.value.length > 1 &&
    (selectedSegmentStatistics.value !== null || isCreatingSegmentSet.value)
  );
});

const canStartNewSegmentSet = computed(() => {
  return trackData.value.length >= 2 && !isEditingSegmentCuts.value && !isSavingSegmentSet.value;
});

const hasValidSegmentSetName = computed(() => {
  return !isCreatingSegmentSet.value || draftSegmentSetName.value.trim().length > 0;
});

const canApplySegmentCutChanges = computed(() => {
  return (
    isEditingSegmentCuts.value &&
    editableSegmentCuts.value.length > 0 &&
    !hasInvalidSegmentCuts.value &&
    !hasDuplicateSegmentCuts.value &&
    hasValidSegmentSetName.value &&
    !isSavingSegmentSet.value
  );
});

function selectSegmentSet(segmentSetId: string) {
  selectedSegmentSetId.value = segmentSetId;
  isCreatingSegmentSet.value = false;
  draftSegmentSetName.value = '';
  segmentMutationError.value = null;
  cancelSegmentCutEdit();
}

function startNewSegmentSet() {
  segmentMutationError.value = null;
  selectedSegmentSetId.value = null;
  isCreatingSegmentSet.value = true;
  draftSegmentSetName.value = `Segments ${segmentSetIds.value.length + 1}`;
  editableSegmentCuts.value = [];
  addEditableCut();
  isEditingSegmentCuts.value = true;
}

function startSegmentCutEdit() {
  segmentMutationError.value = null;
  isCreatingSegmentSet.value = false;
  editableSegmentCuts.value = [...(selectedSegmentStatistics.value?.cuts ?? [])];
  isEditingSegmentCuts.value = true;
}

function cancelSegmentCutEdit() {
  editableSegmentCuts.value = [];
  isEditingSegmentCuts.value = false;
  isCreatingSegmentSet.value = false;
  draftSegmentSetName.value = '';
  segmentMutationError.value = null;
}

function handleSegmentSetChange(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return;
  selectSegmentSet(target.value);
}

function trackIndexForCut(cutId: number) {
  return trackIndexByPointId.value.get(cutId) ?? 0;
}

function trackPointForCut(cutId: number) {
  return trackData.value[trackIndexForCut(cutId)] ?? null;
}

function secondsBetweenTrackPoints(startPoint: TrackPoint | null, endPoint: TrackPoint | null) {
  if (!startPoint || !endPoint) return null;

  const startMs = new Date(startPoint.time).getTime();
  const endMs = new Date(endPoint.time).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;

  return Math.max(0, (endMs - startMs) / 1000);
}

function durationBeforeCut(cutIndex: number) {
  const currentCutId = sortedEditableSegmentCuts.value[cutIndex];
  if (currentCutId === undefined) return null;

  const startPoint =
    cutIndex === 0
      ? (trackData.value[0] ?? null)
      : trackPointForCut(sortedEditableSegmentCuts.value[cutIndex - 1] ?? currentCutId);

  return secondsBetweenTrackPoints(startPoint, trackPointForCut(currentCutId));
}

function durationBeforeCutId(cutId: number) {
  const cutIndex = sortedEditableSegmentCuts.value.indexOf(cutId);
  if (cutIndex === -1) return null;

  return durationBeforeCut(cutIndex);
}

const finalEditableSegmentDuration = computed(() => {
  if (sortedEditableSegmentCuts.value.length === 0) return null;

  const lastCutId = sortedEditableSegmentCuts.value[sortedEditableSegmentCuts.value.length - 1];
  if (lastCutId === undefined) return null;

  return secondsBetweenTrackPoints(trackPointForCut(lastCutId), trackData.value[trackData.value.length - 1] ?? null);
});

const trackStartTimestamp = computed(() => {
  const firstPoint = trackData.value[0];
  if (!firstPoint) return null;

  const timestamp = Date.parse(firstPoint.time);
  return Number.isNaN(timestamp) ? null : timestamp;
});

function elapsedSecondsForTrackIndex(index: number) {
  const point = trackData.value[index];
  if (!point || trackStartTimestamp.value === null) return index;

  const timestamp = Date.parse(point.time);
  if (Number.isNaN(timestamp)) return index;

  return Math.max(0, (timestamp - trackStartTimestamp.value) / 1000);
}

function nearestTrackIndexForElapsedSeconds(targetSeconds: number) {
  if (trackData.value.length === 0) return 0;

  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  trackData.value.forEach((_, index) => {
    const distance = Math.abs(elapsedSecondsForTrackIndex(index) - targetSeconds);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function clampTrackIndex(index: number) {
  return Math.min(Math.max(index, 0), Math.max(trackData.value.length - 1, 0));
}

function setEditableCutByTrackIndex(cutIndex: number, trackIndex: number) {
  const point = trackData.value[clampTrackIndex(trackIndex)];
  if (!point) return;

  const nextCuts = [...editableSegmentCuts.value];
  nextCuts[cutIndex] = point.id;
  editableSegmentCuts.value = nextCuts;
}

function nudgeEditableCutByPoints(cutIndex: number, deltaPoints: number) {
  setEditableCutByTrackIndex(
    cutIndex,
    trackIndexForCut(editableSegmentCuts.value[cutIndex] ?? 0) + deltaPoints
  );
}

function nudgeEditableCutBySeconds(cutIndex: number, deltaSeconds: number) {
  const currentIndex = trackIndexForCut(editableSegmentCuts.value[cutIndex] ?? 0);
  const targetSeconds = elapsedSecondsForTrackIndex(currentIndex) + deltaSeconds;
  setEditableCutByTrackIndex(cutIndex, nearestTrackIndexForElapsedSeconds(targetSeconds));
}

function formatElapsedTrackTime(index: number) {
  return formatSeconds(elapsedSecondsForTrackIndex(index));
}

function trackLabelForIndex(index: number) {
  const point = trackData.value[index];
  if (!point) return 'Unknown point';

  return `${formatElapsedTrackTime(index)} · ${formatDistanceMeters(point.dist)} · Point ${point.id}`;
}

function updateEditableCut(cutIndex: number, event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;

  const trackIndex = Number.parseInt(target.value, 10);
  setEditableCutByTrackIndex(cutIndex, trackIndex);
}

function addEditableCut() {
  if (trackData.value.length === 0) return;

  const preferredIndex = hoveredPointIndex.value ?? Math.floor(trackData.value.length / 2);
  const point = trackData.value[preferredIndex] ?? trackData.value[0];
  if (!point) return;

  editableSegmentCuts.value = [...editableSegmentCuts.value, point.id];
}

function removeEditableCut(cutIndex: number) {
  editableSegmentCuts.value = editableSegmentCuts.value.filter((_, index) => index !== cutIndex);
}

async function saveSegmentCutChanges() {
  if (!canApplySegmentCutChanges.value) return;

  isSavingSegmentSet.value = true;
  segmentMutationError.value = null;

  try {
    if (isCreatingSegmentSet.value) {
      const created = await createSegmentSet({
        name: draftSegmentSetName.value.trim(),
        activityId: props.id,
        cuts: sortedEditableSegmentCuts.value,
      });
      await loadSegmentSets();
      selectedSegmentSetId.value = created.id;
    } else if (selectedSegmentSetId.value !== null) {
      await updateSegmentSet(selectedSegmentSetId.value, { cuts: sortedEditableSegmentCuts.value });
      const updatedStatistics = await fetchSegmentStatistics(selectedSegmentSetId.value);
      segmentStatisticsById.value = {
        ...segmentStatisticsById.value,
        [updatedStatistics.segmentSetId]: updatedStatistics,
      };
    }

    cancelSegmentCutEdit();
    showSegmentStats.value = true;
  } catch (e: unknown) {
    segmentMutationError.value = e instanceof Error ? e.message : String(e);
  } finally {
    isSavingSegmentSet.value = false;
  }
}

async function deleteSelectedSegmentSet() {
  if (selectedSegmentSetId.value === null || isSavingSegmentSet.value) return;
  if (!window.confirm('Delete this segment set? This cannot be undone.')) return;

  isSavingSegmentSet.value = true;
  segmentMutationError.value = null;

  try {
    await deleteSegmentSet(selectedSegmentSetId.value);
    await loadSegmentSets();
  } catch (e: unknown) {
    segmentMutationError.value = e instanceof Error ? e.message : String(e);
  } finally {
    isSavingSegmentSet.value = false;
  }
}

function formatDistanceMeters(meters: number | null) {
  if (meters === null) return '-';
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${meters.toFixed(0)} m`;
}

function formatSeconds(seconds: number) {
  const wholeSeconds = Math.round(seconds);
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const remainingSeconds = wholeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatPace(secondsPerKm: number | null) {
  if (secondsPerKm === null) return '-';
  return `${formatSeconds(secondsPerKm)}/km`;
}

function formatSpeedMetersPerSecond(speed: number | null) {
  if (speed === null) return '-';
  return `${(speed * 3.6).toFixed(1)} km/h`;
}

function formatNullableMetric(value: number | null, unit: string) {
  if (value === null) return '-';
  return `${value.toFixed(0)} ${unit}`;
}

function formatSegmentElevation(gain: number | null, loss: number | null) {
  if (gain === null && loss === null) return '-';

  const gainLabel = gain === null ? '-' : `+${gain.toFixed(0)}`;
  const lossLabel = loss === null ? '-' : `-${loss.toFixed(0)}`;
  return `${gainLabel} / ${lossLabel} m`;
}

onMounted(() => {
  loadData();
});

watch(
  () => props.id,
  (newId) => {
    activityStore.fetchActivityImages(newId);
  }
);

// Callback to refresh just the summary when tags are edited
async function refreshActivity() {
  try {
    activity.value = await fetchActivitySummary(props.id);
  } catch (e) {
    console.error("Failed to refresh activity summary", e);
  }
}

const hasLocationData = computed(() => {
  if (!trackData.value || trackData.value.length === 0) return false;
  return trackData.value.some((p) => p.lat !== null && p.lon !== null);
});

async function handleDeleteConfirm() {
  isDeleting.value = true;
  const success = await activityStore.deleteActivity(props.id);

  if (success) {
    router.replace({ name: 'dashboard' });
  } else {
    isDeleting.value = false;
    showDeleteModal.value = false;
    alert('Failed to delete activity.');
  }
}
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 bg-verve-light/30 min-h-[calc(100vh-64px)]">
    <div v-if="isLoading" class="text-center text-verve-brown/60 py-12">
      Loading activity data...
    </div>
    <div v-else-if="error" class="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
      Error: {{ error }}
    </div>

    <div v-else-if="activity" class="max-w-7xl mx-auto space-y-8">
      <!-- 1. Top Metrics Display -->
      <div class="bg-white p-6 rounded-xl shadow-sm border border-verve-medium/30">
        <div class="flex justify-between items-start mb-6">
          <div>
            <h1 class="text-3xl font-bold text-verve-brown">
              {{ activity.name || new Date(activity.start).toLocaleDateString() }}
            </h1>
            <p v-if="activity.name" class="text-sm text-verve-brown/60 mt-1">
              {{ new Date(activity.start).toLocaleString() }}
            </p>
          </div>
          <div class="flex items-center space-x-3">
            <router-link :to="{ name: 'activity-edit', params: { id: activity.id } }"
              class="px-4 py-2 border border-verve-medium text-verve-brown font-semibold rounded-xl hover:bg-verve-light transition-colors text-sm">
              Edit
            </router-link>
            <button @click="showDeleteModal = true"
              class="px-3 py-2 border border-red-200 rounded-xl text-red-600 bg-white hover:bg-red-50 hover:border-red-300 transition-colors"
              title="Delete Activity">
              <Trash2 class="size-4" />
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 text-center">
          <div class="p-4 bg-verve-light/20 rounded-lg">
            <p class="text-2xl font-bold text-verve-brown">
              {{ activity.distance != null ? activity.distance.toFixed(2) : '-' }}
            </p>
            <p class="text-xs font-bold text-verve-brown/50 uppercase tracking-wider mt-1">km</p>
          </div>
          <div class="p-4 bg-verve-light/20 rounded-lg">
            <p class="text-2xl font-bold text-verve-brown">{{ activity.duration }}</p>
            <p class="text-xs font-bold text-verve-brown/50 uppercase tracking-wider mt-1">
              Duration
            </p>
          </div>
          <div class="p-4 bg-verve-light/20 rounded-lg">
            <p class="text-2xl font-bold text-verve-brown">
              {{ activity.elevationGain?.toFixed(0) ?? '-' }}
            </p>
            <p class="text-xs font-bold text-verve-brown/50 uppercase tracking-wider mt-1">m Gain</p>
          </div>
          <div class="p-4 bg-verve-light/20 rounded-lg">
            <p class="text-2xl font-bold text-verve-brown">
              {{ activity.avg_speed?.toFixed(1) ?? '-' }}
            </p>
            <p class="text-xs font-bold text-verve-brown/50 uppercase tracking-wider mt-1">
              Avg Speed
            </p>
          </div>
          <div class="p-4 bg-verve-light/20 rounded-lg">
            <p class="text-2xl font-bold text-verve-brown">
              {{ activity.max_speed?.toFixed(1) ?? '-' }}
            </p>
            <p class="text-xs font-bold text-verve-brown/50 uppercase tracking-wider mt-1">
              Max Speed
            </p>
          </div>
        </div>
      </div>

      <ActivityHighlights :activity-id="id" />

      <div v-if="trackData.length > 0" class="bg-white p-6 rounded-xl shadow-sm border border-verve-medium/30">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="text-xl font-bold text-verve-brown">Segments</h2>
            <p class="text-sm text-verve-brown/60 mt-1">
              Interval statistics for saved segment sets.
            </p>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select v-if="segmentSetIds.length > 0" :value="selectedSegmentSetId ?? ''" :disabled="isLoadingSegmentSets"
              class="px-3 py-2 border border-verve-medium rounded-xl text-sm text-verve-brown bg-white focus:outline-none focus:ring-2 focus:ring-verve-orange/30"
              @change="handleSegmentSetChange">
              <option v-for="segmentSetId in segmentSetIds" :key="segmentSetId" :value="segmentSetId">
                {{ segmentStatisticsById[segmentSetId]?.name ?? 'Segment set' }}
              </option>
            </select>

            <button v-if="selectedSegmentStatistics" type="button" @click="showSegmentStats = !showSegmentStats"
              class="px-4 py-2 rounded-xl text-sm font-semibold transition-colors" :class="showSegmentStats
                  ? 'bg-verve-brown text-white hover:bg-verve-brown/90'
                  : 'bg-verve-light text-verve-brown hover:bg-verve-medium/40'
                ">
              {{ showSegmentStats ? 'Hide stats' : 'Show stats' }}
            </button>

            <button v-if="selectedSegmentStatistics" type="button" :disabled="!canUseSegmentCutEdit"
              @click="isEditingSegmentCuts ? cancelSegmentCutEdit() : startSegmentCutEdit()"
              class="px-4 py-2 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :class="isEditingSegmentCuts
                  ? 'border-verve-brown text-verve-brown bg-white hover:bg-verve-light/50'
                  : 'border-verve-medium text-verve-brown bg-white hover:bg-verve-light/50'
                ">
              {{ isEditingSegmentCuts ? 'Cancel edit' : 'Edit cuts' }}
            </button>

            <button type="button" :disabled="!canStartNewSegmentSet" @click="startNewSegmentSet"
              class="px-4 py-2 rounded-xl text-sm font-semibold bg-verve-orange text-white hover:bg-verve-orange/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              New set
            </button>

            <button v-if="selectedSegmentStatistics" type="button" :disabled="isSavingSegmentSet"
              @click="deleteSelectedSegmentSet"
              class="px-4 py-2 rounded-xl text-sm font-semibold border border-red-200 text-red-600 bg-white hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              Delete
            </button>
          </div>
        </div>

        <div v-if="isLoadingSegmentSets" class="mt-4 text-sm text-verve-brown/60">
          Loading segment sets...
        </div>
        <div v-else-if="segmentSetError" class="mt-4 p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">
          {{ segmentSetError }}
        </div>
        <div v-else-if="segmentSetIds.length === 0" class="mt-4 text-sm text-verve-brown/60 italic">
          No segment sets saved for this activity.
        </div>

        <div v-if="segmentMutationError" class="mt-4 p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">
          {{ segmentMutationError }}
        </div>

        <div
          v-if="isEditingSegmentCuts"
          class="mt-6 p-4 rounded-xl bg-verve-light/20 border border-verve-medium/30"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 class="font-bold text-verve-brown">
                {{ isCreatingSegmentSet ? 'Create segment set' : 'Edit cut points' }}
              </h3>
              <p class="text-sm text-verve-brown/60 mt-1">{{ trackData.length }} track points</p>
            </div>
            <button
              type="button"
              @click="addEditableCut"
              class="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white border border-verve-medium text-sm font-semibold text-verve-brown hover:bg-verve-light/60 transition-colors"
            >
              <Plus class="size-4" />
              <span>Add cut</span>
            </button>
          </div>

          <label
            v-if="isCreatingSegmentSet"
            class="block mt-4 text-sm font-semibold text-verve-brown"
          >
            Name
            <input
              v-model="draftSegmentSetName"
              type="text"
              class="mt-2 w-full px-3 py-2 border border-verve-medium rounded-xl text-sm text-verve-brown bg-white focus:outline-none focus:ring-2 focus:ring-verve-orange/30"
              placeholder="Interval set"
            />
          </label>

          <div
            v-if="editableSegmentCuts.length === 0"
            class="mt-4 text-sm text-verve-brown/60 italic"
          >
            No cuts selected yet.
          </div>

          <div v-else class="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
            <div
              v-for="(cutId, cutIndex) in editableSegmentCuts"
              :key="cutIndex"
              class="rounded-lg bg-white border border-verve-medium/40 p-4 shadow-sm"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-bold text-verve-brown">Cut {{ cutIndex + 1 }}</p>
                  <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span
                      class="rounded-md bg-verve-brown px-2 py-1 font-mono font-bold text-white"
                    >
                      {{ formatElapsedTrackTime(trackIndexForCut(cutId)) }}
                    </span>
                    <span
                      class="rounded-md bg-verve-light px-2 py-1 font-semibold text-verve-brown/80"
                    >
                      {{ formatDistanceMeters(trackData[trackIndexForCut(cutId)]?.dist ?? 0) }}
                    </span>
                    <span
                      class="rounded-md bg-white px-2 py-1 font-semibold text-verve-brown/50 ring-1 ring-verve-medium/40"
                    >
                      ID {{ cutId }}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  @click="removeEditableCut(cutIndex)"
                  class="inline-flex items-center justify-center rounded-md p-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                  :aria-label="`Remove cut ${cutIndex + 1}`"
                >
                  <Trash2 class="size-4" />
                </button>
              </div>

              <p class="mt-3 text-xs text-verve-brown/55">
                {{ trackLabelForIndex(trackIndexForCut(cutId)) }}
              </p>

              <p class="mt-2 text-xs font-semibold text-verve-brown/70">
                Segment duration: {{ durationBeforeCutId(cutId) === null ? '-' : formatSeconds(durationBeforeCutId(cutId)!) }}
              </p>

              <input
                type="range"
                min="0"
                :max="Math.max(trackData.length - 1, 0)"
                step="1"
                :value="trackIndexForCut(cutId)"
                class="cut-range mt-4 w-full"
                @input="updateEditableCut(cutIndex, $event)"
              />

              <div class="mt-3 grid grid-cols-4 gap-2">
                <button
                  type="button"
                  :disabled="trackIndexForCut(cutId) === 0"
                  class="cut-nudge-button"
                  :aria-label="`Move cut ${cutIndex + 1} back one minute`"
                  @click="nudgeEditableCutBySeconds(cutIndex, -60)"
                >
                  <ChevronsLeft class="size-4" />
                  <span>-1m</span>
                </button>
                <button
                  type="button"
                  :disabled="trackIndexForCut(cutId) === 0"
                  class="cut-nudge-button"
                  :aria-label="`Move cut ${cutIndex + 1} back one track point`"
                  @click="nudgeEditableCutByPoints(cutIndex, -1)"
                >
                  <ChevronLeft class="size-4" />
                  <span>-1</span>
                </button>
                <button
                  type="button"
                  :disabled="trackIndexForCut(cutId) >= trackData.length - 1"
                  class="cut-nudge-button"
                  :aria-label="`Move cut ${cutIndex + 1} forward one track point`"
                  @click="nudgeEditableCutByPoints(cutIndex, 1)"
                >
                  <span>+1</span>
                  <ChevronRight class="size-4" />
                </button>
                <button
                  type="button"
                  :disabled="trackIndexForCut(cutId) >= trackData.length - 1"
                  class="cut-nudge-button"
                  :aria-label="`Move cut ${cutIndex + 1} forward one minute`"
                  @click="nudgeEditableCutBySeconds(cutIndex, 60)"
                >
                  <span>+1m</span>
                  <ChevronsRight class="size-4" />
                </button>
              </div>
            </div>
          </div>

          <p
            v-if="finalEditableSegmentDuration !== null"
            class="mt-4 text-sm font-semibold text-verve-brown/70"
          >
            Final segment duration: {{ formatSeconds(finalEditableSegmentDuration) }}
          </p>

          <div class="mt-4 flex flex-col gap-2 text-sm">
            <p v-if="hasInvalidSegmentCuts" class="text-red-600">
              One or more cuts no longer match a track point.
            </p>
            <p v-if="hasDuplicateSegmentCuts" class="text-red-600">
              Two cuts point to the same track point.
            </p>
            <p v-if="!hasValidSegmentSetName" class="text-red-600">
              Segment set name is required.
            </p>
            <p v-if="canApplySegmentCutChanges" class="text-verve-brown/70">
              {{ sortedEditableSegmentCuts.length }} valid cuts ready, ordered by track position.
            </p>
          </div>

          <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button type="button" @click="cancelSegmentCutEdit"
              class="px-4 py-2 rounded-xl text-sm font-semibold border border-verve-medium text-verve-brown bg-white hover:bg-verve-light/50 transition-colors">
              Cancel
            </button>
            <button type="button" :disabled="!canApplySegmentCutChanges" @click="saveSegmentCutChanges"
              class="px-4 py-2 rounded-xl text-sm font-semibold bg-verve-brown text-white hover:bg-verve-brown/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {{ isSavingSegmentSet ? 'Saving...' : 'Save cuts' }}
            </button>
          </div>
        </div>

        <div v-if="showSegmentStats && selectedSegmentStatistics" class="mt-6 overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="text-left text-xs font-bold uppercase tracking-wider text-verve-brown/50 border-b border-verve-medium/30">
                <th class="py-3 pr-4">#</th>
                <th class="py-3 px-4">Distance</th>
                <th class="py-3 px-4">Duration</th>
                <th class="py-3 px-4">Pace</th>
                <th class="py-3 px-4">Speed</th>
                <th class="py-3 px-4">HR</th>
                <th class="py-3 px-4">Power</th>
                <th class="py-3 px-4">Cadence</th>
                <th class="py-3 pl-4">Elevation</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-verve-medium/20">
              <tr v-for="(segment, index) in selectedSegmentStatistics.segments" :key="index" class="text-verve-brown">
                <td class="py-3 pr-4 font-semibold">{{ index + 1 }}</td>
                <td class="py-3 px-4">{{ formatDistanceMeters(segment.distanceM) }}</td>
                <td class="py-3 px-4">{{ formatSeconds(segment.durationS) }}</td>
                <td class="py-3 px-4">{{ formatPace(segment.avgPaceSPerKm) }}</td>
                <td class="py-3 px-4">{{ formatSpeedMetersPerSecond(segment.speed?.avg ?? null) }}</td>
                <td class="py-3 px-4">{{ formatNullableMetric(segment.heartrate?.avg ?? null, 'bpm') }}</td>
                <td class="py-3 px-4">{{ formatNullableMetric(segment.power?.avg ?? null, 'W') }}</td>
                <td class="py-3 px-4">{{ formatNullableMetric(segment.cadence?.avg ?? null, 'rpm') }}</td>
                <td class="py-3 pl-4">
                  {{ formatSegmentElevation(segment.elevationGain, segment.elevationLoss) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 2. Charts & Map -->
      <template v-if="trackData && trackData.length > 0">
        <!-- Map -->
        <LeafletMap v-if="hasLocationData" :track-data="trackData" :hovered-index="hoveredPointIndex"
          :cut-indices="visibleSegmentCutIndices"
          @point-hover="handlePointHover" class="rounded-xl overflow-hidden shadow-sm border border-verve-medium/30" />

        <!-- Elevation Chart -->
        <div v-if="hasLocationData" class="bg-white p-6 rounded-xl shadow-sm border border-verve-medium/30">
          <h3 class="text-lg font-bold text-verve-brown mb-4">Elevation Profile</h3>
          <ElevationChart :track-data="trackData" :hovered-index="hoveredPointIndex"
            :cut-indices="visibleSegmentCutIndices" @point-hover="handlePointHover" />
        </div>

        <!-- Metrics Chart -->
        <div class="bg-white p-6 rounded-xl shadow-sm border border-verve-medium/30">
          <CombinedMetricsChart :track-data="trackData" :hovered-index="hoveredPointIndex"
            :cut-indices="visibleSegmentCutIndices"
            @point-hover="handlePointHover" />
        </div>
      </template>

      <div v-else
        class="text-center p-12 bg-white rounded-xl shadow-sm border border-verve-medium/30 text-verve-brown/50 italic">
        <p>No map or elevation data available for this activity.</p>
      </div>

      <!-- 3. Bottom Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <ActivityGallery :activity-id="id" :images="activityStore.activityImages"
          :is-loading="activityStore.isImagesLoading" />

        <div class="space-y-8">
          <ActivityLocationsWidget />

          <!-- Tags Widget -->
          <ActivityTagsWidget :activity-id="id" :current-tags="activity.tags" @updated="refreshActivity" />
        </div>
      </div>

      <ActivityEquipment :activity-id="id" />
    </div>
  </div>

  <!-- Security Modal -->
  <ConfirmDeleteModal :is-open="showDeleteModal" :is-deleting="isDeleting" title="Delete Activity"
    message="Are you sure you want to delete this activity? This action cannot be undone and will remove all associated data."
    @close="showDeleteModal = false" @confirm="handleDeleteConfirm" />
</template>

<style scoped>
.cut-range {
  min-height: 2rem;
  accent-color: var(--color-verve-orange);
  cursor: pointer;
}

.cut-nudge-button {
  min-height: 2.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  border: 1px solid rgb(205 212 164 / 70%);
  border-radius: 0.5rem;
  background: rgb(255 255 255 / 92%);
  color: var(--color-verve-brown);
  font-size: 0.75rem;
  font-weight: 700;
  transition:
    background-color 150ms ease,
    border-color 150ms ease,
    color 150ms ease;
}

.cut-nudge-button:hover:not(:disabled) {
  background: rgb(239 243 219 / 80%);
  border-color: var(--color-verve-medium);
}

.cut-nudge-button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}
</style>
