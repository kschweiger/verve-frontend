<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Pie } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  type ChartData,
  type ChartOptions,
} from 'chart.js';

ChartJS.register(Title, Tooltip, Legend, ArcElement);

const props = defineProps<{
  chartData: ChartData<'pie'>;
  chartOptions?: ChartOptions<'pie'>;
}>();

const defaultOptions: ChartOptions<'pie'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
    },
  },
};
const { locale } = useI18n();
const options = computed(() => ({
  ...(props.chartOptions ?? defaultOptions),
  locale: props.chartOptions?.locale ?? locale.value,
}));
</script>

<template>
  <Pie :data="chartData" :options="options" />
</template>
