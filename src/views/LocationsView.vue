<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLocationStore, type Location } from '@/stores/location';
import { useTypeStore } from '@/stores/types';
import { VERVE_COLORS, getCategoryColor } from '@/utils/colors'; // Import helper
import ActivityListItem from '@/components/ActivityListItem.vue';
import { Trash2, Plus, Edit2, Check, X as IconX } from 'lucide-vue-next';
import LocationCreateModal from '@/components/forms/LocationCreateModal.vue';
import LocationGoalCreateForm from '@/components/forms/LocationGoalCreateForm.vue';

const route = useRoute();
const router = useRouter();
const locationStore = useLocationStore();
const typeStore = useTypeStore();

// Map State
const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let markersLayer: L.LayerGroup | null = null;

const isSidebarOpen = ref(false);
const isAddingLocation = ref(false);
const showCreateModal = ref(false);
const showGoalModal = ref(false);
const newLocationCoords = ref<{ lat: number, lng: number } | undefined>(undefined);

// Edit Type State
const isEditingType = ref(false);
const editTypeId = ref<number | null>(null);
const editSubTypeId = ref<number | null>(null);

// Global Filters State
const filterTypeId = ref<number | null>(null);
const filterSubTypeId = ref<number | null>(null);

const filterAvailableSubTypes = computed(() => {
  if (!filterTypeId.value) return [];
  const found = typeStore.locationTypes.find(t => t.id === filterTypeId.value);
  return found ? found.sub_types : [];
});

watch(filterTypeId, () => {
  filterSubTypeId.value = null;
  handleMapMove();
});

watch(filterSubTypeId, () => {
  handleMapMove();
});

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
  await typeStore.fetchLocationTypes();

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
  }, {
    typeId: filterTypeId.value,
    subTypeId: filterSubTypeId.value
  });
}

