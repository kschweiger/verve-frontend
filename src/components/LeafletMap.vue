<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { TrackPoint } from '@/services/api';

const props = defineProps<{
  trackData: TrackPoint[];
  hoveredIndex: number | null;
}>();


const emit = defineEmits<{
  (e: 'point-hover', index: number | null): void;
}>();


const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let hoverMarker: L.CircleMarker | null = null;
let trackPolyline: L.Polyline | null = null;

const drawTrackOnMap = () => {
  if (!map || !props.trackData || props.trackData.length === 0) return;

  const latLngs = props.trackData.map(p => [p.lat, p.lon] as L.LatLngExpression);

  // If the polyline already exists, just update its points (optional optimization)
  if (trackPolyline) {
    trackPolyline.setLatLngs(latLngs);
  } else {
    trackPolyline = L.polyline(latLngs, { color: 'red' }).addTo(map);

    // --- 2. ADD MOUSEMOVE EVENT LISTENER ---
    trackPolyline.on('mousemove', (e: L.LeafletMouseEvent) => {
      if (!trackPolyline) return;

      // This is a Leaflet utility to find the closest point on the line to the mouse
      const closestPoint = (e.target as L.Polyline).closestLayerPoint(e.layerPoint);
      if (!closestPoint) return;

      // Now we need to find which index in our original data corresponds to this point
      // This is computationally intensive, so we do it smartly.
      let minDistance = Infinity;
      let closestIndex = -1;

      // Find the closest vertex in our data to the mouse position
      props.trackData.forEach((point, index) => {
        const pointLatLng = L.latLng(point.lat, point.lon);
        const distance = e.latlng.distanceTo(pointLatLng);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });

      // Emit the index if we found one
      if (closestIndex !== -1 && closestIndex !== props.hoveredIndex) {
        emit('point-hover', closestIndex);
      }
    });

  }

  map.fitBounds(trackPolyline.getBounds());
};

// Initialize the map when the component is mounted
onMounted(() => {
  if (mapContainer.value) {
    map = L.map(mapContainer.value).setView([47.37, 8.54], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    map.on('mouseout', () => {
      // Only emit if we are currently showing a hover marker. This prevents unnecessary events.
      if (props.hoveredIndex !== null) {
        emit('point-hover', null);
      }
    });
    // This handles the case where the data arrived BEFORE the map was created.
    drawTrackOnMap();
  }
});

// Watch for the trackData to arrive
watch(() => props.trackData, () => {
  // This handles the case where the data arrives AFTER the map was created.
  drawTrackOnMap();
});

watch(() => props.hoveredIndex, (newIndex) => {
  if (!map) return; // Make sure the map is ready

  // If the hover ends (index is null), remove the marker
  if (newIndex === null) {
    if (hoverMarker) {
      hoverMarker.remove();
      hoverMarker = null;
    }
    return;
  }

  // If we have a valid index, get the coordinates
  const point = props.trackData[newIndex];
  if (!point) return;

  const latLng: L.LatLngExpression = [point.lat, point.lon];

  if (hoverMarker) {
    // If the marker already exists, just move it (more efficient)
    hoverMarker.setLatLng(latLng);
  } else {
    // Otherwise, create the marker
    hoverMarker = L.circleMarker(latLng, {
      radius: 8,
      color: '#ffffff',
      weight: 2,
      fillColor: '#ef4444', // A reddish color
      fillOpacity: 1,
    }).addTo(map);
  }
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
