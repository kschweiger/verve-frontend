import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from './auth';

type StatsPerType = Record<string, number>;

export interface StatsMetric {
  count: number;
  distance: number;
  duration: number;
  effective_duration: number;
  elevation_gain: number;
}

export interface ActivityCalendarItem {
  id: string;
  name: string | null;
  type_id: number;
  distance: number | null;
  duration: number | string; // API might return ISO string or seconds
  effective_duration: number;
  elevation_gain: number | null;
}

export interface CalendarDay {
  date: string;
  is_in_month: boolean;
  items: ActivityCalendarItem[];
  active_type_ids: number[];
  total: StatsMetric;
}

export interface CalendarWeek {
  days: CalendarDay[];
  week_summary: StatsMetric;
}

export interface CalendarResponse {
  year: number;
  month: number;
  weeks: CalendarWeek[];
}

export interface GridDay {
  date: string;
  activity_count: number;
  duration_seconds: number;
  effective_duration_seconds: number;
}

export interface GridWeek {
  start_date: string;
  month: number | null;
  days: Array<GridDay | null>;
}

export interface GridMax {
  activity_count: number;
  duration_seconds: number;
  effective_duration_seconds: number;
}

export interface GridTotals {
  activity_count: number;
  duration_seconds: number;
  effective_duration_seconds: number;
  active_days: number;
}

export interface GridSummary {
  last_active_day: string | null;
  week_activity_streak: number;
  activities_this_month: number;
}

export interface ActivityGridResponse {
  weeks: GridWeek[];
  scale_max: GridMax;
  totals: GridTotals;
  summary: GridSummary;
}

export interface YearStats {
  distance: {
    total: number;
    per_type: StatsPerType;
  };
  duration: {
    total: number;
    per_type: StatsPerType;
  };
  effective_duration: {
    total: number;
    per_type: StatsPerType;
  };
  count: {
    total: number;
    per_type: StatsPerType;
  };
}

export interface MetricData {
  per_day: Record<string, number | null>;
  pie_data: Record<string, number>;
  total: number;
}

export interface WeeklyStats {
  distance: MetricData;
  elevation_gain: MetricData;
  duration: MetricData;
  effective_duration: MetricData;
}

export const useStatisticsStore = defineStore('statistics', () => {
  const yearlyStats = ref<YearStats | null>(null);
  const weeklyStats = ref<WeeklyStats | null>(null);
  const calendarData = ref<CalendarResponse | null>(null);
  const activityGrid = ref<ActivityGridResponse | null>(null);
  const isActivityGridLoading = ref(false);
  const activityGridError = ref<string | null>(null);
  const isWeeklyLoading = ref(false);
  const weeklyError = ref<string | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const userStore = useUserStore();

  async function fetchYearlyStats(year: number | null) {
    isLoading.value = true;
    error.value = null;

    if (!userStore.token) {
      error.value = 'Not authenticated.';
      isLoading.value = false;
      return;
    }

    try {
      const params = new URLSearchParams();
      if (year) {
        params.append('year', year.toString());
      }

      const queryString = params.toString();
      const url = `${import.meta.env.VITE_API_BASE_URL}/statistics/year${queryString ? '?' + queryString : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${userStore.token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch statistics.');
      }

      yearlyStats.value = await response.json();
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e);
      yearlyStats.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchCalendar(year: number, month: number) {
    isLoading.value = true;
    error.value = null;

    if (!userStore.token) {
      error.value = 'Not authenticated';
      isLoading.value = false;
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/statistics/calender?year=${year}&month=${month}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${userStore.token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to load calendar data.');

      calendarData.value = await response.json();
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchWeeklyStats(
    year: number | null,
    week: number | null,
    activityTypeId: number
  ) {
    isWeeklyLoading.value = true;
    weeklyError.value = null;

    if (!userStore.token) {
      weeklyError.value = 'Not authenticated.';
      isWeeklyLoading.value = false;
      return;
    }

    try {
      const params = new URLSearchParams();
      if (year) params.append('year', year.toString());
      if (week) params.append('week', week.toString());
      params.append('activity_type_id', activityTypeId.toString());

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/statistics/week?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${userStore.token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch weekly stats.');

      weeklyStats.value = await response.json();
    } catch (e: unknown) {
      weeklyError.value = e instanceof Error ? e.message : String(e);
      weeklyStats.value = null;
    } finally {
      isWeeklyLoading.value = false;
    }
  }

  async function fetchActivityGrid(weeks = 52) {
    isActivityGridLoading.value = true;
    activityGridError.value = null;

    if (!userStore.token) {
      activityGridError.value = 'Not authenticated';
      isActivityGridLoading.value = false;
      return;
    }

    try {
      const params = new URLSearchParams();
      params.append('weeks', weeks.toString());

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/statistics/activity-grid?${params.toString()}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${userStore.token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to load activity grid.');

      activityGrid.value = await response.json();
    } catch (e: unknown) {
      activityGridError.value = e instanceof Error ? e.message : String(e);
      activityGrid.value = null;
    } finally {
      isActivityGridLoading.value = false;
    }
  }

  return {
    yearlyStats,
    weeklyStats,
    calendarData,
    activityGrid,
    isActivityGridLoading,
    activityGridError,
    isWeeklyLoading,
    weeklyError,
    isLoading,
    error,
    fetchYearlyStats,
    fetchWeeklyStats,
    fetchCalendar,
    fetchActivityGrid,
  };
});
