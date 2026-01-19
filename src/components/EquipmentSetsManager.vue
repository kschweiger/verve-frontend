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
      <h2 class="text-xl font-bold text-verve-brown">Equipment Sets</h2>
      <button @click="showCreateModal = true"
        class="px-4 py-2 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 border border-verve-dark/5 transition-all text-sm">
        + New Set
      </button>
    </div>

    <!-- Create Modal (Inline) -->
    <div v-if="showCreateModal" class="bg-verve-light/20 p-4 rounded-xl border border-verve-medium/30">
      <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Set Name</label>
      <div class="flex gap-2">
        <input v-model="newSetName" type="text" placeholder="e.g. Winter Hiking Kit"
          class="flex-grow border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
        <button @click="handleCreate"
          class="px-4 py-2 bg-verve-neon text-verve-brown font-bold rounded-xl text-sm shadow-sm hover:brightness-105">Create</button>
        <button @click="showCreateModal = false"
          class="px-4 py-2 border border-verve-medium/50 bg-white text-verve-brown font-semibold rounded-xl text-sm hover:bg-verve-light">Cancel</button>
      </div>
    </div>

    <!-- List of Sets -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="set in equipmentStore.equipmentSets" :key="set.id"
        class="bg-white border border-verve-medium/30 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <!-- Card Header -->
        <div class="p-4 bg-verve-light/10 border-b border-verve-medium/20 flex justify-between items-center">
          <h3 class="font-bold text-verve-brown truncate" :title="set.name">{{ set.name }}</h3>
          <div class="flex items-center space-x-2">
            <button @click="openDefaultModal(set.id)"
              class="text-xs text-verve-brown/60 hover:text-verve-brown font-bold uppercase tracking-wide transition-colors"
              title="Configure Defaults">
              ★ Defaults
            </button>
            <div class="h-3 w-px bg-verve-medium/40 mx-1"></div>
            <button @click="expandedSetId = expandedSetId === set.id ? null : set.id"
              class="text-xs font-bold text-verve-brown/80 hover:text-verve-orange uppercase tracking-wide transition-colors">
              {{ expandedSetId === set.id ? 'Done' : 'Edit' }}
            </button>
            <button @click="equipmentStore.deleteSet(set.id)"
              class="text-sm text-verve-orange/60 hover:text-verve-orange font-bold ml-2 transition-colors">
              &times;
            </button>
          </div>
        </div>

        <!-- Items Preview (Collapsed) -->
        <div v-if="expandedSetId !== set.id" class="p-4 text-sm text-verve-brown/70 flex-grow">
          <p v-if="set.items.length === 0" class="italic text-verve-brown/40">Empty set.</p>
          <ul v-else class="list-disc list-inside space-y-1">
            <li v-for="itemId in set.items.slice(0, 3)" :key="itemId" class="truncate">
              {{ getEquipmentName(itemId) }}
            </li>
            <li v-if="set.items.length > 3" class="list-none text-xs text-verve-brown/40 mt-1 pl-2">
              + {{ set.items.length - 3 }} more...
            </li>
          </ul>
        </div>

        <!-- Expanded View (Edit) -->
        <div v-else class="p-4 bg-white flex-grow flex flex-col">
          <ul class="space-y-2 mb-4 flex-grow">
            <li v-for="itemId in set.items" :key="itemId"
              class="flex justify-between items-center bg-verve-light/10 p-2 rounded-xl border border-verve-medium/20">
              <span class="text-sm text-verve-brown truncate mr-2">{{ getEquipmentName(itemId) }}</span>
              <button @click="equipmentStore.removeEquipmentFromSet(set.id, itemId)"
                class="text-red-500 hover:text-red-700 text-xs font-medium transition-colors">
                Remove
              </button>
            </li>
            <li v-if="set.items.length === 0" class="text-sm text-verve-brown/40 italic text-center py-2">Set is empty.
            </li>
          </ul>

          <!-- Add Item Control -->
          <div class="mt-auto pt-3 border-t border-verve-medium/20">
            <label class="block text-xs font-bold text-verve-brown/50 mb-1 uppercase">Add Item</label>
            <div class="flex gap-2">
              <select v-model="selectedEquipmentIdToAdd"
                class="flex-grow text-sm border-verve-medium rounded-xl py-1.5 px-2 text-verve-brown focus:ring-verve-dark">
                <option :value="null">Select item...</option>
                <option v-for="item in getAvailableItemsForSet(set.items)" :key="item.id" :value="item.id">
                  {{ item.name }}
                </option>
              </select>
              <button @click="handleAddItem(set.id)" :disabled="!selectedEquipmentIdToAdd"
                class="px-3 py-1.5 bg-verve-neon text-verve-brown rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Default Configuration Modal -->
    <div v-if="configuringDefaultSetId"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-verve-brown/20 backdrop-blur-sm">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 border border-verve-medium/30">
        <h3 class="text-lg font-bold text-verve-brown mb-2">Configure Default</h3>
        <p class="text-sm text-verve-brown/60 mb-4">Automatically add this set when creating activities of type:</p>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Activity Type</label>
            <select v-model="defaultTypeId"
              class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white">
              <option :value="null">Select Type...</option>
              <option v-for="t in typeStore.activityTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Sub-Type (Optional)</label>
            <select v-model="defaultSubTypeId" :disabled="!defaultTypeId"
              class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white disabled:bg-gray-50 disabled:text-gray-400">
              <option :value="null">Any Sub-Type</option>
              <option v-for="st in availableSubTypes" :key="st.id" :value="st.id">{{ st.name }}</option>
            </select>
          </div>
        </div>

        <div class="flex justify-end space-x-3 mt-6 pt-4 border-t border-verve-medium/30">
          <button @click="configuringDefaultSetId = null"
            class="px-4 py-2 border border-verve-medium/50 rounded-xl text-verve-brown font-semibold hover:bg-verve-light transition-colors text-sm">Cancel</button>
          <button @click="saveDefault" :disabled="!defaultTypeId"
            class="px-4 py-2 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 disabled:opacity-50 text-sm">Save</button>
        </div>
      </div>
    </div>

  </div>
</template>
