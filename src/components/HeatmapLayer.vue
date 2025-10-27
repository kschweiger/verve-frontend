<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat'; // Import the plugin
import type { HeatPoint } from '@/stores/heatmap';

const props = defineProps<{
  points: HeatPoint[];
  center: [number, number];
}>();

const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let heatLayer: L.Layer | null = null;

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
    map = L.map(mapContainer.value).setView(props.center, 10); // Start with a wider view
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
