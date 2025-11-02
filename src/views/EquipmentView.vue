<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useEquipmentStore } from '@/stores/equipment';
// We can create a form component for this later if it gets complex

const equipmentStore = useEquipmentStore();
const showCreateForm = ref(false);

// Form state
const newEquipment = ref({
  name: '', equipment_type: 'bike', brand: '', model: '', description: '', purchase_date: new Date().toISOString().split('T')[0]
});

async function handleSave() {
  await equipmentStore.createEquipment(newEquipment.value);
  // Reset form and hide it
  showCreateForm.value = false;
  newEquipment.value = { name: '', equipment_type: 'bike', brand: '', model: '', description: '', purchase_date: new Date().toISOString().split('T')[0] };
}

onMounted(() => {
  equipmentStore.fetchAllEquipment();
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
        <div><label class="block text-sm font-medium">Name</label><input v-model="newEquipment.name" type="text"
            class="mt-1 w-full border-gray-300 rounded-md" /></div>
        <div><label class="block text-sm font-medium">Brand</label><input v-model="newEquipment.brand" type="text"
            class="mt-1 w-full border-gray-300 rounded-md" /></div>
        <div><label class="block text-sm font-medium">Model</label><input v-model="newEquipment.model" type="text"
            class="mt-1 w-full border-gray-300 rounded-md" /></div>
        <div><label class="block text-sm font-medium">Purchase Date</label><input v-model="newEquipment.purchase_date"
            type="date" class="mt-1 w-full border-gray-300 rounded-md" /></div>
        <button @click="handleSave" class="w-full py-2 bg-green-600 text-white rounded-md">Save</button>
      </div>

      <!-- Equipment List -->
      <div class="bg-white rounded-lg shadow-md">
        <ul>
          <li v-for="item in equipmentStore.allEquipment" :key="item.id" class="p-4 border-b last:border-b-0">
            <p class="font-bold">{{ item.name }}</p>
            <p class="text-sm text-gray-600">{{ item.brand }} {{ item.model }}</p>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
