<!-- src/views/TagsView.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useTagsStore } from '@/stores/tags';
import { Trash2, Plus } from 'lucide-vue-next';

const tagsStore = useTagsStore();

const newCategoryName = ref('');
const newTagName = ref('');
const newTagCategoryId = ref<number | null>(null);

onMounted(() => {
  tagsStore.fetchAll();
});

const handleCreateCategory = async () => {
  if (!newCategoryName.value.trim()) return;
  const success = await tagsStore.createCategory(newCategoryName.value);
  if (success) newCategoryName.value = '';
};

const handleCreateTag = async () => {
  if (!newTagName.value.trim()) return;
  const success = await tagsStore.createTag(newTagName.value, newTagCategoryId.value);
  if (success) {
    newTagName.value = '';
    newTagCategoryId.value = null;
  }
};

const handleDeleteCategory = async (id: number) => {
  if (!confirm('Delete this category? Associated tags will become uncategorized unless you delete them too.')) return;
  const cascade = confirm('Do you also want to delete all tags inside this category?');
  await tagsStore.deleteCategory(id, cascade);
};

const handleDeleteTag = async (id: number) => {
  if (!confirm('Delete this tag globally?')) return;
  await tagsStore.deleteTag(id);
};

const uncategorizedTags = computed(() => {
  return tagsStore.tags.filter(t => t.category_id === null);
});
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8 bg-verve-medium min-h-[calc(100vh-64px)]">
    <div class="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 class="text-3xl font-bold text-verve-brown">Tag Management</h1>
        <p class="mt-2 text-verve-brown/60">Organize your activity categorization with global tags.</p>
      </div>

      <div v-if="tagsStore.isLoading" class="text-center py-12 text-verve-brown/60">
        Loading...
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

          <!-- Create Tag -->
          <div class="bg-white p-5 rounded-xl shadow-sm border border-verve-medium/30">
            <h3 class="font-bold text-verve-brown mb-3">Add Tag</h3>
            <div class="space-y-3">
              <input v-model="newTagName" type="text" placeholder="e.g., Sunny"
                class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark bg-white" />
              <select v-model="newTagCategoryId"
                class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark bg-white">
                <option :value="null">No Category</option>
                <option v-for="cat in tagsStore.categories" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
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
                class="text-verve-brown/30 hover:text-red-500 transition-colors">
                <Trash2 class="size-4" />
              </button>
            </div>
            <div class="flex flex-wrap gap-2">
              <div v-for="tag in tagsStore.tags.filter(t => t.category_id === cat.id)" :key="tag.id"
                class="flex items-center gap-2 bg-verve-light px-3 py-1.5 rounded-lg border border-verve-medium/40 text-sm text-verve-brown font-medium">
                {{ tag.name }}
                <button @click="handleDeleteTag(tag.id)"
                  class="text-verve-brown/40 hover:text-red-500 transition-colors">
                  <Trash2 class="size-3" />
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
                class="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 font-medium">
                {{ tag.name }}
                <button @click="handleDeleteTag(tag.id)" class="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 class="size-3" />
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
