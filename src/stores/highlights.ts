import { useAccountSession } from '../composables/useAccountSession';
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from './auth';

// --- INTERFACES ---
export interface Highlight {
  activity_id: string;
  metric: string;
  scope: 'yearly' | 'lifetime';
  year: number;
  value: number;
  rank: 1 | 2 | 3;
}

interface ApiResponse<T> {
  data: T;
}

export const useHighlightStore = defineStore('highlight', () => {
  const availableMetrics = ref<string[]>([]);
  const activityHighlights = ref<Highlight[]>([]); // For the detail view
  const dashboardHighlights = ref<Highlight[]>([]); // For the dashboard widget
  const isLoading = ref(false);

  const userStore = useUserStore();
  const getAuthHeaders = () => {
    if (!userStore.token) throw new Error('Not authenticated');
    return { Authorization: `Bearer ${userStore.token}` };
  };

  // --- ACTIONS ---

  const captureSession = useAccountSession(() => {
    availableMetrics.value = [];
    activityHighlights.value = [];
    dashboardHighlights.value = [];
    isLoading.value = false;
  });

  async function fetchAvailableMetrics() {
    const isCurrent = captureSession();
    if (availableMetrics.value.length > 0) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/highlights/metrics`, {
        headers: getAuthHeaders(),
      });
      if (!isCurrent()) return;
      if (!response.ok) throw new Error('Failed to fetch highlight metrics.');

      const data: ApiResponse<string[]> = await response.json();
      if (!isCurrent()) return;
      availableMetrics.value = data.data;
    } catch (e) {
      if (!isCurrent()) return;
      console.error(e);
    }
  }

  async function fetchHighlightsForActivity(activityId: string) {
    const isCurrent = captureSession();
    isLoading.value = true;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/highlights/activity/${activityId}`,
        {
          headers: getAuthHeaders(),
        }
      );
      if (!isCurrent()) return;
      if (!response.ok) {
        activityHighlights.value = [];
        return;
      }
      const data: ApiResponse<Highlight[]> = await response.json();
      if (!isCurrent()) return;
      activityHighlights.value = data.data;
    } catch (e) {
      if (!isCurrent()) return;
      console.error(e);
      activityHighlights.value = [];
    } finally {
      if (isCurrent()) {
        isLoading.value = false;
      }
    }
  }

  async function fetchDashboardHighlights(metric: string, year: number | null) {
    const isCurrent = captureSession();
    isLoading.value = true;
    dashboardHighlights.value = [];
    try {
      const params = new URLSearchParams();
      if (year) {
        params.append('year', year.toString());
      }

      const queryString = params.toString();
      const url = `${import.meta.env.VITE_API_BASE_URL}/highlights/metric/${metric}${queryString ? '?' + queryString : ''}`;

      const response = await fetch(url, { headers: getAuthHeaders() });
      if (!isCurrent()) return;
      if (!response.ok) return;

      const data: ApiResponse<Highlight[]> = await response.json();
      if (!isCurrent()) return;
      dashboardHighlights.value = data.data;
    } catch (e) {
      if (!isCurrent()) return;
      console.error(e);
    } finally {
      if (isCurrent()) {
        isLoading.value = false;
      }
    }
  }

  return {
    availableMetrics,
    activityHighlights,
    dashboardHighlights,
    isLoading,
    fetchAvailableMetrics,
    fetchHighlightsForActivity,
    fetchDashboardHighlights,
  };
});
