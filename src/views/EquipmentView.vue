<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useEquipmentStore } from '@/stores/equipment';

const equipmentStore = useEquipmentStore();
const showCreateForm = ref(false);

// Form state - updated to default the equipment_type to the first available type
const newEquipment = ref({
  name: '',
  equipment_type: '', // Will be set once types are loaded
  brand: '',
  model: '',
  description: '',
  purchase_date: new Date().toISOString().split('T')[0]
});

async function handleSave() {
  // Basic validation
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
  // Fetch both in parallel
  await Promise.all([
    equipmentStore.fetchAllEquipment(),
    equipmentStore.fetchEquipmentTypes()
  ]);
  // Set a default value for the form's dropdown
  if (equipmentStore.equipmentTypes.length > 0) {
    newEquipment.value.equipment_type = equipmentStore.equipmentTypes[0];
  }
});
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8">
    <div class="max-w-4xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-gray-900">My Gear</h1>
        <button @click="showCreateForm = !showCreateForm" class="px-4 py-2 bg-indigo-600 text-white rounded-md">
          {{ showCreateForm ? 'Cancel' : 'Add New Gear' }}
        </button>
      </div>

      <!-- Create Form -->
      <div v-if="showCreateForm" class="bg-white p-6 rounded-lg shadow-md mb-6 space-y-4">
        <h2 class="text-xl font-bold">New Equipment</h2>

        <!-- Name Input -->
        <div><label class="block text-sm font-medium">Name</label><input v-model="newEquipment.name" type="text"
            required
            class="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
        </div>

        <!-- Equipment Type Dropdown -->
        <div>
          <label class="block text-sm font-medium">Type</label>
          <select v-model="newEquipment.equipment_type" required
            class="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
            <option disabled value="">Select a type</option>
            <option v-for="type in equipmentStore.equipmentTypes" :key="type" :value="type">
              {{ type.charAt(0).toUpperCase() + type.slice(1) }} <!-- Capitalize for display -->
            </option>
          </select>
        </div>

        <!-- Other Inputs -->
        <div><label class="block text-sm font-medium">Brand</label><input v-model="newEquipment.brand" type="text"
            class="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
        </div>
        <div><label class="block text-sm font-medium">Model</label><input v-model="newEquipment.model" type="text"
            class="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
        </div>
        <div><label class="block text-sm font-medium">Purchase Date</label><input v-model="newEquipment.purchase_date"
            type="date"
            class="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
        </div>

        <button @click="handleSave"
          class="w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Save</button>
      </div>

      <!-- Equipment List -->
      <div v-if="equipmentStore.isLoading" class="text-center text-gray-500 py-16">
        Loading your gear...
      </div>
      <div v-else class="bg-white rounded-lg shadow-md">
        <ul v-if="equipmentStore.allEquipment.length > 0">
          <li v-for="item in equipmentStore.allEquipment" :key="item.id"
            class="p-4 border-b last:border-b-0 flex justify-between items-center">
            <div>
              <p class="font-bold">{{ item.name }}</p>
              <p class="text-sm text-gray-600">{{ item.brand }} {{ item.model }}</p>
            </div>
            <span class="text-sm font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{{ item.equipment_type
              }}</span>
          </li>
        </ul>
        <div v-else class="text-center p-8 text-gray-500">
          <p>You haven't added any gear yet. Click "Add New Gear" to get started!</p>
        </div>
      </div>
    </div>
  </div>
</template>/template>
