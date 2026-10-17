import { useLatestRequest } from '../composables/useLatestRequest';
import { useAccountSession } from '../composables/useAccountSession';
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from './auth';
import { mapApiActivity } from '../services/api';
import { parseActivityPageData } from '../services/activityResponses';
import { isSupportedTimezone } from '../services/timezones';
import type { ActivityTagPublic } from './tags';

function activityErrorMessage(value: unknown, fallback: string): string {
  if (typeof value !== 'object' || value === null || !('detail' in value)) return fallback;
  if (typeof value.detail === 'string') return value.detail;
  if (Array.isArray(value.detail)) {
    const first: unknown = value.detail[0];
    if (
      typeof first === 'object' &&
      first !== null &&
      'msg' in first &&
      typeof first.msg === 'string'
    ) {
      return first.msg;
    }
  }
  return fallback;
}

export interface Activity {
  id: string;
  start: string;
  timezone: string;
  duration: string;
  distance: number | null;
  durationSeconds: number;
  movingDuration: string | null;
  movingDurationSeconds: number | null;
  effectiveDuration: string;
  effectiveDurationSeconds: number;
  elevationGain: number | null;
  elevationLoss: number | null;
  type_id: number;
  sub_type_id: number | null;
  name: string | null;
  avg_speed: number | null;
  max_speed: number | null;
  avg_heartrate: number | null;
  max_heartrate: number | null;
  avg_power: number | null;
  max_power: number | null;
  metaData: Record<string, unknown> | null;
  tags: ActivityTagPublic[];
}

export interface ActivityFilters {
  year?: number | null;
  month?: number | null;
  type_id?: number | null;
  sub_type_id?: number | null;
  category_id?: number | null;
  tag_id?: number | null;
}

export interface ActivityUpdatePayload {
  timezone?: string;
  name?: string;
  type_id?: number | null;
  sub_type_id?: number | null;
  distance?: number | null;
  duration?: string;
}

export interface ActivityCreatePayload {
  name: string;
  start: string;
  type_id: number;
  sub_type_id?: number | null;
  distance?: number | null;
  elevation_change_up?: number | null;
  duration: string;
  add_default_equipment: boolean;
  meta_data?: Record<string, unknown>;
}

export interface ActivityImage {
  id: string;
  url: string;
}

const ACTIVITIES_PER_PAGE = 5;

