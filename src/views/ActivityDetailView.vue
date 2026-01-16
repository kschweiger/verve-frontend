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
import IconTrash from '@/components/icons/IconTrash.vue';
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
      locationStore.fetchLocationsForActivity(props.id)
    ]);
    activity.value = summaryResponse;
    trackData.value = trackResponse;
  } catch (e: any) {
    error.value = e.message;
  } finally {
    isLoading.value = false;
  }
});
watch(() => props.id, (newId) => {
  activityStore.fetchActivityImages(newId);
});

const hasLocationData = computed(() => {
  if (!trackData.value || trackData.value.length === 0) return false;
  // Check if at least one point has lat/lon
  return trackData.value.some(p => p.lat !== null && p.lon !== null);
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
  <div class="p-4 sm:p-6 lg:p-8">
    <div v-if="isLoading" class="text-center text-gray-500">Loading activity data...</div>
    <div v-else-if="error" class="p-4 bg-red-100 text-red-700 rounded-md">Error: {{ error }}</div>

    <div v-else-if="activity" class="max-w-7xl mx-auto space-y-8">
      <!-- 1. Top Metrics Display -->
      <div class="bg-white p-6 rounded-lg shadow-md">
        <div class="flex justify-between items-start">
          <div>
            <!-- Add a name if it exists, otherwise show the date -->
            <h1 class="text-2xl font-bold text-gray-800">{{ activity.name || new Date(activity.start).toLocaleString()
            }}</h1>
            <p v-if="activity.name" class="text-sm text-gray-500">{{ new Date(activity.start).toLocaleString() }}</p>
          </div>
          <div class="flex items-center space-x-3">
            <router-link :to="{ name: 'activity-edit', params: { id: activity.id } }"
              class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              Edit
            </router-link>
            <button @click="showDeleteModal = true"
              class="px-3 py-2 border border-red-200 rounded-md shadow-sm text-sm font-medium text-red-600 bg-white hover:bg-red-50 hover:border-red-300 transition-colors"
              title="Delete Activity">
              <IconTrash class="w-5 h-5" />
            </button>
          </div>
        </div>
        <!-- <h1 class="text-2xl font-bold text-gray-800">{{ activity.name }} - {{ new Date(activity.start).toLocaleString() -->
        <!--   }} -->
        <!-- </h1> -->
        <div class="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
          <div>
            <p class="text-2xl font-bold">
              {{ activity.distance != null ? activity.distance.toFixed(2) : '-' }}
            </p>
            <p class="text-sm text-gray-500">km</p>
          </div>
          <div>
            <p class="text-2xl font-bold">{{ activity.duration }}</p>
            <p class="text-sm text-gray-500">Duration</p>
          </div>
          <div>
            <p class="text-2xl font-bold">{{ activity.elevationGain?.toFixed(0) ?? 'N/A' }}</p>
            <p class="text-sm text-gray-500">m Gain</p>
          </div>
          <div>
            <p class="text-2xl font-bold">{{ activity.avg_speed?.toFixed(1) ?? 'N/A' }}</p>
            <p class="text-sm text-gray-500">Average speed [km/h]</p>
          </div>
          <div>
            <p class="text-2xl font-bold">{{ activity.max_speed?.toFixed(1) ?? 'N/A' }}</p>
            <p class="text-sm text-gray-500">Mixumum speed [km/h]</p>
          </div>
          <!-- Add Avg Speed, HR, Power here as they become available -->
        </div>
      </div>

      <ActivityHighlights :activity-id="id" />
      <!-- 2. Leaflet Map -->

      <template v-if="trackData && trackData.length > 0">
        <LeafletMap v-if="hasLocationData" :track-data="trackData" :hovered-index="hoveredPointIndex"
          @point-hover="handlePointHover" />
        <!-- <div v-else class="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center"> -->
        <!--   <p class="text-gray-500 italic">No GPS data available for this activity.</p> -->
        <!-- </div> -->
        <div v-if="hasLocationData" class="bg-white p-6 rounded-lg shadow-md">
          <h3 class="text-xl font-bold text-gray-800 mb-4">Elevation Profile</h3>
          <ElevationChart :track-data="trackData" :hovered-index="hoveredPointIndex" @point-hover="handlePointHover" />
        </div>
        <div class="bg-white p-6 rounded-lg shadow-md">
          <CombinedMetricsChart :track-data="trackData" :hovered-index="hoveredPointIndex"
            @point-hover="handlePointHover" />
        </div>
      </template>
      <!-- Show a message if there is no track data -->
      <div v-else class="text-center p-6 bg-white rounded-lg shadow-md text-gray-500">
        <p>No map or elevation data available for this activity.</p>
      </div>


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
    message="Are you sure you want to delete this activity? This action cannot be undone and will remove all associated data, including track points and photos."
    @close="showDeleteModal = false" @confirm="handleDeleteConfirm" />

</template>
