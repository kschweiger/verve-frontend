import type * as Backend from '../types/api';
import { useLatestRequest } from '../composables/useLatestRequest';
import { useAccountSession } from '../composables/useAccountSession';
import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from './auth';

export const equipmentTypeValues = ['bike', 'shoes', 'skis', 'snowboard', 'hometrainer'] as const;
export type EquipmentType = Backend.EquipmentType;

export interface Equipment {
  id: string;
  name: string;
  equipment_type: EquipmentType;
  brand: string | null;
  model: string | null;
  description: string | null;
  purchase_date: string | null;
}

export type EquipmentSet = Backend.EquipmentSetPublic;
export type EquipmentCreatePayload = Backend.EquipmentCreate;
export type EquipmentUpdatePayload = Backend.EquipmentUpdate;

function mapEquipment(value: Backend.EquipmentPublic): Equipment {
  return {
    ...value,
    brand: value.brand ?? null,
    model: value.model ?? null,
    description: value.description ?? null,
    purchase_date: value.purchase_date ?? null,
  };
}

export const useEquipmentStore = defineStore('equipment', () => {
  const allEquipment = ref<Equipment[]>([]);
  const equipmentSets = ref<EquipmentSet[]>([]);
  const activityEquipment = ref<Equipment[]>([]);
  let equipmentActivityId: string | null = null;
  const equipmentTypes = ref<EquipmentType[]>([]);

  const isLoading = ref(false);
  const areTypesLoading = ref(false);

  const userStore = useUserStore();
  const getAuthHeaders = (contentType = 'application/json') => ({
    Authorization: `Bearer ${userStore.token}`,
    'Content-Type': contentType,
  });

  const captureSession = useAccountSession(() => {
    equipmentActivityId = null;
    allEquipment.value = [];
    equipmentSets.value = [];
    activityEquipment.value = [];
    equipmentTypes.value = [];
    isLoading.value = false;
    areTypesLoading.value = false;
  });
  const beginInventoryRequest = useLatestRequest(captureSession);
  const beginSetsRequest = useLatestRequest(captureSession);
  const beginActivityEquipmentRequest = useLatestRequest(captureSession);

  async function fetchEquipmentTypes() {
    const isCurrent = captureSession();
    if (equipmentTypes.value.length > 0) return;
    areTypesLoading.value = true;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/types`);
      if (!isCurrent()) return;
      if (response.ok) {
        const data: Backend.ListResponse<EquipmentType> = await response.json();
        if (!isCurrent()) return;
        equipmentTypes.value = data.data;
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
    const isCurrent = beginInventoryRequest();
    isLoading.value = true;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/`, {
        headers: getAuthHeaders(),
      });
      if (!isCurrent()) return;
      if (response.ok) {
        const data: Backend.ListResponse<Backend.EquipmentPublic> = await response.json();
        if (!isCurrent()) return;
        allEquipment.value = data.data.map(mapEquipment);
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
    const data: Backend.EquipmentPublic = await response.json();
    if (!isCurrent()) return;
    const updated = mapEquipment(data);
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
    const ownsSets = beginSetsRequest();
    try {
      const setsResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/set/`, {
        headers: getAuthHeaders(),
      });
      if (!isCurrent() || !ownsSets()) return;
      if (!setsResponse.ok) throw new Error();
      const setsData: Backend.ListResponse<EquipmentSet> = await setsResponse.json();
      if (!isCurrent() || !ownsSets()) return;
      equipmentSets.value = setsData.data;
    } catch {
      if (!isCurrent() || !ownsSets()) return;
      throw new Error('Equipment was deleted, but equipment sets could not be refreshed.');
    }
  }

  async function fetchAllSets() {
    const isCurrent = beginSetsRequest();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/equipment/set/`, {
        headers: getAuthHeaders(),
      });
      if (!isCurrent()) return;
      if (response.ok) {
        const data: Backend.ListResponse<EquipmentSet> = await response.json();
        if (!isCurrent()) return;
        equipmentSets.value = data.data;
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
    equipmentActivityId = activityId;
    const isCurrent = beginActivityEquipmentRequest();
    activityEquipment.value = [];
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/equipment/activity/${activityId}`,
      {
        headers: getAuthHeaders(),
      }
    );
    if (!isCurrent()) return;
    if (response.ok) {
      const data: Backend.ListResponse<Backend.EquipmentPublic> = await response.json();
      if (!isCurrent()) return;
      activityEquipment.value = data.data.map(mapEquipment);
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
    if (equipmentActivityId === null || equipmentActivityId === activityId) {
      await fetchEquipmentForActivity(activityId);
    }
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
    if (equipmentActivityId === null || equipmentActivityId === activityId) {
      await fetchEquipmentForActivity(activityId);
    }
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
    if (equipmentActivityId === null || equipmentActivityId === activityId) {
      await fetchEquipmentForActivity(activityId);
    }
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
    if (equipmentActivityId === null || equipmentActivityId === activityId) {
      await fetchEquipmentForActivity(activityId);
    }
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
