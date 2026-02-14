<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import type { Activity } from '@/stores/activity';
import { useActivityStore } from '@/stores/activity';
import { fetchActivitySummary, fetchActivityTrack, type TrackPoint } from '@/services/api';
import ActivityEquipment from '@/components/ActivityEquipment.vue';
import ActivityHighlights from '@/components/ActivityHighlights.vue';
import LeafletMap from '@/components/LeafletMap.vue';
import ElevationChart from '@/components/ElevationChart.vue';
import ActivityGallery from '@/components/ActivityGallery.vue';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal.vue';
import { Trash2 } from 'lucide-vue-next';
import ActivityLocationsWidget from '@/components/widgets/ActivityLocationsWidget.vue';
import CombinedMetricsChart from '@/components/CombinedMetricsChart.vue';
import { useLocationStore } from '@/stores/location';

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

function handlePointHover(index: number | null) {
  hoveredPointIndex.value = index;
}

const showDeleteModal = ref(false);
const isDeleting = ref(false);

onMounted(async () => {
  try {
    const [summaryResponse, trackResponse] = await Promise.all([
      fetchActivitySummary(props.id),
      fetchActivityTrack(props.id),
      activityStore.fetchActivityImages(props.id),
      locationStore.fetchLocationsForActivity(props.id),
    ]);
    activity.value = summaryResponse;
    trackData.value = trackResponse;
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    isLoading.value = false;
  }
});

watch(
  () => props.id,
  (newId) => {
    activityStore.fetchActivityImages(newId);
  }
);

const hasLocationData = computed(() => {
  if (!trackData.value || trackData.value.length === 0) return false;
  // Check if at least one point has lat/lon
  return trackData.value.some((p) => p.lat !== null && p.lon !== null);
});

async function handleDeleteConfirm() {
  isDeleting.value = true;
  const success = await activityStore.deleteActivity(props.id);

  if (success) {
    // Redirect to dashboard (replace prevents going back to deleted item)
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

      <!-- 2. Charts & Map -->
      <template v-if="trackData && trackData.length > 0">
        <!-- Map -->
        <LeafletMap v-if="hasLocationData" :track-data="trackData" :hovered-index="hoveredPointIndex"
          @point-hover="handlePointHover" class="rounded-xl overflow-hidden shadow-sm border border-verve-medium/30" />

        <!-- Elevation Chart -->
        <div v-if="hasLocationData" class="bg-white p-6 rounded-xl shadow-sm border border-verve-medium/30">
          <h3 class="text-lg font-bold text-verve-brown mb-4">Elevation Profile</h3>
          <ElevationChart :track-data="trackData" :hovered-index="hoveredPointIndex" @point-hover="handlePointHover" />
        </div>

        <!-- Metrics Chart -->
        <div class="bg-white p-6 rounded-xl shadow-sm border border-verve-medium/30">
          <CombinedMetricsChart :track-data="trackData" :hovered-index="hoveredPointIndex"
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

        <ActivityLocationsWidget />
      </div>

      <ActivityEquipment :activity-id="id" />
    </div>
  </div>

  <!-- Security Modal -->
  <ConfirmDeleteModal :is-open="showDeleteModal" :is-deleting="isDeleting" title="Delete Activity"
    message="Are you sure you want to delete this activity? This action cannot be undone and will remove all associated data."
    @close="showDeleteModal = false" @confirm="handleDeleteConfirm" />
</template>
