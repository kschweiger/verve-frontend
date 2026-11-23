<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStatisticsStore, type ActivityCalendarItem, type CalendarDay } from '@/stores/statistics';
import ActivityIcon from '@/components/ActivityIcon.vue';
import { getMonthAgendaDays } from '@/utils/calendarAgenda';
import { isCalendarDataForMonth } from '@/utils/calendarData';
import { formatDuration } from '@/utils/datetime';

const statsStore = useStatisticsStore();
const { locale, t } = useI18n();
const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// --- Navigation State ---
const now = new Date();
const currentYear = ref(now.getFullYear());
const currentMonth = ref(now.getMonth() + 1);

// --- Computed ---
const monthName = computed(() =>
  new Intl.DateTimeFormat(locale.value, { month: 'long' }).format(
    new Date(currentYear.value, currentMonth.value - 1)
  )
);
const yearLabel = computed(() => currentYear.value.toLocaleString(locale.value, { useGrouping: false }));
const wholeNumber = computed(() => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 0 }));
const oneDecimal = computed(() => new Intl.NumberFormat(locale.value, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
}));
// API dates are calendar days without a timezone. Format them in UTC to retain the day.
const dayNumber = computed(() => new Intl.DateTimeFormat(locale.value, {
  day: 'numeric',
  timeZone: 'UTC',
}));
const agendaDate = computed(() => new Intl.DateTimeFormat(locale.value, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
}));
const isCalendarDataCurrent = computed(() =>
  isCalendarDataForMonth(statsStore.calendarData, currentYear.value, currentMonth.value)
);
const agendaDays = computed(() => getMonthAgendaDays(statsStore.calendarData?.weeks ?? []));

