import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useUserStore } from './auth'
import { parseISODuration, formatDuration } from '@/utils/datetime'

function toISODuration(hours: number, minutes: number, seconds: number): string {
  let iso = 'PT';
  if (hours > 0) iso += `${hours}H`;
  if (minutes > 0) iso += `${minutes}M`;
  if (seconds > 0 || iso === 'PT') iso += `${seconds}S`; // Always at least PT0S
  return iso;
}


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



export interface ActivityCreatePayload {
  name: string;
  start: string; // ISO Date Time
  type_id: number;
  sub_type_id?: number | null;
  distance?: number | null;
  duration: string; // ISO 8601 Duration
  add_default_equipment: boolean;
}

export interface ActivityImage {
  id: string;
  url: string;
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

  const activityImages = ref<ActivityImage[]>([]);
  const isImagesLoading = ref(false);

  const userStore = useUserStore();

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
        let msg = 'Upload failed.';
        if (errorData.detail) {
          msg = typeof errorData.detail === 'string'
            ? errorData.detail
            : (errorData.detail[0]?.msg || JSON.stringify(errorData.detail));
        }
        throw new Error(msg);
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

  async function createManualActivity(payload: ActivityCreatePayload, file: File | null): Promise<{ success: boolean; message: string }> {
    const userStore = useUserStore();
    if (!userStore.token) return { success: false, message: 'Not authenticated.' };

    try {
      // Step 1: Create the Activity entity
      const query = new URLSearchParams();
      if (payload.add_default_equipment) query.append('add_default_equipment', 'true');

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/activity/?${query.toString()}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userStore.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail?.[0]?.msg || 'Failed to create activity.');
      }

      const newActivity = await response.json();

      // Step 2: Upload Track (Optional)
      if (file) {
        const formData = new FormData();
        formData.append('file', file);

        const trackResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/track/?activity_id=${newActivity.id}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${userStore.token}` },
          body: formData
        });

        if (!trackResponse.ok) {
          // Activity created, but track failed. We return success but with a warning message.
          return { success: true, message: 'Activity created, but track upload failed.' };
        }
      }

      // Refresh lists
      fetchRecentActivities();

      return { success: true, message: 'Activity created successfully!' };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }


  // 1. Fetch Images (UPDATED)
  async function fetchActivityImages(activityId: string) {
    isImagesLoading.value = true;
    activityImages.value = []; // Reset

    if (!userStore.token) { isImagesLoading.value = false; return; }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/media/images/activity/${activityId}`, {
        headers: { 'Authorization': `Bearer ${userStore.token}` }
      });

      if (response.ok) {
        const responseData = await response.json();
        // UPDATED: Now accessing .data instead of .images
        activityImages.value = responseData.data;
      }
    } catch (e) {
      console.error('Failed to load images', e);
    } finally {
      isImagesLoading.value = false;
    }
  }

  // 2. Upload Image (Unchanged, ensures consistent path)
  async function uploadActivityImage(activityId: string, file: File) {
    if (!userStore.token) return false;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/media/image/activity/${activityId}`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${userStore.token}` },
          body: formData
        }
      );

      if (!response.ok) throw new Error('Upload failed');

      await fetchActivityImages(activityId);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  // 3. Delete Image (Confirmed path based on your request)
  async function deleteActivityImage(imageId: string, activityId: string) {
    if (!userStore.token) return false;

    try {
      // Endpoint: DELETE /api/v1/media/image/{image_id}
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/media/image/${imageId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${userStore.token}` }
        }
      );

      if (!response.ok) throw new Error('Delete failed');

      // Optimistically remove from UI
      activityImages.value = activityImages.value.filter(img => img.id !== imageId);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async function deleteActivity(id: string): Promise<boolean> {
    const userStore = useUserStore();
    if (!userStore.token) return false;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/activity/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${userStore.token}` }
      });

      if (!response.ok) throw new Error('Failed to delete activity');

      // Optimistic update: Remove from recent list if it's there
      recentActivities.value = recentActivities.value.filter(a => a.id !== id);

      return true;
    } catch (e) {
      console.error(e);
      return false;
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

    createManualActivity,
    // Upload
    uploadActivity,

    // Update
    updateActivity,

    deleteActivity,

    activityImages,
    isImagesLoading,
    fetchActivityImages,
    uploadActivityImage,
    deleteActivityImage
  }
})
