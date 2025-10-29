<script setup lang="ts">
import { computed, ref } from 'vue';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement, Filler, ArcElement } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import type { TrackPoint } from '@/services/api';

ChartJS.register(Title, Tooltip, Legend, ArcElement, LineElement, CategoryScale, LinearScale, PointElement, Filler, annotationPlugin);

const props = defineProps<{
  trackData: TrackPoint[];
  hoveredIndex: number | null;
}>();

const emit = defineEmits<{
  (e: 'point-hover', index: number | null): void;
}>();
const isChartHovered = ref(false);
const chartData = computed(() => {
  if (!props.trackData || props.trackData.length === 0) {
    return { labels: [], datasets: [] };
  }
  const labels = props.trackData.map(p => (p.dist / 1000).toFixed(1));
  const data = props.trackData.map(p => p.ele ?? 0);
  return {
    labels,
    datasets: [{
      label: 'Elevation',
      backgroundColor: 'rgba(79, 70, 229, 0.2)',
      borderColor: 'rgba(79, 70, 229, 1)',
      data: data,
      fill: true,
      pointRadius: 0,
      tension: 0.1,
    }]
  };
});

// --- THIS IS THE FIX ---
// Wrap the entire options object in a computed property.
const chartOptions = computed(() => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    onHover: (event, chartElement) => {
      if (chartElement.length > 0) {
        // The mouse is ON our chart.
        isChartHovered.value = true;
        const currentIndex = chartElement[0].index;
        if (currentIndex !== props.hoveredIndex) {
          emit('point-hover', currentIndex);
        }
      } else {
        // The mouse is NOT on our chart.
        // We should only emit 'null' if the mouse was JUST on our chart and moved away.
        if (isChartHovered.value) {
          isChartHovered.value = false; // Reset our local state
          emit('point-hover', null);
        }
        // If isChartHovered is already false, it means the hover state is
        // being controlled by the map, so we DO NOTHING.
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      annotation: {
        annotations: {
          line1: {
            type: 'line',
            // Now, this part will be re-evaluated whenever props.hoveredIndex changes
            display: props.hoveredIndex !== null,
            scaleID: 'x',
            value: props.hoveredIndex,
            borderColor: 'rgba(239, 68, 68, 0.7)',
            borderWidth: 2,
            borderDash: [6, 6],
          }
        }
      }
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Elevation (m)',
        }
      },
      x: {
        title: {
          display: true,
          text: 'Distance (km)',
        }
      }
    },
  }
});
</script>

<template>
  <div class="h-72">
    <Line v-if="trackData && trackData.length > 0" :data="chartData" :options="chartOptions" />
  </div>
</template>
