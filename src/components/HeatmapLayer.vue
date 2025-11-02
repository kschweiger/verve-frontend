<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat'; // Import the plugin
import type { HeatPoint } from '@/stores/heatmap';

const props = defineProps<{
  points: HeatPoint[];
  center?: [number, number] | null;
}>();

const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let heatLayer: L.Layer | null = null;

const DEFAULT_CENTER: L.LatLngExpression = [48.13, 11.58]; // A fallback (e.g., Munich)
const DEFAULT_ZOOM = 5;

const updateHeatLayer = () => {
  if (!map) return;
  // Remove the old layer if it exists
  if (heatLayer) {
    heatLayer.remove();
  }
  if (props.points && props.points.length > 0) {
    // Create the new heat layer from the example
    heatLayer = L.heatLayer(props.points, {
      radius: 5,
      blur: 5,
      maxZoom: 18,
    }).addTo(map);
  }
};

onMounted(() => {
  if (mapContainer.value) {
    const initialCenter = props.center ?? DEFAULT_CENTER;
    const initialZoom = props.center ? 13 : DEFAULT_ZOOM;

    map = L.map(mapContainer.value).setView(initialCenter, initialZoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    updateHeatLayer(); // Draw initial data if it arrived before mount
  }
});

// Watch for new points and update the layer
watch(() => props.points, () => {
  updateHeatLayer();
});
</script>

<template>
  <div ref="mapContainer" class="h-[75vh] w-full rounded-lg shadow-md z-0"></div>
</template>
