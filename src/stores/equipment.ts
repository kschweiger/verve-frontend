import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from './auth';

export interface Equipment {
  id: string;
  name: string;
  equipment_type: string;
  brand: string;
  model: string;
  description: string;
  purchase_date: string;
}

export interface EquipmentCreatePayload {
  name: string;
  equipment_type: string;
  brand: string;
  model: string;
  description: string;
  purchase_date: string;
}

export const useEquipmentStore = defineStore('equipment', () => {
  const allEquipment = ref<Equipment[]>([]); // The user's entire "gear closet"
  const activityEquipment = ref<Equipment[]>([]); // Equipment for the currently viewed activity
  const isLoading = ref(false);
  const equipmentTypes = ref<string[]>([]);
  const areTypesLoading = ref(false); // Separate loading state for types

  const userStore = useUserStore();
  const getAuthHeaders = (contentType = 'application/json') => ({
    'Authorization': `Bearer ${userStore.token}`,
    'Content-Type': contentType,
  });

  async function fetchEquipmentTypes() {
    if (equipmentTypes.value.length > 0) return; // Don't re-fetch
    areTypesLoading.value = true;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/types`, {});
      if (!response.ok) throw new Error('Failed to fetch equipment types.');
      const data = await response.json();
      equipmentTypes.value = data.data; // Response is { "data": [...] }
    } catch (e) {
      console.error(e);
    } finally {
      areTypesLoading.value = false;
    }
  }

  async function fetchAllEquipment() {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/`, { headers: getAuthHeaders() });
    if (!response.ok) { // Handle 404/empty case
      allEquipment.value = [];
      return;
    }
    const data = await response.json();
    allEquipment.value = data.data;
  }

  async function createEquipment(payload: EquipmentCreatePayload) {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to create equipment.');
    await fetchAllEquipment(); // Refresh the list
  }

  // --- ACTIONS for a single activity ---
  async function fetchEquipmentForActivity(activityId: string) {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/activity/${activityId}`, { headers: getAuthHeaders() });
    if (!response.ok) { // Handle 404/empty case
      activityEquipment.value = [];
      return;
    }
    const data = await response.json();
    activityEquipment.value = data.data;
  }

  async function addEquipmentToActivity(equipmentId: string, activityId: string) {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/${equipmentId}/activity/${activityId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to add equipment to activity.');
    await fetchEquipmentForActivity(activityId); // Refresh the activity's equipment list
  }

  async function removeEquipmentFromActivity(equipmentId: string, activityId: string) {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/${equipmentId}/activity/${activityId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to remove equipment from activity.');
    await fetchEquipmentForActivity(activityId); // Refresh the list
  }

  return {
    allEquipment,
    activityEquipment,
    equipmentTypes,
    isLoading,
    fetchAllEquipment,
    createEquipment,
    fetchEquipmentForActivity,
    addEquipmentToActivity,
    removeEquipmentFromActivity,
    fetchEquipmentTypes
  };
});
