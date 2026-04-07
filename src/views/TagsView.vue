<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue';
import { useTagsStore, type TagSearchResult } from '@/stores/tags';
import { Trash2, Plus, Search, Loader2, X } from 'lucide-vue-next';

const tagsStore = useTagsStore();

// --- Create Category ---
const newCategoryName = ref('');

// --- Create Tag (with Category Combobox) ---
const newTagName = ref('');
const createTagDropdownRef = ref<HTMLElement | null>(null);
const categoryQuery = ref('');
const isCategoryDropdownOpen = ref(false);
const isCategorySearching = ref(false);
const categorySearchResults = ref<TagSearchResult[]>([]);
const selectedCategoryId = ref<number | null>(null);

let categorySearchTimeout: ReturnType<typeof setTimeout> | null = null;

onMounted(() => {
  tagsStore.fetchAll();
  document.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});

const uncategorizedTags = computed(() => {
  return tagsStore.tags.filter((t) => t.category_id === null);
});

// --- Combobox Handlers ---
const displayCategoryList = computed(() => {
  if (!categoryQuery.value.trim()) {
    return tagsStore.categories.map(c => ({ id: c.id, phrase: c.name }));
  }
  return categorySearchResults.value;
});

function handleCategorySearchInput() {
  selectedCategoryId.value = null;
  isCategoryDropdownOpen.value = true;

  if (categorySearchTimeout) clearTimeout(categorySearchTimeout);

  const q = categoryQuery.value.trim();
  if (!q) {
    categorySearchResults.value = [];
    isCategorySearching.value = false;
    return;
  }

  isCategorySearching.value = true;
  categorySearchTimeout = setTimeout(async () => {
    categorySearchResults.value = await tagsStore.searchCategories(q);
    isCategorySearching.value = false;
  }, 300);
}

function selectCategoryOption(item: { id: number; phrase: string }) {
  selectedCategoryId.value = item.id;
  categoryQuery.value = item.phrase;
  isCategoryDropdownOpen.value = false;
}

function handleClickOutside(event: MouseEvent) {
  if (createTagDropdownRef.value && !createTagDropdownRef.value.contains(event.target as Node)) {
    isCategoryDropdownOpen.value = false;
  }
}

// --- Action Handlers ---
const handleCreateCategory = async () => {
  if (!newCategoryName.value.trim()) return;
  const success = await tagsStore.createCategory(newCategoryName.value);
  if (success) newCategoryName.value = '';
};

const handleCreateTag = async () => {
  if (!newTagName.value.trim()) return;
  const success = await tagsStore.createTag(newTagName.value, selectedCategoryId.value);
  if (success) {
    newTagName.value = '';
    selectedCategoryId.value = null;
    categoryQuery.value = '';
  }
};

const handleDeleteCategory = async (id: number) => {
  if (!confirm('Delete this category? Associated tags will become uncategorized unless you cascade delete.')) return;
  const cascade = confirm('Do you also want to delete all tags inside this category?');
  await tagsStore.deleteCategory(id, cascade);
};

