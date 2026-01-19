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
  <div class="space-y-4 pt-2">
    <!-- Default Type -->
    <div>
      <label for="default-type" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Default Activity
        Type</label>
      <select v-model="selectedTypeId" id="default-type"
        class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white">
        <option :value="null">None</option>
        <option v-for="t in typeStore.activityTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>
    </div>

    <!-- Default Sub-Type -->
    <div>
      <label for="default-sub-type" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Default
        Sub-Type</label>
      <select v-model="selectedSubTypeId" id="default-sub-type"
        :disabled="!selectedTypeId || availableSubTypes.length === 0"
        class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white disabled:bg-gray-50 disabled:text-gray-400">
        <option :value="null">None</option>
        <option v-for="st in availableSubTypes" :key="st.id" :value="st.id">{{ st.name }}</option>
      </select>
    </div>

    <!-- Actions -->
    <div class="flex justify-end space-x-3 pt-4 border-t border-verve-medium/30">
      <button @click="$emit('cancel')"
        class="px-5 py-2.5 border border-verve-medium/50 rounded-xl text-verve-brown font-semibold hover:bg-verve-light transition-colors">
        Cancel
      </button>
      <button @click="onSave"
        class="px-6 py-2.5 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 border border-verve-dark/5 transition-all">
        Save Settings
      </button>
    </div>
  </div>
</template>
