import { ref } from 'vue';
import { defineStore } from 'pinia';

// --- Interfaces ---
export interface SubType {
  id: number;
  name: string;
}

// Renamed from ActivityType to generic CategoryType
export interface CategoryType {
  id: number;
  name: string;
  sub_types: SubType[];
}

// Alias for backward compatibility with existing components
export type ActivityType = CategoryType;
export type LocationType = CategoryType;

interface ApiResponse<T> {
  data: T;
}

export const useTypeStore = defineStore('type', () => {
  // --- STATE ---
  const activityTypes = ref<ActivityType[]>([]);
  const locationTypes = ref<LocationType[]>([]);
  const isLoading = ref(false);

  // --- ACTIONS ---
  async function fetchActivityTypes() {
    if (activityTypes.value.length > 0 || isLoading.value) return;

    isLoading.value = true;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/resolve/types`, {
        method: 'GET',
      });
      if (!response.ok) throw new Error('Failed to fetch activity types.');

      const responseData: ApiResponse<ActivityType[]> = await response.json();
      activityTypes.value = responseData.data;
    } catch (error) {
      console.error(error);
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchLocationTypes() {
    if (locationTypes.value.length > 0) return;

    // We don't block isLoading here to allow parallel loading with activity types if needed
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/resolve/location_types`, {
        method: 'GET',
      });
      if (!response.ok) throw new Error('Failed to fetch location types.');

      const responseData: ApiResponse<LocationType[]> = await response.json();
      locationTypes.value = responseData.data;
    } catch (error) {
      console.error(error);
    }
  }

  return {
    activityTypes,
    locationTypes,
    fetchActivityTypes,
    fetchLocationTypes
  };
});
