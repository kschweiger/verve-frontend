<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLocationStore, type Location } from '@/stores/location';
import { VERVE_COLORS } from '@/utils/colors'; // <--- Import Colors
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

    if (route.query.lat && route.query.lng) {
      const qLat = Number(route.query.lat);
      const qLng = Number(route.query.lng);
      if (!isNaN(qLat) && !isNaN(qLng)) {
        center = [qLat, qLng];
        initialZoom = 14;
      } else {
        center = await determineInitialCenter();
      }
    } else {
      center = await determineInitialCenter();
    }

    map = L.map(mapContainer.value).setView(center, initialZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);

    map.on('moveend', handleMapMove);
    map.on('zoomend', handleMapMove);
    map.on('click', handleMapBackgroundClick);

    handleMapMove();

    if (route.query.focus_id) {
      const focusId = String(route.query.focus_id);
      await locationStore.selectLocation(focusId);
      isSidebarOpen.value = true;
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
    // UPDATED: Use CircleMarker with Verve Orange
    const marker = L.circleMarker([loc.latitude, loc.longitude], {
      radius: 8,
      color: '#ffffff',
      weight: 2,
      fillColor: VERVE_COLORS.orange,
      fillOpacity: 1
    });

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

    <!-- Map Container -->
    <div ref="mapContainer" class="h-full w-full z-0"></div>

    <!-- Toolbar (Top-Left) -->
    <div class="absolute top-4 left-14 z-[500] flex flex-col space-y-2">
      <button v-if="!isAddingLocation" @click="startAddMode"
        class="bg-white p-2 rounded-xl shadow-md border-2 border-verve-medium/30 text-verve-brown hover:text-verve-orange hover:border-verve-medium transition-colors"
        title="Add Location">
        <IconPlus class="w-6 h-6" />
      </button>

      <button v-else @click="cancelAddMode"
        class="bg-white p-2 rounded-xl shadow-md border-2 border-verve-orange text-verve-orange hover:bg-verve-light transition-colors animate-pulse"
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
        class="absolute top-4 left-1/2 -translate-x-1/2 z-[500] bg-verve-brown text-white px-5 py-2.5 rounded-xl shadow-lg text-sm font-bold flex items-center pointer-events-none border border-verve-light/20">
        <span>📍 Click map to place location</span>
      </div>
    </Transition>

    <!-- Sidebar Overlay -->
    <Transition enter-active-class="transform transition ease-out duration-300" enter-from-class="translate-x-full"
      enter-to-class="translate-x-0" leave-active-class="transform transition ease-in duration-300"
      leave-from-class="translate-x-0" leave-to-class="translate-x-full">
      <aside v-if="isSidebarOpen && locationStore.selectedLocation"
        class="absolute top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-[1000] flex flex-col border-l border-verve-medium/30">
        <!-- Sidebar Header -->
        <div class="p-6 bg-white border-b border-verve-medium/30 flex justify-between items-start">
          <div>
            <h2 class="text-2xl font-bold text-verve-brown leading-tight">{{ locationStore.selectedLocation.name }}</h2>
            <p class="text-verve-brown/60 text-sm mt-1" v-if="locationStore.selectedLocation.description">
              {{ locationStore.selectedLocation.description }}
            </p>
            <div class="text-xs text-verve-brown/40 mt-2 font-mono">
              {{ locationStore.selectedLocation.latitude.toFixed(4) }}, {{
                locationStore.selectedLocation.longitude.toFixed(4) }}
            </div>
          </div>
          <button @click="closeSidebar"
            class="text-verve-brown/40 hover:text-verve-brown p-1 hover:bg-verve-light rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Scrollable Content -->
        <div class="flex-grow overflow-y-auto p-6 bg-verve-light/30">

          <div class="flex space-x-3 mb-8">
            <button @click="handleCreateGoal"
              class="flex-1 py-2.5 bg-verve-neon border border-verve-dark/5 text-verve-brown rounded-xl text-sm font-bold hover:brightness-105 shadow-sm flex items-center justify-center gap-2 transition-all">
              <span>🎯</span> Create Goal
            </button>
            <button @click="handleDeleteLocation"
              class="px-4 py-2.5 bg-white border border-red-200 text-red-500 rounded-xl hover:bg-red-50 shadow-sm transition-colors">
              <IconTrash class="w-5 h-5" />
            </button>
          </div>

          <div>
            <h3 class="text-xs font-bold text-verve-brown/50 uppercase tracking-wider mb-3">Matched Activities ({{
              locationStore.selectedLocationActivities.length }})</h3>

            <div v-if="locationStore.isLoading" class="flex justify-center py-4">
              <span class="animate-pulse text-verve-brown/60 text-sm">Loading history...</span>
            </div>

            <div v-else-if="locationStore.selectedLocationActivities.length > 0" class="space-y-3">
              <div v-for="act in locationStore.selectedLocationActivities" :key="act.id"
                class="bg-white rounded-xl shadow-sm border border-verve-medium/20 overflow-hidden">
                <ActivityListItem :activity="act" :compact="true" />
              </div>
            </div>

            <div v-else
              class="text-center py-8 text-verve-brown/40 bg-white/50 rounded-xl border border-dashed border-verve-medium/30">
              <p class="text-sm">No activities matched to this location yet.</p>
            </div>
          </div>
        </div>
      </aside>
    </Transition>

    <LocationCreateModal v-if="showCreateModal" :initial-lat="newLocationCoords?.lat"
      :initial-lng="newLocationCoords?.lng" @close="showCreateModal = false" @saved="handleCreationSaved" />

    <div v-if="showGoalModal"
      class="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-verve-brown/20 backdrop-blur-sm">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <LocationGoalCreateForm v-if="locationStore.selectedLocation"
          :location="{ id: locationStore.selectedLocation.id, name: locationStore.selectedLocation.name }"
          @close="showGoalModal = false" @saved="handleGoalSaved" />
      </div>
    </div>

  </div>
</template>
