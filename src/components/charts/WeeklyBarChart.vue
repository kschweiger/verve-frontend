<script setup lang="ts">
import { Bar } from 'vue-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

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
      display: false
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      // Hide the vertical grid lines
      grid: {
        display: false,
        drawBorder: false,
      }
    },
    x: {
      // Hide the horizontal grid lines
      grid: {
        display: false,
        drawBorder: false,
      }
    }
  }
};
</script>
<template>
  <Bar :data="chartData" :options="chartOptions ?? defaultOptions" />
</template>
