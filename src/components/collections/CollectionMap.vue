<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Activity } from '@/stores/activity';
import type { CollectionTrackPoint } from '@/services/collections';
import { CHART_COLORS, VERVE_COLORS } from '@/utils/colors';

const props = defineProps<{
  trackData: CollectionTrackPoint[];
  activities: Activity[];
}>();

const mapContainer = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let polylines: L.Polyline[] = [];

const activityById = computed(() => new Map(props.activities.map((activity) => [activity.id, activity])));

const activityColor = (activityId: string) => {
  const sortedIds = props.activities.map((item) => item.id);
  const index = Math.max(sortedIds.indexOf(activityId), 0);
  return CHART_COLORS[index % CHART_COLORS.length] ?? VERVE_COLORS.orange;
};

const groupedTrackData = computed(() => {
  const groups = new Map<string, CollectionTrackPoint[]>();
  for (const point of props.trackData) {
    if (point.lat === null || point.lon === null) continue;
    groups.set(point.activityId, [...(groups.get(point.activityId) ?? []), point]);
  }
  return groups;
});

const legendItems = computed(() =>
  Array.from(groupedTrackData.value.keys()).map((activityId) => ({
    activityId,
    label:
      activityById.value.get(activityId)?.name ||
      new Date(activityById.value.get(activityId)?.start ?? '').toLocaleDateString(),
    color: activityColor(activityId),
  }))
);

function clearPolylines() {
  polylines.forEach((polyline) => polyline.remove());
  polylines = [];
}

function drawMap() {
  if (!map) return;
  clearPolylines();

  const activeMap = map;
  const bounds = L.latLngBounds([]);

  groupedTrackData.value.forEach((points, activityId) => {
    const latLngs = points.map((point) => [point.lat, point.lon] as L.LatLngExpression);
    if (latLngs.length < 2) return;

    const polyline = L.polyline(latLngs, {
      color: activityColor(activityId),
      weight: 4,
      opacity: 0.9,
    }).addTo(activeMap);

    polyline.bindTooltip(activityById.value.get(activityId)?.name || 'Activity');
    polylines.push(polyline);
    latLngs.forEach((latLng) => bounds.extend(latLng));
  });

  if (bounds.isValid()) {
    activeMap.fitBounds(bounds, { padding: [20, 20] });
  }
}

onMounted(() => {
  if (!mapContainer.value) return;

  map = L.map(mapContainer.value).setView([47.37, 8.54], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  drawMap();
});

onBeforeUnmount(() => {
  clearPolylines();
  map?.remove();
  map = null;
});

watch(
  () => [props.trackData, props.activities],
  () => drawMap(),
  { deep: true }
);
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-verve-medium/30 bg-white shadow-sm">
    <div ref="mapContainer" class="h-[28rem] w-full"></div>
    <div v-if="legendItems.length > 0" class="flex flex-wrap gap-3 border-t border-verve-medium/20 p-4">
      <div v-for="item in legendItems" :key="item.activityId" class="flex items-center gap-2 text-sm text-verve-brown">
        <span class="size-3 rounded-full" :style="{ backgroundColor: item.color }"></span>
        <span class="max-w-[14rem] truncate">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<style>
.leaflet-container {
  z-index: 0;
}
</style>
