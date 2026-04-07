<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useTagsStore, type ActivityTagPublic, type TagSearchResult } from '@/stores/tags';
import { Plus, X, Tag, Search, Loader2 } from 'lucide-vue-next';

const props = defineProps<{
  activityId: string;
  currentTags?: ActivityTagPublic[];
}>();

const emit = defineEmits<{
  (e: 'updated'): void;
}>();

const tagsStore = useTagsStore();
const showAddMode = ref(false);
const isAdding = ref(false);

// Custom Combobox State
const dropdownRef = ref<HTMLElement | null>(null);
const searchQuery = ref('');
const isDropdownOpen = ref(false);
const isSearching = ref(false);
const searchResults = ref<TagSearchResult[]>([]);
const selectedTagId = ref<number | null>(null);

onMounted(() => {
  tagsStore.fetchAll();
  document.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});

const displayList = computed(() => {
  const currentIds = new Set((props.currentTags || []).map(t => t.id));

  if (!searchQuery.value.trim()) {
    // Show all available tags from standard fetch if input is empty
    return tagsStore.tags
      .filter((t) => !currentIds.has(t.id))
      .map((t) => ({ id: t.id, phrase: t.name }));
  }

  // Show fuzzy search results
  return searchResults.value.filter((r) => !currentIds.has(r.id));
});

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

function handleSearchInput() {
  selectedTagId.value = null;
  isDropdownOpen.value = true;

  if (searchTimeout) clearTimeout(searchTimeout);

  const q = searchQuery.value.trim();
  if (!q) {
    searchResults.value = [];
    isSearching.value = false;
    return;
  }

  isSearching.value = true;
  searchTimeout = setTimeout(async () => {
    searchResults.value = await tagsStore.searchTags(q);
    isSearching.value = false;
  }, 300);
}

function selectOption(item: { id: number; phrase: string }) {
  selectedTagId.value = item.id;
  searchQuery.value = item.phrase;
  isDropdownOpen.value = false;
}

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isDropdownOpen.value = false;
  }
}

function toggleAddMode() {
  showAddMode.value = !showAddMode.value;
  selectedTagId.value = null;
  searchQuery.value = '';
  searchResults.value = [];
  isDropdownOpen.value = false;
}

const handleAdd = async () => {
  if (!selectedTagId.value) return;
  isAdding.value = true;
  const success = await tagsStore.addTagToActivity(props.activityId, selectedTagId.value);
  if (success) {
    showAddMode.value = false;
    selectedTagId.value = null;
    searchQuery.value = '';
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
  <div class="bg-white p-6 rounded-xl shadow-sm border border-verve-medium/30 overflow-visible">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-bold text-verve-brown">Tags</h3>
      <button @click="toggleAddMode"
        class="p-2 bg-verve-light hover:bg-verve-medium text-verve-brown rounded-lg transition-colors">
        <component :is="showAddMode ? X : Plus" class="size-4" />
      </button>
    </div>

    <!-- Hybrid Add Tag Form -->
    <div v-if="showAddMode" class="mb-4 p-3 bg-verve-light/20 rounded-xl border border-verve-medium/20">
      <div class="flex gap-2">

        <!-- Autocomplete Input -->
        <div class="relative grow" ref="dropdownRef">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-verve-brown/40 pointer-events-none" />
            <input v-model="searchQuery" @focus="isDropdownOpen = true" @input="handleSearchInput" type="text"
              placeholder="Find a tag..."
              class="w-full text-sm border-verve-medium rounded-xl py-2 pl-9 pr-3 text-verve-brown focus:ring-verve-dark bg-white" />
            <Loader2 v-if="isSearching"
              class="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-verve-orange" />
          </div>

          <!-- Dropdown List -->
          <transition enter-active-class="transition ease-out duration-100" enter-from-class="opacity-0 translate-y-1"
            enter-to-class="opacity-100 translate-y-0" leave-active-class="transition ease-in duration-75"
            leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 translate-y-1">
            <div v-if="isDropdownOpen"
              class="absolute z-50 w-full mt-1 bg-white border border-verve-medium/30 rounded-xl shadow-xl max-h-48 overflow-y-auto">
              <div v-if="displayList.length === 0 && !isSearching"
                class="p-3 text-xs text-verve-brown/50 text-center italic">
                No tags found.
              </div>
              <ul v-else class="py-1">
                <li v-for="item in displayList" :key="item.id" @click="selectOption(item)"
                  class="px-3 py-2 text-sm text-verve-brown hover:bg-verve-light cursor-pointer transition-colors">
                  {{ item.phrase }}
                </li>
              </ul>
            </div>
          </transition>
        </div>

        <button @click="handleAdd" :disabled="!selectedTagId || isAdding"
          class="px-4 py-2 bg-verve-neon text-verve-brown text-sm font-bold rounded-xl shadow-sm hover:brightness-105 disabled:opacity-50 transition-all">
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
