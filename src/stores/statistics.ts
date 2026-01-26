import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from './auth';

// Define an interface for the API response for type safety
// A type for the nested per_type object
type StatsPerType = {
  [key: string]: number; // e.g., { "1": 4242.71, "2": 100.5 }
};

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
  duration: number;
  elevation_gain: number | null;
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  is_in_month: boolean;
  items: ActivityCalendarItem[];
  active_type_ids: number[]; // Critical for showing the bike icons
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
  // --- STATE ---
  const yearlyStats = ref<YearStats | null>(null);
  const calendarData = ref<CalendarResponse | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const userStore = useUserStore();

  // --- ACTION ---
  async function fetchYearlyStats(year: number | null) {
    isLoading.value = true;
    error.value = null;

    const userStore = useUserStore();
    if (!userStore.token) {
      error.value = 'Not authenticated.';
      isLoading.value = false;
      return;
    }

    try {
      // Construct the URL. If year is null, no query parameter is added.
      const params = new URLSearchParams();
      if (year) {
        params.append('year', year.toString());
      }

      const queryString = params.toString();
      const url = `${import.meta.env.VITE_API_BASE_URL}/statistics/year${queryString ? '?' + queryString : ''}`; const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${userStore.token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch statistics.');
      }

      yearlyStats.value = await response.json();

    } catch (e: any) {
      error.value = e.message;
      yearlyStats.value = null; // Clear old data on error
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchCalendar(year: number, month: number) {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/statistics/calender?year=${year}&month=${month}`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${userStore.token}` }
        }
      );

      if (!response.ok) throw new Error('Failed to load calendar data.');

      calendarData.value = await response.json();
    } catch (e: any) {
      error.value = e.message;
    } finally {
      isLoading.value = false;
    }
  }
  return { yearlyStats, calendarData, isLoading, error, fetchYearlyStats, fetchCalendar };
});
