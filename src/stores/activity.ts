import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useUserStore } from './auth'
import { parseISODuration, formatDuration } from '@/utils/datetime'


export interface Activity {
  id: string;
  start: string;
  duration: string;
  distance: number;
  durationSeconds: number;
  elevationGain: number | null;
  elevationLoss: number | null;
  type_id: number;
  sub_type_id: number | null;
  name: string | null;
  avg_speed: number | null;
  max_speed: number | null;

}

export interface ActivityFilters {
  year?: number | null;
  month?: number | null;
  type_id?: number | null;
  sub_type_id?: number | null;
}

export interface ActivityUpdatePayload {
  name?: string;
  type_id?: number | null;
  sub_type_id?: number | null;
  // meta_data is also possible, but we'll stick to these for now
}

const ACTIVITIES_PER_PAGE = 5;

const mapApiActivity = (apiActivity: any): Activity => {
  const durationSeconds = parseISODuration(apiActivity.duration);

  return {
    id: apiActivity.id,
    start: apiActivity.start,

    // Core metrics are assumed to be present
    duration: formatDuration(durationSeconds),
    durationSeconds: durationSeconds,
    distance: apiActivity.distance,

    // Use nullish coalescing for safety on nullable fields
    elevationGain: apiActivity.elevation_change_up ?? null,
    elevationLoss: apiActivity.elevation_change_down ?? null,
    name: apiActivity.name ?? null,
    avg_speed: apiActivity.avg_speed ?? null,
    max_speed: apiActivity.max_speed ?? null,

    type_id: apiActivity.type_id,
    sub_type_id: apiActivity.sub_type_id ?? null,
  };
};

export const useActivityStore = defineStore('activity', () => {
  // --- STATE ---
  const recentActivities = ref<Activity[]>([]);
  const isRecentLoading = ref(false);
  const recentError = ref<string | null>(null);

  const paginatedActivities = ref<Activity[]>([]);
  const isListLoading = ref(false);
  const listError = ref<string | null>(null);
  const currentPage = ref(1);
  const canLoadMore = ref(true);
  const currentFilters = ref<ActivityFilters>({});


  // --- ACTIONS ---
  async function fetchRecentActivities() {
    // Don't re-fetch if we are already loading
    if (isRecentLoading.value) return;

    isRecentLoading.value = true;
    recentError.value = null;

    const userStore = useUserStore();
    if (!userStore.token) {
      recentError.value = 'Authentication token not found.';
      isRecentLoading.value = false;
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
      recentActivities.value = data.data.map(mapApiActivity);

    } catch (e: any) {
      recentError.value = e.message || 'An unknown error occurred.';
    } finally {
      isRecentLoading.value = false;
    }
  }

  async function fetchActivities(filters: ActivityFilters, loadMore = false) {
    isListLoading.value = true;
    listError.value = null;

    if (!loadMore) {
      paginatedActivities.value = [];
      currentPage.value = 1;
      canLoadMore.value = true;
      currentFilters.value = filters; // Store the new filters
    }

    const userStore = useUserStore();
    if (!userStore.token) {
      listError.value = 'Not authenticated.';
      isListLoading.value = false;
      return;
    }

    try {
      const params = new URLSearchParams();
      params.append('limit', ACTIVITIES_PER_PAGE.toString());
      params.append('offset', ((currentPage.value - 1) * ACTIVITIES_PER_PAGE).toString());

      if (currentFilters.value.year) params.append('year', currentFilters.value.year.toString());
      if (currentFilters.value.month) params.append('month', currentFilters.value.month.toString());
      if (currentFilters.value.type_id) params.append('type_id', currentFilters.value.type_id.toString());
      if (currentFilters.value.sub_type_id) params.append('sub_type_id', currentFilters.value.sub_type_id.toString());

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/activity/?${params.toString()}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${userStore.token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch paginated activities.');

      const data = await response.json();
      const newActivities = data.data.map(mapApiActivity);

      if (loadMore) {
        paginatedActivities.value.push(...newActivities);
      } else {
        paginatedActivities.value = newActivities;
      }

      if (data.data.length < ACTIVITIES_PER_PAGE) {
        canLoadMore.value = false;
      }

      currentPage.value++;

    } catch (e: any) {
      listError.value = e.message;
    } finally {
      isListLoading.value = false;
    }
  }

  async function uploadActivity(
    file: File,
    typeId: number | null,
    subTypeId: number | null
  ): Promise<{ success: boolean; message: string }> {

    const userStore = useUserStore();
    if (!userStore.token) {
      return { success: false, message: 'Not authenticated.' };
    }

    // Use FormData for multipart/form-data requests (file uploads)
    const formData = new FormData();
    formData.append('file', file);

    // Build the URL with optional query parameters
    const params = new URLSearchParams();
    if (typeId) {
      params.append('type_id', typeId.toString());
    }
    if (subTypeId) {
      params.append('sub_type_id', subTypeId.toString());
    }
    const queryString = params.toString();
    const url = `${import.meta.env.VITE_API_BASE_URL}/activity/auto/${queryString ? '?' + queryString : ''}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userStore.token}`
          // For FormData, the browser sets the Content-Type header automatically with the correct boundary
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed.');
      }

      // After a successful upload, we should refresh the recent activities list
      // so the new activity appears in the other widget.
      fetchRecentActivities();

      return { success: true, message: 'Activity uploaded successfully!' };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }
  async function updateActivity(activityId: string, payload: ActivityUpdatePayload): Promise<boolean> {
    const userStore = useUserStore();
    if (!userStore.token) {
      // In a real app, you might set an error state here
      console.error('Not authenticated.');
      return false;
    }

    try {
      console.log(payload);
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/activity/${activityId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${userStore.token}`,
          'Content-Type': 'application/json', // IMPORTANT for JSON payloads
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // You could parse the error response from the backend here
        throw new Error('Failed to update activity.');
      }

      // Optionally, you could update the specific activity in your paginated/recent lists here
      // for a super slick UI, but for now, we'll let the detail view re-fetch.
      return true; // Indicate success

    } catch (e: any) {
      console.error(e.message);
      return false; // Indicate failure
    }
  }
  // Expose state and actions
  return {
    // Dashboard Widget
    recentActivities,
    isRecentLoading, // Use aliases to avoid name clashes
    recentError,
    fetchRecentActivities,

    // Activities List View
    paginatedActivities,
    isListLoading,
    listError,
    canLoadMore,
    currentFilters,
    fetchActivities,

    // Upload
    uploadActivity,

    // Update
    updateActivity
  }
})
