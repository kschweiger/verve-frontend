<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useStatisticsStore } from '@/stores/statistics';
import ActivityIcon from '@/components/ActivityIcon.vue';

const statsStore = useStatisticsStore();

// Navigation State
const now = new Date();
const currentYear = ref(now.getFullYear());
const currentMonth = ref(now.getMonth() + 1);

// Formatting
const monthName = computed(() => {
  const date = new Date(currentYear.value, currentMonth.value - 1);
  return date.toLocaleString('default', { month: 'long' });
});

const todayString = now.toISOString().split('T')[0];

function isToday(dateStr: string) {
  return dateStr === todayString;
}

// Calculate total activities for the header
const totalActivitiesInView = computed(() => {
  if (!statsStore.calendarData) return 0;
  return statsStore.calendarData.weeks.reduce((acc, week) => {
    return acc + week.days.reduce((dAcc, day) => dAcc + (day.is_in_month ? day.total.count : 0), 0);
  }, 0);
});

// Navigation logic
const changeMonth = (delta: number) => {
  let m = currentMonth.value + delta;
  let y = currentYear.value;
  if (m > 12) { m = 1; y++; }
  if (m < 1) { m = 12; y--; }
  currentMonth.value = m;
  currentYear.value = y;
};

// Fetch data
const loadData = () => statsStore.fetchCalendar(currentYear.value, currentMonth.value);
watch([currentYear, currentMonth], loadData);
onMounted(loadData);
</script>

<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <!-- Header -->
    <div class="flex justify-between items-end mb-6">
      <div>
        <div class="text-xs text-gray-500 uppercase font-bold tracking-wider">Activity Log</div>
        <div class="flex items-baseline space-x-2">
          <h3 class="text-2xl font-bold text-gray-800">{{ monthName }}</h3>
          <span class="text-lg text-gray-400">{{ currentYear }}</span>
        </div>
      </div>

      <!-- Stats Summary -->
      <div class="text-right hidden sm:block">
        <div class="text-xs text-gray-500 uppercase">Activities</div>
        <div class="text-xl font-bold text-indigo-600">{{ totalActivitiesInView }}</div>
      </div>

      <!-- Controls -->
      <div class="flex space-x-1">
        <button @click="changeMonth(-1)" class="p-1 hover:bg-gray-100 rounded text-gray-500">&lt;</button>
        <button @click="changeMonth(1)" class="p-1 hover:bg-gray-100 rounded text-gray-500">&gt;</button>
      </div>
    </div>

    <div v-if="statsStore.calendarData" class="w-full">

      <!-- Weekday Labels -->
      <div class="grid grid-cols-7 mb-2 text-center text-xs font-semibold text-gray-400">
        <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
      </div>

      <!-- Main Grid -->
      <div class="flex flex-col space-y-2">
        <div v-for="(week, wIdx) in statsStore.calendarData.weeks" :key="wIdx" class="grid grid-cols-7">
          <!-- Days -->
          <div v-for="(day, dIdx) in week.days" :key="dIdx"
            class="aspect-square flex items-center justify-center relative">
            <!-- 1. Day with Activity (Filled Circle) -->
            <div v-if="day.total.count > 0 && day.is_in_month"
              class="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-sm"
              :title="`${day.total.distance.toFixed(1)} km`">
              <!-- Show Icon if available -->
              <div class="w-4 h-4">
                <ActivityIcon :type-id="day.active_type_ids[0]" />
              </div>
            </div>

            <!-- 2. Today (Outline Circle) - if not an active day -->
            <div v-else-if="isToday(day.date)"
              class="w-8 h-8 rounded-full border-2 border-indigo-600 flex items-center justify-center font-bold text-indigo-700">
              {{ new Date(day.date).getDate() }}
            </div>

            <!-- 3. Standard Day (Text) -->
            <span v-else class="text-sm font-medium" :class="day.is_in_month ? 'text-gray-600' : 'text-gray-300'">
              {{ new Date(day.date).getDate() }}
            </span>
          </div>
        </div>
      </div>

    </div>

    <!-- Loading State -->
    <div v-else class="h-64 flex items-center justify-center text-gray-400">
      Loading calendar...
    </div>
  </div>
</template>