// --- UPDATED: Color Coded Markers ---
watch(() => locationStore.visibleLocations, (newLocations) => {
  if (!map || !markersLayer) return;
  markersLayer.clearLayers();

  newLocations.forEach(loc => {
    // Determine color based on Type ID
    const color = getCategoryColor(loc.type_id);

    const marker = L.circleMarker([loc.latitude, loc.longitude], {
      radius: 8,
      color: '#ffffff', // White stroke for contrast
      weight: 2,
      fillColor: color,
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
  isEditingType.value = false;
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

const currentLocationTypeName = computed(() => {
  const loc = locationStore.selectedLocation;
  if (!loc || !loc.type_id) return 'Uncategorized';
  const type = typeStore.locationTypes.find(t => t.id === loc.type_id);
  if (!type) return 'Unknown Type';

  let label = type.name;
  if (loc.sub_type_id) {
    const sub = type.sub_types.find(s => s.id === loc.sub_type_id);
    if (sub) label += ` • ${sub.name}`;
  }
  return label;
});

const editAvailableSubTypes = computed(() => {
  if (!editTypeId.value) return [];
  const found = typeStore.locationTypes.find(t => t.id === editTypeId.value);
  return found ? found.sub_types : [];
});

watch(editTypeId, () => {
  editSubTypeId.value = null;
});

function startEditingType() {
  if (!locationStore.selectedLocation) return;
  editTypeId.value = locationStore.selectedLocation.type_id || null;
  editSubTypeId.value = locationStore.selectedLocation.sub_type_id || null;
  isEditingType.value = true;
}

async function saveTypeChange() {
  if (!locationStore.selectedLocation || !editTypeId.value) return;

  await locationStore.updateLocationType(
    locationStore.selectedLocation.id,
    editTypeId.value,
    editSubTypeId.value
  );
  isEditingType.value = false;

  // Refresh visible markers to update colors immediately
  handleMapMove();
}
</script>

<template>
  <div class="relative h-[calc(100vh-64px)] w-full overflow-hidden">

    <!-- Map Container -->
    <div ref="mapContainer" class="h-full w-full z-0"></div>

    <!-- Filter Controls (Top Right) -->
    <div
      class="absolute top-4 right-4 z-[500] flex gap-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-xl shadow-md border border-verve-medium/30">
      <select v-model="filterTypeId"
        class="text-xs border-transparent bg-transparent font-bold text-verve-brown focus:ring-0 cursor-pointer hover:bg-verve-light/50 rounded-lg py-1 px-2 transition-colors">
        <option :value="null">All Categories</option>
        <option v-for="t in typeStore.locationTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>

      <div v-if="filterTypeId && filterAvailableSubTypes.length > 0" class="w-px bg-verve-medium/30 mx-1"></div>

      <select v-if="filterTypeId && filterAvailableSubTypes.length > 0" v-model="filterSubTypeId"
        class="text-xs border-transparent bg-transparent text-verve-brown focus:ring-0 cursor-pointer hover:bg-verve-light/50 rounded-lg py-1 px-2 transition-colors">
        <option :value="null">All Sub-Categories</option>
        <option v-for="st in filterAvailableSubTypes" :key="st.id" :value="st.id">{{ st.name }}</option>
      </select>
    </div>

    <!-- Toolbar (Top-Left) -->
    <div class="absolute top-4 left-14 z-[500] flex flex-col space-y-2">
      <button v-if="!isAddingLocation" @click="startAddMode"
        class="bg-white p-2 rounded-xl shadow-md border-2 border-verve-medium/30 text-verve-brown hover:text-verve-orange hover:border-verve-medium transition-colors"
        title="Add Location">
        <Plus class="size-4" />
      </button>

      <button v-else @click="cancelAddMode"
        class="bg-white p-2 rounded-xl shadow-md border-2 border-verve-orange text-verve-orange hover:bg-verve-light transition-colors animate-pulse"
        title="Cancel">
        <IconX class="size-6" />
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
        <div class="p-6 bg-white border-b border-verve-medium/30">
          <div class="flex justify-between items-start mb-2">
            <h2 class="text-2xl font-bold text-verve-brown leading-tight">{{ locationStore.selectedLocation.name }}</h2>
            <button @click="closeSidebar"
              class="text-verve-brown/40 hover:text-verve-brown p-1 hover:bg-verve-light rounded-lg transition-colors">
              <IconX class="size-6" />
            </button>
          </div>

          <!-- Type Display / Edit -->
          <div class="mb-3">
            <div v-if="!isEditingType" class="flex items-center gap-2 group">
              <!-- ADDED: Dynamic Color Dot -->
              <div class="size-3 rounded-full shrink-0"
                :style="{ backgroundColor: getCategoryColor(locationStore.selectedLocation.type_id) }"
                :title="currentLocationTypeName">
              </div>
              <span
                class="text-xs font-bold uppercase tracking-wider text-verve-brown/60 bg-verve-light/50 px-2 py-0.5 rounded">
                {{ currentLocationTypeName }}
              </span>
              <button @click="startEditingType"
                class="text-verve-brown/30 hover:text-verve-brown opacity-0 group-hover:opacity-100 transition-all"
                title="Edit Category">
                <Edit2 class="size-3" />
              </button>
            </div>

            <div v-else class="flex flex-col gap-2 bg-verve-light/20 p-2 rounded-lg border border-verve-medium/20">
              <select v-model="editTypeId"
                class="text-xs border-verve-medium rounded-md py-1 text-verve-brown bg-white">
                <option :value="null">No Category</option>
                <option v-for="t in typeStore.locationTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
              <select v-model="editSubTypeId" :disabled="!editTypeId || editAvailableSubTypes.length === 0"
                class="text-xs border-verve-medium rounded-md py-1 text-verve-brown disabled:opacity-50 bg-white">
                <option :value="null">No Sub-Category</option>
                <option v-for="st in editAvailableSubTypes" :key="st.id" :value="st.id">{{ st.name }}</option>
              </select>
              <div class="flex gap-2 justify-end mt-1">
                <button @click="isEditingType = false" class="p-1 text-red-500 hover:bg-red-50 rounded">
                  <IconX class="size-3" />
                </button>
                <button @click="saveTypeChange" class="p-1 text-green-600 hover:bg-green-50 rounded">
                  <Check class="size-3" />
                </button>
              </div>
            </div>
          </div>

          <p class="text-verve-brown/60 text-sm mt-1" v-if="locationStore.selectedLocation.description">
            {{ locationStore.selectedLocation.description }}
          </p>
          <div class="text-xs text-verve-brown/40 mt-2 font-mono">
            {{ locationStore.selectedLocation.latitude.toFixed(4) }}, {{
              locationStore.selectedLocation.longitude.toFixed(4) }}
          </div>
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
              <Trash2 class="size-4" />
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
