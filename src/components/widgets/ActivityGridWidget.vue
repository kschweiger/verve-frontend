<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useStatisticsStore, type GridDay } from '@/stores/statistics';
import { useActivityStore } from '@/stores/activity';
import {
  formatActivityGridCellDetails,
  getActivityGridIntensity,
  getRecentGridWeeks,
  getWeekdayLabels,
  hasActivityGridCellDetails,
  monthLabel,
} from '@/utils/activityGrid';

const statisticsStore = useStatisticsStore();
const activityStore = useActivityStore();

const weekdayLabels = getWeekdayLabels();
const COMPACT_QUERY = '(max-width: 1023px)';
const COMPACT_WEEK_COUNT = 12;

const weeks = computed(() => statisticsStore.activityGrid?.weeks ?? []);
const scaleMax = computed(() => statisticsStore.activityGrid?.scale_max.effective_duration_seconds ?? 0);
const activeDay = ref<GridDay | null>(null);
const isCompact = ref(false);
let compactMediaQuery: MediaQueryList | null = null;

const visibleWeeks = computed(() =>
  isCompact.value ? getRecentGridWeeks(weeks.value, COMPACT_WEEK_COUNT) : weeks.value
);
const gridTemplateColumns = computed(
  () => `28px repeat(${visibleWeeks.value.length}, minmax(12px, 1fr))`
);
const historySubtitle = computed(() =>
  isCompact.value ? 'Last 12 weeks by active time' : 'Last 52 weeks by active time'
);

const loadGrid = () => {
  statisticsStore.fetchActivityGrid(52);
};

onMounted(loadGrid);
watch(() => activityStore.lastUpdate, loadGrid);
watch(() => statisticsStore.activityGrid, clearCellDetails);

function syncCompactViewport() {
  isCompact.value = compactMediaQuery?.matches ?? false;
  clearCellDetails();
}

onMounted(() => {
  compactMediaQuery = window.matchMedia(COMPACT_QUERY);
  syncCompactViewport();
  compactMediaQuery.addEventListener('change', syncCompactViewport);
});

onBeforeUnmount(() => {
  compactMediaQuery?.removeEventListener('change', syncCompactViewport);
});

function cellClass(day: GridDay | null): string {
  if (day === null) return 'bg-verve-medium/20 border-verve-medium/20';

  const intensity = getActivityGridIntensity(day.effective_duration_seconds, scaleMax.value);
  if (intensity === 0) return 'bg-verve-light border-verve-medium/30';
  if (intensity < 0.25) return 'bg-verve-neon/30 border-verve-neon/40';
  if (intensity < 0.5) return 'bg-verve-neon/55 border-verve-neon/60';
  if (intensity < 0.75) return 'bg-verve-orange/65 border-verve-orange/70';
  return 'bg-verve-orange border-verve-orange';
}

function cellDetails(day: GridDay | null): string {
  return hasActivityGridCellDetails(day) ? formatActivityGridCellDetails(day) : '';
}

function showCellDetails(day: GridDay | null) {
  activeDay.value = hasActivityGridCellDetails(day) ? day : null;
}

function clearCellDetails() {
  activeDay.value = null;
}
</script>

<template>
  <section class="relative bg-white border border-verve-medium/30 rounded-xl shadow-sm p-5 sm:p-6">
    <div class="mb-5">
      <div>
        <h2 class="text-xl font-bold text-verve-brown">Activity History</h2>
        <p class="text-sm text-verve-brown/60">{{ historySubtitle }}</p>
      </div>
    </div>

    <div v-if="statisticsStore.isActivityGridLoading" class="py-14 text-center text-sm text-verve-brown/60">
      <span class="animate-pulse">Loading activity history...</span>
    </div>

    <div v-else-if="statisticsStore.activityGridError"
      class="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
      {{ statisticsStore.activityGridError }}
    </div>

    <template v-else-if="visibleWeeks.length > 0">
      <div class="overflow-visible lg:overflow-x-auto lg:pb-1">
        <div class="grid min-w-0 gap-1 lg:min-w-[900px]" :style="{ gridTemplateColumns }">
          <div class="grid grid-rows-[12px_repeat(7,minmax(0,1fr))] gap-1 pr-2">
            <div></div>
            <div v-for="label in weekdayLabels" :key="label"
              class="h-3 text-right text-[10px] leading-none text-verve-brown/40">
              {{ label }}
            </div>
          </div>

          <div v-for="week in visibleWeeks" :key="week.start_date"
            class="relative grid grid-rows-[12px_repeat(7,minmax(0,1fr))] gap-1">
            <div>
              <span class="absolute left-0 top-0 w-max text-[10px] leading-none text-verve-brown/45">
                {{ monthLabel(week.month) }}
              </span>
            </div>
            <template v-for="(day, dayIndex) in week.days" :key="`${week.start_date}-${dayIndex}`">
              <button v-if="hasActivityGridCellDetails(day)" type="button"
                class="aspect-square w-full rounded-[3px] border p-0 outline-none focus:ring-2 focus:ring-verve-orange focus:ring-offset-1"
                :class="cellClass(day)" :title="cellDetails(day)" :aria-label="cellDetails(day)"
                @click="showCellDetails(day)" @mouseenter="showCellDetails(day)" @mouseleave="clearCellDetails"
                @focus="showCellDetails(day)" @blur="clearCellDetails"></button>
              <div v-else :key="`${week.start_date}-${dayIndex}`"
                class="aspect-square w-full rounded-[3px] border outline-none focus:ring-2 focus:ring-verve-orange focus:ring-offset-1"
                :class="cellClass(day)"></div>
            </template>
          </div>
        </div>
      </div>

      <div v-if="activeDay"
        class="mt-4 rounded-lg border border-verve-medium/30 bg-white px-3 py-2 text-xs font-semibold text-verve-brown shadow-lg lg:absolute lg:right-5 lg:top-5 lg:mt-0"
        role="status">
        {{ cellDetails(activeDay) }}
      </div>
    </template>

    <div v-else class="py-14 text-center text-sm italic text-verve-brown/50">
      No activity history found.
    </div>
  </section>
</template>
