import { useAccountSession } from '../composables/useAccountSession';
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from './auth';

export const equipmentTypeValues = ['bike', 'shoes', 'skis', 'snowboard', 'hometrainer'] as const;
export type EquipmentType = (typeof equipmentTypeValues)[number];

export interface Equipment {
  id: string;
  name: string;
  equipment_type: EquipmentType;
  brand: string | null;
  model: string | null;
  description: string | null;
  purchase_date: string | null;
}

export interface EquipmentSet {
  id: string;
  name: string;
  items: string[];
}

export interface EquipmentCreatePayload {
  name: string;
  equipment_type: EquipmentType;
  brand?: string | null;
  model?: string | null;
  description?: string | null;
  purchase_date?: string | null;
}

export interface EquipmentUpdatePayload {
  name?: string | null;
  equipment_type?: EquipmentType | null;
  brand?: string | null;
  model?: string | null;
  description?: string | null;
  purchase_date?: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

function parseEquipment(value: unknown): Equipment {
  if (!isRecord(value)) throw new Error('Invalid equipment response.');
  const { id, name, equipment_type, brand, model, description, purchase_date } = value;
  if (
    typeof id !== 'string' ||
    typeof name !== 'string' ||
    typeof equipment_type !== 'string' ||
    !equipmentTypeValues.includes(equipment_type as EquipmentType) ||
    ![brand, model, description, purchase_date].every(
      (field) => field === undefined || field === null || typeof field === 'string'
    )
  ) {
    throw new Error('Invalid equipment response.');
  }
  return {
    id,
    name,
    equipment_type: equipment_type as EquipmentType,
    brand: (brand as string | null | undefined) ?? null,
    model: (model as string | null | undefined) ?? null,
    description: (description as string | null | undefined) ?? null,
    purchase_date: (purchase_date as string | null | undefined) ?? null,
  };
}

function parseEquipmentListResponse(value: unknown): Equipment[] {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new Error('Invalid equipment list response.');
  }
  return value.data.map(parseEquipment);
}

function parseEquipmentSetsResponse(value: unknown): EquipmentSet[] {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new Error('Invalid equipment sets response.');
  }
  return value.data.map((set): EquipmentSet => {
    if (
      !isRecord(set) ||
      typeof set.id !== 'string' ||
      typeof set.name !== 'string' ||
      !Array.isArray(set.items) ||
      !set.items.every((item) => typeof item === 'string')
    ) {
      throw new Error('Invalid equipment sets response.');
    }
    return { id: set.id, name: set.name, items: set.items };
  });
}

