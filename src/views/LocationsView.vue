<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLocationStore, type Location } from '@/stores/location';
import ActivityListItem from '@/components/ActivityListItem.vue';
import IconTrash from '@/components/icons/IconTrash.vue';
import IconPlus from '@/components/icons/IconPlus.vue';
import LocationCreateModal from '@/components/forms/LocationCreateModal.vue';
import LocationGoalCreateForm from '@/components/forms/LocationGoalCreateForm.vue';

const route = useRoute();
const router = useRouter();
const locationStore = useLocationStore();

// Map State
const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let markersLayer: L.LayerGroup | null = null;

const isSidebarOpen = ref(false);
const isAddingLocation = ref(false);
const showCreateModal = ref(false);
const showGoalModal = ref(false);

const newLocationCoords = ref<{ lat: number, lng: number } | undefined>(undefined);

// --- Fix: Imperatively update cursor to prevent Vue DOM patching issues ---
watch(isAddingLocation, (val) => {
  if (mapContainer.value) {
    mapContainer.value.style.cursor = val ? 'crosshair' : '';
  }
});

async function determineInitialCenter(): Promise<L.LatLngExpression> {
  const center = await locationStore.findLocationMapCenter();
  return center;
}

onMounted(async () => {
  if (mapContainer.value) {
    let center: L.LatLngExpression;
    let initialZoom = 10;

    // 1. Check for Query Params (Deep Linking)
    if (route.query.lat && route.query.lng) {
      const qLat = Number(route.query.lat);
      const qLng = Number(route.query.lng);
      if (!isNaN(qLat) && !isNaN(qLng)) {
        center = [qLat, qLng];
        initialZoom = 14; // Zoom in closer for specific location
      } else {
        center = await locationStore.findLocationMapCenter();
      }
    } else {
      center = await locationStore.findLocationMapCenter();
    }

    // 2. Initialize Map
    map = L.map(mapContainer.value).setView(center, initialZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);

    // Event Listeners
    map.on('moveend', handleMapMove);
    map.on('zoomend', handleMapMove);
    map.on('click', handleMapBackgroundClick);

    // Initial Fetch
    handleMapMove();

    // 3. If deep linked to a specific ID, select it immediately
    if (route.query.focus_id) {
      const focusId = String(route.query.focus_id);
      await locationStore.selectLocation(focusId);
      isSidebarOpen.value = true;

      // Clean up URL so refresh doesn't stick to this location forever?
      // Optional: router.replace({ query: {} });
      // Keeping it is usually better for sharing links.
    }
  }
});

onUnmounted(() => {
  if (map) {
    map.off();
    map.remove();
  }
});

function handleMapMove() {
  if (!map) return;
  const bounds = map.getBounds();
  locationStore.fetchLocationsInBounds({
    latMin: bounds.getSouth(),
    latMax: bounds.getNorth(),
    lngMin: bounds.getWest(),
    lngMax: bounds.getEast()
  });
}

watch(() => locationStore.visibleLocations, (newLocations) => {
  if (!map || !markersLayer) return;
  markersLayer.clearLayers();
  newLocations.forEach(loc => {
    const marker = L.marker([loc.latitude, loc.longitude]);
    marker.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      handleMarkerClick(loc);
    });
    markersLayer!.addLayer(marker);
  });
});

async function handleMarkerClick(location: Location) {
  if (isAddingLocation.value) return;
  if (map) map.panTo([location.latitude, location.longitude], { animate: true });
  await locationStore.selectLocation(location.id);
  isSidebarOpen.value = true;
}

function handleMapBackgroundClick(e: L.LeafletMouseEvent) {
  if (isAddingLocation.value) {
    newLocationCoords.value = { lat: e.latlng.lat, lng: e.latlng.lng };
    showCreateModal.value = true;
    isAddingLocation.value = false;
  } else {
    closeSidebar();
  }
}

function startAddMode() {
  closeSidebar();
  isAddingLocation.value = true;
}

function cancelAddMode() {
  isAddingLocation.value = false;
}

function handleCreationSaved() {
  showCreateModal.value = false;
  handleMapMove();
}

function closeSidebar() {
  isSidebarOpen.value = false;
  locationStore.selectedLocation = null;
}

async function handleDeleteLocation() {
  if (!locationStore.selectedLocation) return;
  if (!confirm(`Delete location "${locationStore.selectedLocation.name}"?`)) return;

  const success = await locationStore.deleteLocation(locationStore.selectedLocation.id);
  if (success) closeSidebar();
}