const monthSummary = computed(() => {
  if (!isCalendarDataCurrent.value || !statsStore.calendarData) {
    return { count: 0, distance: 0, effectiveDuration: 0, elevation: 0 };
  }

  let count = 0,
    distance = 0,
    effectiveDuration = 0,
    elevation = 0;

  statsStore.calendarData.weeks.forEach((week) => {
    week.days.forEach((day) => {
      if (day.is_in_month) {
        count += day.total.count;
        distance += day.total.distance;
        effectiveDuration += day.total.effective_duration;
        elevation += day.total.elevation_gain;
      }
    });
  });

  return { count, distance, effectiveDuration, elevation };
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

const getDistanceLabel = (distance: number) => `${oneDecimal.value.format(distance)} km`;
const getCountLabel = (count: number) =>
  t('calendar.activityCount', { count: wholeNumber.value.format(count) }, count);

const getDisplayValue = (item: ActivityCalendarItem) => {
  if (item.distance != null && item.distance > 0) {
    return getDistanceLabel(item.distance);
  }
  const seconds = item.effective_duration;
  if (seconds > 0) {
    return formatDuration(seconds, locale.value);
  }
  return t('calendar.viewActivity');
};

const getDaySummary = (day: CalendarDay) => {
  const parts: string[] = [];
  if (day.total.distance > 0) parts.push(getDistanceLabel(day.total.distance));
  if (day.total.effective_duration > 0)
    parts.push(formatDuration(day.total.effective_duration, locale.value));
  parts.push(getCountLabel(day.total.count));
  return parts.join(' · ');
};
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-64px)] flex flex-col bg-verve-medium">
    <!-- HEADER -->
    <div
      class="flex flex-col items-center justify-between mb-6 rounded-xl border border-verve-medium/30 bg-white p-6 shadow-sm lg:flex-row shrink-0">
      <!-- Month Navigation -->
      <div class="mb-4 flex flex-wrap items-center gap-4 lg:mb-0">
        <h1 class="text-3xl font-bold text-verve-brown w-48">
          {{ monthName }} <span class="font-light text-verve-brown/60">{{ yearLabel }}</span>
        </h1>

        <div class="flex items-center bg-verve-light rounded-xl p-1">
          <button type="button" :aria-label="t('calendar.previousMonth')" @click="changeMonth(-1)"
            class="p-2 hover:bg-white rounded-lg text-verve-brown/60 hover:text-verve-brown transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="size-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clip-rule="evenodd" />
            </svg>
          </button>
          <button type="button" :aria-label="t('calendar.currentMonth')" @click="goToToday" class="px-4 text-sm font-bold text-verve-brown/80 hover:text-verve-brown">
            {{ t('calendar.today') }}
          </button>
          <button type="button" :aria-label="t('calendar.nextMonth')" @click="changeMonth(1)"
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
      <div class="grid grid-cols-3 gap-3 text-right sm:gap-6 lg:gap-8">
        <div>
          <div class="text-[10px] text-verve-brown/60 uppercase font-bold tracking-wider">
            {{ t('calendar.totalDistance') }}
          </div>
          <div class="text-xl font-bold text-verve-brown">
            {{ wholeNumber.format(monthSummary.distance) }}
            <span class="text-xs font-normal text-verve-brown/60">km</span>
          </div>
        </div>
        <div>
          <div class="text-[10px] text-verve-brown/60 uppercase font-bold tracking-wider">
            {{ t('calendar.activeTime') }}
          </div>
          <div class="text-xl font-bold text-verve-brown">
            {{ formatDuration(monthSummary.effectiveDuration, locale) }}
          </div>
        </div>
        <div>
          <div class="text-[10px] text-verve-brown/60 uppercase font-bold tracking-wider">
            {{ t('calendar.activities') }}
          </div>
          <div class="text-xl font-bold text-verve-brown">{{ wholeNumber.format(monthSummary.count) }}</div>
        </div>
      </div>
    </div>

    <div v-if="statsStore.calendarError" role="alert" class="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
      <p>{{ statsStore.calendarError.detail || t(`calendar.${statsStore.calendarError.reason}`) }}</p>
      <button type="button" @click="loadData" class="mt-3 rounded-lg px-3 py-2 font-bold underline focus-visible:outline-2 focus-visible:outline-offset-2">{{ t('calendar.retry') }}</button>
    </div>

    <div
      v-else-if="statsStore.isCalendarLoading || !isCalendarDataCurrent"
      class="flex h-64 items-center justify-center rounded-xl border border-verve-medium/30 bg-white text-verve-brown/40 shadow-sm"
    >
      {{ t('calendar.loading') }}
    </div>

    <template v-else>
      <section class="overflow-hidden rounded-xl border border-verve-medium/30 bg-white shadow-sm lg:hidden">
        <article
          v-for="day in agendaDays"
          :key="day.date"
          class="border-b border-verve-medium/20 px-4 py-3 last:border-b-0"
        >
          <div class="flex items-center justify-between gap-3">
            <time :datetime="day.date" class="font-bold text-verve-brown">
              {{ agendaDate.format(new Date(day.date)) }}
            </time>
            <span
              v-if="isToday(day.date)"
              class="rounded-full bg-verve-neon px-2 py-0.5 text-xs font-bold text-verve-brown"
            >
              {{ t('calendar.today') }}
            </span>
          </div>

          <p v-if="day.total.count === 0" class="mt-1 text-sm text-verve-brown/60">{{ t('calendar.restDay') }}</p>

          <template v-else>
            <p class="mt-1 text-sm text-verve-brown/60">{{ getDaySummary(day) }}</p>
            <div class="mt-2 space-y-1">
              <router-link
                v-for="item in day.items"
                :key="item.id"
                :to="{ name: 'activity-detail', params: { id: item.id } }"
                class="group flex items-center gap-2 rounded-lg border border-transparent bg-verve-light/40 p-1.5 transition-all hover:border-verve-medium/50 hover:bg-verve-light"
                :title="item.name ?? t('calendar.activity')"
              >
                <div class="flex size-5 shrink-0 items-center justify-center rounded-full bg-white text-verve-brown shadow-sm">
                  <div class="size-3">
                    <ActivityIcon :type-id="item.type_id" />
                  </div>
                </div>
                <span class="min-w-0 grow truncate text-xs font-medium leading-tight text-verve-brown transition-colors group-hover:text-verve-orange">
                  {{ item.name ?? t('calendar.activity') }}
                </span>
                <span class="shrink-0 text-xs text-verve-brown/60">{{ getDisplayValue(item) }}</span>
              </router-link>
            </div>
          </template>
        </article>
      </section>

      <div class="hidden overflow-x-auto lg:block">
        <div class="min-w-[900px] overflow-hidden rounded-xl border border-verve-medium/30 bg-white shadow-sm">
          <!-- GRID HEADERS -->
          <div
            class="grid grid-cols-8 border-b border-verve-medium/30 bg-verve-light/50 text-xs font-bold text-verve-brown/60 uppercase tracking-wider">
            <div v-for="day in weekdays" :key="day"
              class="py-3 text-center border-r border-verve-medium/10 last:border-r-0">
              {{ t(`calendar.weekdays.${day}`) }}
            </div>
            <div class="py-3 text-center bg-verve-medium/20 text-verve-brown/80 border-l border-verve-medium/30">
              {{ t('calendar.weekly') }}
            </div>
          </div>

          <!-- GRID BODY -->
          <div class="grid grid-cols-8 auto-rows-[minmax(10rem,1fr)]">
          <template v-for="(week, wIdx) in statsStore.calendarData?.weeks ?? []" :key="wIdx">
            <!-- 1. THE 7 DAYS -->
            <div v-for="(day, dIdx) in week.days" :key="`${wIdx}-${dIdx}`"
              class="border-b border-r border-verve-medium/20 p-2 flex flex-col relative transition-colors"
              :class="day.is_in_month ? 'bg-white' : 'bg-gray-50/50'">
              <!-- Date Header -->
              <div class="flex justify-between items-start mb-2">
                <time :datetime="day.date" :aria-current="isToday(day.date) ? 'date' : undefined"
                  class="text-sm font-medium size-7 flex items-center justify-center rounded-full transition-all"
                  :class="[
                    isToday(day.date)
                      ? 'bg-verve-neon text-verve-brown font-bold shadow-sm'
                      : day.is_in_month
                        ? 'text-verve-brown'
                        : 'text-verve-brown/30',
                  ]">
                  {{ dayNumber.format(new Date(day.date)) }}
                </time>
              </div>

              <!-- Activity List (Chips) -->
              <div class="space-y-1 overflow-y-auto max-h-[140px] scrollbar-thin">
                <router-link v-for="item in day.items" :key="item.id"
                  :to="{ name: 'activity-detail', params: { id: item.id } }"
                  class="flex items-center space-x-2 p-1.5 rounded-lg border border-transparent bg-verve-light/40 hover:bg-verve-light hover:border-verve-medium/50 transition-all group"
                  :title="item.name || t('calendar.activity')">
                  <!-- Tiny Icon -->
                  <div
                    class="size-5 rounded-full bg-white text-verve-brown flex items-center justify-center shrink-0 shadow-sm">
                    <div class="size-3">
                      <ActivityIcon :type-id="item.type_id" />
                    </div>
                  </div>

                  <!-- Text -->
                  <span class="sr-only">{{ item.name || t('calendar.activity') }}</span>
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
                  {{ wholeNumber.format(week.week_summary.distance) }}
                  <span class="text-xs font-normal text-verve-brown/60">km</span>
                </div>
                <div class="text-xs text-verve-brown/80 font-mono bg-white/50 px-2 py-0.5 rounded-md">
                  {{ formatDuration(week.week_summary.effective_duration, locale) }}
                </div>
                <div class="text-[10px] text-verve-brown/40 mt-1 font-medium uppercase tracking-wide">
                  {{ getCountLabel(week.week_summary.count) }}
                </div>
              </div>
              <div v-else class="text-verve-brown/20 text-xs italic">{{ t('calendar.restWeek') }}</div>
            </div>
          </template>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
