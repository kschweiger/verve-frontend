<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';
import type { HeatPoint } from '@/stores/heatmap';

const props = defineProps<{
  points: HeatPoint[];
  center?: [number, number] | null;
}>();

const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let heatLayer: L.Layer | null = null;

const DEFAULT_CENTER: L.LatLngExpression = [48.13, 11.58];
const DEFAULT_ZOOM = 5;

const updateHeatLayer = () => {
  if (!map) return;

  if (heatLayer) {
    heatLayer.remove();
  }

  if (props.points && props.points.length > 0) {
    // Cast to any because leaflet.heat is a plugin that extends L at runtime
    // and types might be loose without specific augmenting
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    heatLayer = (L as any).heatLayer(props.points, {
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
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    updateHeatLayer();
  }
});

onUnmounted(() => {
  if (map) {
    map.remove();
    map = null;
  }
});

watch(
  () => props.points,
  () => {
    updateHeatLayer();
  }
);
</script>

<template>
  <div ref="mapContainer" class="h-[75vh] w-full rounded-lg shadow-md z-0"></div>
</template>
