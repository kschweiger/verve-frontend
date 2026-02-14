import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from './auth';

// Define interfaces to match your API response
interface MetricData {
  per_day: { [date: string]: number | null };
  pie_data: { [subTypeId: string]: number };
  total: number;
}

export interface WeeklyStats {
  distance: MetricData;
  elevation_gain: MetricData;
  duration: MetricData;
}

export const useWeeklyStore = defineStore('weekly', () => {
  const weeklyData = ref<WeeklyStats | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function fetchWeeklyStats(
    year: number | null,
    week: number | null,
    activityTypeId: number
  ) {
    isLoading.value = true;
    error.value = null;

    const userStore = useUserStore();
    if (!userStore.token) {
      error.value = 'Not authenticated.';
      isLoading.value = false;
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

      weeklyData.value = await response.json();
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      isLoading.value = false;
    }
  }

  return { weeklyData, isLoading, error, fetchWeeklyStats };
});
