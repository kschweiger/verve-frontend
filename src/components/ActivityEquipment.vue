<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useEquipmentStore } from '@/stores/equipment';

const props = defineProps<{ activityId: string }>();
const equipmentStore = useEquipmentStore();
const selectedEquipmentId = ref<string | null>(null);

// A computed property to find which gear is available to be added
const availableEquipment = computed(() => {
  const assignedIds = new Set(equipmentStore.activityEquipment.map(e => e.id));
  return equipmentStore.allEquipment.filter(e => !assignedIds.has(e.id));
});

async function handleAdd() {
  if (!selectedEquipmentId.value) return;
  await equipmentStore.addEquipmentToActivity(selectedEquipmentId.value, props.activityId);
  selectedEquipmentId.value = null; // Reset dropdown
}

onMounted(() => {
  // Fetch both the gear for this activity and the user's entire gear closet
  equipmentStore.fetchEquipmentForActivity(props.activityId);
  equipmentStore.fetchAllEquipment();
});
</script>
<template>
  <div class="bg-white p-6 rounded-lg shadow-md">
    <h3 class="text-xl font-bold text-gray-800 mb-4">Equipment Used</h3>
    <!-- List of assigned equipment -->
    <div v-if="equipmentStore.activityEquipment.length > 0" class="space-y-2 mb-4">
      <div v-for="item in equipmentStore.activityEquipment" :key="item.id"
        class="flex justify-between items-center bg-gray-50 p-2 rounded">
        <div>
          <p class="font-semibold">{{ item.name }}</p>
          <p class="text-sm text-gray-500">{{ item.brand }} {{ item.model }}</p>
        </div>
        <div class="flex items-center space-x-4">

          <span class="text-xs font-mono bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
            {{ item.equipment_type }}
          </span>
          <button @click="equipmentStore.removeEquipmentFromActivity(item.id, activityId)"
            class="text-red-500 hover:text-red-700">Remove</button>
        </div>

      </div>
    </div>
    <p v-else class="text-sm text-gray-500 mb-4">No equipment assigned to this activity.</p>

    <!-- Form to add new equipment -->
    <div class="border-t pt-4">
      <label class="block text-sm font-medium text-gray-700">Add Equipment</label>
      <div class="mt-1 flex space-x-2">
        <select v-model="selectedEquipmentId" class="flex-grow border-gray-300 rounded-md">
          <option disabled :value="null">Select from your gear...</option>
          <option v-for="item in availableEquipment" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
        <button @click="handleAdd" :disabled="!selectedEquipmentId"
          class="px-4 py-2 bg-indigo-600 text-white rounded-md disabled:bg-indigo-300">Add</button>
      </div>
    </div>
  </div>
</template>