export const useActivityStore = defineStore('activity', () => {
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
  let imagesActivityId: string | null = null;
  const isImagesLoading = ref(false);
  const lastUpdate = ref<number>(Date.now());

  const userStore = useUserStore();

  function notifyUpdate() {
    lastUpdate.value = Date.now();
  }

  const captureSession = useAccountSession(() => {
    imagesActivityId = null;
    recentActivities.value = [];
    isRecentLoading.value = false;
    recentError.value = null;
    paginatedActivities.value = [];
    isListLoading.value = false;
    listError.value = null;
    currentPage.value = 1;
    canLoadMore.value = true;
    currentFilters.value = {};
    activityImages.value = [];
    isImagesLoading.value = false;
    lastUpdate.value = Date.now();
  });
  const beginRecentRequest = useLatestRequest(captureSession);
  const beginListRequest = useLatestRequest(captureSession);
  const beginImagesRequest = useLatestRequest(captureSession);

  async function fetchRecentActivities() {
    const isCurrent = beginRecentRequest();
    isRecentLoading.value = true;
    recentError.value = null;

    if (!userStore.token) {
      recentError.value = 'Authentication token not found.';
      isRecentLoading.value = false;
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/activity/?limit=8`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${userStore.token}` },
      });
      if (!isCurrent()) return;

      if (!response.ok) throw new Error('Failed to fetch activities.');

      const data: unknown = await response.json();
      if (!isCurrent()) return;
      recentActivities.value = parseActivityPageData(data).map(mapApiActivity);
    } catch (e: unknown) {
      if (!isCurrent()) return;
      recentError.value = e instanceof Error ? e.message : 'An unknown error occurred.';
    } finally {
      if (isCurrent()) {
        isRecentLoading.value = false;
      }
    }
  }

  async function fetchActivities(filters: ActivityFilters, loadMore = false) {
    if (loadMore && (isListLoading.value || !canLoadMore.value)) return;
    const isCurrent = beginListRequest();
    isListLoading.value = true;
    listError.value = null;

    if (!loadMore) {
      paginatedActivities.value = [];
      currentPage.value = 1;
      canLoadMore.value = true;
      currentFilters.value = { ...filters };
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

      if (currentFilters.value.category_id)
        params.append('category_id', currentFilters.value.category_id.toString());
      if (currentFilters.value.tag_id)
        params.append('tag_id', currentFilters.value.tag_id.toString());

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/activity/?${params.toString()}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${userStore.token}` },
        }
      );
      if (!isCurrent()) return;

      if (!response.ok) throw new Error('Failed to fetch paginated activities.');

      const data: unknown = await response.json();
      if (!isCurrent()) return;
      const newActivities = parseActivityPageData(data).map(mapApiActivity);

      if (loadMore) {
        paginatedActivities.value.push(...newActivities);
      } else {
        paginatedActivities.value = newActivities;
      }

      if (newActivities.length < ACTIVITIES_PER_PAGE) canLoadMore.value = false;
      currentPage.value++;
    } catch (e: unknown) {
      if (!isCurrent()) return;
      listError.value = e instanceof Error ? e.message : String(e);
    } finally {
      if (isCurrent()) {
        isListLoading.value = false;
      }
    }
  }

  async function uploadActivity(
    file: File,
    typeId: number | null,
    subTypeId: number | null,
    timezoneName?: string
  ): Promise<{ success: boolean; message: string }> {
    const isCurrent = captureSession();
    if (!userStore.token) {
      return { success: false, message: 'Not authenticated.' };
    }

    if (timezoneName !== undefined && !isSupportedTimezone(timezoneName)) {
      return { success: false, message: 'Select a supported timezone.' };
    }

    const formData = new FormData();
    formData.append('file', file);

    const params = new URLSearchParams();
    if (typeId) params.append('type_id', typeId.toString());
    if (subTypeId) params.append('sub_type_id', subTypeId.toString());
    if (timezoneName !== undefined) params.set('timezone_name', timezoneName);

    const queryString = params.toString();
    const url = `${import.meta.env.VITE_API_BASE_URL}/activity/auto/${queryString ? '?' + queryString : ''}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userStore.token}` },
        body: formData,
      });
      if (!isCurrent())
        return { success: false, message: 'Account changed while processing the request.' };

      if (!response.ok) {
        const errorData: unknown = await response.json();
        if (!isCurrent())
          return { success: false, message: 'Account changed while processing the request.' };
        throw new Error(activityErrorMessage(errorData, 'Upload failed.'));
      }

      fetchRecentActivities();
      notifyUpdate();
      return { success: true, message: 'Activity uploaded successfully!' };
    } catch (e: unknown) {
      if (!isCurrent())
        return { success: false, message: 'Account changed while processing the request.' };
      return { success: false, message: e instanceof Error ? e.message : String(e) };
    }
  }

  async function updateActivity(
    activityId: string,
    payload: ActivityUpdatePayload
  ): Promise<boolean> {
    const isCurrent = captureSession();
    if (!userStore.token) return false;

    try {
      if (payload.timezone !== undefined && !isSupportedTimezone(payload.timezone)) {
        throw new Error('Select a supported timezone.');
      }
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/activity/${activityId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${userStore.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!isCurrent()) return false;

      if (!response.ok) throw new Error('Failed to update activity.');
      const data: unknown = await response.json();
      if (!isCurrent()) return false;
      const updatedActivity = mapApiActivity(data);
      if (updatedActivity.id !== activityId)
        throw new Error('Unexpected activity update response.');
      recentActivities.value = recentActivities.value.map((activity) =>
        activity.id === activityId ? updatedActivity : activity
      );
      paginatedActivities.value = paginatedActivities.value.map((activity) =>
        activity.id === activityId ? updatedActivity : activity
      );
      notifyUpdate();
      return true;
    } catch {
      if (!isCurrent()) return false;
      return false;
    }
  }

  async function createManualActivity(
    payload: ActivityCreatePayload,
    file: File | null,
    timezoneName?: string
  ): Promise<{ success: boolean; message: string }> {
    const isCurrent = captureSession();
    if (!userStore.token) return { success: false, message: 'Not authenticated.' };

    try {
      const query = new URLSearchParams();
      if (timezoneName !== undefined) {
        if (!isSupportedTimezone(timezoneName)) throw new Error('Select a supported timezone.');
        query.set('timezone_name', timezoneName);
      }
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
      if (!isCurrent())
        return { success: false, message: 'Account changed while processing the request.' };

      if (!response.ok) {
        const err: unknown = await response.json();
        if (!isCurrent())
          return { success: false, message: 'Account changed while processing the request.' };
        throw new Error(activityErrorMessage(err, 'Failed to create activity.'));
      }

      const activityData: unknown = await response.json();
      if (!isCurrent())
        return { success: false, message: 'Account changed while processing the request.' };
      const newActivity = mapApiActivity(activityData);

      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const trackQuery = new URLSearchParams({ activity_id: newActivity.id });
        if (timezoneName !== undefined) trackQuery.set('timezone_name', timezoneName);
        const trackResponse = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/track/?${trackQuery.toString()}`,
          {
            method: 'PUT',
            headers: { Authorization: `Bearer ${userStore.token}` },
            body: formData,
          }
        );
        if (!isCurrent())
          return { success: false, message: 'Account changed while processing the request.' };

        if (!trackResponse.ok) {
          return {
            success: true,
            message: 'Activity created, but track upload failed.',
          };
        }
      }

      fetchRecentActivities();
      notifyUpdate();
      return { success: true, message: 'Activity created successfully!' };
    } catch (e: unknown) {
      if (!isCurrent())
        return { success: false, message: 'Account changed while processing the request.' };
      return { success: false, message: e instanceof Error ? e.message : String(e) };
    }
  }

  async function fetchActivityImages(activityId: string) {
    imagesActivityId = activityId;
    const isCurrent = beginImagesRequest();
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
      if (!isCurrent()) return;

      if (response.ok) {
        const responseData = await response.json();
        if (!isCurrent()) return;
        activityImages.value = responseData.data;
      }
    } catch (e) {
      if (!isCurrent()) return;
      console.error('Failed to load images', e);
    } finally {
      if (isCurrent()) {
        isImagesLoading.value = false;
      }
    }
  }

  async function uploadActivityImage(activityId: string, file: File) {
    const isCurrent = captureSession();
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
      if (!isCurrent()) return false;

      if (!response.ok) throw new Error('Upload failed');
      if (imagesActivityId === null || imagesActivityId === activityId) {
        await fetchActivityImages(activityId);
      }
      if (!isCurrent()) return false;
      return true;
    } catch (e) {
      if (!isCurrent()) return false;
      console.error(e);
      return false;
    }
  }

  async function deleteActivityImage(imageId: string) {
    const isCurrent = captureSession();
    if (!userStore.token) return false;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/media/image/${imageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userStore.token}` },
      });
      if (!isCurrent()) return false;

      if (!response.ok) throw new Error('Delete failed');
      activityImages.value = activityImages.value.filter((img) => img.id !== imageId);
      return true;
    } catch (e) {
      if (!isCurrent()) return false;
      console.error(e);
      return false;
    }
  }

  async function deleteActivity(id: string): Promise<boolean> {
    const isCurrent = captureSession();
    if (!userStore.token) return false;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/activity/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userStore.token}` },
      });
      if (!isCurrent()) return false;

      if (!response.ok) throw new Error('Failed to delete activity');

      recentActivities.value = recentActivities.value.filter((a) => a.id !== id);
      notifyUpdate();
      return true;
    } catch (e) {
      if (!isCurrent()) return false;
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
    lastUpdate,
  };
});
