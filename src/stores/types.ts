import { ref } from 'vue'
import { defineStore } from 'pinia'

// Define interfaces for our data structures
export interface SubType {
  id: number;
  name: string;
}

export interface ActivityType {
  id: number;
  name: string;
  sub_types: SubType[];
}

export const useTypeStore = defineStore('type', () => {
  // --- STATE ---
  const activityTypes = ref<ActivityType[]>([]);
  const isLoading = ref(false);

  // --- ACTIONS ---
  async function fetchActivityTypes() {
    if (activityTypes.value.length > 0 || isLoading.value) return; // Don't fetch if we already have them

    isLoading.value = true;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/resolve/types`, {
        method: 'GET',
      });
      if (!response.ok) throw new Error('Failed to fetch activity types.');
      const responseData = await response.json();
      activityTypes.value = responseData.data;;
    } catch (error) {
      console.error(error);
      // Handle error appropriately
    } finally {
      isLoading.value = false;
    }
  }

  return { activityTypes, fetchActivityTypes };
})
