import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from './auth';
import { parseISODuration, formatDuration } from '@/utils/datetime';
import type { ApiActivity } from '@/services/api';

// --- Helper Types ---
type ApiError = {
  message: string;
  detail?: string | Array<{ msg: string }>;
};

// --- Interfaces ---
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
  distance?: number | null; // Added
  duration?: string;        // Added
}

export interface ActivityCreatePayload {
  name: string;
  start: string;
  type_id: number;
  sub_type_id?: number | null;
  distance?: number | null;
  duration: string;
  add_default_equipment: boolean;
  meta_data?: Record<string, unknown>;
}

export interface ActivityImage {
  id: string;
  url: string;
}

const ACTIVITIES_PER_PAGE = 5;

const mapApiActivity = (apiActivity: ApiActivity): Activity => {
  const durationSeconds = parseISODuration(apiActivity.duration);

  return {
    id: apiActivity.id,
    start: apiActivity.start,
    duration: formatDuration(durationSeconds),
    durationSeconds,
    distance: apiActivity.distance,
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
    if (isRecentLoading.value) return;

    isRecentLoading.value = true;
    recentError.value = null;

    if (!userStore.token) {
      recentError.value = 'Authentication token not found.';
      isRecentLoading.value = false;
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/activity/?limit=5`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${userStore.token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch activities.');

      const data = await response.json();
      recentActivities.value = (data.data as ApiActivity[]).map(mapApiActivity);
    } catch (e: unknown) {
      recentError.value = e instanceof Error ? e.message : 'An unknown error occurred.';
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
      currentFilters.value = filters;
    }

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
      if (currentFilters.value.type_id)
        params.append('type_id', currentFilters.value.type_id.toString());
      if (currentFilters.value.sub_type_id)
        params.append('sub_type_id', currentFilters.value.sub_type_id.toString());

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/activity/?${params.toString()}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${userStore.token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch paginated activities.');

      const data = await response.json();
      const newActivities = (data.data as ApiActivity[]).map(mapApiActivity);

      if (loadMore) {
        paginatedActivities.value.push(...newActivities);
      } else {
        paginatedActivities.value = newActivities;
      }

      if (data.data.length < ACTIVITIES_PER_PAGE) {
        canLoadMore.value = false;
      }

      currentPage.value++;
    } catch (e: unknown) {
      listError.value = e instanceof Error ? e.message : String(e);
    } finally {
      isListLoading.value = false;
    }
  }

  async function uploadActivity(
    file: File,
    typeId: number | null,
    subTypeId: number | null
  ): Promise<{ success: boolean; message: string }> {
    if (!userStore.token) {
      return { success: false, message: 'Not authenticated.' };
    }

    const formData = new FormData();
    formData.append('file', file);

    const params = new URLSearchParams();
    if (typeId) params.append('type_id', typeId.toString());
    if (subTypeId) params.append('sub_type_id', subTypeId.toString());

    const queryString = params.toString();
    const url = `${import.meta.env.VITE_API_BASE_URL}/activity/auto/${queryString ? '?' + queryString : ''}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userStore.token}` },
        body: formData,
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        let msg = 'Upload failed.';
        if (errorData.detail) {
          msg =
            typeof errorData.detail === 'string'
              ? errorData.detail
              : errorData.detail[0]?.msg || JSON.stringify(errorData.detail);
        }
        throw new Error(msg);
      }

      fetchRecentActivities();
      return { success: true, message: 'Activity uploaded successfully!' };
    } catch (e: unknown) {
      return { success: false, message: e instanceof Error ? e.message : String(e) };
    }
  }

  async function updateActivity(
    activityId: string,
    payload: ActivityUpdatePayload
  ): Promise<boolean> {
    if (!userStore.token) return false;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/activity/${activityId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${userStore.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to update activity.');
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async function createManualActivity(
    payload: ActivityCreatePayload,
    file: File | null
  ): Promise<{ success: boolean; message: string }> {
    if (!userStore.token) return { success: false, message: 'Not authenticated.' };

    try {
      const query = new URLSearchParams();
      if (payload.add_default_equipment) query.append('add_default_equipment', 'true');

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/activity/?${query.toString()}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${userStore.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail?.[0]?.msg || 'Failed to create activity.');
      }

      const newActivity = await response.json();

      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const trackResponse = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/track/?activity_id=${newActivity.id}`,
          {
            method: 'PUT',
            headers: { Authorization: `Bearer ${userStore.token}` },
            body: formData,
          }
        );

        if (!trackResponse.ok) {
          return {
            success: true,
            message: 'Activity created, but track upload failed.',
          };
        }
      }

      fetchRecentActivities();
      return { success: true, message: 'Activity created successfully!' };
    } catch (e: unknown) {
      return { success: false, message: e instanceof Error ? e.message : String(e) };
    }
  }

  async function fetchActivityImages(activityId: string) {
    isImagesLoading.value = true;
    activityImages.value = [];

    if (!userStore.token) {
      isImagesLoading.value = false;
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/media/images/activity/${activityId}`,
        {
          headers: { Authorization: `Bearer ${userStore.token}` },
        }
      );

      if (response.ok) {
        const responseData = await response.json();
        activityImages.value = responseData.data;
      }
    } catch (e) {
      console.error('Failed to load images', e);
    } finally {
      isImagesLoading.value = false;
    }
  }

  async function uploadActivityImage(activityId: string, file: File) {
    if (!userStore.token) return false;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/media/image/activity/${activityId}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${userStore.token}` },
          body: formData,
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

  async function deleteActivityImage(imageId: string, activityId: string) {
    if (!userStore.token) return false;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/media/image/${imageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userStore.token}` },
      });

      if (!response.ok) throw new Error('Delete failed');
      activityImages.value = activityImages.value.filter((img) => img.id !== imageId);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async function deleteActivity(id: string): Promise<boolean> {
    if (!userStore.token) return false;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/activity/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userStore.token}` },
      });

      if (!response.ok) throw new Error('Failed to delete activity');

      recentActivities.value = recentActivities.value.filter((a) => a.id !== id);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  return {
    recentActivities,
    isRecentLoading,
    recentError,
    fetchRecentActivities,
    paginatedActivities,
    isListLoading,
    listError,
    canLoadMore,
    currentFilters,
    fetchActivities,
    createManualActivity,
    uploadActivity,
    updateActivity,
    deleteActivity,
    activityImages,
    isImagesLoading,
    fetchActivityImages,
    uploadActivityImage,
    deleteActivityImage,
  };
});
