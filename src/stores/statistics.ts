import { ApiResponseError, responseError, getAuthHeaders } from '../services/authHeaders';
import type { ActivityCalendarItem } from '../types/api';
import { useLatestRequest } from '../composables/useLatestRequest';
import { useAccountSession } from '../composables/useAccountSession';
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from './auth';

type StatisticsError = { reason: 'notAuthenticated' | 'loadFailed'; detail?: string };

export interface StatsMetric {
  count: number;
  distance: number;
  duration: number;
  effective_duration: number;
  elevation_gain: number;
}

export type { ActivityCalendarItem } from '../types/api';

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

interface YearMetric {
  total: number;
  per_type: Record<string, number>;
  per_sub_type: Record<string, Record<string, number>>;
}

export interface YearStats {
  distance: YearMetric;
  duration: YearMetric;
  effective_duration: YearMetric;
  count: YearMetric;
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
  const activityGridError = ref<StatisticsError | null>(null);
  const isWeeklyLoading = ref(false);
  const weeklyError = ref<StatisticsError | null>(null);
  const isLoading = ref(false);
  const error = ref<StatisticsError | null>(null);

  const isCalendarLoading = ref(false);
  const calendarError = ref<StatisticsError | null>(null);

  const userStore = useUserStore();

  const captureSession = useAccountSession(() => {
    isCalendarLoading.value = false;
    calendarError.value = null;
    yearlyStats.value = null;
    weeklyStats.value = null;
    calendarData.value = null;
    activityGrid.value = null;
    isActivityGridLoading.value = false;
    activityGridError.value = null;
    isWeeklyLoading.value = false;
    weeklyError.value = null;
    isLoading.value = false;
    error.value = null;
  });
  const beginYearRequest = useLatestRequest(captureSession);
  const beginCalendarRequest = useLatestRequest(captureSession);
  const beginWeekRequest = useLatestRequest(captureSession);
  const beginGridRequest = useLatestRequest(captureSession);

  async function fetchYearlyStats(year: number | null) {
    const isCurrent = beginYearRequest();
    isLoading.value = true;
    error.value = null;

    if (!userStore.token) {
      error.value = { reason: 'notAuthenticated' };
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
        headers: getAuthHeaders(),
      });
      if (!isCurrent()) return;

      if (!response.ok) {
        throw await responseError(response, 'Failed to fetch statistics.');
      }

      const data: typeof yearlyStats.value = await response.json();
      if (!isCurrent()) return;
      yearlyStats.value = data;
    } catch (e: unknown) {
      if (!isCurrent()) return;
      error.value = { reason: 'loadFailed', detail: e instanceof ApiResponseError ? e.detail : undefined };
      yearlyStats.value = null;
    } finally {
      if (isCurrent()) {
        isLoading.value = false;
      }
    }
  }

  async function fetchCalendar(year: number, month: number) {
    const isCurrent = beginCalendarRequest();
    isCalendarLoading.value = true;
    calendarError.value = null;

    if (!userStore.token) {
      calendarError.value = { reason: 'notAuthenticated' };
      isCalendarLoading.value = false;
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/statistics/calender?year=${year}&month=${month}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );
      if (!isCurrent()) return;

      if (!response.ok) throw await responseError(response, 'Failed to load calendar data.');

      const data: typeof calendarData.value = await response.json();
      if (!isCurrent()) return;
      calendarData.value = data;
    } catch (e: unknown) {
      if (!isCurrent()) return;
      calendarError.value = {
        reason: 'loadFailed',
        detail: e instanceof ApiResponseError ? e.detail : undefined,
      };
    } finally {
      if (isCurrent()) {
        isCalendarLoading.value = false;
      }
    }
  }

  async function fetchWeeklyStats(
    year: number | null,
    week: number | null,
    activityTypeId: number
  ) {
    const isCurrent = beginWeekRequest();
    isWeeklyLoading.value = true;
    weeklyError.value = null;

    if (!userStore.token) {
      weeklyError.value = { reason: 'notAuthenticated' };
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
          headers: getAuthHeaders(),
        }
      );
      if (!isCurrent()) return;

      if (!response.ok) throw await responseError(response, 'Failed to fetch weekly stats.');

      const data: typeof weeklyStats.value = await response.json();
      if (!isCurrent()) return;
      weeklyStats.value = data;
    } catch (e: unknown) {
      if (!isCurrent()) return;
      weeklyError.value = { reason: 'loadFailed', detail: e instanceof ApiResponseError ? e.detail : undefined };
      weeklyStats.value = null;
    } finally {
      if (isCurrent()) {
        isWeeklyLoading.value = false;
      }
    }
  }

  async function fetchActivityGrid(weeks = 52) {
    const isCurrent = beginGridRequest();
    isActivityGridLoading.value = true;
    activityGridError.value = null;

    if (!userStore.token) {
      activityGridError.value = { reason: 'notAuthenticated' };
      isActivityGridLoading.value = false;
      return;
    }

    try {
      const params = new URLSearchParams();
      params.append('weeks', weeks.toString());

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/statistics/activity_grid?${params.toString()}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );
      if (!isCurrent()) return;

      if (!response.ok) throw await responseError(response, 'Failed to load activity grid.');

      const data: typeof activityGrid.value = await response.json();
      if (!isCurrent()) return;
      activityGrid.value = data;
    } catch (e: unknown) {
      if (!isCurrent()) return;
      activityGridError.value = {
        reason: 'loadFailed',
        detail: e instanceof ApiResponseError ? e.detail : undefined,
      };
      activityGrid.value = null;
    } finally {
      if (isCurrent()) {
        isActivityGridLoading.value = false;
      }
    }
  }

  return {
    isCalendarLoading,
    calendarError,
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
