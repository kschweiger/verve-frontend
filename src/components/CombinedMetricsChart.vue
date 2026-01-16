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
  type ChartOptions
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import type { TrackPoint } from '@/services/api';

ChartJS.register(
  Title, Tooltip, Legend, LineElement, CategoryScale,
  LinearScale, PointElement, Filler, annotationPlugin
);

const props = defineProps<{
  trackData: TrackPoint[];
  hoveredIndex: number | null;
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
    color: '#3b82f6',
    transform: (v) => v * 3.6,
    fallbackValue: 0
  },
  hr: {
    key: 'hr',
    label: 'Heart Rate (bpm)',
    color: '#ef4444',
    transform: (v) => v,
    fallbackValue: null
  },
  cad: {
    key: 'cad',
    label: 'Cadence (rpm)',
    color: '#8b5cf6',
    transform: (v) => v,
    fallbackValue: 0
  },
  power: {
    key: 'power',
    label: 'Power (W)',
    color: '#f59e0b',
    transform: (v) => v,
    fallbackValue: 0
  }
};

const selectedMetricKey = ref<string>('');
const availableMetrics = ref<string[]>([]);
const hasElevation = ref(false);
const xAxisMode = ref<'distance' | 'time'>('distance');

onMounted(() => {
  analyzeData();
});

watch(() => props.trackData, () => {
  analyzeData();
});

function analyzeData() {
  const found: Set<string> = new Set();
  let maxDist = 0;
  let hasEle = false;
  if (!props.trackData || props.trackData.length === 0) return;

  for (const point of props.trackData) {
    if (point.speed != null && point.speed > 0) found.add('speed');
    if (point.hr != null) found.add('hr');
    if (point.cad != null) found.add('cad');
    if (point.power != null) found.add('power');
    if (point.ele !== null) hasEle = true;
    if (point.dist > maxDist) maxDist = point.dist;
  }
  // Decide X-Axis: If total distance is negligible (< 100m), assume stationary -> Time
  xAxisMode.value = maxDist > 100 ? 'distance' : 'time';
  hasElevation.value = hasEle;

  const list = Array.from(found);
  const priority = ['speed', 'hr', 'power', 'cad'];
  list.sort((a, b) => priority.indexOf(a) - priority.indexOf(b));

  availableMetrics.value = list;

  if (list.length > 0 && !list.includes(selectedMetricKey.value)) {
    selectedMetricKey.value = list[0] as string;
  }
}

const yAxisLabel = computed(() => {
  const def = metricDefinitions[selectedMetricKey.value];
  return def ? def.label : '';
});

const formatTimeLabel = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  // const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}h`;
  return `${m}m`;
};

const chartData = computed(() => {
  const metricConf = metricDefinitions[selectedMetricKey.value];

  if (!props.trackData || props.trackData.length === 0 || !metricConf) {
    return { labels: [], datasets: [] };
  }
  let labels: string[] = [];

  if (xAxisMode.value === 'distance') {
    labels = props.trackData.map(p => (p.dist / 1000).toFixed(1));
  } else {
    // Time Mode: Calculate elapsed time relative to start
    const startTime = new Date(props.trackData[0].time).getTime();
    labels = props.trackData.map(p => {
      const elapsedSec = (new Date(p.time).getTime() - startTime) / 1000;
      return formatTimeLabel(elapsedSec);
    });
  }

  const datasets: any[] = [];

  // Metric Dataset (Foreground)
  const metricData = props.trackData.map(p => {
    // @ts-ignore
    const rawVal = p[metricConf.key];
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
    spanGaps: metricConf.fallbackValue !== null,
  });

  // Elevation Dataset (Background) - Only add if data exists
  if (hasElevation.value) {
    const elevationData = props.trackData.map(p => p.ele ?? 0);
    datasets.push({
      label: 'Elevation (m)',
      data: elevationData,
      borderColor: '#9ca3af',
      backgroundColor: 'rgba(156, 163, 175, 0.2)',
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
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
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
          label: (context: any) => {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) label += context.parsed.y.toFixed(1);
            return label;
          },
          title: (tooltipItems: any) => {
            // Show "Distance: X km" or "Time: X min" in tooltip title
            const val = tooltipItems[0].label;
            return xAxisMode.value === 'distance' ? `${val} km` : val;
          }
        }
      },
      annotation: {
        annotations: {
          line1: {
            type: 'line',
            display: props.hoveredIndex !== null,
            scaleID: 'x',
            value: props.hoveredIndex ?? 0,
            borderColor: 'rgba(107, 114, 128, 0.5)',
            borderWidth: 1,
            borderDash: [4, 4],
          }
        }
      }
    },
    scales: {
      x: {
        ticks: { maxTicksLimit: 8 },
        grid: { display: false },
        title: {
          display: true,
          text: xAxisMode.value === 'distance' ? 'Distance (km)' : 'Time'
        }
      },
      yMetric: {
        type: 'linear',
        display: true,
        position: 'left',
        title: { display: true, text: yAxisLabel.value },
        grid: { color: '#e5e7eb' }
      },
      yElevation: {
        // Only show axis if we have data
        type: 'linear',
        display: hasElevation.value,
        position: 'right',
        title: { display: true, text: 'Elevation (m)' },
        grid: { display: false }
      }
    },
  };
});

</script>

<template>
  <div v-if="availableMetrics.length > 0 && trackData.length > 0" class="flex flex-col h-full">
    <div class="flex justify-end space-x-2 mb-2">
      <button v-for="m in availableMetrics" :key="m" @click="selectedMetricKey = m"
        class="px-3 py-1 text-xs font-semibold rounded-full border transition-colors" :class="selectedMetricKey === m
          ? `bg-gray-800 text-white border-gray-800`
          : `bg-white text-gray-600 border-gray-200 hover:border-gray-400`">
        {{ metricDefinitions[m]?.label.split(' ')[0] }}
      </button>
    </div>
    <div class="grow min-h-[250px]">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
