<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Activity } from '@/stores/activity';
import { fetchActivitySummary, fetchActivityTrack, type TrackPoint } from '@/services/api';
import ActivityEquipment from '@/components/ActivityEquipment.vue'; // <-- Import
// Child Components we will create next
import LeafletMap from '@/components/LeafletMap.vue';
import ElevationChart from '@/components/ElevationChart.vue';

// The activity ID is passed as a prop from the router
const props = defineProps<{
  id: string;
}>();

// Local state for this view
const activity = ref<Activity | null>(null);
const trackData = ref<TrackPoint[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
const hoveredPointIndex = ref<number | null>(null);
function handlePointHover(index: number | null) {
  hoveredPointIndex.value = index;
}

// Fetch all necessary data when the component mounts

onMounted(async () => {
  try {
    const [summaryResponse, trackResponse] = await Promise.all([
      fetchActivitySummary(props.id),
      fetchActivityTrack(props.id)
    ]);
    activity.value = summaryResponse;
    trackData.value = trackResponse;
  } catch (e: any) {
    error.value = e.message;
  } finally {
    isLoading.value = false;
  }
});

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
          <router-link :to="{ name: 'activity-edit', params: { id: activity.id } }"
            class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            Edit
          </router-link>
        </div>
        <!-- <h1 class="text-2xl font-bold text-gray-800">{{ activity.name }} - {{ new Date(activity.start).toLocaleString() -->
        <!--   }} -->
        <!-- </h1> -->
        <div class="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
          <div>
            <p class="text-2xl font-bold">{{ (activity.distance).toFixed(2) }}</p>
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

      <!-- 2. Leaflet Map -->

      <template v-if="trackData && trackData.length > 0">
        <LeafletMap :track-data="trackData" :hovered-index="hoveredPointIndex" @point-hover="handlePointHover" />

        <div class="bg-white p-6 rounded-lg shadow-md">
          <h3 class="text-xl font-bold text-gray-800 mb-4">Elevation Profile</h3>
          <ElevationChart :track-data="trackData" :hovered-index="hoveredPointIndex" @point-hover="handlePointHover" />
        </div>
      </template>


      <div v-else-if="activity" class="max-w-7xl mx-auto space-y-8">
        <ActivityEquipment :activity-id="id" />
      </div>


      <!-- Show a message if there is no track data -->
      <div v-else class="text-center p-6 bg-white rounded-lg shadow-md text-gray-500">
        <p>No map or elevation data available for this activity.</p>
      </div>


    </div>
  </div>
</template>
