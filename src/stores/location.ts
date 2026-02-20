import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from './auth';
import type { Activity } from './activity';
import { parseISODuration, formatDuration } from '@/utils/datetime';
import type { ApiActivity } from '@/services/api';

// --- Interfaces ---
export interface Location {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface LocationCreatePayload {
  name: string;
  description?: string | null;
  latitude: number;
  longitude: number;
}

export interface MapBounds {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}

export const useLocationStore = defineStore('location', () => {
  // --- State ---
  const visibleLocations = ref<Location[]>([]);
  const availableLocations = ref<Location[]>([]); // For selection dropdowns
  const selectedLocation = ref<Location | null>(null);
  const selectedLocationActivities = ref<Activity[]>([]);
  const currentActivityLocations = ref<Location[]>([]);

  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const userStore = useUserStore();
  const getHeaders = () => ({
    Authorization: `Bearer ${userStore.token}`,
    'Content-Type': 'application/json',
  });

  // --- Helpers ---
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

  // --- Actions ---
  async function fetchLocationsInBounds(bounds: MapBounds) {
    isLoading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      params.append('latitude_lower_bound', bounds.latMin.toString());
      params.append('latitude_upper_bound', bounds.latMax.toString());
      params.append('longitude_lower_bound', bounds.lngMin.toString());
      params.append('longitude_upper_bound', bounds.lngMax.toString());
      params.append('limit', '100');

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/location/?${params.toString()}`, {
        headers: getHeaders(),
      });

      if (!response.ok) throw new Error('Failed to fetch locations.');

      const data = await response.json();
      visibleLocations.value = data.data;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchAllLocations() {
    // Fetches a list of locations for dropdowns, limited to most recent 100 for now
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/location/?limit=100`, {
        headers: getHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        availableLocations.value = data.data;
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function selectLocation(locationId: string) {
    isLoading.value = true;
    selectedLocation.value = null;
    selectedLocationActivities.value = [];

    try {
      // 1. Fetch Location Details
      const locResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/location/${locationId}`, {
        headers: getHeaders(),
      });
      if (!locResponse.ok) throw new Error('Failed to load location details.');
      selectedLocation.value = await locResponse.json();

      // 2. Fetch Matched Activities
      const actResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/location/${locationId}/activities`, {
        headers: getHeaders(),
      });
      if (actResponse.ok) {
        const actData = await actResponse.json();
        selectedLocationActivities.value = (actData.data as ApiActivity[]).map(mapApiActivity);
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      isLoading.value = false;
    }
  }

  async function createLocation(payload: LocationCreatePayload): Promise<boolean> {
    isLoading.value = true;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/location/`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to create location.');
      return true;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteLocation(locationId: string): Promise<boolean> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/location/${locationId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (!response.ok) throw new Error('Failed to delete location.');

      // Optimistic update
      visibleLocations.value = visibleLocations.value.filter((l) => l.id !== locationId);
      if (selectedLocation.value?.id === locationId) {
        selectedLocation.value = null;
        selectedLocationActivities.value = [];
      }
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async function fetchLocationsForActivity(activityId: string) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/activity/${activityId}/locations`, {
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch activity locations.');

      const data = await response.json();
      currentActivityLocations.value = data.data;
    } catch (e) {
      console.error(e);
      currentActivityLocations.value = [];
    }
  }

  async function addLocationToActivity(activityId: string, locationId: string): Promise<boolean> {
    try {
      const params = new URLSearchParams();
      params.append('location_id', locationId);
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/activity/${activityId}/add_location?${params.toString()}`,
        {
          method: 'PATCH',
          headers: getHeaders(),
        }
      );

      if (!response.ok) throw new Error('Failed to add location.');

      await fetchLocationsForActivity(activityId);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async function removeLocationFromActivity(activityId: string, locationId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/activity/${activityId}/locations/${locationId}`,
        {
          method: 'DELETE',
          headers: getHeaders(),
        }
      );

      if (!response.ok) throw new Error('Failed to remove location.');

      await fetchLocationsForActivity(activityId);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async function _getMostRecentCoordinates(): Promise<[number, number] | null> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/location/?limit=1`, {
        headers: getHeaders(),
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        return [data.data[0].latitude, data.data[0].longitude];
      }
      return null;
    } catch {
      return null;
    }
  }

  async function findLocationMapCenter(): Promise<[number, number]> {
    const recent = await _getMostRecentCoordinates();
    if (recent) return recent;
    return [48.13, 11.58]; // Fallback
  }

  return {
    visibleLocations,
    availableLocations,
    selectedLocation,
    selectedLocationActivities,
    currentActivityLocations,
    isLoading,
    error,
    fetchLocationsInBounds,
    fetchAllLocations,
    selectLocation,
    createLocation,
    deleteLocation,
    fetchLocationsForActivity,
    addLocationToActivity,
    removeLocationFromActivity,
    findLocationMapCenter,
  };
});
