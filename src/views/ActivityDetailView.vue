<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useActivityStore } from '@/stores/activity';
import { removeTrackExtensionData, type SupportedTrackExtension } from '@/services/api';
import ActivityEquipment from '@/components/ActivityEquipment.vue';
import ActivityHighlights from '@/components/ActivityHighlights.vue';
import ActivitySegmentsPanel from '@/components/ActivitySegmentsPanel.vue';
import LeafletMap from '@/components/LeafletMap.vue';
import ElevationChart from '@/components/ElevationChart.vue';
import ActivityGallery from '@/components/ActivityGallery.vue';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal.vue';
import TrackExtensionDataModal from '@/components/TrackExtensionDataModal.vue';
import ActivityMetadataWidget from '@/components/widgets/ActivityMetadataWidget.vue';
import { Trash2 } from '@lucide/vue';
import ActivityLocationsWidget from '@/components/widgets/ActivityLocationsWidget.vue';
import CombinedMetricsChart from '@/components/CombinedMetricsChart.vue';
import { useLocationStore } from '@/stores/location';
import ActivityTagsWidget from '@/components/widgets/ActivityTagsWidget.vue';
import { parseActivityMetadata } from '@/activityMetadata/registry';
import {
  activitySummaryMetricCardClasses,
  activitySummaryMetricListClasses,
  buildActivitySummaryMetrics,
} from '@/utils/activitySummaryMetrics';
import { getAvailableTrackExtensions, trackExtensionLabels } from '@/utils/trackExtensions';
import { useCadence } from '@/composables/useCadence';
import { useActivityDateTime } from '@/composables/useActivityDateTime';
import { useActivityDetail } from '@/composables/useActivityDetail';
import { useAccountSession } from '@/composables/useAccountSession';
import { useLatestRequest } from '@/composables/useLatestRequest';
const props = defineProps<{
  id: string;
}>();

const router = useRouter();

const activityStore = useActivityStore();

const locationStore = useLocationStore();

const {
  activity,
  trackData,
  isLoading,
  error,
  reload,
  refresh: refreshDetails,
  refreshSummary,
  captureActivity,
} = useActivityDetail(() => props.id);
const activityDateTime = useActivityDateTime(activity);
const cadenceUnit = useCadence(activity);
const beginExtensionRefresh = useLatestRequest(captureActivity);

const hoveredPointIndex = ref<number | null>(null);
const visibleSegmentCutIndices = ref<number[]>([]);

function handlePointHover(index: number | null) {
  hoveredPointIndex.value = index;
}

const showDeleteModal = ref(false);
const isDeleting = ref(false);
const showTrackExtensionModal = ref(false);
const showTrackExtensionConfirmModal = ref(false);
const selectedTrackExtension = ref<SupportedTrackExtension | null>(null);
const isRemovingTrackExtension = ref(false);
const trackExtensionError = ref<string | null>(null);
const trackExtensionRefreshError = ref<string | null>(null);
const isRefreshingTrackExtensionData = ref(false);
const activityHighlightsKey = ref(0);
const activitySummaryMetrics = computed(() => {
  return activity.value === null ? [] : buildActivitySummaryMetrics(activity.value);
});

const availableTrackExtensions = computed(() => getAvailableTrackExtensions(trackData.value));

const selectedTrackExtensionLabel = computed(() => {
  return selectedTrackExtension.value === null
    ? 'sensor'
    : trackExtensionLabels[selectedTrackExtension.value];
});

const activityMetadata = computed(() => parseActivityMetadata(activity.value?.metaData ?? null));

async function refreshActivity() {
  try {
    await refreshSummary();
  } catch (cause: unknown) {
    console.error('Failed to refresh activity summary', cause);
  }
}

const hasLocationData = computed(() => {
  if (!trackData.value || trackData.value.length === 0) return false;
  return trackData.value.some((p) => p.lat !== null && p.lon !== null);
});

async function handleDeleteConfirm() {
  const isCurrent = captureActivity();
  const activityId = props.id;
  isDeleting.value = true;
  const success = await activityStore.deleteActivity(activityId);
  if (!isCurrent()) return;

  if (success) {
    router.replace({ name: 'dashboard' });
  } else {
    isDeleting.value = false;
    showDeleteModal.value = false;
    alert('Failed to delete activity.');
  }
}

function openTrackExtensionModal() {
  trackExtensionError.value = null;
  trackExtensionRefreshError.value = null;
  showTrackExtensionModal.value = true;
}

function startTrackExtensionRemoval(extension: SupportedTrackExtension) {
  selectedTrackExtension.value = extension;
  trackExtensionError.value = null;
  showTrackExtensionModal.value = false;
  showTrackExtensionConfirmModal.value = true;
}

