import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from './auth';
import type { Activity } from './activity'; // Assuming Activity interface is exported here
import { parseISODuration, formatDuration } from '@/utils/datetime';

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

// Simplified bounds interface to decouple from Leaflet types
export interface MapBounds {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}

export const useLocationStore = defineStore('location', () => {
  // --- State ---

  // Locations currently visible on the map
  const visibleLocations = ref<Location[]>([]);

  // Data for the currently selected location (e.g. in the sidebar)
  const selectedLocation = ref<Location | null>(null);
  const selectedLocationActivities = ref<Activity[]>([]); // Matched activities

  // Locations attached to a specific activity (for Activity Detail View)
  const currentActivityLocations = ref<Location[]>([]);

  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const userStore = useUserStore();
  const getHeaders = () => ({
    'Authorization': `Bearer ${userStore.token}`,
    'Content-Type': 'application/json'
  });

  // --- Helper: Map Raw API to Activity Interface ---
  const mapApiActivity = (apiActivity: any): Activity => {
    // Basic mapping to ensure ActivityListItem works
    const durationSeconds = parseISODuration(apiActivity.duration || 'PT0S');
    return {
      id: apiActivity.id,
      start: apiActivity.start,
      duration: formatDuration(durationSeconds),
      durationSeconds: durationSeconds,
      distance: apiActivity.distance,
      elevationGain: apiActivity.elevation_change_up ?? null, // <--- Critical Map
      elevationLoss: apiActivity.elevation_change_down ?? null,
      name: apiActivity.name ?? null,
      avg_speed: apiActivity.avg_speed ?? null,
      max_speed: apiActivity.max_speed ?? null,
      type_id: apiActivity.type_id,
      sub_type_id: apiActivity.sub_type_id ?? null,
    };
  };

  // --- Actions ---

  /**
   * Fetches locations within specific geographical bounds.
   * Used by the Map View when panning/zooming.
   */
  async function fetchLocationsInBounds(bounds: MapBounds) {
    isLoading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      params.append('latitude_lower_bound', bounds.latMin.toString());
      params.append('latitude_upper_bound', bounds.latMax.toString());
      params.append('longitude_lower_bound', bounds.lngMin.toString());
      params.append('longitude_upper_bound', bounds.lngMax.toString());
      // Increase limit for map view if necessary, default is 20 in API
      params.append('limit', '100');

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/location/?${params.toString()}`, {
        headers: getHeaders()
      });

      if (!response.ok) throw new Error('Failed to fetch locations.');

      const data = await response.json();
      visibleLocations.value = data.data;
    } catch (e: any) {
      error.value = e.message;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Fetches full details for a single location, including the activities that visited it.
   */
  async function selectLocation(locationId: string) {
    isLoading.value = true;
    selectedLocation.value = null;
    selectedLocationActivities.value = [];

    try {
      // 1. Fetch Location Details
      const locResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/location/${locationId}`, {
        headers: getHeaders()
      });
      if (!locResponse.ok) throw new Error('Failed to load location details.');
      selectedLocation.value = await locResponse.json();

      // 2. Fetch Matched Activities
      const actResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/location/${locationId}/activities`, {
        headers: getHeaders()
      });
      if (actResponse.ok) {
        const actData = await actResponse.json();
        // UPDATED: Map the raw data to the Activity interface
        selectedLocationActivities.value = actData.data.map(mapApiActivity);
      }
    } catch (e: any) {
      error.value = e.message;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Creates a new location.
   */
  async function createLocation(payload: LocationCreatePayload): Promise<boolean> {
    isLoading.value = true;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/location/`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to create location.');

      // We don't necessarily need to refresh the list here because the map bounds
      // check usually handles refreshing, but we could optimistic add if needed.
      return true;
    } catch (e: any) {
      error.value = e.message;
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Deletes a location.
   */
  async function deleteLocation(locationId: string): Promise<boolean> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/location/${locationId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!response.ok) throw new Error('Failed to delete location.');

      // Optimistic update
      visibleLocations.value = visibleLocations.value.filter(l => l.id !== locationId);
      if (selectedLocation.value?.id === locationId) {
        selectedLocation.value = null;
        selectedLocationActivities.value = [];
      }
      return true;
    } catch (e: any) {
      console.error(e);
      return false;
    }
  }

  /**
   * Fetches all locations associated with a specific Activity ID.
   * Used in Activity Detail View.
   */
  async function fetchLocationsForActivity(activityId: string) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/activity/${activityId}/locations`, {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch activity locations.');

      const data = await response.json();
      currentActivityLocations.value = data.data;
    } catch (e) {
      console.error(e);
      currentActivityLocations.value = [];
    }
  }


  /**
 * Strategy A: Get the most recent location added.
 */
  async function _getMostRecentCoordinates(): Promise<[number, number] | null> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/location/?limit=1`, {
        headers: getHeaders()
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        return [data.data[0].latitude, data.data[0].longitude];
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Determines the best starting center for the map.
   * Logic:
   * 1. Check for recent locations.
   * 2. (Future) Check for user "Home" setting.
   * 3. (Future) Check for browser geolocation.
   * 4. Fallback to default.
   */
  async function findLocationMapCenter(): Promise<[number, number]> {
    // 1. Try Recent
    const recent = await _getMostRecentCoordinates();
    if (recent) return recent;

    // 2. Future strategies go here...

    // 3. Fallback (e.g. Munich)
    return [48.13, 11.58];
  }


  return {
    // State
    visibleLocations,
    selectedLocation,
    selectedLocationActivities,
    currentActivityLocations,
    isLoading,
    error,

    // Actions
    fetchLocationsInBounds,
    selectLocation,
    createLocation,
    deleteLocation,
    fetchLocationsForActivity,
    findLocationMapCenter
  };
});
