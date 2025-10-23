import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useUserStore } from './auth'
import { parseISODuration, formatDuration } from '@/utils/datetime'


// Define a TypeScript interface for our Activity object for type safety
export interface Activity {
  id: string; // Assuming UUID is a string
  start: string; // ISO date string
  duration: string; // ISO 8601 duration format
  distance: number;
  // Add any other properties you might need from the API response
  // Computed fields
  durationSeconds?: number;
}

export const useActivityStore = defineStore('activity', () => {
  // --- STATE ---
  const recentActivities = ref<Activity[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // --- ACTIONS ---
  async function fetchRecentActivities() {
    // Don't re-fetch if we are already loading
    if (isLoading.value) return;

    isLoading.value = true;
    error.value = null;

    const userStore = useUserStore();
    if (!userStore.token) {
      error.value = 'Authentication token not found.';
      isLoading.value = false;
      return;
    }

    try {
      // Call the endpoint to get activities, with a limit of 5
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/activity/?limit=5`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userStore.token}`
        },
      }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch activities.');
      }

      const data = await response.json();
      // Assuming the API returns an object like { data: [...], count: ... }
      recentActivities.value = data.data.map((activity: any) => ({
        id: activity.id,
        start: activity.start,
        duration: formatDuration(parseISODuration(activity.duration)),
        distance: activity.distance,
        durationSeconds: parseISODuration(activity.duration)
      }));

    } catch (e: any) {
      error.value = e.message || 'An unknown error occurred.';
    } finally {
      isLoading.value = false;
    }
    console.log('Fetched recent activities:', recentActivities.value);
  }

  // Expose state and actions
  return { recentActivities, isLoading, error, fetchRecentActivities }
})
