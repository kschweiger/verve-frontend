<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { TrackPoint } from '@/services/api';
import { VERVE_COLORS } from '@/utils/colors';

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

  const latLngs = props.trackData
    .filter((p) => p.lat !== null && p.lon !== null)
    .map((p) => [p.lat!, p.lon!] as L.LatLngExpression);

  if (latLngs.length === 0) return;

  if (trackPolyline) {
    trackPolyline.setLatLngs(latLngs);
  } else {
    trackPolyline = L.polyline(latLngs, { color: VERVE_COLORS.orange }).addTo(map);

    trackPolyline.on('mousemove', (e: L.LeafletMouseEvent) => {
      if (!trackPolyline) return;

      const closestPoint = trackPolyline.closestLayerPoint(e.layerPoint);
      if (!closestPoint) return;

      let minDistance = Infinity;
      let closestIndex = -1;

      // Iterate original data to find index
      props.trackData.forEach((point, index) => {
        if (point.lat === null || point.lon === null) return;

        const pointLatLng = L.latLng(point.lat, point.lon);
        const distance = e.latlng.distanceTo(pointLatLng);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });

      if (closestIndex !== -1 && closestIndex !== props.hoveredIndex) {
        emit('point-hover', closestIndex);
      }
    });
  }

  map.fitBounds(trackPolyline.getBounds());
};

onMounted(() => {
  if (mapContainer.value) {
    map = L.map(mapContainer.value).setView([47.37, 8.54], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    map.on('mouseout', () => {
      if (props.hoveredIndex !== null) {
        emit('point-hover', null);
      }
    });

    drawTrackOnMap();
  }
});

watch(
  () => props.trackData,
  () => {
    drawTrackOnMap();
  }
);

watch(
  () => props.hoveredIndex,
  (newIndex) => {
    if (!map) return;

    if (newIndex === null) {
      if (hoverMarker) {
        hoverMarker.remove();
        hoverMarker = null;
      }
      return;
    }

    const point = props.trackData[newIndex];
    if (!point || point.lat === null || point.lon === null) return;

    const latLng: L.LatLngExpression = [point.lat, point.lon];

    if (hoverMarker) {
      hoverMarker.setLatLng(latLng);
    } else {
      hoverMarker = L.circleMarker(latLng, {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: VERVE_COLORS.orange,
        fillOpacity: 1,
      }).addTo(map);
    }
  }
);
</script>

<template>
  <div ref="mapContainer" class="h-96 w-full rounded-lg shadow-md z-0"></div>
</template>

<style>
/* Leaflet z-index fix for some stacking contexts */
.leaflet-container {
  z-index: 0;
}
</style>
