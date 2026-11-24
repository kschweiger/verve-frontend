<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';
import type { HeatPoint } from '@/stores/heatmap';
import { useMapLabels } from '@/composables/useMapLabels';

const props = defineProps<{
  points: HeatPoint[];
  center?: [number, number] | null;
}>();

const mapContainer = ref<HTMLElement | null>(null);
const { t } = useI18n();
const localizeMap = useMapLabels();
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
    localizeMap(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

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
  <div ref="mapContainer" role="region" :aria-label="t('heatmap.title')" class="h-[75vh] w-full rounded-lg shadow-md z-0"></div>
</template>