const handleDeleteTag = async (id: number) => {
  if (!confirm('Delete this tag globally?')) return;
  await tagsStore.deleteTag(id);
};
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 bg-verve-medium min-h-[calc(100vh-64px)]">
    <div class="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 class="text-3xl font-bold text-verve-brown">Tag Management</h1>
        <p class="mt-2 text-verve-brown/60">Organize your activity categorization with global tags.</p>
      </div>

      <div v-if="tagsStore.isLoading" class="text-center py-12 text-verve-brown/60 animate-pulse">
        Loading tags & categories...
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <!-- Forms Column -->
        <div class="space-y-6">
          <!-- Create Category -->
          <div class="bg-white p-5 rounded-xl shadow-sm border border-verve-medium/30">
            <h3 class="font-bold text-verve-brown mb-3">Add Category</h3>
            <div class="flex gap-2">
              <input v-model="newCategoryName" type="text" placeholder="e.g., Weather"
                class="grow border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark bg-white" />
              <button @click="handleCreateCategory"
                class="px-4 py-2 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 border border-verve-dark/5">
                <Plus class="size-4" />
              </button>
            </div>
          </div>

          <!-- Create Tag (with Combobox) -->
          <div class="bg-white p-5 rounded-xl shadow-sm border border-verve-medium/30 overflow-visible">
            <h3 class="font-bold text-verve-brown mb-3">Add Tag</h3>
            <div class="space-y-3">
              <input v-model="newTagName" type="text" placeholder="e.g., Sunny"
                class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark bg-white" />

              <!-- Category Search Combobox -->
              <div class="relative" ref="createTagDropdownRef">
                <div class="relative">
                  <Search
                    class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-verve-brown/40 pointer-events-none" />
                  <input v-model="categoryQuery" @focus="isCategoryDropdownOpen = true"
                    @input="handleCategorySearchInput" type="text" placeholder="Search category (optional)..."
                    class="w-full text-sm border-verve-medium rounded-xl py-2 pl-9 pr-3 text-verve-brown focus:ring-verve-dark bg-white" />
                  <Loader2 v-if="isCategorySearching"
                    class="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-verve-orange" />
                </div>
                <transition enter-active-class="transition ease-out duration-100"
                  enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition ease-in duration-75" leave-from-class="opacity-100 translate-y-0"
                  leave-to-class="opacity-0 translate-y-1">
                  <div v-if="isCategoryDropdownOpen"
                    class="absolute z-50 w-full mt-1 bg-white border border-verve-medium/30 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    <div v-if="displayCategoryList.length === 0 && !isCategorySearching"
                      class="p-3 text-xs text-verve-brown/50 text-center italic">
                      No matching categories found.
                    </div>
                    <ul v-else class="py-1">
                      <li v-for="item in displayCategoryList" :key="item.id" @click="selectCategoryOption(item)"
                        class="px-3 py-2 text-sm text-verve-brown hover:bg-verve-light cursor-pointer transition-colors">
                        {{ item.phrase }}
                      </li>
                    </ul>
                  </div>
                </transition>
              </div>

              <button @click="handleCreateTag"
                class="w-full py-2 bg-verve-brown text-white font-bold rounded-xl shadow-sm hover:bg-verve-dark transition-colors">
                Create Tag
              </button>
            </div>
          </div>
        </div>

        <!-- Lists Column -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Categories -->
          <div v-for="cat in tagsStore.categories" :key="cat.id"
            class="bg-white p-5 rounded-xl shadow-sm border border-verve-medium/30">
            <div class="flex justify-between items-center mb-4 border-b border-verve-medium/20 pb-2">
              <h3 class="text-lg font-bold text-verve-brown">{{ cat.name }}</h3>
              <button @click="handleDeleteCategory(cat.id)"
                class="text-verve-brown/30 hover:text-red-500 transition-colors" title="Delete Category">
                <Trash2 class="size-4" />
              </button>
            </div>

            <div class="flex flex-wrap gap-2">
              <div v-for="tag in tagsStore.tags.filter(t => t.category_id === cat.id)" :key="tag.id"
                class="flex items-center gap-1.5 bg-verve-light/50 px-3 py-1.5 rounded-lg border border-verve-medium/30 transition-all hover:bg-verve-light">
                <span class="text-sm text-verve-brown font-medium">{{ tag.name }}</span>
                <button @click="handleDeleteTag(tag.id)"
                  class="text-verve-brown/40 hover:text-red-500 transition-colors ml-1" title="Delete Tag">
                  <X class="size-3.5" />
                </button>
              </div>
              <p v-if="tagsStore.tags.filter(t => t.category_id === cat.id).length === 0"
                class="text-xs text-verve-brown/50 italic">
                No tags in this category.
              </p>
            </div>
          </div>

          <!-- Uncategorized Tags -->
          <div class="bg-white p-5 rounded-xl shadow-sm border border-verve-medium/30 border-dashed">
            <h3
              class="text-sm font-bold text-verve-brown/60 uppercase tracking-wider mb-4 border-b border-verve-medium/20 pb-2">
              Uncategorized Tags
            </h3>

            <div class="flex flex-wrap gap-2">
              <div v-for="tag in uncategorizedTags" :key="tag.id"
                class="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 transition-all hover:bg-gray-100">
                <span class="text-sm text-gray-600 font-medium">{{ tag.name }}</span>
                <button @click="handleDeleteTag(tag.id)" class="text-gray-400 hover:text-red-500 transition-colors ml-1"
                  title="Delete Tag">
                  <X class="size-3.5" />
                </button>
              </div>
              <p v-if="uncategorizedTags.length === 0" class="text-xs text-verve-brown/50 italic">
                None.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>