function handleCreateGoal() {
  if (!locationStore.selectedLocation) return;
  showGoalModal.value = true;
}

function handleGoalSaved() {
  showGoalModal.value = false;
}
</script>

<template>
  <div class="relative h-[calc(100vh-64px)] w-full overflow-hidden">

    <!-- Map Container: REMOVED :class binding -->
    <div ref="mapContainer" class="h-full w-full z-0"></div>

    <!-- Toolbar (Top-Left) -->
    <div class="absolute top-4 left-14 z-[500] flex flex-col space-y-2">
      <button v-if="!isAddingLocation" @click="startAddMode"
        class="bg-white p-2 rounded-md shadow-md border-2 border-transparent hover:border-gray-300 text-gray-700 hover:text-indigo-600 transition-colors"
        title="Add Location">
        <IconPlus class="w-6 h-6" />
      </button>

      <button v-else @click="cancelAddMode"
        class="bg-white p-2 rounded-md shadow-md border-2 border-indigo-500 text-indigo-600 hover:bg-gray-50 transition-colors animate-pulse"
        title="Cancel">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Instruction Toast -->
    <Transition enter-active-class="transform transition ease-out duration-300"
      enter-from-class="-translate-y-20 opacity-0" enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition ease-in duration-200" leave-from-class="opacity-100"
      leave-to-class="-translate-y-20 opacity-0">
      <div v-if="isAddingLocation"
        class="absolute top-4 left-1/2 -translate-x-1/2 z-[500] bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold flex items-center pointer-events-none">
        <span>📍 Click map to place location</span>
      </div>
    </Transition>

    <!-- Sidebar Overlay -->
    <Transition enter-active-class="transform transition ease-out duration-300" enter-from-class="translate-x-full"
      enter-to-class="translate-x-0" leave-active-class="transform transition ease-in duration-300"
      leave-from-class="translate-x-0" leave-to-class="translate-x-full">
      <aside v-if="isSidebarOpen && locationStore.selectedLocation"
        class="absolute top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-[1000] flex flex-col border-l border-gray-200">
        <div class="p-4 bg-indigo-600 text-white flex justify-between items-start shadow-md">
          <div>
            <h2 class="text-xl font-bold">{{ locationStore.selectedLocation.name }}</h2>
            <p class="text-indigo-100 text-sm mt-1" v-if="locationStore.selectedLocation.description">
              {{ locationStore.selectedLocation.description }}
            </p>
            <div class="text-xs text-indigo-200 mt-2 font-mono">
              {{ locationStore.selectedLocation.latitude.toFixed(4) }}, {{
                locationStore.selectedLocation.longitude.toFixed(4) }}
            </div>
          </div>
          <button @click="closeSidebar" class="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="flex-grow overflow-y-auto p-4 bg-gray-50">
          <div class="flex space-x-2 mb-6">
            <button @click="handleCreateGoal"
              class="flex-1 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 shadow-sm flex items-center justify-center gap-2">
              <span>🎯</span> Create Goal
            </button>
            <button @click="handleDeleteLocation"
              class="px-3 py-2 bg-white border border-red-200 text-red-600 rounded-md hover:bg-red-50 shadow-sm">
              <IconTrash class="w-5 h-5" />
            </button>
          </div>

          <div>
            <h3 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Matched Activities ({{
              locationStore.selectedLocationActivities.length }})</h3>
            <div v-if="locationStore.isLoading" class="flex justify-center py-4"><span
                class="animate-pulse text-gray-400">Loading history...</span></div>
            <div v-else-if="locationStore.selectedLocationActivities.length > 0" class="space-y-3">
              <div v-for="act in locationStore.selectedLocationActivities" :key="act.id"
                class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <ActivityListItem :activity="act" :compact="true" />
              </div>
            </div>
            <div v-else class="text-center py-8 text-gray-400 bg-white rounded-lg border border-dashed border-gray-300">
              <p>No activities matched to this location yet.</p>
            </div>
          </div>
        </div>
      </aside>
    </Transition>

    <LocationCreateModal v-if="showCreateModal" :initial-lat="newLocationCoords?.lat"
      :initial-lng="newLocationCoords?.lng" @close="showCreateModal = false" @saved="handleCreationSaved" />
    <div v-if="showGoalModal"
      class="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <!-- Using the new specific form -->
        <LocationGoalCreateForm v-if="locationStore.selectedLocation"
          :location="{ id: locationStore.selectedLocation.id, name: locationStore.selectedLocation.name }"
          @close="showGoalModal = false" @saved="handleGoalSaved" />
      </div>
    </div>
  </div>
</template>
