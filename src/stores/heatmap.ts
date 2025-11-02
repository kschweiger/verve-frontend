import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from './auth';
import type { ActivityFilters } from './activity'; // Reuse the filter interface

// The heatmap plugin expects an array of [lat, lon, intensity]
export type HeatPoint = [number, number, number];

export const useHeatmapStore = defineStore('heatmap', () => {
  // --- STATE ---
  const heatmapPoints = ref<HeatPoint[]>([]);
  const heatmapCenter = ref<[number, number]>([0, 0]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // --- ACTION ---
  async function fetchHeatmapData(filters: ActivityFilters) {
    isLoading.value = true;
    error.value = null;
    const userStore = useUserStore();

    try {
      // Build the URL with query parameters from the filters
      const params = new URLSearchParams();
      if (filters.year) params.append('year', filters.year.toString());
      if (filters.month) params.append('month', filters.month.toString());
      if (filters.type_id) params.append('activity_type_id', filters.type_id.toString());
      if (filters.sub_type_id) params.append('activity_sub_type_id', filters.sub_type_id.toString());

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/heatmap/activities?${params.toString()}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${userStore.token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch heatmap data.');

      const data = await response.json();

      heatmapPoints.value = data.points;
      heatmapCenter.value = data.center;

    } catch (e: any) {
      error.value = e.message;
    } finally {
      isLoading.value = false;
    }
  }

  return { heatmapPoints, heatmapCenter, isLoading, error, fetchHeatmapData };
});
