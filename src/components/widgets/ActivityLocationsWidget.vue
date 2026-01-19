<script setup lang="ts">
import { useLocationStore } from '@/stores/location';

const locationStore = useLocationStore();

// Helper to format coordinates nicely
const formatCoords = (lat: number, lng: number) => `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
</script>

<template>
  <div class="bg-white p-6 rounded-xl shadow-sm border border-verve-medium/30">
    <h3 class="text-xl font-bold text-verve-brown mb-4">Matched Locations</h3>

    <div v-if="locationStore.isLoading" class="text-verve-brown/60 text-sm animate-pulse py-2">
      Checking locations...
    </div>

    <div v-else-if="locationStore.currentActivityLocations.length > 0" class="space-y-3">
      <router-link v-for="loc in locationStore.currentActivityLocations" :key="loc.id"
        :to="{ name: 'locations', query: { focus_id: loc.id, lat: loc.latitude, lng: loc.longitude } }"
        class="block group border border-verve-medium/20 rounded-xl p-3 hover:border-verve-medium/50 hover:bg-verve-light/20 transition-all">
        <div class="flex justify-between items-start">
          <div class="flex items-start">
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

          <!-- Chevron -->
          <svg xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-verve-brown/20 group-hover:text-verve-brown/50 transition-colors" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>

        <p v-if="loc.description" class="text-sm text-verve-brown/70 mt-2 pl-10 line-clamp-2 leading-relaxed">
          {{ loc.description }}
        </p>
      </router-link>
    </div>

    <div v-else
      class="text-verve-brown/40 text-center py-8 italic border border-dashed border-verve-medium/30 rounded-xl bg-verve-light/10 text-sm">
      No known locations matched this activity.
    </div>
  </div>
</template>
