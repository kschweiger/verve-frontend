<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { TrackPoint } from '@/services/api';

const props = defineProps<{
  trackData: TrackPoint[];
}>();

const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;

const drawTrackOnMap = () => {
  // Guard against running if the map or data isn't ready
  if (!map || !props.trackData || props.trackData.length === 0) {
    return;
  }

  console.log("Drawing track on map with", props.trackData.length, "points.");

  const latLngs = props.trackData.map(p => [p.lat, p.lon] as L.LatLngExpression);
  const polyline = L.polyline(latLngs, { color: 'red' }).addTo(map);

  // Fit the map view to the bounds of the track
  map.fitBounds(polyline.getBounds());
};

// Initialize the map when the component is mounted
onMounted(() => {
  if (mapContainer.value) {
    map = L.map(mapContainer.value).setView([47.37, 8.54], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // This handles the case where the data arrived BEFORE the map was created.
    drawTrackOnMap();
  }
});

// Watch for the trackData to arrive
watch(() => props.trackData, () => {
  // This handles the case where the data arrives AFTER the map was created.
  drawTrackOnMap();
});
</script>

<template>
  <div ref="mapContainer" class="h-96 w-full rounded-lg shadow-md z-0"></div>
</template>

<style>
/* Add this to ensure map tiles render correctly and avoid grey areas */
.leaflet-container {
  z-index: 0;
}
</style>
