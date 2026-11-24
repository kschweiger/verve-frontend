<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStatisticsStore, type CalendarDay } from '@/stores/statistics';
import { useActivityStore } from '@/stores/activity';
import ActivityIcon from '@/components/ActivityIcon.vue';
import { isCalendarDataForMonth } from '@/utils/calendarData';

const statsStore = useStatisticsStore();
const activityStore = useActivityStore();
const { locale, t, n } = useI18n();
const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Navigation State
const now = new Date();
const currentYear = ref(now.getFullYear());
const currentMonth = ref(now.getMonth() + 1);

const monthName = computed(() =>
  new Intl.DateTimeFormat(locale.value, { month: 'long' }).format(
    new Date(currentYear.value, currentMonth.value - 1)
  )
);
const yearLabel = computed(() => currentYear.value.toLocaleString(locale.value, { useGrouping: false }));
const oneDecimal = computed(() => new Intl.NumberFormat(locale.value, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
}));
const dayNumber = computed(() => new Intl.DateTimeFormat(locale.value, { day: 'numeric', timeZone: 'UTC' }));
const calendarData = computed(() =>
  isCalendarDataForMonth(statsStore.calendarData, currentYear.value, currentMonth.value)
    ? statsStore.calendarData
    : null
);

const todayString = now.toISOString().split('T')[0];

function isToday(dateStr: string) {
  return dateStr === todayString;
}

const totalActivitiesInView = computed(() => {
  if (!calendarData.value) return 0;
  return calendarData.value.weeks.reduce((acc, week) => {
    return acc + week.days.reduce((dAcc, day) => dAcc + (day.is_in_month ? day.total.count : 0), 0);
  }, 0);
});

// Navigation logic
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

// Fetch data
const loadData = () => statsStore.fetchCalendar(currentYear.value, currentMonth.value);
watch([currentYear, currentMonth], loadData);

watch(() => activityStore.lastUpdate, () => {
  loadData();
});

onMounted(loadData);

function handleDayClick(day: CalendarDay) {
  console.log('Clicked day:', day.date);
}
</script>

<template>
  <div class="bg-white rounded-xl shadow-sm border border-verve-medium/30 p-6 h-full">
    <!-- Header -->
    <div class="flex justify-between items-end mb-6">
      <div>
        <div class="text-xs text-verve-brown/60 uppercase font-bold tracking-wider mb-0.5">
          {{ t('stats.calendar.title') }}
        </div>
        <div class="flex items-baseline gap-2">
          <h3 class="text-2xl font-bold text-verve-brown">{{ monthName }}</h3>
          <span class="text-lg text-verve-brown/40">{{ yearLabel }}</span>
        </div>
      </div>

      <!-- Stats Summary -->
      <div class="text-right hidden sm:block">
        <div class="text-xs text-verve-brown/60 uppercase font-bold">{{ t('calendar.activities') }}</div>
        <div class="text-xl font-bold text-verve-orange">{{ n(totalActivitiesInView) }}</div>
      </div>

      <!-- Controls -->
      <div class="flex gap-1">
        <button type="button" :aria-label="t('calendar.previousMonth')" @click="changeMonth(-1)"
          class="p-1 hover:bg-verve-light rounded text-verve-brown/60 hover:text-verve-brown transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-verve-orange">
          &lt;
        </button>
        <button type="button" :aria-label="t('calendar.nextMonth')" @click="changeMonth(1)"
          class="p-1 hover:bg-verve-light rounded text-verve-brown/60 hover:text-verve-brown transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-verve-orange">
          &gt;
        </button>
      </div>
    </div>

    <div v-if="calendarData && !statsStore.isCalendarLoading && !statsStore.calendarError" class="w-full">
      <!-- Weekday Labels -->
      <div class="grid grid-cols-7 cal-grid-header">
        <span v-for="weekday in weekdays" :key="weekday">{{ t(`calendar.weekdays.${weekday}`) }}</span>
      </div>

      <!-- Main Grid -->
      <div class="flex flex-col gap-2">
        <div v-for="(week, wIdx) in calendarData.weeks" :key="wIdx" class="grid grid-cols-7">
          <!-- Days -->
          <div v-for="(day, dIdx) in week.days" :key="dIdx" class="cal-day-wrapper">
            <!-- 1. Day with Activity (Clickable Filled Circle) -->
            <button type="button" v-if="day.total.count > 0 && day.is_in_month" @click="handleDayClick(day)"
              class="cal-day-circle cal-day-filled group focus-visible:outline-2 focus-visible:outline-verve-orange"
              :title="t('stats.calendar.distanceTitle', { distance: `${oneDecimal.format(day.total.distance)} km` })">
              <div class="size-4">
                <ActivityIcon :type-id="day.active_type_ids[0]" />
              </div>
            </button>

            <!-- 2. Today (Outline Circle) -->
            <div v-else-if="isToday(day.date)" class="cal-day-circle cal-day-today">
              {{ dayNumber.format(new Date(day.date)) }}
            </div>

            <!-- 3. Standard Day (Text) -->
            <span v-else class="cal-day-circle" :class="day.is_in_month ? 'cal-day-text' : 'cal-day-muted'">
              {{ dayNumber.format(new Date(day.date)) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="statsStore.calendarError" class="h-64 flex items-center justify-center text-red-600 text-sm" role="alert">
      {{ statsStore.calendarError.detail ?? t(`calendar.${statsStore.calendarError.reason}`) }}
    </div>
    <div v-else class="h-64 flex items-center justify-center text-verve-brown/40 text-sm" role="status">
      {{ t('calendar.loading') }}
    </div>
  </div>
</template>
