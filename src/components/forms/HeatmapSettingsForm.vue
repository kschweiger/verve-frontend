<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useTypeStore } from '@/stores/types';
import type { HeatmapSettings } from '@/stores/settings';

const props = defineProps<{
  initialSettings: HeatmapSettings;
}>();

const emit = defineEmits<{
  (e: 'save', excludedTypes: Array<[number, number | null]>): void;
  (e: 'cancel'): void;
}>();

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

function toggleMainType(typeId: number, isChecked: boolean) {
  const type = typeStore.activityTypes.find((t) => t.id === typeId);
  if (!type) return;

  const mainKey = `${typeId}:null`;

  if (!isChecked) {
    excludedSet.value.add(mainKey);
    type.sub_types.forEach((sub) => {
      excludedSet.value.add(`${typeId}:${sub.id}`);
    });
  } else {
    excludedSet.value.delete(mainKey);
    type.sub_types.forEach((sub) => {
      excludedSet.value.delete(`${typeId}:${sub.id}`);
    });
  }
}

function toggleSubType(typeId: number, subTypeId: number, isChecked: boolean) {
  const key = `${typeId}:${subTypeId}`;
  if (!isChecked) {
    excludedSet.value.add(key);
  } else {
    excludedSet.value.delete(key);
  }
}

function isMainIncluded(typeId: number): boolean {
  return !excludedSet.value.has(`${typeId}:null`);
}

function isSubIncluded(typeId: number, subTypeId: number): boolean {
  return !excludedSet.value.has(`${typeId}:${subTypeId}`);
}

function onSave() {
  const result: Array<[number, number | null]> = [];

  excludedSet.value.forEach((key) => {
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
    <p class="text-sm text-verve-brown/60">
      Uncheck activities to hide them from your global heatmap.
    </p>

    <div v-if="typeStore.activityTypes.length === 0" class="text-verve-brown/40 text-sm">
      Loading types...
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1">
      <div v-for="type in typeStore.activityTypes" :key="type.id"
        class="border border-verve-medium/30 rounded-xl p-3 bg-verve-light/20">
        <!-- Main Type Checkbox (Acts as Bulk Toggle) -->
        <div class="flex items-center mb-2">
          <input type="checkbox" :id="`type-${type.id}`" :checked="isMainIncluded(type.id)"
            @change="(e) => toggleMainType(type.id, (e.target as HTMLInputElement).checked)"
            class="size-4 text-verve-dark focus:ring-verve-dark border-verve-medium rounded" />
          <label :for="`type-${type.id}`" class="ml-2 block text-sm font-bold text-verve-brown cursor-pointer">
            {{ type.name }}
          </label>
        </div>

        <!-- Sub Types List -->
        <div v-if="isMainIncluded(type.id) && type.sub_types.length > 0" class="ml-6 space-y-1">
          <div v-for="sub in type.sub_types" :key="sub.id" class="flex items-center">
            <input type="checkbox" :id="`subtype-${type.id}-${sub.id}`" :checked="isSubIncluded(type.id, sub.id)"
              @change="(e) => toggleSubType(type.id, sub.id, (e.target as HTMLInputElement).checked)"
              class="size-3 text-verve-dark focus:ring-verve-dark border-verve-medium rounded" />
            <label :for="`subtype-${type.id}-${sub.id}`" class="ml-2 block text-xs text-verve-brown/80 cursor-pointer">
              {{ sub.name }}
            </label>
          </div>
        </div>
        <div v-else-if="!isMainIncluded(type.id)" class="ml-6 text-xs text-verve-brown/40 italic">
          Entire category hidden
        </div>
      </div>
    </div>

    <div class="flex justify-end gap-3 pt-4 border-t border-verve-medium/30">
      <button @click="$emit('cancel')"
        class="px-5 py-2.5 border border-verve-medium/50 rounded-xl text-verve-brown font-semibold hover:bg-verve-light transition-colors">
        Cancel
      </button>
      <button @click="onSave"
        class="px-6 py-2.5 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 border border-verve-dark/5 transition-all">
        Save Changes
      </button>
    </div>
  </div>
</template>
