<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useStatisticsStore, type ActivityCalendarItem } from '@/stores/statistics';
import ActivityIcon from '@/components/ActivityIcon.vue';
import { formatDuration, parseISODuration } from '@/utils/datetime';

const statsStore = useStatisticsStore();

// --- Navigation State ---
const now = new Date();
const currentYear = ref(now.getFullYear());
const currentMonth = ref(now.getMonth() + 1);

// --- Computed ---
const monthName = computed(() =>
  new Date(currentYear.value, currentMonth.value - 1).toLocaleString('default', { month: 'long' })
);

const monthSummary = computed(() => {
  if (!statsStore.calendarData) return { count: 0, distance: 0, duration: 0, elevation: 0 };

  let count = 0,
    distance = 0,
    duration = 0,
    elevation = 0;

  statsStore.calendarData.weeks.forEach((week) => {
    week.days.forEach((day) => {
      if (day.is_in_month) {
        count += day.total.count;
        distance += day.total.distance;
        duration += day.total.duration;
        elevation += day.total.elevation_gain;
      }
    });
  });

  return { count, distance, duration, elevation };
});

// --- Actions ---
const changeMonth = (delta: number) => {
  let m = currentMonth.value + delta;
  let y = currentYear.value;
  if (m > 12) {
    m = 1;
    y++;
  }
  if (m < 1) {
    m = 12;
    y--;
  }
  currentMonth.value = m;
  currentYear.value = y;
};

const goToToday = () => {
  const d = new Date();
  currentYear.value = d.getFullYear();
  currentMonth.value = d.getMonth() + 1;
};

const loadData = () => statsStore.fetchCalendar(currentYear.value, currentMonth.value);

watch([currentYear, currentMonth], loadData);
onMounted(loadData);

// --- Helpers ---
const isToday = (dateStr: string) => dateStr === now.toISOString().split('T')[0];

