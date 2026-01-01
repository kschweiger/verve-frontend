<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useTypeStore } from '@/stores/types';
import type { HeatmapSettings } from '@/stores/settings';

const props = defineProps<{
  initialSettings: HeatmapSettings;
}>();

const emit = defineEmits(['save', 'cancel']);
const typeStore = useTypeStore();

// "typeId:subTypeId" or "typeId:null"
const excludedSet = ref<Set<string>>(new Set());

onMounted(async () => {
  await typeStore.fetchActivityTypes();

  props.initialSettings.excluded_activity_types.forEach(([tId, stId]) => {
    const key = `${tId}:${stId === null ? 'null' : stId}`;
    excludedSet.value.add(key);
  });
});

// Helper to toggle main type AND all its sub-types
function toggleMainType(typeId: number, isChecked: boolean) {
  const type = typeStore.activityTypes.find(t => t.id === typeId);
  if (!type) return;

  // 1. Handle the Generic bucket (typeId, null)
  const mainKey = `${typeId}:null`;

  if (!isChecked) {
    // User unchecked the category header -> Hide EVERYTHING in this category
    excludedSet.value.add(mainKey); // Hide generic

    // Hide all sub-types
    type.sub_types.forEach(sub => {
      excludedSet.value.add(`${typeId}:${sub.id}`);
    });
  } else {
    // User checked the category header -> Show EVERYTHING in this category
    excludedSet.value.delete(mainKey); // Show generic

    // Show all sub-types
    type.sub_types.forEach(sub => {
      excludedSet.value.delete(`${typeId}:${sub.id}`);
    });
  }
}

// Helper to toggle sub type
function toggleSubType(typeId: number, subTypeId: number, isChecked: boolean) {
  const key = `${typeId}:${subTypeId}`;
  if (!isChecked) {
    excludedSet.value.add(key);
  } else {
    excludedSet.value.delete(key);
  }
}

// Check status helpers
function isMainIncluded(typeId: number): boolean {
  // We use the "Generic" bucket state to represent the header checkbox state
  // If the generic bucket is hidden, we treat the whole header as unchecked/hidden
  return !excludedSet.value.has(`${typeId}:null`);
}

function isSubIncluded(typeId: number, subTypeId: number): boolean {
  return !excludedSet.value.has(`${typeId}:${subTypeId}`);
}

function onSave() {
  const result: Array<[number, number | null]> = [];

  excludedSet.value.forEach(key => {
    const parts = key.split(':');
    if (parts.length < 2) return;

    const tIdStr = parts[0];
    const stIdStr = parts[1];

    if (tIdStr === undefined || stIdStr === undefined) return;

    const tId = parseInt(tIdStr);
    const stId = stIdStr === 'null' ? null : parseInt(stIdStr);
    result.push([tId, stId]);
  });

  emit('save', result);
}
</script>

<template>
  <div class="space-y-4 pt-2">
    <p class="text-sm text-gray-500">
      Uncheck activities to hide them from your global heatmap.
    </p>

    <div v-if="typeStore.activityTypes.length === 0" class="text-gray-400 text-sm">
      Loading types...
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1">
      <div v-for="type in typeStore.activityTypes" :key="type.id" class="border rounded-md p-3 bg-gray-50">

        <!-- Main Type Checkbox (Acts as Bulk Toggle) -->
        <div class="flex items-center mb-2">
          <input type="checkbox" :id="`type-${type.id}`" :checked="isMainIncluded(type.id)"
            @change="(e) => toggleMainType(type.id, (e.target as HTMLInputElement).checked)"
            class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
          <label :for="`type-${type.id}`" class="ml-2 block text-sm font-bold text-gray-800">
            {{ type.name }}
          </label>
        </div>

        <!-- Sub Types List -->
        <div v-if="isMainIncluded(type.id) && type.sub_types.length > 0" class="ml-6 space-y-1">
          <div v-for="sub in type.sub_types" :key="sub.id" class="flex items-center">
            <input type="checkbox" :id="`subtype-${type.id}-${sub.id}`" :checked="isSubIncluded(type.id, sub.id)"
              @change="(e) => toggleSubType(type.id, sub.id, (e.target as HTMLInputElement).checked)"
              class="h-3 w-3 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
            <label :for="`subtype-${type.id}-${sub.id}`" class="ml-2 block text-xs text-gray-600">
              {{ sub.name }}
            </label>
          </div>
        </div>
        <div v-else-if="!isMainIncluded(type.id)" class="ml-6 text-xs text-gray-400 italic">
          Entire category hidden
        </div>

      </div>
    </div>

    <div class="flex justify-end space-x-3 pt-4 border-t border-gray-100">
      <button @click="$emit('cancel')"
        class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
        Cancel
      </button>
      <button @click="onSave"
        class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
        Save Changes
      </button>
    </div>
  </div>
</template>
