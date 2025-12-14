<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useEquipmentStore } from '@/stores/equipment';
import { useTypeStore } from '@/stores/types';

const equipmentStore = useEquipmentStore();
const typeStore = useTypeStore();

// --- UI State ---
const showCreateModal = ref(false);
const newSetName = ref('');
const expandedSetId = ref<string | null>(null); // Controls which set is open for editing

// State for "Add Item to Set"
const selectedEquipmentIdToAdd = ref<string | null>(null);

// State for "Set Defaults" Modal
const configuringDefaultSetId = ref<string | null>(null);
const defaultTypeId = ref<number | null>(null);
const defaultSubTypeId = ref<number | null>(null);

onMounted(() => {
  equipmentStore.fetchAllSets();
  equipmentStore.fetchAllEquipment(); // Need items to resolve names
  typeStore.fetchActivityTypes(); // Need types for default config
});

// --- Computed Helpers ---

const getEquipmentName = (id: string) => {
  const item = equipmentStore.allEquipment.find(e => e.id === id);
  return item ? item.name : 'Unknown Item';
};

const getAvailableItemsForSet = (currentSetItems: string[]) => {
  const setIds = new Set(currentSetItems);
  return equipmentStore.allEquipment.filter(e => !setIds.has(e.id));
};

const availableSubTypes = computed(() => {
  if (!defaultTypeId.value) return [];
  const t = typeStore.activityTypes.find(x => x.id === defaultTypeId.value);
  return t ? t.sub_types : [];
});

// --- Actions ---

async function handleCreate() {
  if (!newSetName.value.trim()) return;
  await equipmentStore.createSet(newSetName.value);
  newSetName.value = '';
  showCreateModal.value = false;
}

async function handleAddItem(setId: string) {
  if (!selectedEquipmentIdToAdd.value) return;
  await equipmentStore.addEquipmentToSet(setId, selectedEquipmentIdToAdd.value);
  selectedEquipmentIdToAdd.value = null; // Reset selection
}

async function handleSaveDefault() {
  if (!configuringDefaultSetId.value || !defaultTypeId.value) return;
  await equipmentStore.setDefaultSet(configuringDefaultSetId.value, defaultTypeId.value, defaultSubTypeId.value);
  configuringDefaultSetId.value = null;
  defaultTypeId.value = null;
  defaultSubTypeId.value = null;
  alert('Default configuration saved!');
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-bold text-gray-800">Equipment Sets</h2>
      <button @click="showCreateModal = true" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
        + New Set
      </button>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="bg-gray-50 p-4 rounded-md border border-gray-200">
      <label class="block text-sm font-medium text-gray-700 mb-1">Set Name</label>
      <div class="flex gap-2">
        <input v-model="newSetName" type="text" placeholder="e.g. Winter Hiking Kit"
          class="flex-grow border-gray-300 rounded-md shadow-sm" />
        <button @click="handleCreate" class="px-3 py-2 bg-green-600 text-white rounded-md shadow-sm">Create</button>
        <button @click="showCreateModal = false"
          class="px-3 py-2 border border-gray-300 bg-white text-gray-700 rounded-md shadow-sm">Cancel</button>
      </div>
    </div>

    <!-- List of Sets -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="set in equipmentStore.equipmentSets" :key="set.id"
        class="bg-white border rounded-lg shadow-sm overflow-hidden flex flex-col">
        <!-- Card Header -->
        <div class="p-4 bg-gray-50 border-b flex justify-between items-center">
          <h3 class="font-bold text-gray-800 truncate" :title="set.name">{{ set.name }}</h3>
          <div class="flex items-center space-x-2">
            <button @click="configuringDefaultSetId = set.id"
              class="text-xs text-gray-500 hover:text-indigo-600 font-medium" title="Configure Defaults">
              Defaults
            </button>
            <div class="h-4 w-px bg-gray-300 mx-1"></div>
            <button @click="expandedSetId = expandedSetId === set.id ? null : set.id"
              class="text-sm text-indigo-600 hover:underline">
              {{ expandedSetId === set.id ? 'Done' : 'Edit' }}
            </button>
            <button @click="equipmentStore.deleteSet(set.id)"
              class="text-sm text-red-500 hover:text-red-700 font-bold ml-2">
              &times;
            </button>
          </div>
        </div>

        <!-- Card Content: Collapsed View -->
        <div v-if="expandedSetId !== set.id" class="p-4 text-sm text-gray-600 flex-grow">
          <p v-if="set.items.length === 0" class="italic text-gray-400">No items in set.</p>
          <ul v-else class="list-disc list-inside space-y-1">
            <li v-for="itemId in set.items.slice(0, 3)" :key="itemId" class="truncate">
              {{ getEquipmentName(itemId) }}
            </li>
            <li v-if="set.items.length > 3" class="list-none text-xs text-gray-400 mt-1 pl-2">
              + {{ set.items.length - 3 }} more...
            </li>
          </ul>
        </div>

        <!-- Card Content: Expanded (Edit) View -->
        <div v-else class="p-4 bg-white flex-grow flex flex-col">
          <ul class="space-y-2 mb-4 flex-grow">
            <li v-for="itemId in set.items" :key="itemId"
              class="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100">
              <span class="text-sm truncate mr-2">{{ getEquipmentName(itemId) }}</span>
              <button @click="equipmentStore.removeEquipmentFromSet(set.id, itemId)"
                class="text-red-500 hover:text-red-700 text-xs font-medium">
                Remove
              </button>
            </li>
            <li v-if="set.items.length === 0" class="text-sm text-gray-400 italic text-center py-2">Set is empty.</li>
          </ul>

          <!-- Add Item Control -->
          <div class="mt-auto pt-3 border-t">
            <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">Add Item</label>
            <div class="flex gap-2">
              <select v-model="selectedEquipmentIdToAdd" class="flex-grow text-sm border-gray-300 rounded-md">
                <option :value="null">Select item...</option>
                <option v-for="item in getAvailableItemsForSet(set.items)" :key="item.id" :value="item.id">
                  {{ item.name }}
                </option>
              </select>
              <button @click="handleAddItem(set.id)" :disabled="!selectedEquipmentIdToAdd"
                class="px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-sm font-medium disabled:opacity-50">
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Default Configuration Modal -->
    <div v-if="configuringDefaultSetId"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-2">Configure Default</h3>
        <p class="text-sm text-gray-600 mb-4">Automatically add this set when creating activities of type:</p>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Activity Type</label>
            <select v-model="defaultTypeId" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
              <option :value="null">Select Type...</option>
              <option v-for="t in typeStore.activityTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Sub-Type (Optional)</label>
            <select v-model="defaultSubTypeId" :disabled="!defaultTypeId"
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm disabled:bg-gray-100">
              <option :value="null">Any Sub-Type</option>
              <option v-for="st in availableSubTypes" :key="st.id" :value="st.id">{{ st.name }}</option>
            </select>
          </div>
        </div>

        <div class="flex justify-end space-x-3 mt-6">
          <button @click="configuringDefaultSetId = null"
            class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
          <button @click="handleSaveDefault" :disabled="!defaultTypeId"
            class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300">Save</button>
        </div>
      </div>
    </div>

  </div>
</template>
