<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useTypeStore } from '@/stores/types';
import type { UserSettings } from '@/stores/settings';

const props = defineProps<{ initialSettings: UserSettings }>();
const emit = defineEmits<{
  (e: 'save', payload: { typeId: number | null, subTypeId: number | null }): void;
  (e: 'cancel'): void;
}>();

const typeStore = useTypeStore();
const selectedTypeId = ref(props.initialSettings.default_type_id);
const selectedSubTypeId = ref(props.initialSettings.defautl_sub_type_id);



const availableSubTypes = computed(() => {
  if (!selectedTypeId.value) return [];
  const foundType = typeStore.activityTypes.find(t => t.id === selectedTypeId.value);
  return foundType?.sub_types || [];
});
watch(selectedTypeId, () => { selectedSubTypeId.value = null; });
onMounted(() => typeStore.fetchActivityTypes());

function onSave() {
  emit('save', { typeId: selectedTypeId.value, subTypeId: selectedSubTypeId.value });
}
</script>
<template>
  <div>
    <label for="default-type" class="block text-sm font-medium text-gray-700">Default Activity Type</label>
    <select v-model="selectedTypeId" id="default-type"
      class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
      <option :value="null">None</option>
      <option v-for="t in typeStore.activityTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
    </select>
  </div>
  <div>
    <label for="default-sub-type" class="block text-sm font-medium text-gray-700">Default Sub-Type</label>
    <select v-model="selectedSubTypeId" id="default-sub-type"
      :disabled="!selectedTypeId || availableSubTypes.length === 0"
      class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
      <option :value="null">None</option>
      <option v-for="st in availableSubTypes" :key="st.id" :value="st.id">{{ st.name }}</option>
    </select>
  </div>
  <div class="flex justify-end space-x-3 pt-4">
    <button @click="$emit('cancel')"
      class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
      Cancel
    </button>
    <button @click="onSave"
      class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
      Save Settings
    </button>
  </div>
</template>