function closeTrackExtensionConfirmation() {
  if (isRemovingTrackExtension.value) return;
  showTrackExtensionConfirmModal.value = false;
  selectedTrackExtension.value = null;
  trackExtensionError.value = null;
}

async function refreshTrackExtensionViews() {
  const isCurrent = beginExtensionRefresh();
  isRefreshingTrackExtensionData.value = true;
  trackExtensionRefreshError.value = null;
  try {
    const refreshed = await refreshDetails();
    if (!isCurrent() || !refreshed) return;
    activityHighlightsKey.value += 1;
  } catch {
    if (!isCurrent()) return;
    trackExtensionRefreshError.value =
      'Sensor data was removed, but this activity could not be refreshed. Try refreshing it again.';
  } finally {
    if (isCurrent()) isRefreshingTrackExtensionData.value = false;
  }
}

async function handleTrackExtensionRemoval() {
  const isCurrent = captureActivity();
  const activityId = props.id;
  if (selectedTrackExtension.value === null) return;

  isRemovingTrackExtension.value = true;
  trackExtensionError.value = null;

  try {
    await removeTrackExtensionData(activityId, selectedTrackExtension.value);
    if (!isCurrent()) return;
    showTrackExtensionConfirmModal.value = false;
    selectedTrackExtension.value = null;
  } catch (e: unknown) {
    if (!isCurrent()) return;
    trackExtensionError.value =
      e instanceof Error ? e.message : 'Failed to remove the selected sensor data.';
    return;
  } finally {
    if (isCurrent()) {
      isRemovingTrackExtension.value = false;
    }
  }

  await refreshTrackExtensionViews();
  if (!isCurrent()) return;
}
function resetTransientState() {
  hoveredPointIndex.value = null;
  visibleSegmentCutIndices.value = [];
  showDeleteModal.value = false;
  isDeleting.value = false;
  showTrackExtensionModal.value = false;
  showTrackExtensionConfirmModal.value = false;
  selectedTrackExtension.value = null;
  isRemovingTrackExtension.value = false;
  trackExtensionError.value = null;
  trackExtensionRefreshError.value = null;
  isRefreshingTrackExtensionData.value = false;
  activityHighlightsKey.value = 0;
}
useAccountSession(resetTransientState);
watch(
  () => props.id,
  (id) => {
    resetTransientState();
    void activityStore.fetchActivityImages(id);
    void locationStore.fetchLocationsForActivity(id);
  },
  { immediate: true }
);
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 bg-verve-light/30 min-h-[calc(100vh-64px)]">
    <div v-if="isLoading" class="text-center text-verve-brown/60 py-12">
      Loading activity data...
    </div>
    <div v-else-if="error" class="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
      <p role="alert">Error: {{ error }}</p>
      <button
        type="button"
        @click="reload"
        class="mt-3 rounded-lg px-3 py-2 font-bold underline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Retry activity
      </button>
    </div>

    <div v-else-if="activity" :key="activity.id" class="max-w-7xl mx-auto space-y-8">
      <!-- 1. Top Metrics Display -->
      <div class="bg-white p-6 rounded-xl shadow-sm border border-verve-medium/30">
        <div class="flex justify-between items-start mb-6">
          <div>
            <h1 class="text-3xl font-bold text-verve-brown">
              {{ activity.name || activityDateTime.date }}
            </h1>
            <p class="text-sm text-verve-brown/60 mt-1">
              <time :datetime="activity.start">{{ activityDateTime.dateTime }}</time>
              <span class="block break-words">{{ activity.timezone }}</span>
            </p>
          </div>
          <div class="flex items-center space-x-3">
            <button
              v-if="availableTrackExtensions.length > 0"
              type="button"
              class="px-4 py-2 border border-verve-medium text-verve-brown font-semibold rounded-xl hover:bg-verve-light transition-colors text-sm"
              @click="openTrackExtensionModal"
            >
              Sensor data
            </button>
            <router-link
              :to="{ name: 'activity-edit', params: { id: activity.id } }"
              class="px-4 py-2 border border-verve-medium text-verve-brown font-semibold rounded-xl hover:bg-verve-light transition-colors text-sm"
            >
              Edit
            </router-link>
            <button
              @click="showDeleteModal = true"
              class="px-3 py-2 border border-red-200 rounded-xl text-red-600 bg-white hover:bg-red-50 hover:border-red-300 transition-colors"
              title="Delete Activity"
            >
              <Trash2 class="size-4" />
            </button>
          </div>
        </div>

        <div :class="activitySummaryMetricListClasses">
          <div
            v-for="metric in activitySummaryMetrics"
            :key="metric.label"
            :class="activitySummaryMetricCardClasses"
          >
            <p class="text-2xl font-bold text-verve-brown">{{ metric.value }}</p>
            <p class="text-xs font-bold text-verve-brown/50 uppercase tracking-wider mt-1">
              {{ metric.label }}
            </p>
            <p v-if="metric.secondary" class="mt-1 text-xs text-verve-brown/45">
              {{ metric.secondary }}
            </p>
          </div>
        </div>

        <div
          v-if="trackExtensionRefreshError"
          class="mt-4 flex flex-col gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <p>{{ trackExtensionRefreshError }}</p>
          <button
            type="button"
            :disabled="isRefreshingTrackExtensionData"
            class="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-2 font-semibold transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            @click="refreshTrackExtensionViews"
          >
            {{ isRefreshingTrackExtensionData ? 'Refreshing...' : 'Refresh activity' }}
          </button>
        </div>
      </div>

      <ActivityMetadataWidget v-if="activityMetadata" :metadata="activityMetadata" />

      <ActivityHighlights :key="activityHighlightsKey" :activity-id="id" />

      <ActivitySegmentsPanel
        :key="`${activity.id}:${activityHighlightsKey}`"
        :activity-id="activity.id"
        :cadence-unit="cadenceUnit"
        :track-data="trackData"
        :hovered-index="hoveredPointIndex"
        @cuts-change="visibleSegmentCutIndices = $event"
      />

      <!-- 2. Charts & Map -->
      <template v-if="trackData && trackData.length > 0">
        <!-- Map -->
        <LeafletMap
          v-if="hasLocationData"
          :track-data="trackData"
          :hovered-index="hoveredPointIndex"
          :cut-indices="visibleSegmentCutIndices"
          @point-hover="handlePointHover"
          class="rounded-xl overflow-hidden shadow-sm border border-verve-medium/30"
        />

        <!-- Elevation Chart -->
        <div
          v-if="hasLocationData"
          class="bg-white p-6 rounded-xl shadow-sm border border-verve-medium/30"
        >
          <h3 class="text-lg font-bold text-verve-brown mb-4">Elevation Profile</h3>
          <ElevationChart
            :track-data="trackData"
            :hovered-index="hoveredPointIndex"
            :cut-indices="visibleSegmentCutIndices"
            @point-hover="handlePointHover"
          />
        </div>

        <!-- Metrics Chart -->
        <div class="bg-white p-6 rounded-xl shadow-sm border border-verve-medium/30">
          <CombinedMetricsChart
            :cadence-unit="cadenceUnit"
            :track-data="trackData"
            :hovered-index="hoveredPointIndex"
            :cut-indices="visibleSegmentCutIndices"
            @point-hover="handlePointHover"
          />
        </div>
      </template>

      <div
        v-else
        class="text-center p-12 bg-white rounded-xl shadow-sm border border-verve-medium/30 text-verve-brown/50 italic"
      >
        <p>No map or elevation data available for this activity.</p>
      </div>

      <!-- 3. Bottom Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <ActivityGallery
          :activity-id="id"
          :images="activityStore.activityImages"
          :is-loading="activityStore.isImagesLoading"
        />

        <div class="space-y-8">
          <ActivityLocationsWidget />

          <!-- Tags Widget -->
          <ActivityTagsWidget
            :activity-id="id"
            :current-tags="activity.tags"
            @updated="refreshActivity"
          />
        </div>
      </div>

      <ActivityEquipment :activity-id="id" />
    </div>
  </div>

  <!-- Security Modal -->
  <ConfirmDeleteModal
    :is-open="showDeleteModal"
    :is-deleting="isDeleting"
    title="Delete Activity"
    message="Are you sure you want to delete this activity? This action cannot be undone and will remove all associated data."
    @close="showDeleteModal = false"
    @confirm="handleDeleteConfirm"
  />

  <TrackExtensionDataModal
    :is-open="showTrackExtensionModal"
    :extensions="availableTrackExtensions"
    @close="showTrackExtensionModal = false"
    @remove="startTrackExtensionRemoval"
  />

  <ConfirmDeleteModal
    :is-open="showTrackExtensionConfirmModal"
    :is-deleting="isRemovingTrackExtension"
    :title="`Remove ${selectedTrackExtensionLabel} data?`"
    :message="`This permanently removes ${selectedTrackExtensionLabel.toLowerCase()} readings from this activity. This action cannot be undone.`"
    :confirm-label="`Remove ${selectedTrackExtensionLabel} data`"
    confirming-label="Removing..."
    :error-message="trackExtensionError"
    @close="closeTrackExtensionConfirmation"
    @confirm="handleTrackExtensionRemoval"
  />
</template>
