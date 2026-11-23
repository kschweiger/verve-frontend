<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useActivityStore } from '@/stores/activity';
import { removeTrackExtensionData, type SupportedTrackExtension } from '@/services/api';
import { ApiResponseError } from '@/services/authHeaders';
import ActivityExportButton from '@/components/ActivityExportButton.vue';
import ActivityEquipment from '@/components/ActivityEquipment.vue';
import ActivityWorkout from '@/components/ActivityWorkout.vue';
import { useTypeStore } from '@/stores/types';
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
import { getAvailableTrackExtensions } from '@/utils/trackExtensions';
import { useCadence } from '@/composables/useCadence';
import { useActivityDateTime } from '@/composables/useActivityDateTime';
import { useActivityDetail } from '@/composables/useActivityDetail';
import { useAccountSession } from '@/composables/useAccountSession';
import { useLatestRequest } from '@/composables/useLatestRequest';
const props = defineProps<{
  id: string;
}>();

const router = useRouter();
const { locale, t } = useI18n();

const activityStore = useActivityStore();

const locationStore = useLocationStore();
const typeStore = useTypeStore();
void typeStore.fetchActivityTypes();
const isStrengthTraining = computed(() =>
  typeStore.activityTypes.some(
    (type) => type.id === activity.value?.type_id && type.name === 'Strength Training'
  )
);

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
const activityDateTime = useActivityDateTime(activity, locale);
const localTimeUnavailable = computed(() => {
  if (!activity.value || activityDateTime.value.isLocalTimeAvailable) return null;
  return t('activities.row.localTimeUnavailable', {
    timestamp: activity.value.start,
    timezone: activity.value.timezone,
  });
});
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
const trackExtensionError = ref<{ detail?: string } | null>(null);
const trackExtensionRefreshError = ref(false);
const isRefreshingTrackExtensionData = ref(false);
const activityHighlightsKey = ref(0);
const activitySummaryMetrics = computed(() => {
  return activity.value === null ? [] : buildActivitySummaryMetrics(activity.value, locale.value);
});

const availableTrackExtensions = computed(() => getAvailableTrackExtensions(trackData.value));

const selectedTrackExtensionLabel = computed(() =>
  t(`activityDetail.sensor.${selectedTrackExtension.value ?? 'generic'}`)
);

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
    alert(t('activityDetail.deleteActivity.failed'));
  }
}

