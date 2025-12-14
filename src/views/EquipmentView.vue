<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useEquipmentStore } from '@/stores/equipment';
import EquipmentSetsManager from '@/components/EquipmentSetsManager.vue';

const equipmentStore = useEquipmentStore();
const activeTab = ref<'items' | 'sets'>('items');

// --- Existing Logic for Individual Items Tab ---
const showCreateForm = ref(false);
const newEquipment = ref({
  name: '',
  equipment_type: '',
  brand: '',
  model: '',
  description: '',
  purchase_date: new Date().toISOString().split('T')[0]
});

async function handleSaveItem() {
  if (!newEquipment.value.name || !newEquipment.value.equipment_type) {
    alert('Name and Equipment Type are required.');
    return;
  }
  await equipmentStore.createEquipment(newEquipment.value);
  showCreateForm.value = false;
  // Reset form
  newEquipment.value = { name: '', equipment_type: equipmentStore.equipmentTypes[0] || '', brand: '', model: '', description: '', purchase_date: new Date().toISOString().split('T')[0] };
}

onMounted(async () => {
  await Promise.all([
    equipmentStore.fetchAllEquipment(),
    equipmentStore.fetchEquipmentTypes()
  ]);
  // Set default type for the dropdown
  const firstType = equipmentStore.equipmentTypes[0];
  if (firstType) {
    newEquipment.value.equipment_type = firstType;
  }
});
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8">
    <div class="max-w-4xl mx-auto">

      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 class="text-3xl font-bold text-gray-900 mb-4 sm:mb-0">My Gear</h1>

        <!-- Tab Navigation -->
        <div class="bg-gray-100 p-1 rounded-lg flex space-x-1">
          <button @click="activeTab = 'items'"
            :class="['px-4 py-2 text-sm font-medium rounded-md transition-all', activeTab === 'items' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700']">
            Individual Items
          </button>
          <button @click="activeTab = 'sets'"
            :class="['px-4 py-2 text-sm font-medium rounded-md transition-all', activeTab === 'sets' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700']">
            Equipment Sets
          </button>
        </div>
      </div>

      <!-- TAB 1: Individual Items (Your existing view logic) -->
      <div v-if="activeTab === 'items'">
        <div class="flex justify-end mb-4">
          <button @click="showCreateForm = !showCreateForm"
            class="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm">
            {{ showCreateForm ? 'Cancel' : '+ Add New Item' }}
          </button>
        </div>

        <!-- Create Form -->
        <div v-if="showCreateForm" class="bg-white p-6 rounded-lg shadow-md mb-6 space-y-4 border border-gray-200">
          <h2 class="text-lg font-bold text-gray-800">Add New Gear</h2>
          <div><label class="block text-sm font-medium text-gray-700">Name</label><input v-model="newEquipment.name"
              type="text" class="mt-1 w-full border-gray-300 rounded-md shadow-sm" /></div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Type</label>
            <select v-model="newEquipment.equipment_type" class="mt-1 w-full border-gray-300 rounded-md shadow-sm">
              <option v-for="type in equipmentStore.equipmentTypes" :key="type" :value="type">
                {{ type.charAt(0).toUpperCase() + type.slice(1) }}
              </option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-sm font-medium text-gray-700">Brand</label><input v-model="newEquipment.brand"
                type="text" class="mt-1 w-full border-gray-300 rounded-md shadow-sm" /></div>
            <div><label class="block text-sm font-medium text-gray-700">Model</label><input v-model="newEquipment.model"
                type="text" class="mt-1 w-full border-gray-300 rounded-md shadow-sm" /></div>
          </div>
          <div><label class="block text-sm font-medium text-gray-700">Date</label><input
              v-model="newEquipment.purchase_date" type="date"
              class="mt-1 w-full border-gray-300 rounded-md shadow-sm" /></div>
          <button @click="handleSaveItem"
            class="w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-700 shadow-sm">Save Item</button>
        </div>

        <!-- List -->
        <div v-if="equipmentStore.isLoading" class="text-center text-gray-500 py-16">Loading gear...</div>
        <div v-else class="bg-white rounded-lg shadow-md overflow-hidden">
          <ul v-if="equipmentStore.allEquipment.length > 0">
            <li v-for="item in equipmentStore.allEquipment" :key="item.id"
              class="p-4 border-b last:border-b-0 flex justify-between items-center hover:bg-gray-50 transition">
              <div>
                <p class="font-bold text-gray-800">{{ item.name }}</p>
                <p class="text-sm text-gray-500">{{ item.brand }} {{ item.model }}</p>
              </div>
              <span class="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded-full border border-gray-200">
                {{ item.equipment_type }}
              </span>
            </li>
          </ul>
          <div v-else class="text-center p-8 text-gray-500 italic">
            You haven't added any gear yet.
          </div>
        </div>
      </div>

      <!-- TAB 2: Sets Manager -->
      <div v-else-if="activeTab === 'sets'">
        <EquipmentSetsManager />
      </div>

    </div>
  </div>
</template>
