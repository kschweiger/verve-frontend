import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '../../src/stores/auth';
import { useEquipmentStore } from '../../src/stores/equipment';

const originalFetch = globalThis.fetch;
const originalLocalStorage = globalThis.localStorage;

const jsonResponse = (body: unknown, init?: ResponseInit): Response =>
  new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

const equipment = {
  id: 'equipment-1',
  name: 'Road bike',
  equipment_type: 'bike',
  brand: 'Verve',
  model: null,
  description: null,
  purchase_date: null,
};

beforeEach(() => {
  setActivePinia(createPinia());
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    length: 0,
  } as Storage;
  useUserStore().setToken('token-123');
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.localStorage = originalLocalStorage;
});

describe('equipment item mutations', () => {
  test('patches an item and synchronizes both equipment caches from the response', async () => {
    const updated = { ...equipment, name: 'Touring bike' };
    const fetchMock = mock(async () => jsonResponse(updated));
    globalThis.fetch = fetchMock as typeof fetch;
    const store = useEquipmentStore();
    store.allEquipment = [equipment];
    store.activityEquipment = [equipment];

    await store.updateEquipment(equipment.id, { name: 'Touring bike' });

    expect(fetchMock).toHaveBeenCalledWith(
      `${import.meta.env.VITE_API_BASE_URL}/equipment/${equipment.id}`,
      expect.objectContaining({
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Touring bike' }),
      })
    );
    expect(store.allEquipment).toEqual([updated]);
    expect(store.activityEquipment).toEqual([updated]);
  });

  test('preserves cached items when an update request fails', async () => {
    globalThis.fetch = mock(async () => jsonResponse({}, { status: 503 })) as typeof fetch;
    const store = useEquipmentStore();
    store.allEquipment = [equipment];

    await expect(store.updateEquipment(equipment.id, { name: 'Changed' })).rejects.toThrow(
      'Failed to update equipment.'
    );
    expect(store.allEquipment).toEqual([equipment]);
  });

  test('deletes without parsing a response body and refreshes sets', async () => {
    const fetchMock = mock()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));
    globalThis.fetch = fetchMock as typeof fetch;
    const store = useEquipmentStore();
    store.allEquipment = [equipment];
    store.activityEquipment = [equipment];

    await store.deleteEquipment(equipment.id);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${import.meta.env.VITE_API_BASE_URL}/equipment/${equipment.id}`,
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(store.allEquipment).toEqual([]);
    expect(store.activityEquipment).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('does not remove cached items when delete fails', async () => {
    globalThis.fetch = mock(async () => new Response(null, { status: 500 })) as typeof fetch;
    const store = useEquipmentStore();
    store.allEquipment = [equipment];

    await expect(store.deleteEquipment(equipment.id)).rejects.toThrow(
      'Failed to delete equipment.'
    );
    expect(store.allEquipment).toEqual([equipment]);
  });

  test('reports set refresh failure after a successful delete', async () => {
    globalThis.fetch = mock()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 })) as typeof fetch;
    const store = useEquipmentStore();
    store.allEquipment = [equipment];

    await expect(store.deleteEquipment(equipment.id)).rejects.toThrow(
      'Equipment was deleted, but equipment sets could not be refreshed.'
    );
    expect(store.allEquipment).toEqual([]);
  });
});
