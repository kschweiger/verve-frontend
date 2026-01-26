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
  // activity is not on the highlight, we will need to fetch it separately for the widget
}

export const useHighlightStore = defineStore('highlight', () => {
  const availableMetrics = ref<string[]>([]);
  const activityHighlights = ref<Highlight[]>([]); // For the detail view
  const dashboardHighlights = ref<Highlight[]>([]); // For the dashboard widget
  const isLoading = ref(false);

  const userStore = useUserStore();
  const getAuthHeaders = () => ({ 'Authorization': `Bearer ${userStore.token}` });

  // --- ACTIONS ---

  // Fetch the list of all possible metrics for dropdowns
  async function fetchAvailableMetrics() {
    if (availableMetrics.value.length > 0) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/highlights/metrics`, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Failed to fetch highlight metrics.');
      const data = await response.json();
      availableMetrics.value = data.data;
    } catch (e) {
      console.error(e);
    }
  }

  // Fetch highlights for a specific activity
  async function fetchHighlightsForActivity(activityId: string) {
    isLoading.value = true;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/highlights/activity/${activityId}`, { headers: getAuthHeaders() });
      if (!response.ok) { activityHighlights.value = []; return; }
      const data = await response.json();
      activityHighlights.value = data.data;
    } catch (e) {
      console.error(e);
      activityHighlights.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  // Fetch the top 3 highlights for a given metric and scope (for the dashboard)
  async function fetchDashboardHighlights(metric: string, year: number | null) {
    isLoading.value = true;
    dashboardHighlights.value = []; // Clear previous results
    try {
      const params = new URLSearchParams();
      if (year) {
        params.append('year', year.toString());
      }

      const queryString = params.toString();
      const url = `${import.meta.env.VITE_API_BASE_URL}/highlights/metric/${metric}${queryString ? '?' + queryString : ''}`;
      const response = await fetch(url.toString(), { headers: getAuthHeaders() });
      if (!response.ok) return;
      const data = await response.json();
      dashboardHighlights.value = data.data;
    } catch (e) {
      console.error(e);
    } finally {
      isLoading.value = false;
    }
  }

  return {
    availableMetrics, activityHighlights, dashboardHighlights, isLoading,
    fetchAvailableMetrics, fetchHighlightsForActivity, fetchDashboardHighlights,
  };
});
