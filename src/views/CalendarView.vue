<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useStatisticsStore, type ActivityCalendarItem } from '@/stores/statistics';
import ActivityIcon from '@/components/ActivityIcon.vue';
import { formatDuration, parseISODuration } from '@/utils/datetime';

const statsStore = useStatisticsStore();
const router = useRouter();

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

  let count = 0, distance = 0, duration = 0, elevation = 0;

  statsStore.calendarData.weeks.forEach(week => {
    week.days.forEach(day => {
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
  if (m > 12) { m = 1; y++; }
  if (m < 1) { m = 12; y--; }
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
  let seconds = typeof item.duration === 'string' ? parseISODuration(item.duration) : item.duration;
  if (seconds > 0) {
    return formatDuration(seconds);
  }
  return 'View';
};
</script>

<template>
  <!--
    FIX 1: Use min-h instead of h to allow vertical expansion.
    Remove 'h-[calc(100vh-64px)]' which forced a fixed height.
  -->
  <div class="p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-64px)] flex flex-col">

    <!-- HEADER -->
    <div class="flex flex-col md:flex-row justify-between items-center mb-4 bg-white p-4 rounded-lg shadow-sm shrink-0">

      <!-- Month Navigation -->
      <div class="flex items-center space-x-4 mb-4 md:mb-0">
        <h1 class="text-2xl font-bold text-gray-900 w-48">{{ monthName }} {{ currentYear }}</h1>
        <div class="flex items-center bg-gray-100 rounded-lg p-1">
          <button @click="changeMonth(-1)" class="p-2 hover:bg-white rounded-md text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clip-rule="evenodd" />
            </svg>
          </button>
          <button @click="goToToday"
            class="px-3 text-sm font-semibold text-gray-600 hover:text-indigo-600">Today</button>
          <button @click="changeMonth(1)" class="p-2 hover:bg-white rounded-md text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Month Summary -->
      <div class="flex space-x-6 text-right">
        <div>
          <div class="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Total Dist</div>
          <div class="text-lg font-bold text-gray-800">{{ monthSummary.distance.toFixed(0) }} <span
              class="text-xs font-normal text-gray-500">km</span></div>
        </div>
        <div>
          <div class="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Total Time</div>
          <div class="text-lg font-bold text-gray-800">{{ formatDuration(monthSummary.duration) }}</div>
        </div>
        <div>
          <div class="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Activities</div>
          <div class="text-lg font-bold text-gray-800">{{ monthSummary.count }}</div>
        </div>
      </div>
    </div>

    <!-- CALENDAR GRID CONTAINER -->
    <!-- Removed 'grow' to allow it to take natural height -->
    <div
      class="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden flex flex-col min-w-[900px] overflow-x-auto">

      <!-- GRID HEADERS -->
      <div
        class="grid grid-cols-8 border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
        <div v-for="day in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']" :key="day"
          class="py-3 text-center border-r border-gray-100">
          {{ day }}
        </div>
        <div class="py-3 text-center bg-gray-100/50 text-gray-600">Weekly</div>
      </div>

      <!-- GRID BODY -->
      <!--
        FIX 2: Use 'auto-rows-[minmax(10rem,1fr)]'
        This forces every row to be at least 10rem (160px) tall, but allows them to grow equally if there's extra space.
      -->
      <div class="grid grid-cols-8 auto-rows-[minmax(10rem,1fr)]">

        <template v-if="statsStore.calendarData">
          <template v-for="(week, wIdx) in statsStore.calendarData.weeks" :key="wIdx">

            <!-- 1. THE 7 DAYS -->
            <div v-for="(day, dIdx) in week.days" :key="`${wIdx}-${dIdx}`"
              class="border-b border-r border-gray-100 p-2 flex flex-col relative transition-colors"
              :class="day.is_in_month ? 'bg-white' : 'bg-gray-50/30'">
              <!-- Date Header -->
              <div class="flex justify-between items-start mb-2">
                <span class="text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full" :class="[
                  isToday(day.date) ? 'bg-indigo-600 text-white' : (day.is_in_month ? 'text-gray-700' : 'text-gray-400')
                ]">
                  {{ new Date(day.date).getDate() }}
                </span>
              </div>

              <!-- Activity List (Chips) -->
              <!-- Increased max-height to fill the larger cells -->
              <div class="space-y-1 overflow-y-auto max-h-[140px] scrollbar-thin">
                <router-link v-for="item in day.items" :key="item.id"
                  :to="{ name: 'activity-detail', params: { id: item.id } }"
                  class="flex items-center space-x-2 p-1 rounded-md border border-gray-200 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200 transition-colors group"
                  :title="item.name || 'Activity'">
                  <!-- Tiny Icon -->
                  <div
                    class="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-indigo-600 shrink-0">
                    <div class="w-3 h-3">
                      <ActivityIcon :type-id="item.type_id" />
                    </div>
                  </div>

                  <!-- Text -->
                  <div class="truncate text-xs text-gray-700 font-medium leading-tight">
                    {{ getDisplayValue(item) }}
                  </div>
                </router-link>
              </div>
            </div>

            <!-- 2. THE 8TH COLUMN (WEEKLY SUMMARY) -->
            <div
              class="border-b border-gray-100 bg-gray-50/50 p-2 flex flex-col justify-center items-center text-center space-y-2">
              <div v-if="week.week_summary.count > 0">
                <div class="text-sm font-bold text-gray-800">
                  {{ week.week_summary.distance.toFixed(0) }} <span class="text-xs font-normal text-gray-500">km</span>
                </div>
                <div class="text-xs text-gray-600">
                  {{ formatDuration(week.week_summary.duration) }}
                </div>
                <div class="text-[10px] text-gray-400 mt-1">
                  {{ week.week_summary.count }} Activities
                </div>
              </div>
              <div v-else class="text-gray-300 text-xs italic">
                Rest Week
              </div>
            </div>

          </template>
        </template>

        <!-- Loading State -->
        <div v-else class="col-span-8 h-64 flex items-center justify-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>

      </div>
    </div>
  </div>
</template>