const getDisplayValue = (item: ActivityCalendarItem) => {
  if (item.distance != null && item.distance > 0) {
    return `${item.distance.toFixed(1)} km`;
  }
  const seconds = typeof item.duration === 'string' ? parseISODuration(item.duration) : item.duration;
  if (seconds > 0) {
    return formatDuration(seconds);
  }
  return 'View';
};
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-64px)] flex flex-col bg-verve-medium">
    <!-- HEADER -->
    <div
      class="flex flex-col md:flex-row justify-between items-center mb-6 bg-white p-6 rounded-xl shadow-sm border border-verve-medium/30 shrink-0">
      <!-- Month Navigation -->
      <div class="flex items-center space-x-4 mb-4 md:mb-0">
        <h1 class="text-3xl font-bold text-verve-brown w-48">
          {{ monthName }} <span class="font-light text-verve-brown/60">{{ currentYear }}</span>
        </h1>

        <div class="flex items-center bg-verve-light rounded-xl p-1">
          <button @click="changeMonth(-1)"
            class="p-2 hover:bg-white rounded-lg text-verve-brown/60 hover:text-verve-brown transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="size-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clip-rule="evenodd" />
            </svg>
          </button>
          <button @click="goToToday" class="px-4 text-sm font-bold text-verve-brown/80 hover:text-verve-brown">
            Today
          </button>
          <button @click="changeMonth(1)"
            class="p-2 hover:bg-white rounded-lg text-verve-brown/60 hover:text-verve-brown transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="size-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Month Summary -->
      <div class="flex space-x-8 text-right">
        <div>
          <div class="text-[10px] text-verve-brown/60 uppercase font-bold tracking-wider">
            Total Dist
          </div>
          <div class="text-xl font-bold text-verve-brown">
            {{ monthSummary.distance.toFixed(0) }}
            <span class="text-xs font-normal text-verve-brown/60">km</span>
          </div>
        </div>
        <div>
          <div class="text-[10px] text-verve-brown/60 uppercase font-bold tracking-wider">
            Total Time
          </div>
          <div class="text-xl font-bold text-verve-brown">
            {{ formatDuration(monthSummary.duration) }}
          </div>
        </div>
        <div>
          <div class="text-[10px] text-verve-brown/60 uppercase font-bold tracking-wider">
            Activities
          </div>
          <div class="text-xl font-bold text-verve-brown">{{ monthSummary.count }}</div>
        </div>
      </div>
    </div>

    <!-- CALENDAR GRID CONTAINER -->
    <div
      class="bg-white rounded-xl shadow-sm border border-verve-medium/30 overflow-hidden flex flex-col min-w-[900px] overflow-x-auto">
      <!-- GRID HEADERS -->
      <div
        class="grid grid-cols-8 border-b border-verve-medium/30 bg-verve-light/50 text-xs font-bold text-verve-brown/60 uppercase tracking-wider">
        <div v-for="day in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']" :key="day"
          class="py-3 text-center border-r border-verve-medium/10 last:border-r-0">
          {{ day }}
        </div>
        <div class="py-3 text-center bg-verve-medium/20 text-verve-brown/80 border-l border-verve-medium/30">
          Weekly
        </div>
      </div>

      <!-- GRID BODY -->
      <div class="grid grid-cols-8 auto-rows-[minmax(10rem,1fr)]">
        <template v-if="statsStore.calendarData">
          <template v-for="(week, wIdx) in statsStore.calendarData.weeks" :key="wIdx">
            <!-- 1. THE 7 DAYS -->
            <div v-for="(day, dIdx) in week.days" :key="`${wIdx}-${dIdx}`"
              class="border-b border-r border-verve-medium/20 p-2 flex flex-col relative transition-colors"
              :class="day.is_in_month ? 'bg-white' : 'bg-gray-50/50'">
              <!-- Date Header -->
              <div class="flex justify-between items-start mb-2">
                <span class="text-sm font-medium size-7 flex items-center justify-center rounded-full transition-all"
                  :class="[
                    isToday(day.date)
                      ? 'bg-verve-neon text-verve-brown font-bold shadow-sm'
                      : day.is_in_month
                        ? 'text-verve-brown'
                        : 'text-verve-brown/30',
                  ]">
                  {{ new Date(day.date).getDate() }}
                </span>
              </div>

              <!-- Activity List (Chips) -->
              <div class="space-y-1 overflow-y-auto max-h-[140px] scrollbar-thin">
                <router-link v-for="item in day.items" :key="item.id"
                  :to="{ name: 'activity-detail', params: { id: item.id } }"
                  class="flex items-center space-x-2 p-1.5 rounded-lg border border-transparent bg-verve-light/40 hover:bg-verve-light hover:border-verve-medium/50 transition-all group"
                  :title="item.name || 'Activity'">
                  <!-- Tiny Icon -->
                  <div
                    class="size-5 rounded-full bg-white text-verve-brown flex items-center justify-center shrink-0 shadow-sm">
                    <div class="size-3">
                      <ActivityIcon :type-id="item.type_id" />
                    </div>
                  </div>

                  <!-- Text -->
                  <div
                    class="truncate text-xs text-verve-brown font-medium leading-tight group-hover:text-verve-orange transition-colors">
                    {{ getDisplayValue(item) }}
                  </div>
                </router-link>
              </div>
            </div>

            <!-- 2. THE 8TH COLUMN (WEEKLY SUMMARY) -->
            <div
              class="border-b border-verve-medium/30 bg-verve-light/10 border-l p-2 flex flex-col justify-center items-center text-center space-y-2">
              <div v-if="week.week_summary.count > 0">
                <div class="text-sm font-bold text-verve-brown">
                  {{ week.week_summary.distance.toFixed(0) }}
                  <span class="text-xs font-normal text-verve-brown/60">km</span>
                </div>
                <div class="text-xs text-verve-brown/80 font-mono bg-white/50 px-2 py-0.5 rounded-md">
                  {{ formatDuration(week.week_summary.duration) }}
                </div>
                <div class="text-[10px] text-verve-brown/40 mt-1 font-medium uppercase tracking-wide">
                  {{ week.week_summary.count }} Activities
                </div>
              </div>
              <div v-else class="text-verve-brown/20 text-xs italic">Rest Week</div>
            </div>
          </template>
        </template>

        <!-- Loading State -->
        <div v-else class="col-span-8 h-64 flex items-center justify-center text-verve-brown/40">
          Loading calendar...
        </div>
      </div>
    </div>
  </div>
</template>
