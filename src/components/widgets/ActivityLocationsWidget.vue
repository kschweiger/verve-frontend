<script setup lang="ts">
import { useLocationStore } from '@/stores/location';

const locationStore = useLocationStore();

// Helper to format coordinates nicely
const formatCoords = (lat: number, lng: number) => `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
</script>

<template>
  <div class="bg-white p-6 rounded-lg shadow-md">
    <h3 class="text-xl font-bold text-gray-800 mb-4">Matched Locations</h3>

    <div v-if="locationStore.isLoading" class="text-gray-500 text-sm animate-pulse">
      Checking locations...
    </div>

    <div v-else-if="locationStore.currentActivityLocations.length > 0" class="space-y-3">
      <router-link v-for="loc in locationStore.currentActivityLocations" :key="loc.id"
        :to="{ name: 'locations', query: { focus_id: loc.id, lat: loc.latitude, lng: loc.longitude } }"
        class="block group border border-gray-200 rounded-lg p-3 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
        <div class="flex justify-between items-start">
          <div class="flex items-start">
            <span class="text-2xl mr-3">📍</span>
            <div>
              <p class="font-bold text-gray-800 group-hover:text-indigo-700 transition-colors">
                {{ loc.name }}
              </p>
              <p class="text-xs text-gray-500 font-mono mt-0.5">
                {{ formatCoords(loc.latitude, loc.longitude) }}
              </p>
            </div>
          </div>

          <!-- Chevron -->
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 group-hover:text-indigo-500" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>

        <p v-if="loc.description" class="text-sm text-gray-600 mt-2 pl-9 line-clamp-2">
          {{ loc.description }}
        </p>
      </router-link>
    </div>

    <div v-else class="text-gray-400 text-center py-4 italic border border-dashed border-gray-200 rounded-lg">
      No known locations matched this activity.
    </div>
  </div>
</template>
