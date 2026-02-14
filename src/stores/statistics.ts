import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from './auth';

type StatsPerType = Record<string, number>;

export interface StatsMetric {
  count: number;
  distance: number;
  duration: number;
  elevation_gain: number;
}

export interface ActivityCalendarItem {
  id: string;
  name: string | null;
  type_id: number;
  distance: number | null;
  duration: number | string; // API might return ISO string or seconds
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

export interface YearStats {
  distance: {
    total: number;
    per_type: StatsPerType;
  };
  duration: {
    total: number;
    per_type: StatsPerType;
  };
  count: {
    total: number;
    per_type: StatsPerType;
  };
}

export const useStatisticsStore = defineStore('statistics', () => {
  const yearlyStats = ref<YearStats | null>(null);
  const calendarData = ref<CalendarResponse | null>(null);
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

  return {
    yearlyStats,
    calendarData,
    isLoading,
    error,
    fetchYearlyStats,
    fetchCalendar,
  };
});
