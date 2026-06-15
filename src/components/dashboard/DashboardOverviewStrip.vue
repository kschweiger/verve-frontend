<script setup lang="ts">
import { computed } from 'vue';
import { Activity, CalendarDays, Clock, Gauge } from 'lucide-vue-next';
import { useStatisticsStore } from '@/stores/statistics';
import { formatActivityGridDuration, formatAverageDuration } from '@/utils/activityGrid';

const statisticsStore = useStatisticsStore();

const totals = computed(() => statisticsStore.activityGrid?.totals ?? null);

const items = computed(() => {
  if (!totals.value) return [];

  return [
    {
      label: 'Active time',
      value: formatActivityGridDuration(totals.value.duration_seconds),
      icon: Clock,
    },
    {
      label: 'Activities',
      value: totals.value.activity_count.toString(),
      icon: Activity,
    },
    {
      label: 'Active days',
      value: totals.value.active_days.toString(),
      icon: CalendarDays,
    },
  ];
});
</script>

<template>
  <section class="grid grid-cols-2 gap-3 lg:grid-cols-3">
    <div v-for="item in items" :key="item.label"
      class="bg-white border border-verve-medium/30 rounded-xl shadow-sm px-4 py-3">
      <div class="flex items-center gap-2 text-verve-brown/50">
        <component :is="item.icon" class="size-4" aria-hidden="true" />
        <p class="text-xs font-bold uppercase tracking-wider">{{ item.label }}</p>
      </div>
      <p class="mt-2 text-2xl font-bold text-verve-brown">{{ item.value }}</p>
    </div>
  </section>
</template>
