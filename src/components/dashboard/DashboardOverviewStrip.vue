<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Activity, CalendarDays, Clock, Flame } from '@lucide/vue';
import { useStatisticsStore } from '@/stores/statistics';
import {
  formatActivityGridDate,
  formatActivityGridDuration,
  getActivityGridDayOffset,
} from '@/utils/activityGrid';

const statisticsStore = useStatisticsStore();
const { t, n, locale } = useI18n();

const totals = computed(() => statisticsStore.activityGrid?.totals ?? null);
const summary = computed(() => statisticsStore.activityGrid?.summary ?? null);

function formatLastActiveDay(date: string | null): string {
  if (date === null) return t('dashboard.summary.noActivity');

  const today = new Date();
  const days = getActivityGridDayOffset(date, today);
  if (days === 0) return t('dashboard.summary.today');
  if (days === 1) return t('dashboard.summary.yesterday');
  if (days > 1 && days < 30) return t('dashboard.summary.daysAgo', { days: n(days) });

  return formatActivityGridDate(date, locale.value, {
    month: 'short',
    day: 'numeric',
    year: date.startsWith(`${today.getFullYear()}-`) ? undefined : 'numeric',
  });
}

const items = computed(() => {
  if (!totals.value || !summary.value) return [];
  const streak = summary.value.week_activity_streak;

  return [
    {
      key: 'activeTime',
      value: formatActivityGridDuration(totals.value.effective_duration_seconds, locale.value),
      icon: Clock,
    },
    {
      key: 'thisMonth',
      value: n(summary.value.activities_this_month),
      icon: CalendarDays,
    },
    {
      key: 'lastActive',
      value: formatLastActiveDay(summary.value.last_active_day),
      icon: Activity,
    },
    {
      key: 'weekStreak',
      value: t('dashboard.summary.weeks', { value: n(streak) }, streak),
      icon: Flame,
    },
  ];
});
</script>

<template>
  <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <div v-for="item in items" :key="item.key"
      class="bg-white border border-verve-medium/30 rounded-xl shadow-sm px-4 py-3">
      <div class="flex items-center gap-2 text-verve-brown/50">
        <component :is="item.icon" class="size-4" aria-hidden="true" />
        <p class="text-xs font-bold uppercase tracking-wider">{{ t(`dashboard.summary.${item.key}`) }}</p>
      </div>
      <p class="mt-2 text-2xl font-bold text-verve-brown">{{ item.value }}</p>
    </div>
  </section>
</template>
