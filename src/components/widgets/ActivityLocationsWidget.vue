<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useLocationStore, type LocationSearchResult } from '@/stores/location';
import { Plus, X, Search, Loader2 } from 'lucide-vue-next';

const route = useRoute();
const locationStore = useLocationStore();

const activityId = computed(() => route.params.id as string);

const showAddMode = ref(false);
const isAdding = ref(false);

const dropdownRef = ref<HTMLElement | null>(null);
const searchQuery = ref('');
const isDropdownOpen = ref(false);
const isSearching = ref(false);
const searchResults = ref<LocationSearchResult[]>([]);
const selectedLocationId = ref<string | null>(null);

const formatCoords = (lat: number, lng: number) => `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

const displayList = computed(() => {
  const currentIds = new Set(locationStore.currentActivityLocations.map((l) => l.id));

  if (!searchQuery.value.trim()) {
    // If input is empty, show all available locations from standard fetch
    return locationStore.availableLocations
      .filter((l) => !currentIds.has(l.id))
      .map((l) => ({ id: l.id, phrase: l.name }));
  }

  // If typing, show fuzzy search results
  return searchResults.value.filter((r) => !currentIds.has(r.id));
});

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

function handleSearchInput() {
  selectedLocationId.value = null; // Clear strict selection on text change
  isDropdownOpen.value = true;

  if (searchTimeout) clearTimeout(searchTimeout);

  const q = searchQuery.value.trim();
  if (!q) {
    searchResults.value = [];
    isSearching.value = false;
    return;
  }

  isSearching.value = true;
  searchTimeout = setTimeout(async () => {
    searchResults.value = await locationStore.searchLocations(q);
    isSearching.value = false;
  }, 300);
}

function selectOption(item: { id: string; phrase: string }) {
  selectedLocationId.value = item.id;
  searchQuery.value = item.phrase;
  isDropdownOpen.value = false;
}

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isDropdownOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});

function toggleAddMode() {
  if (!showAddMode.value) {
    locationStore.fetchAllLocations();
  }
  showAddMode.value = !showAddMode.value;
  selectedLocationId.value = null;
  searchQuery.value = '';
  searchResults.value = [];
  isDropdownOpen.value = false;
}

async function handleAdd() {
  if (!selectedLocationId.value || !activityId.value) return;
  isAdding.value = true;

  const success = await locationStore.addLocationToActivity(activityId.value, selectedLocationId.value);
  isAdding.value = false;

  if (success) {
    showAddMode.value = false;
    selectedLocationId.value = null;
    searchQuery.value = '';
    searchResults.value = [];
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
  <div class="bg-white p-6 rounded-xl shadow-sm border border-verve-medium/30 overflow-visible">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-bold text-verve-brown">Matched Locations</h3>
      <button @click="toggleAddMode"
        class="p-2 bg-verve-light hover:bg-verve-medium text-verve-brown rounded-lg transition-colors"
        :title="showAddMode ? 'Cancel' : 'Add Location'">
        <component :is="showAddMode ? X : Plus" class="size-4" />
      </button>
    </div>

    <!-- Hybrid Add Location Form -->
    <div v-if="showAddMode" class="mb-4 p-3 bg-verve-light/20 rounded-xl border border-verve-medium/20">
      <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-2">Find or Select Location</label>

      <div class="flex gap-2">
        <div class="relative grow" ref="dropdownRef">
          <!-- Search Input -->
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-verve-brown/40 pointer-events-none" />
            <input v-model="searchQuery" @focus="isDropdownOpen = true" @input="handleSearchInput" type="text"
              placeholder="Search database..."
              class="w-full text-sm border-verve-medium rounded-xl py-2 pl-9 pr-3 text-verve-brown focus:ring-verve-dark bg-white" />
            <Loader2 v-if="isSearching"
              class="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-verve-orange" />
          </div>

          <!-- Dropdown List -->
          <transition enter-active-class="transition ease-out duration-100" enter-from-class="opacity-0 translate-y-1"
            enter-to-class="opacity-100 translate-y-0" leave-active-class="transition ease-in duration-75"
            leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-1">
            <div v-if="isDropdownOpen"
              class="absolute z-50 w-full mt-1 bg-white border border-verve-medium/30 rounded-xl shadow-xl max-h-48 overflow-y-auto">
              <div v-if="displayList.length === 0 && !isSearching"
                class="p-3 text-xs text-verve-brown/50 text-center italic">
                No matching locations found.
              </div>
              <ul v-else class="py-1">
                <li v-for="loc in displayList" :key="loc.id" @click="selectOption(loc)"
                  class="px-3 py-2 text-sm text-verve-brown hover:bg-verve-light cursor-pointer transition-colors">
                  {{ loc.phrase }}
                </li>
              </ul>
            </div>
          </transition>
        </div>

        <button @click="handleAdd" :disabled="!selectedLocationId || isAdding"
          class="px-4 py-2 bg-verve-neon text-verve-brown text-sm font-bold rounded-xl shadow-sm hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed border border-verve-dark/5 transition-all">
          {{ isAdding ? 'Adding...' : 'Add' }}
        </button>
      </div>
    </div>

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
