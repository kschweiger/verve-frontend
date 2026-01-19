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
  <div class="bg-white rounded-xl shadow-sm border border-verve-medium/30 p-6 h-full">
    <!-- Header -->
    <div class="flex justify-between items-end mb-6">
      <div>
        <div class="text-xs text-verve-brown/60 uppercase font-bold tracking-wider mb-0.5">Activity Log</div>
        <div class="flex items-baseline space-x-2">
          <h3 class="text-2xl font-bold text-verve-brown">{{ monthName }}</h3>
          <span class="text-lg text-verve-brown/40">{{ currentYear }}</span>
        </div>
      </div>

      <!-- Stats Summary -->
      <div class="text-right hidden sm:block">
        <div class="text-xs text-verve-brown/60 uppercase font-bold">Activities</div>
        <div class="text-xl font-bold text-verve-orange">{{ totalActivitiesInView }}</div>
      </div>

      <!-- Controls -->
      <div class="flex space-x-1">
        <button @click="changeMonth(-1)"
          class="p-1 hover:bg-verve-light rounded text-verve-brown/60 hover:text-verve-brown transition-colors">&lt;</button>
        <button @click="changeMonth(1)"
          class="p-1 hover:bg-verve-light rounded text-verve-brown/60 hover:text-verve-brown transition-colors">&gt;</button>
      </div>
    </div>

    <div v-if="statsStore.calendarData" class="w-full">

      <!-- Weekday Labels (Reusable Class) -->
      <div class="grid grid-cols-7 cal-grid-header">
        <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
      </div>

      <!-- Main Grid -->
      <div class="flex flex-col space-y-2">
        <div v-for="(week, wIdx) in statsStore.calendarData.weeks" :key="wIdx" class="grid grid-cols-7">
          <!-- Days -->
          <div v-for="(day, dIdx) in week.days" :key="dIdx" class="cal-day-wrapper">
            <!-- 1. Day with Activity (Clickable Filled Circle) -->
            <button v-if="day.total.count > 0 && day.is_in_month" @click="handleDayClick(day)"
              class="cal-day-circle cal-day-filled group"
              :title="`${day.total.distance.toFixed(1)} km - Click to view`">
              <div class="w-4 h-4">
                <!-- Pass a light color class if needed, usually icons inherit currentColor -->
                <ActivityIcon :type-id="day.active_type_ids[0]" />
              </div>
            </button>

            <!-- 2. Today (Outline Circle) -->
            <div v-else-if="isToday(day.date)" class="cal-day-circle cal-day-today">
              {{ new Date(day.date).getDate() }}
            </div>

            <!-- 3. Standard Day (Text) -->
            <span v-else class="cal-day-circle" :class="day.is_in_month ? 'cal-day-text' : 'cal-day-muted'">
              {{ new Date(day.date).getDate() }}
            </span>
          </div>
        </div>
      </div>

    </div>

    <!-- Loading State -->
    <div v-else class="h-64 flex items-center justify-center text-verve-brown/40 text-sm">
      Loading calendar...
    </div>
  </div>
</template>
