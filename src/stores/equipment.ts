import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from './auth';

// --- Interfaces ---
export interface Equipment {
  id: string;
  name: string;
  equipment_type: string;
  brand: string | null;
  model: string | null;
  description: string | null;
  purchase_date: string | null;
}

export interface EquipmentSet {
  id: string;
  name: string;
  items: string[]; // List of Equipment IDs (UUIDs)
}

export interface EquipmentCreatePayload {
  name: string;
  equipment_type: string;
  brand?: string;
  model?: string;
  description?: string;
  purchase_date?: string;
}

export const useEquipmentStore = defineStore('equipment', () => {
  // --- State ---
  const allEquipment = ref<Equipment[]>([]);
  const equipmentSets = ref<EquipmentSet[]>([]); // <--- New
  const activityEquipment = ref<Equipment[]>([]);
  const equipmentTypes = ref<string[]>([]);

  const isLoading = ref(false);
  const areTypesLoading = ref(false);

  const userStore = useUserStore();
  const getAuthHeaders = (contentType = 'application/json') => ({
    'Authorization': `Bearer ${userStore.token}`,
    'Content-Type': contentType,
  });

  // --- Existing Basic Actions ---

  async function fetchEquipmentTypes() {
    if (equipmentTypes.value.length > 0) return;
    areTypesLoading.value = true;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/types`);
      if (response.ok) {
        const data = await response.json();
        equipmentTypes.value = data.data;
      }
    } finally { areTypesLoading.value = false; }
  }

  async function fetchAllEquipment() {
    isLoading.value = true;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/`, { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        allEquipment.value = data.data;
      }
    } finally { isLoading.value = false; }
  }

  async function createEquipment(payload: EquipmentCreatePayload) {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to create equipment.');
    await fetchAllEquipment();
  }

  // --- NEW: Equipment Set Actions ---

  async function fetchAllSets() {
    try {
      // Based on your confirmation, this endpoint exists and returns { data: [...] }
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/set/`, { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        equipmentSets.value = data.data;
      }
    } catch (e) { console.error("Fetch sets failed", e); }
  }

  async function createSet(name: string) {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/set/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, equipment_ids: [] }), // Start empty
    });
    if (!response.ok) throw new Error('Failed to create set.');
    await fetchAllSets();
  }

  async function deleteSet(setId: string) {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/set/${setId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete set.');
    await fetchAllSets();
  }

  async function addEquipmentToSet(setId: string, equipmentId: string) {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/set/${setId}/equipment/${equipmentId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to add item to set.');
    await fetchAllSets(); // Refresh to get updated item list
  }

  async function removeEquipmentFromSet(setId: string, equipmentId: string) {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/set/${setId}/equipment/${equipmentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to remove item from set.');
    await fetchAllSets();
  }

  // --- NEW: Default Sets Logic ---
  async function setDefaultSet(setId: string, typeId: number, subTypeId: number | null) {
    const query = new URLSearchParams({ activity_type_id: typeId.toString() });
    if (subTypeId) query.append('activity_sub_type_id', subTypeId.toString());

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/set/default/${setId}?${query.toString()}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to set default.');
  }

  // --- Activity Actions (Adding Items/Sets to Activity) ---

  async function fetchEquipmentForActivity(activityId: string) {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/activity/${activityId}`, { headers: getAuthHeaders() });
    if (response.ok) {
      const data = await response.json();
      activityEquipment.value = data.data;
    } else {
      activityEquipment.value = [];
    }
  }

  async function addEquipmentToActivity(equipmentId: string, activityId: string) {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/${equipmentId}/activity/${activityId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to add equipment.');
    await fetchEquipmentForActivity(activityId);
  }

  async function removeEquipmentFromActivity(equipmentId: string, activityId: string) {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/${equipmentId}/activity/${activityId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to remove equipment.');
    await fetchEquipmentForActivity(activityId);
  }

  async function addSetToActivity(setId: string, activityId: string) {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/set/${setId}/activity/${activityId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to add set to activity.');
    await fetchEquipmentForActivity(activityId);
  }

  async function removeSetFromActivity(setId: string, activityId: string) {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/set/${setId}/activity/${activityId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to remove set from activity.');
    await fetchEquipmentForActivity(activityId);
  }

  return {
    allEquipment,
    activityEquipment,
    equipmentSets,
    equipmentTypes,
    isLoading,

    // Basics
    fetchAllEquipment,
    createEquipment,
    fetchEquipmentTypes,

    // Sets
    fetchAllSets,
    createSet,
    deleteSet,
    addEquipmentToSet,
    removeEquipmentFromSet,
    setDefaultSet,

    // Activity
    fetchEquipmentForActivity,
    addEquipmentToActivity,
    removeEquipmentFromActivity,
    addSetToActivity,
    removeSetFromActivity
  };
});
