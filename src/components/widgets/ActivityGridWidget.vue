<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useStatisticsStore, type GridDay } from '@/stores/statistics';
import { useActivityStore } from '@/stores/activity';
import {
  formatActivityGridDuration,
  getActivityGridIntensity,
  getWeekdayLabels,
  monthLabel,
} from '@/utils/activityGrid';

const statisticsStore = useStatisticsStore();
const activityStore = useActivityStore();

const weekdayLabels = getWeekdayLabels();

const weeks = computed(() => statisticsStore.activityGrid?.weeks ?? []);
const scaleMax = computed(() => statisticsStore.activityGrid?.scale_max.duration_seconds ?? 0);
const gridTemplateColumns = computed(() => `28px repeat(${weeks.value.length}, minmax(12px, 1fr))`);

const loadGrid = () => {
  statisticsStore.fetchActivityGrid(52);
};

onMounted(loadGrid);
watch(() => activityStore.lastUpdate, loadGrid);

function cellClass(day: GridDay | null): string {
  if (day === null) return 'bg-verve-medium/20 border-verve-medium/20';

  const intensity = getActivityGridIntensity(day.duration_seconds, scaleMax.value);
  if (intensity === 0) return 'bg-verve-light border-verve-medium/30';
  if (intensity < 0.25) return 'bg-verve-neon/30 border-verve-neon/40';
  if (intensity < 0.5) return 'bg-verve-neon/55 border-verve-neon/60';
  if (intensity < 0.75) return 'bg-verve-orange/65 border-verve-orange/70';
  return 'bg-verve-orange border-verve-orange';
}

function cellTitle(day: GridDay | null): string {
  if (day === null) return 'Future day';

  const activityLabel = day.activity_count === 1 ? 'activity' : 'activities';
  return `${day.date}: ${day.activity_count} ${activityLabel}, ${formatActivityGridDuration(day.duration_seconds)}`;
}
</script>

<template>
  <section class="bg-white border border-verve-medium/30 rounded-xl shadow-sm p-5 sm:p-6">
    <div class="mb-5">
      <div>
        <h2 class="text-xl font-bold text-verve-brown">Activity History</h2>
        <p class="text-sm text-verve-brown/60">Last 52 weeks by active time</p>
      </div>
    </div>

    <div
      v-if="statisticsStore.isActivityGridLoading"
      class="py-14 text-center text-sm text-verve-brown/60"
    >
      <span class="animate-pulse">Loading activity history...</span>
    </div>

    <div
      v-else-if="statisticsStore.activityGridError"
      class="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
    >
      {{ statisticsStore.activityGridError }}
    </div>

    <div v-else-if="weeks.length > 0" class="overflow-x-auto pb-1">
      <div
        class="grid min-w-[900px] gap-1"
        :style="{ gridTemplateColumns }"
      >
        <div class="grid grid-rows-[12px_repeat(7,minmax(0,1fr))] gap-1 pr-2">
          <div></div>
          <div
            v-for="label in weekdayLabels"
            :key="label"
            class="h-3 text-right text-[10px] leading-none text-verve-brown/40"
          >
            {{ label }}
          </div>
        </div>

        <div
          v-for="week in weeks"
          :key="week.start_date"
          class="relative grid grid-rows-[12px_repeat(7,minmax(0,1fr))] gap-1"
        >
          <div>
            <span class="absolute left-0 top-0 w-max text-[10px] leading-none text-verve-brown/45">
              {{ monthLabel(week.month) }}
            </span>
          </div>
          <div
            v-for="(day, dayIndex) in week.days"
            :key="`${week.start_date}-${dayIndex}`"
            class="aspect-square w-full rounded-[3px] border"
            :class="cellClass(day)"
            :title="cellTitle(day)"
          ></div>
        </div>
      </div>
    </div>

    <div v-else class="py-14 text-center text-sm italic text-verve-brown/50">
      No activity history found.
    </div>
  </section>
</template>
