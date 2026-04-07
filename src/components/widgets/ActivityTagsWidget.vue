<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useTagsStore, type ActivityTagPublic } from '@/stores/tags';
import { Plus, X, Tag } from 'lucide-vue-next';

const props = defineProps<{
  activityId: string;
  currentTags?: ActivityTagPublic[]; // Expected to be provided by Activity object
}>();

const emit = defineEmits<{
  (e: 'updated'): void; // Emit to trigger parent refetch if needed
}>();

const tagsStore = useTagsStore();
const showAddMode = ref(false);
const isAdding = ref(false);
const selectedTagId = ref<number | null>(null);

onMounted(() => {
  tagsStore.fetchAll();
});

const unassignedTags = computed(() => {
  const currentIds = new Set((props.currentTags || []).map(t => t.id));
  return tagsStore.tags.filter(t => !currentIds.has(t.id));
});

const handleAdd = async () => {
  if (!selectedTagId.value) return;
  isAdding.value = true;
  const success = await tagsStore.addTagToActivity(props.activityId, selectedTagId.value);
  if (success) {
    showAddMode.value = false;
    selectedTagId.value = null;
    emit('updated');
  } else {
    alert('Failed to add tag');
  }
  isAdding.value = false;
};

const handleRemove = async (tagId: number) => {
  const success = await tagsStore.removeTagFromActivity(props.activityId, tagId);
  if (success) emit('updated');
};
</script>

<template>
  <div class="bg-white p-6 rounded-xl shadow-sm border border-verve-medium/30">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-bold text-verve-brown">Tags</h3>
      <button @click="showAddMode = !showAddMode"
        class="p-2 bg-verve-light hover:bg-verve-medium text-verve-brown rounded-lg transition-colors">
        <component :is="showAddMode ? X : Plus" class="size-4" />
      </button>
    </div>

    <!-- Add Form -->
    <div v-if="showAddMode" class="mb-4 p-3 bg-verve-light/20 rounded-xl border border-verve-medium/20">
      <div class="flex gap-2">
        <select v-model="selectedTagId"
          class="grow text-sm border-verve-medium rounded-xl py-2 px-3 text-verve-brown focus:ring-verve-dark bg-white">
          <option :value="null">Select a tag...</option>
          <option v-for="tag in unassignedTags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
        </select>
        <button @click="handleAdd" :disabled="!selectedTagId || isAdding"
          class="px-4 py-2 bg-verve-neon text-verve-brown text-sm font-bold rounded-xl shadow-sm hover:brightness-105 disabled:opacity-50">
          {{ isAdding ? '...' : 'Add' }}
        </button>
      </div>
    </div>

    <!-- Tag List -->
    <div class="flex flex-wrap gap-2">
      <div v-for="tag in currentTags" :key="tag.id"
        class="group flex items-center gap-2 bg-verve-light/50 px-3 py-1.5 rounded-lg border border-verve-medium/40 text-sm text-verve-brown font-medium">
        <Tag class="size-3 text-verve-brown/50" />
        {{ tag.name }}
        <button @click="handleRemove(tag.id)"
          class="text-verve-brown/30 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
          <X class="size-3" />
        </button>
      </div>
      <p v-if="!currentTags || currentTags.length === 0" class="text-sm text-verve-brown/40 italic">
        No tags assigned.
      </p>
    </div>
  </div>
</template>
