import { responseError, getAuthHeaders } from '../services/authHeaders';
import type { ActivityHighlightPublic, HighlightMetric, ListResponse } from '../types/api';
import { mapActivityHighlight, type ActivityHighlight } from '../services/records';
import { useLatestRequest } from '../composables/useLatestRequest';
import { useAccountSession } from '../composables/useAccountSession';
import { ref } from 'vue';
import { defineStore } from 'pinia';

export type { ActivityHighlight as Highlight } from '../services/records';

export const useHighlightStore = defineStore('highlight', () => {
  const availableMetrics = ref<HighlightMetric[]>([]);
  const activityHighlights = ref<ActivityHighlight[]>([]); // For the detail view
  const dashboardHighlights = ref<ActivityHighlight[]>([]); // For the dashboard widget
  const isLoading = ref(false);

  const isDashboardLoading = ref(false);

  // --- ACTIONS ---

  const captureSession = useAccountSession(() => {
    isDashboardLoading.value = false;
    availableMetrics.value = [];
    activityHighlights.value = [];
    dashboardHighlights.value = [];
    isLoading.value = false;
  });
  const beginActivityHighlightsRequest = useLatestRequest(captureSession);
  const beginDashboardHighlightsRequest = useLatestRequest(captureSession);

  async function fetchAvailableMetrics() {
    const isCurrent = captureSession();
    if (availableMetrics.value.length > 0) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/highlights/metrics`, {
        headers: getAuthHeaders(),
      });
      if (!isCurrent()) return;
      if (!response.ok) throw await responseError(response, 'Failed to fetch highlight metrics.');

      const data: ListResponse<HighlightMetric> = await response.json();
      if (!isCurrent()) return;
      availableMetrics.value = data.data;
    } catch (e) {
      if (!isCurrent()) return;
      console.error(e);
    }
  }

  async function fetchHighlightsForActivity(activityId: string) {
    const isCurrent = beginActivityHighlightsRequest();
    activityHighlights.value = [];
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
      const data: ListResponse<ActivityHighlightPublic> = await response.json();
      if (!isCurrent()) return;
      activityHighlights.value = data.data.map(mapActivityHighlight);
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

  async function fetchDashboardHighlights(metric: HighlightMetric, year: number | null) {
    const isCurrent = beginDashboardHighlightsRequest();
    isDashboardLoading.value = true;
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

      const data: ListResponse<ActivityHighlightPublic> = await response.json();
      if (!isCurrent()) return;
      dashboardHighlights.value = data.data.map(mapActivityHighlight);
    } catch (e) {
      if (!isCurrent()) return;
      console.error(e);
    } finally {
      if (isCurrent()) {
        isDashboardLoading.value = false;
      }
    }
  }

  return {
    isDashboardLoading,
    availableMetrics,
    activityHighlights,
    dashboardHighlights,
    isLoading,
    fetchAvailableMetrics,
    fetchHighlightsForActivity,
    fetchDashboardHighlights,
  };
});
