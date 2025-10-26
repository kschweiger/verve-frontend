<script setup lang="ts">
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement, Filler } from 'chart.js';
import type { TrackPoint } from '@/services/api';

// Register the components Chart.js needs
ChartJS.register(Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement, Filler);

const props = defineProps<{
  trackData: TrackPoint[];
}>();

const chartData = computed(() => {
  const labels = props.trackData.map(p => (p.dist / 1000).toFixed(1)); // X-axis: distance in km
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

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
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
  }
};
</script>

<template>
  <div class="h-72">
    <Line v-if="trackData.length > 0" :data="chartData" :options="chartOptions" />
  </div>
</template>
