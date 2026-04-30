<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
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
  type ChartOptions,
  type TooltipItem,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import type { TrackPoint } from '@/services/api';
import { VERVE_COLORS, hexToRgba } from '@/utils/colors';

ChartJS.register(
  Title,
  Tooltip,
  Legend,
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

// --- Configuration for Metrics ---
interface MetricConfig {
  key: keyof TrackPoint;
  label: string;
  color: string;
  transform: (val: number) => number;
  fallbackValue: number | null;
}

const metricDefinitions: Record<string, MetricConfig> = {
  speed: {
    key: 'speed',
    label: 'Speed (km/h)',
    color: VERVE_COLORS.chartBlue,
    transform: (v) => v * 3.6,
    fallbackValue: 0,
  },
  hr: {
    key: 'hr',
    label: 'Heart Rate (bpm)',
    color: VERVE_COLORS.orange,
    transform: (v) => v,
    fallbackValue: null,
  },
  cad: {
    key: 'cad',
    label: 'Cadence (rpm)',
    color: VERVE_COLORS.brown,
    transform: (v) => v,
    fallbackValue: 0,
  },
  power: {
    key: 'power',
    label: 'Power (W)',
    color: VERVE_COLORS.orange,
    transform: (v) => v,
    fallbackValue: 0,
  },
};

const selectedMetricKey = ref<string>('');
const availableMetrics = ref<string[]>([]);
const hasElevation = ref(false);

onMounted(() => {
  analyzeData();
});

watch(
  () => props.trackData,
  () => {
    analyzeData();
  }
);

function analyzeData() {
  const found: Set<string> = new Set();
  let hasEle = false;

  if (!props.trackData || props.trackData.length === 0) return;

  for (const point of props.trackData) {
    if (point.speed != null && point.speed > 0) found.add('speed');
    if (point.hr != null) found.add('hr');
    if (point.cad != null) found.add('cad');
    if (point.power != null) found.add('power');
    if (point.ele !== null) hasEle = true;
  }

  hasElevation.value = hasEle;

  const list = Array.from(found);
  const priority = ['speed', 'hr', 'power', 'cad'];
  list.sort((a, b) => priority.indexOf(a) - priority.indexOf(b));

  availableMetrics.value = list;

  // Fix: Check if list has items and assign safely
  if (list.length > 0 && !list.includes(selectedMetricKey.value)) {
    const firstMetric = list[0];
    if (firstMetric) {
      selectedMetricKey.value = firstMetric;
    }
  }
}

const yAxisLabel = computed(() => {
  const def = metricDefinitions[selectedMetricKey.value];
  return def ? def.label : '';
});

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

  const start = Date.parse(firstPoint.time);
  const current = Date.parse(point.time);
  if (Number.isNaN(start) || Number.isNaN(current)) return index;

  return Math.max(0, (current - start) / 1000);
};

const chartData = computed(() => {
  const metricConf = metricDefinitions[selectedMetricKey.value];

  // Early return guards against undefined trackData or empty array
  if (!props.trackData || props.trackData.length === 0 || !metricConf) {
    return { labels: [], datasets: [] };
  }

  const labels = props.trackData.map((_, index) => formatTimeLabel(elapsedSecondsAtIndex(index)));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const datasets: any[] = [];

  // Metric Dataset (Foreground)
  const metricData = props.trackData.map((p) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawVal = (p as any)[metricConf.key];
    if (typeof rawVal !== 'number') return metricConf.fallbackValue;
    return metricConf.transform(rawVal);
  });

  datasets.push({
    label: metricConf.label,
    data: metricData,
    borderColor: metricConf.color,
    backgroundColor: metricConf.color,
    yAxisID: 'yMetric',
    fill: false,
    pointRadius: 0,
    borderWidth: 1.5,
    tension: 0.2,
    spanGaps: true,
  });

  // Elevation Dataset (Background)
  if (hasElevation.value) {
    const elevationData = props.trackData.map((p) => p.ele ?? 0);
    datasets.push({
      label: 'Elevation (m)',
      data: elevationData,
      borderColor: VERVE_COLORS.chartGray,
      backgroundColor: hexToRgba(VERVE_COLORS.chartGray, 0.2),
      yAxisID: 'yElevation',
      fill: 'start',
      pointRadius: 0,
      borderWidth: 1,
      tension: 0.1,
    });
  }

  return { labels, datasets };
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
          content: `Cut ${index + 1}`,
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
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onHover: (event: any, chartElement: any[]) => {
      if (chartElement.length > 0) {
        const index = chartElement[0].index;
        if (index !== props.hoveredIndex) {
          emit('point-hover', index);
        }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'line'>) => {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) label += context.parsed.y.toFixed(1);
            return label;
          },
          title: (tooltipItems: TooltipItem<'line'>[]) => {
            return tooltipItems[0]?.label ?? '';
          },
        },
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
      x: {
        ticks: { maxTicksLimit: 8 },
        grid: { display: false },
        title: {
          display: true,
          text: 'Elapsed time',
        },
      },
      yMetric: {
        type: 'linear',
        display: true,
        position: 'left',
        title: { display: true, text: yAxisLabel.value },
        grid: { color: '#e5e7eb' },
      },
      yElevation: {
        type: 'linear',
        display: hasElevation.value,
        position: 'right',
        title: { display: true, text: 'Elevation (m)' },
        grid: { display: false },
      },
    },
  };
});
</script>

<template>
  <div v-if="availableMetrics.length > 0 && trackData.length > 0" class="flex flex-col h-full">
    <div class="flex justify-end space-x-2 mb-2">
      <button
        v-for="m in availableMetrics"
        :key="m"
        @click="selectedMetricKey = m"
        class="px-3 py-1 text-xs font-semibold rounded-full border transition-colors"
        :class="
          selectedMetricKey === m
            ? `bg-gray-800 text-white border-gray-800`
            : `bg-white text-gray-600 border-gray-200 hover:border-gray-400`
        "
      >
        {{ metricDefinitions[m]?.label.split(' ')[0] }}
      </button>
    </div>
    <div class="grow min-h-[250px]">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
