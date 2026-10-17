import { useLatestRequest } from '../composables/useLatestRequest';
import { useAccountSession } from '../composables/useAccountSession';
// src/stores/location.ts
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from './auth';
import type { Activity } from './activity';
import { mapApiActivity } from '../services/api';
import type { ActivityPublic, ListResponse } from '../types/api';

// --- Interfaces ---
export interface Location {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  created_at: string;
  type_id?: number | null;
  sub_type_id?: number | null;
}

export interface LocationCreatePayload {
  name: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  type_id?: number | null;
  sub_type_id?: number | null;
}

export interface MapBounds {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}

export interface LocationFilters {
  typeId?: number | null;
  subTypeId?: number | null;
}

export interface LocationSearchResult {
  id: string;
  phrase: string;
  score: number;
}

export const useLocationStore = defineStore('location', () => {
  // --- State ---
  const visibleLocations = ref<Location[]>([]);
  const availableLocations = ref<Location[]>([]);
  const selectedLocation = ref<Location | null>(null);
  const selectedLocationActivities = ref<Activity[]>([]);
  const currentActivityLocations = ref<Location[]>([]);
  let locationsActivityId: string | null = null;

  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const isDetailLoading = ref(false);
  const detailError = ref<string | null>(null);

  const userStore = useUserStore();
  const getHeaders = () => ({
    Authorization: `Bearer ${userStore.token}`,
    'Content-Type': 'application/json',
  });

  // --- Actions ---
  const captureSession = useAccountSession(() => {
    locationsActivityId = null;
    isDetailLoading.value = false;
    detailError.value = null;
    visibleLocations.value = [];
    availableLocations.value = [];
    selectedLocation.value = null;
    selectedLocationActivities.value = [];
    currentActivityLocations.value = [];
    isLoading.value = false;
    error.value = null;
  });
  const beginBoundsRequest = useLatestRequest(captureSession);
  const beginLocationRequest = useLatestRequest(captureSession);
  const beginActivityLocationsRequest = useLatestRequest(captureSession);

  async function fetchLocationsInBounds(bounds: MapBounds, filters?: LocationFilters) {
    const isCurrent = beginBoundsRequest();
    isLoading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      params.append('latitude_lower_bound', bounds.latMin.toString());
      params.append('latitude_upper_bound', bounds.latMax.toString());
      params.append('longitude_lower_bound', bounds.lngMin.toString());
      params.append('longitude_upper_bound', bounds.lngMax.toString());
      params.append('limit', '100');

      // Apply Filters
      if (filters?.typeId) {
        params.append('type_id', filters.typeId.toString());
      }
      if (filters?.subTypeId) {
        params.append('sub_type_id', filters.subTypeId.toString());
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/location/?${params.toString()}`,
        {
          headers: getHeaders(),
        }
      );
      if (!isCurrent()) return;

      if (!response.ok) throw new Error('Failed to fetch locations.');

      const data = await response.json();
      if (!isCurrent()) return;
      visibleLocations.value = data.data;
    } catch (e: unknown) {
      if (!isCurrent()) return;
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      if (isCurrent()) {
        isLoading.value = false;
      }
    }
  }

  async function fetchAllLocations() {
    const isCurrent = captureSession();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/location/?limit=100`, {
        headers: getHeaders(),
      });
      if (!isCurrent()) return;
      if (response.ok) {
        const data = await response.json();
        if (!isCurrent()) return;
        availableLocations.value = data.data;
      }
    } catch (e) {
      if (!isCurrent()) return;
      console.error(e);
    }
  }

  async function searchLocations(query: string, limit = 20): Promise<LocationSearchResult[]> {
    const isCurrent = captureSession();
    if (!query) return [];
    try {
      const params = new URLSearchParams({ query, limit: limit.toString() });
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/location/find?${params.toString()}`,
        {
          headers: getHeaders(),
        }
      );
      if (!isCurrent()) return [];
      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      if (!isCurrent()) return [];
      return data.data;
    } catch (e) {
      if (!isCurrent()) return [];
      console.error(e);
      return [];
    }
  }

  async function selectLocation(locationId: string) {
    const isCurrent = beginLocationRequest();
    isDetailLoading.value = true;
    detailError.value = null;
    selectedLocation.value = null;
    selectedLocationActivities.value = [];

    try {
      const locResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/location/${locationId}`,
        {
          headers: getHeaders(),
        }
      );
      if (!isCurrent()) return;
      if (!locResponse.ok) throw new Error('Failed to load location details.');
      const locationData: typeof selectedLocation.value = await locResponse.json();
      if (!isCurrent()) return;
      selectedLocation.value = locationData;

      const actResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/location/${locationId}/activities`,
        {
          headers: getHeaders(),
        }
      );
      if (!isCurrent()) return;
      if (actResponse.ok) {
        const actData: ListResponse<ActivityPublic> = await actResponse.json();
        if (!isCurrent()) return;
        selectedLocationActivities.value = actData.data.map(mapApiActivity);
      }
    } catch (e: unknown) {
      if (!isCurrent()) return;
      detailError.value = e instanceof Error ? e.message : String(e);
    } finally {
      if (isCurrent()) {
        isDetailLoading.value = false;
      }
    }
  }

  async function createLocation(payload: LocationCreatePayload): Promise<boolean> {
    const isCurrent = captureSession();
    isLoading.value = true;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/location/`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (!isCurrent()) return false;

      if (!response.ok) throw new Error('Failed to create location.');
      return true;
    } catch (e: unknown) {
      if (!isCurrent()) return false;
      error.value = e instanceof Error ? e.message : String(e);
      return false;
    } finally {
      if (isCurrent()) {
        isLoading.value = false;
      }
    }
  }

  async function deleteLocation(locationId: string): Promise<boolean> {
    const isCurrent = captureSession();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/location/${locationId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!isCurrent()) return false;

      if (!response.ok) throw new Error('Failed to delete location.');

      visibleLocations.value = visibleLocations.value.filter((l) => l.id !== locationId);
      if (selectedLocation.value?.id === locationId) {
        selectedLocation.value = null;
        selectedLocationActivities.value = [];
      }
      return true;
    } catch (e) {
      if (!isCurrent()) return false;
      console.error(e);
      return false;
    }
  }

  async function updateLocationType(
    id: string,
    typeId: number,
    subTypeId: number | null
  ): Promise<boolean> {
    const isCurrent = captureSession();
    try {
      const params = new URLSearchParams();
      params.append('type_id', typeId.toString());
      if (subTypeId !== null) params.append('sub_type_id', subTypeId.toString());

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/location/${id}/replace_type?${params.toString()}`,
        {
          method: 'PATCH',
          headers: getHeaders(),
        }
      );
      if (!isCurrent()) return false;

      if (!response.ok) throw new Error('Failed to update location type');

      if (selectedLocation.value?.id === id) {
        selectedLocation.value.type_id = typeId;
        selectedLocation.value.sub_type_id = subTypeId;
      }
      return true;
    } catch (e) {
      if (!isCurrent()) return false;
      console.error(e);
      return false;
    }
  }

  async function fetchLocationsForActivity(activityId: string) {
    locationsActivityId = activityId;
    const isCurrent = beginActivityLocationsRequest();
    currentActivityLocations.value = [];
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/activity/${activityId}/locations`,
        {
          headers: getHeaders(),
        }
      );
      if (!isCurrent()) return;
      if (!response.ok) throw new Error('Failed to fetch activity locations.');

      const data = await response.json();
      if (!isCurrent()) return;
      currentActivityLocations.value = data.data;
    } catch (e) {
      if (!isCurrent()) return;
      console.error(e);
      currentActivityLocations.value = [];
    }
  }

  async function addLocationToActivity(activityId: string, locationId: string): Promise<boolean> {
    const isCurrent = captureSession();
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
      if (!isCurrent()) return false;

      if (!response.ok) throw new Error('Failed to add location.');

      if (locationsActivityId === null || locationsActivityId === activityId) {
        await fetchLocationsForActivity(activityId);
      }
      if (!isCurrent()) return false;
      return true;
    } catch (e) {
      if (!isCurrent()) return false;
      console.error(e);
      return false;
    }
  }

  async function removeLocationFromActivity(
    activityId: string,
    locationId: string
  ): Promise<boolean> {
    const isCurrent = captureSession();
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/activity/${activityId}/locations/${locationId}`,
        {
          method: 'DELETE',
          headers: getHeaders(),
        }
      );
      if (!isCurrent()) return false;

      if (!response.ok) throw new Error('Failed to remove location.');

      if (locationsActivityId === null || locationsActivityId === activityId) {
        await fetchLocationsForActivity(activityId);
      }
      if (!isCurrent()) return false;
      return true;
    } catch (e) {
      if (!isCurrent()) return false;
      console.error(e);
      return false;
    }
  }

  async function _getMostRecentCoordinates(): Promise<[number, number] | null> {
    const isCurrent = captureSession();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/location/?limit=1`, {
        headers: getHeaders(),
      });
      if (!isCurrent()) return null;
      if (!response.ok) return null;
      const data = await response.json();
      if (!isCurrent()) return null;
      if (data.data && data.data.length > 0) {
        return [data.data[0].latitude, data.data[0].longitude];
      }
      return null;
    } catch {
      if (!isCurrent()) return null;
      return null;
    }
  }

  async function findLocationMapCenter(): Promise<[number, number]> {
    const isCurrent = captureSession();
    const recent = await _getMostRecentCoordinates();
    if (!isCurrent()) return [48.13, 11.58];
    if (recent) return recent;
    return [48.13, 11.58];
  }

  return {
    isDetailLoading,
    detailError,
    visibleLocations,
    availableLocations,
    selectedLocation,
    selectedLocationActivities,
    currentActivityLocations,
    isLoading,
    error,
    fetchLocationsInBounds,
    fetchAllLocations,
    searchLocations,
    selectLocation,
    createLocation,
    deleteLocation,
    updateLocationType,
    fetchLocationsForActivity,
    addLocationToActivity,
    removeLocationFromActivity,
    findLocationMapCenter,
  };
});