function openTrackExtensionModal() {
  trackExtensionError.value = null;
  trackExtensionRefreshError.value = false;
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
  trackExtensionRefreshError.value = false;
  try {
    const refreshed = await refreshDetails();
    if (!isCurrent() || !refreshed) return;
    activityHighlightsKey.value += 1;
  } catch {
    if (!isCurrent()) return;
    trackExtensionRefreshError.value = true;
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
    trackExtensionError.value = e instanceof ApiResponseError ? { detail: e.detail } : {};
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
  trackExtensionRefreshError.value = false;
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
    <div v-if="isLoading" class="text-center text-verve-brown/60 py-12" role="status">
      {{ t('activityDetail.loading') }}
    </div>
    <div v-else-if="error" class="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
      <p role="alert">
        {{ error.detail
          ? t('activityDetail.loadErrorDetail', { detail: error.detail })
          : t('activityDetail.loadError') }}
      </p>
      <button
        type="button"
        @click="reload"
        class="mt-3 rounded-lg px-3 py-2 font-bold underline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {{ t('activityDetail.retry') }}
      </button>
    </div>

    <div v-else-if="activity" :key="activity.id" class="max-w-7xl mx-auto space-y-8">
      <!-- 1. Top Metrics Display -->
      <div class="bg-white p-6 rounded-xl shadow-sm border border-verve-medium/30">
        <div class="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div>
            <h1 class="text-3xl font-bold text-verve-brown">
              {{ activity.name || (localTimeUnavailable ? t('activityDetail.unnamed') : activityDateTime.date) }}
            </h1>
            <p class="text-sm text-verve-brown/60 mt-1">
              <time :datetime="activity.start">{{ localTimeUnavailable ?? activityDateTime.dateTime }}</time>
              <span v-if="!localTimeUnavailable" class="block break-words">{{ activity.timezone }}</span>
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <ActivityExportButton :activity-id="activity.id" />
            <button
              v-if="availableTrackExtensions.length > 0"
              type="button"
              class="px-4 py-2 border border-verve-medium text-verve-brown font-semibold rounded-xl hover:bg-verve-light transition-colors text-sm"
              @click="openTrackExtensionModal"
            >
              {{ t('activityDetail.sensor.title') }}
            </button>
            <router-link
              :to="{ name: 'activity-edit', params: { id: activity.id } }"
              class="px-4 py-2 border border-verve-medium text-verve-brown font-semibold rounded-xl hover:bg-verve-light transition-colors text-sm"
            >
              {{ t('activityDetail.edit') }}
            </router-link>
            <button
              type="button"
              @click="showDeleteModal = true"
              class="px-3 py-2 border border-red-200 rounded-xl text-red-600 bg-white hover:bg-red-50 hover:border-red-300 transition-colors"
              :aria-label="t('activityDetail.deleteActivity.title')"
              :title="t('activityDetail.deleteActivity.title')"
            >
              <Trash2 aria-hidden="true" class="size-4" />
            </button>
          </div>
        </div>

        <div :class="activitySummaryMetricListClasses">
          <div
            v-for="metric in activitySummaryMetrics"
            :key="metric.key"
            :class="activitySummaryMetricCardClasses"
          >
            <p class="text-2xl font-bold text-verve-brown">{{ metric.value }}</p>
            <p class="text-xs font-bold text-verve-brown/50 uppercase tracking-wider mt-1">
              {{ t(`activityDetail.metrics.${metric.key}`) }}
            </p>
            <p v-if="metric.totalDuration" class="mt-1 text-xs text-verve-brown/45">
              {{ t('activityDetail.totalDuration', { duration: metric.totalDuration }) }}
            </p>
          </div>
        </div>

        <div
          v-if="trackExtensionRefreshError"
          class="mt-4 flex flex-col gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <p>{{ t('activityDetail.sensor.refreshError') }}</p>
          <button
            type="button"
            :disabled="isRefreshingTrackExtensionData"
            class="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-2 font-semibold transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            @click="refreshTrackExtensionViews"
          >
            {{ t(isRefreshingTrackExtensionData ? 'activityDetail.sensor.refreshing' : 'activityDetail.sensor.refresh') }}
          </button>
        </div>
      </div>

      <ActivityMetadataWidget v-if="activityMetadata" :metadata="activityMetadata" />

      <ActivityWorkout v-if="isStrengthTraining" :activity-id="activity.id" />

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
          <h3 class="text-lg font-bold text-verve-brown mb-4">{{ t('activityDetail.elevationProfile') }}</h3>
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
        <p>{{ t('activityDetail.noTrack') }}</p>
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
    :title="t('activityDetail.deleteActivity.title')"
    :message="t('activityDetail.deleteActivity.description')"
    :confirm-label="t('activityDetail.deleteActivity.confirm')"
    :confirming-label="t('activityDetail.deleteActivity.deleting')"
    :cancel-label="t('activityDetail.cancel')"
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
    :title="t('activityDetail.sensor.removeTitle', { sensor: selectedTrackExtensionLabel })"
    :message="t('activityDetail.sensor.removeDescription', { sensor: selectedTrackExtensionLabel })"
    :confirm-label="t('activityDetail.sensor.removeConfirm', { sensor: selectedTrackExtensionLabel })"
    :confirming-label="t('activityDetail.sensor.removing')"
    :cancel-label="t('activityDetail.cancel')"
    :error-message="trackExtensionError && (trackExtensionError.detail || t('activityDetail.sensor.removeError'))"
    @close="closeTrackExtensionConfirmation"
    @confirm="handleTrackExtensionRemoval"
  />
</template>
