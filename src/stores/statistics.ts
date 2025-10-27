import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from './auth';

// Define an interface for the API response for type safety
// A type for the nested per_type object
type StatsPerType = {
  [key: string]: number; // e.g., { "1": 4242.71, "2": 100.5 }
};

// --- UPDATED INTERFACE ---
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
  const isLoading = ref(false);
  const error = ref<string | null>(null);

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
      const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/statistics/year`);
      if (year) {
        url.searchParams.append('year', year.toString());
      }

      const response = await fetch(url.toString(), {
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

  return { yearlyStats, isLoading, error, fetchYearlyStats };
});
