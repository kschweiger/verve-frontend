<script setup lang="ts">
import { Pie } from 'vue-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { CHART_COLORS, CHART_HOVER_COLORS } from '@/utils/colors'; // <-- Import our colors

ChartJS.register(Title, Tooltip, Legend, ArcElement);

defineProps<{
  chartData: {
    labels: string[];
    datasets: any[];
  };
  chartOptions?: any;
}>();

const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
    }
  }
};
</script>
<template>
  <Pie :data="chartData" :options="chartOptions ?? defaultOptions" />
</template>
