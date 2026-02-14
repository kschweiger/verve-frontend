<script setup lang="ts">
import { computed, ref } from 'vue';
import { VERVE_COLORS, hexToRgba } from '@/utils/colors';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Filler,
  ArcElement,
  type ChartOptions,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import type { TrackPoint } from '@/services/api';

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Filler,
  annotationPlugin
);

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
  const labels = props.trackData.map((p) => (p.dist / 1000).toFixed(1));
  const data = props.trackData.map((p) => p.ele ?? 0);

  return {
    labels,
    datasets: [
      {
        label: 'Elevation',
        backgroundColor: hexToRgba(VERVE_COLORS.dark, 0.2),
        borderColor: VERVE_COLORS.dark,
        data: data,
        fill: true,
        pointRadius: 0,
        tension: 0.1,
      },
    ],
  };
});

const chartOptions = computed<ChartOptions<'line'>>(() => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onHover: (event: any, chartElement: any[]) => {
      if (chartElement.length > 0) {
        isChartHovered.value = true;
        const currentIndex = chartElement[0].index;
        if (currentIndex !== props.hoveredIndex) {
          emit('point-hover', currentIndex);
        }
      } else {
        if (isChartHovered.value) {
          isChartHovered.value = false;
          emit('point-hover', null);
        }
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
            display: props.hoveredIndex !== null,
            scaleID: 'x',
            value: props.hoveredIndex ?? 0,
            borderColor: hexToRgba(VERVE_COLORS.orange, 0.7),
            borderWidth: 2,
            borderDash: [6, 6],
          },
        },
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Elevation (m)',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Distance (km)',
        },
      },
    },
  };
});
</script>

<template>
  <div class="h-72">
    <Line v-if="trackData && trackData.length > 0" :data="chartData" :options="chartOptions" />
  </div>
</template>
