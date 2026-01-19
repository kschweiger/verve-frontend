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
  <div class="bg-white p-6 rounded-xl shadow-sm border border-verve-medium/30">
    <h3 class="text-xl font-bold text-verve-brown mb-4">Equipment Used</h3>

    <!-- Assigned List -->
    <div v-if="equipmentStore.activityEquipment.length > 0" class="space-y-2 mb-6">
      <div v-for="item in equipmentStore.activityEquipment" :key="item.id"
        class="flex justify-between items-center bg-white p-3 rounded-xl border border-verve-medium/20 hover:bg-verve-light/20 transition-colors">
        <div>
          <p class="font-bold text-sm text-verve-brown">{{ item.name }}</p>
          <p class="text-xs text-verve-brown/60">{{ item.brand }} {{ item.model }}</p>
        </div>
        <div class="flex items-center space-x-3">
          <span
            class="text-xs font-medium bg-verve-light text-verve-brown/80 px-2.5 py-1 rounded-lg border border-verve-medium/20">
            {{ item.equipment_type }}
          </span>
          <button @click="equipmentStore.removeEquipmentFromActivity(item.id, activityId)"
            class="text-red-500 hover:text-red-700 text-sm font-medium transition-colors">Remove</button>
        </div>
      </div>
    </div>
    <p v-else
      class="text-sm text-verve-brown/50 mb-6 italic text-center py-4 bg-verve-light/10 rounded-xl border border-dashed border-verve-medium/30">
      No equipment assigned.
    </p>

    <!-- Add Section -->
    <div class="border-t border-verve-medium/30 pt-4">
      <label class="block text-sm font-bold text-verve-brown mb-3">Add Gear</label>

      <!-- Radio Toggle -->
      <div class="flex space-x-6 mb-4 text-sm">
        <label class="flex items-center cursor-pointer group">
          <input type="radio" v-model="addMode" value="item"
            class="mr-2 text-verve-dark focus:ring-verve-dark border-verve-medium" />
          <span
            :class="addMode === 'item' ? 'text-verve-brown font-bold' : 'text-verve-brown/70 group-hover:text-verve-brown'">Single
            Item</span>
        </label>
        <label class="flex items-center cursor-pointer group">
          <input type="radio" v-model="addMode" value="set"
            class="mr-2 text-verve-dark focus:ring-verve-dark border-verve-medium" />
          <span
            :class="addMode === 'set' ? 'text-verve-brown font-bold' : 'text-verve-brown/70 group-hover:text-verve-brown'">Entire
            Set</span>
        </label>
      </div>

      <!-- Controls -->
      <div class="flex gap-3">
        <select v-if="addMode === 'item'" v-model="selectedEquipmentId"
          class="flex-grow border-verve-medium rounded-xl text-sm text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white py-2">
          <option :value="null">Select item...</option>
          <option v-for="item in availableEquipment" :key="item.id" :value="item.id">
            {{ item.name }} ({{ item.equipment_type }})
          </option>
        </select>

        <select v-else v-model="selectedSetId"
          class="flex-grow border-verve-medium rounded-xl text-sm text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white py-2">
          <option :value="null">Select set...</option>
          <option v-for="set in availableSets" :key="set.id" :value="set.id">
            {{ set.name }} ({{ set.items.length }} items)
          </option>
        </select>

        <button @click="handleAdd" :disabled="addMode === 'item' ? !selectedEquipmentId : !selectedSetId"
          class="px-5 py-2 bg-verve-neon text-verve-brown font-bold rounded-xl text-sm hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-verve-dark/5">
          Add
        </button>
      </div>

      <!-- Quick Remove Set Helper -->
      <div v-if="addMode === 'set' && selectedSetId" class="mt-3 text-right">
        <button @click="handleRemoveSet(selectedSetId!)"
          class="text-xs text-red-500 hover:text-red-700 hover:underline font-medium transition-colors">
          Remove this set from activity
        </button>
      </div>

    </div>
  </div>
</template>
