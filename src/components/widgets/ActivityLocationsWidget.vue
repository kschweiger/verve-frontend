<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useLocationStore } from '@/stores/location';
import { Plus, X } from 'lucide-vue-next';

const route = useRoute();
const locationStore = useLocationStore();

// The activity ID is in the route params 'id' because this widget is used in ActivityDetailView
const activityId = computed(() => route.params.id as string);

// UI State for Adding Location
const showAddMode = ref(false);
const selectedLocationId = ref<string | null>(null);
const isAdding = ref(false);

// Helper to format coordinates nicely
const formatCoords = (lat: number, lng: number) => `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

// Filter available locations to exclude those already assigned
const selectableLocations = computed(() => {
  const currentIds = new Set(locationStore.currentActivityLocations.map((l) => l.id));
  return locationStore.availableLocations.filter((l) => !currentIds.has(l.id));
});

function toggleAddMode() {
  if (!showAddMode.value) {
    // Fetch options when opening
    locationStore.fetchAllLocations();
  }
  showAddMode.value = !showAddMode.value;
  selectedLocationId.value = null;
}

async function handleAdd() {
  if (!selectedLocationId.value || !activityId.value) return;
  isAdding.value = true;
  const success = await locationStore.addLocationToActivity(activityId.value, selectedLocationId.value);
  isAdding.value = false;
  if (success) {
    showAddMode.value = false;
    selectedLocationId.value = null;
  } else {
    alert('Failed to add location.');
  }
}

async function handleRemove(locationId: string) {
  if (!confirm('Remove this location from the activity?')) return;
  await locationStore.removeLocationFromActivity(activityId.value, locationId);
}
</script>

<template>
  <div class="bg-white p-6 rounded-xl shadow-sm border border-verve-medium/30">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-bold text-verve-brown">Matched Locations</h3>
      <button @click="toggleAddMode"
        class="p-2 bg-verve-light hover:bg-verve-medium text-verve-brown rounded-lg transition-colors"
        :title="showAddMode ? 'Cancel' : 'Add Location'">
        <component :is="showAddMode ? X : Plus" class="size-4" />
      </button>
    </div>

    <!-- Add Location Form -->
    <div v-if="showAddMode" class="mb-4 p-3 bg-verve-light/20 rounded-xl border border-verve-medium/20">
      <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-2">Select Location</label>
      <div class="flex gap-2">
        <select v-model="selectedLocationId"
          class="grow text-sm border-verve-medium rounded-xl py-2 px-3 text-verve-brown focus:ring-verve-dark bg-white">
          <option :value="null">Choose...</option>
          <option v-for="loc in selectableLocations" :key="loc.id" :value="loc.id">
            {{ loc.name }}
          </option>
        </select>
        <button @click="handleAdd" :disabled="!selectedLocationId || isAdding"
          class="px-4 py-2 bg-verve-neon text-verve-brown text-sm font-bold rounded-xl shadow-sm hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed">
          {{ isAdding ? 'Adding...' : 'Add' }}
        </button>
      </div>
      <p v-if="selectableLocations.length === 0" class="text-xs text-verve-brown/50 mt-2 italic">
        No other locations available.
      </p>
    </div>

    <!-- List -->
    <div v-if="locationStore.isLoading && !isAdding" class="text-verve-brown/60 text-sm animate-pulse py-2">
      Checking locations...
    </div>

    <div v-else-if="locationStore.currentActivityLocations.length > 0" class="space-y-3">
      <div v-for="loc in locationStore.currentActivityLocations" :key="loc.id"
        class="group border border-verve-medium/20 rounded-xl p-3 hover:border-verve-medium/50 hover:bg-verve-light/20 transition-all relative">

        <router-link :to="{ name: 'locations', query: { focus_id: loc.id, lat: loc.latitude, lng: loc.longitude } }"
          class="block">
          <div class="flex items-start pr-6">
            <span class="text-2xl mr-3 filter grayscale-[0.2]">📍</span>
            <div>
              <p class="font-bold text-verve-brown group-hover:text-verve-orange transition-colors">
                {{ loc.name }}
              </p>
              <p class="text-xs text-verve-brown/40 font-mono mt-0.5">
                {{ formatCoords(loc.latitude, loc.longitude) }}
              </p>
            </div>
          </div>

          <p v-if="loc.description" class="text-sm text-verve-brown/70 mt-2 pl-10 line-clamp-2 leading-relaxed">
            {{ loc.description }}
          </p>
        </router-link>

        <button @click.prevent="handleRemove(loc.id)"
          class="absolute top-3 right-3 text-verve-brown/20 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50"
          title="Remove location">
          <X class="size-4" />
        </button>
      </div>
    </div>

    <div v-else
      class="text-verve-brown/40 text-center py-8 italic border border-dashed border-verve-medium/30 rounded-xl bg-verve-light/10 text-sm">
      No locations assigned.
    </div>
  </div>
</template>