export const useEquipmentStore = defineStore('equipment', () => {
  const allEquipment = ref<Equipment[]>([]);
  const equipmentSets = ref<EquipmentSet[]>([]);
  const activityEquipment = ref<Equipment[]>([]);
  const equipmentTypes = ref<EquipmentType[]>([]);

  const isLoading = ref(false);
  const areTypesLoading = ref(false);

  const userStore = useUserStore();
  const getAuthHeaders = (contentType = 'application/json') => ({
    Authorization: `Bearer ${userStore.token}`,
    'Content-Type': contentType,
  });

  const captureSession = useAccountSession(() => {
    allEquipment.value = [];
    equipmentSets.value = [];
    activityEquipment.value = [];
    equipmentTypes.value = [];
    isLoading.value = false;
    areTypesLoading.value = false;
  });

  async function fetchEquipmentTypes() {
    const isCurrent = captureSession();
    if (equipmentTypes.value.length > 0) return;
    areTypesLoading.value = true;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/types`);
      if (!isCurrent()) return;
      if (response.ok) {
        const data: unknown = await response.json();
        if (!isCurrent()) return;
        if (isRecord(data) && Array.isArray(data.data)) {
          equipmentTypes.value = data.data.filter(
            (type): type is EquipmentType =>
              typeof type === 'string' && equipmentTypeValues.includes(type as EquipmentType)
          );
        }
      }
    } catch (error: unknown) {
      if (!isCurrent()) return;
      throw error;
    } finally {
      if (isCurrent()) {
        areTypesLoading.value = false;
      }
    }
  }

  async function fetchAllEquipment() {
    const isCurrent = captureSession();
    isLoading.value = true;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/`, {
        headers: getAuthHeaders(),
      });
      if (!isCurrent()) return;
      if (response.ok) {
        const data: unknown = await response.json();
        if (!isCurrent()) return;
        allEquipment.value = parseEquipmentListResponse(data);
      }
    } catch (error: unknown) {
      if (!isCurrent()) return;
      throw error;
    } finally {
      if (isCurrent()) {
        isLoading.value = false;
      }
    }
  }

  async function createEquipment(payload: EquipmentCreatePayload) {
    const isCurrent = captureSession();
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!isCurrent()) return;
    if (!response.ok) throw new Error('Failed to create equipment.');
    const created: unknown = await response.json();
    if (!isCurrent()) return;
    parseEquipment(created);
    await fetchAllEquipment();
  }

  async function updateEquipment(id: string, payload: EquipmentUpdatePayload) {
    const isCurrent = captureSession();
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!isCurrent()) return;
    if (!response.ok) throw new Error('Failed to update equipment.');
    const data: unknown = await response.json();
    if (!isCurrent()) return;
    const updated = parseEquipment(data);
    allEquipment.value = allEquipment.value.map((item) => (item.id === id ? updated : item));
    activityEquipment.value = activityEquipment.value.map((item) =>
      item.id === id ? updated : item
    );
  }

  async function deleteEquipment(id: string) {
    const isCurrent = captureSession();
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!isCurrent()) return;
    if (response.status !== 204) throw new Error('Failed to delete equipment.');
    allEquipment.value = allEquipment.value.filter((item) => item.id !== id);
    activityEquipment.value = activityEquipment.value.filter((item) => item.id !== id);
    try {
      const setsResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/set/`, {
        headers: getAuthHeaders(),
      });
      if (!isCurrent()) return;
      if (!setsResponse.ok) throw new Error();
      const setsData: unknown = await setsResponse.json();
      if (!isCurrent()) return;
      equipmentSets.value = parseEquipmentSetsResponse(setsData);
    } catch {
      if (!isCurrent()) return;
      throw new Error('Equipment was deleted, but equipment sets could not be refreshed.');
    }
  }

  async function fetchAllSets() {
    const isCurrent = captureSession();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/set/`, {
        headers: getAuthHeaders(),
      });
      if (!isCurrent()) return;
      if (response.ok) {
        const data: unknown = await response.json();
        if (!isCurrent()) return;
        equipmentSets.value = parseEquipmentSetsResponse(data);
      }
    } catch (e) {
      if (!isCurrent()) return;
      console.error('Fetch sets failed', e);
    }
  }

  async function createSet(name: string) {
    const isCurrent = captureSession();
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/set/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, equipment_ids: [] }),
    });
    if (!isCurrent()) return;
    if (!response.ok) throw new Error('Failed to create set.');
    await fetchAllSets();
  }

  async function deleteSet(setId: string) {
    const isCurrent = captureSession();
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/set/${setId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!isCurrent()) return;
    if (!response.ok) throw new Error('Failed to delete set.');
    await fetchAllSets();
  }

  async function addEquipmentToSet(setId: string, equipmentId: string) {
    const isCurrent = captureSession();
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/equipment/set/${setId}/equipment/${equipmentId}`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );
    if (!isCurrent()) return;
    if (!response.ok) throw new Error('Failed to add item to set.');
    await fetchAllSets();
  }

  async function removeEquipmentFromSet(setId: string, equipmentId: string) {
    const isCurrent = captureSession();
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/equipment/set/${setId}/equipment/${equipmentId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );
    if (!isCurrent()) return;
    if (!response.ok) throw new Error('Failed to remove item from set.');
    await fetchAllSets();
  }

  async function setDefaultSet(setId: string, typeId: number, subTypeId: number | null) {
    const isCurrent = captureSession();
    const query = new URLSearchParams({ activity_type_id: typeId.toString() });
    if (subTypeId) query.append('activity_sub_type_id', subTypeId.toString());

    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/equipment/set/default/${setId}?${query.toString()}`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
      }
    );
    if (!isCurrent()) return;
    if (!response.ok) throw new Error('Failed to set default.');
  }

  async function fetchEquipmentForActivity(activityId: string) {
    const isCurrent = captureSession();
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/equipment/activity/${activityId}`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!isCurrent()) return;
    if (response.ok) {
      const data: unknown = await response.json();
      if (!isCurrent()) return;
      activityEquipment.value = parseEquipmentListResponse(data);
    } else {
      activityEquipment.value = [];
    }
  }

  async function addEquipmentToActivity(equipmentId: string, activityId: string) {
    const isCurrent = captureSession();
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/equipment/${equipmentId}/activity/${activityId}`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );
    if (!isCurrent()) return;
    if (!response.ok) throw new Error('Failed to add equipment.');
    await fetchEquipmentForActivity(activityId);
  }

  async function removeEquipmentFromActivity(equipmentId: string, activityId: string) {
    const isCurrent = captureSession();
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/equipment/${equipmentId}/activity/${activityId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );
    if (!isCurrent()) return;
    if (!response.ok) throw new Error('Failed to remove equipment.');
    await fetchEquipmentForActivity(activityId);
  }

  async function addSetToActivity(setId: string, activityId: string) {
    const isCurrent = captureSession();
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/equipment/set/${setId}/activity/${activityId}`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );
    if (!isCurrent()) return;
    if (!response.ok) throw new Error('Failed to add set to activity.');
    await fetchEquipmentForActivity(activityId);
  }

  async function removeSetFromActivity(setId: string, activityId: string) {
    const isCurrent = captureSession();
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/equipment/set/${setId}/activity/${activityId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );
    if (!isCurrent()) return;
    if (!response.ok) throw new Error('Failed to remove set from activity.');
    await fetchEquipmentForActivity(activityId);
  }

  return {
    allEquipment,
    activityEquipment,
    equipmentSets,
    equipmentTypes,
    isLoading,
    fetchAllEquipment,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    fetchEquipmentTypes,
    fetchAllSets,
    createSet,
    deleteSet,
    addEquipmentToSet,
    removeEquipmentFromSet,
    setDefaultSet,
    fetchEquipmentForActivity,
    addEquipmentToActivity,
    removeEquipmentFromActivity,
    addSetToActivity,
    removeSetFromActivity,
  };
});
