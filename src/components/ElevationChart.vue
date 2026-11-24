<script setup lang="ts">
import { computed, ref } from 'vue';
import { VERVE_COLORS, hexToRgba } from '@/utils/colors';
import { Line } from 'vue-chartjs';
import { useI18n } from 'vue-i18n';
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
import { elapsedSecondsBetweenInstants } from '@/utils/datetime';

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
  cutIndices?: number[];
}>();

const emit = defineEmits<{
  (e: 'point-hover', index: number | null): void;
}>();

const { t, n, locale } = useI18n();
const isChartHovered = ref(false);

const formatTimeLabel = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}h`;
  return `${m}m`;
};

const elapsedSecondsAtIndex = (index: number) => {
  const firstPoint = props.trackData[0];
  const point = props.trackData[index];
  if (!firstPoint || !point) return index;

  return elapsedSecondsBetweenInstants(firstPoint.time, point.time) ?? index;
};

const chartData = computed(() => {
  if (!props.trackData || props.trackData.length === 0) {
    return { labels: [], datasets: [] };
  }
  const labels = props.trackData.map((_, index) => formatTimeLabel(elapsedSecondsAtIndex(index)));
  const data = props.trackData.map((p) => p.ele ?? 0);

  return {
    labels,
    datasets: [
      {
        label: t('activityCharts.elevation'),
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
  const cutAnnotations = Object.fromEntries(
    (props.cutIndices ?? []).map((cutIndex, index) => [
      `cut${index}`,
      {
        type: 'line' as const,
        display: true,
        scaleID: 'x',
        value: cutIndex,
        borderColor: VERVE_COLORS.dark,
        borderWidth: 2,
        borderDash: [],
        label: {
          display: true,
          content: t('activityCharts.cut', { number: n(index + 1) }),
          position: 'start',
          backgroundColor: hexToRgba(VERVE_COLORS.dark, 0.9),
          color: '#ffffff',
          padding: 4,
          borderRadius: 4,
          font: {
            size: 10,
            weight: 'bold',
          },
        },
      },
    ])
  );

  return {
    locale: locale.value,
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    onHover: (_event, chartElements) => {
      const currentIndex = chartElements[0]?.index;
      if (currentIndex !== undefined) {
        isChartHovered.value = true;
        if (currentIndex !== props.hoveredIndex) {
          emit('point-hover', currentIndex);
        }
      } else if (isChartHovered.value) {
        isChartHovered.value = false;
        emit('point-hover', null);
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      annotation: {
        annotations: {
          ...cutAnnotations,
          line1: {
            type: 'line',
            display: props.hoveredIndex !== null,
            scaleID: 'x',
            value: props.hoveredIndex ?? 0,
            borderColor: 'rgba(17, 24, 39, 0.42)',
            borderWidth: 1,
            borderDash: [6, 6],
          },
        },
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          text: t('activityCharts.series', { metric: t('activityCharts.elevation'), unit: 'm' }),
        },
      },
      x: {
        title: {
          display: true,
          text: t('activityCharts.elapsedTime'),
        },
      },
    },
  };
});
</script>

<template>
  <div class="h-72">
    <Line
      v-if="trackData && trackData.length > 0"
      :data="chartData"
      :options="chartOptions"
      :aria-label="t('activityCharts.elevationProfile')"
    />
  </div>
</template>
