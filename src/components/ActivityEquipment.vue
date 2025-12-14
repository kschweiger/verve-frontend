<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useEquipmentStore } from '@/stores/equipment';

const props = defineProps<{ activityId: string }>();
const equipmentStore = useEquipmentStore();

// UI State
const addMode = ref<'item' | 'set'>('item');
const selectedEquipmentId = ref<string | null>(null);
const selectedSetId = ref<string | null>(null);

// Computeds
const availableEquipment = computed(() => {
  const assignedIds = new Set(equipmentStore.activityEquipment.map(e => e.id));
  return equipmentStore.allEquipment.filter(e => !assignedIds.has(e.id));
});

// We can add any set
const availableSets = computed(() => equipmentStore.equipmentSets);

async function handleAdd() {
  if (addMode.value === 'item' && selectedEquipmentId.value) {
    await equipmentStore.addEquipmentToActivity(selectedEquipmentId.value, props.activityId);
    selectedEquipmentId.value = null;
  } else if (addMode.value === 'set' && selectedSetId.value) {
    await equipmentStore.addSetToActivity(selectedSetId.value, props.activityId);
    selectedSetId.value = null;
  }
}

async function handleRemoveSet(setId: string) {
  if (confirm('Remove all items belonging to this set from the activity?')) {
    await equipmentStore.removeSetFromActivity(setId, props.activityId);
  }
}

onMounted(() => {
  equipmentStore.fetchEquipmentForActivity(props.activityId);
  equipmentStore.fetchAllEquipment();
  equipmentStore.fetchAllSets();
});
</script>

<template>
  <div class="bg-white p-6 rounded-lg shadow-md">
    <h3 class="text-xl font-bold text-gray-800 mb-4">Equipment Used</h3>

    <!-- Assigned List -->
    <div v-if="equipmentStore.activityEquipment.length > 0" class="space-y-2 mb-6">
      <div v-for="item in equipmentStore.activityEquipment" :key="item.id"
        class="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100">
        <div>
          <p class="font-semibold text-sm text-gray-800">{{ item.name }}</p>
          <p class="text-xs text-gray-500">{{ item.brand }} {{ item.model }}</p>
        </div>
        <div class="flex items-center space-x-3">
          <span class="text-xs font-mono bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
            {{ item.equipment_type }}
          </span>
          <button @click="equipmentStore.removeEquipmentFromActivity(item.id, activityId)"
            class="text-red-500 hover:text-red-700 text-sm font-medium">Remove</button>
        </div>
      </div>
    </div>
    <p v-else class="text-sm text-gray-500 mb-6 italic">No equipment assigned.</p>

    <!-- Add Section -->
    <div class="border-t pt-4">
      <label class="block text-sm font-bold text-gray-700 mb-2">Add Gear</label>

      <!-- Radio Toggle -->
      <div class="flex space-x-4 mb-3 text-sm">
        <label class="flex items-center cursor-pointer">
          <input type="radio" v-model="addMode" value="item" class="mr-2 text-indigo-600 focus:ring-indigo-500" />
          Single Item
        </label>
        <label class="flex items-center cursor-pointer">
          <input type="radio" v-model="addMode" value="set" class="mr-2 text-indigo-600 focus:ring-indigo-500" />
          Entire Set
        </label>
      </div>

      <!-- Controls -->
      <div class="flex gap-2">
        <select v-if="addMode === 'item'" v-model="selectedEquipmentId"
          class="flex-grow border-gray-300 rounded-md text-sm">
          <option :value="null">Select item...</option>
          <option v-for="item in availableEquipment" :key="item.id" :value="item.id">
            {{ item.name }} ({{ item.equipment_type }})
          </option>
        </select>

        <select v-else v-model="selectedSetId" class="flex-grow border-gray-300 rounded-md text-sm">
          <option :value="null">Select set...</option>
          <option v-for="set in availableSets" :key="set.id" :value="set.id">
            {{ set.name }} ({{ set.items.length }} items)
          </option>
        </select>

        <button @click="handleAdd" :disabled="addMode === 'item' ? !selectedEquipmentId : !selectedSetId"
          class="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors shadow-sm">
          Add
        </button>
      </div>

      <!-- Quick Remove Set Helper -->
      <div v-if="addMode === 'set' && selectedSetId" class="mt-2 text-right">
        <button @click="handleRemoveSet(selectedSetId!)" class="text-xs text-red-500 hover:text-red-700 underline">
          Remove this set from activity
        </button>
      </div>

    </div>
  </div>
</template>
