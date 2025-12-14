<script setup lang="ts">
import { ref } from 'vue';
import { useActivityStore, type ActivityImage } from '@/stores/activity';
import IconTrash from '@/components/icons/IconTrash.vue';
import IconPlus from '@/components/icons/IconPlus.vue';

const props = defineProps<{
  activityId: string;
  images: ActivityImage[];
  isLoading?: boolean;
}>();

const activityStore = useActivityStore();
const isUploading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const selectedImage = ref<ActivityImage | null>(null);

const triggerUpload = () => {
  fileInput.value?.click();
};

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    isUploading.value = true;
    const success = await activityStore.uploadActivityImage(props.activityId, file);
    isUploading.value = false;
    if (!success) alert('Failed to upload image.');
    target.value = '';
  }
};

const handleDelete = async (imageId: string) => {
  if (!confirm('Delete this photo?')) return;
  if (selectedImage.value?.id === imageId) selectedImage.value = null;
  const success = await activityStore.deleteActivityImage(imageId, props.activityId);
  if (!success) alert('Failed to delete image.');
};
</script>

<template>
  <div class="bg-white p-6 rounded-lg shadow-md">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-bold text-gray-800">Photos</h3>
      <div class="flex items-center space-x-2">
        <span v-if="isUploading" class="text-xs text-gray-500 animate-pulse">Uploading...</span>

        <button @click="triggerUpload" :disabled="isUploading"
          class="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center">
          <IconPlus class="h-4 w-4 mr-1" />
          Add Photo
        </button>
      </div>
      <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileChange" />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>

    <!-- Gallery Grid -->
    <div v-else-if="images && images.length > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div v-for="img in images" :key="img.id"
        class="relative aspect-square group bg-gray-100 rounded-lg overflow-hidden border border-gray-200 cursor-pointer shadow-sm hover:shadow-md"
        @click="selectedImage = img">
        <img :src="img.url" alt="Activity photo" loading="lazy"
          class="absolute inset-0 transition-transform duration-300 group-hover:scale-105"
          style="width: 100%; height: 100%; object-fit: scale-down; max-width: none;" />
      </div>
    </div>

    <div v-else class="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300">
      <p>No photos yet.</p>
    </div>

    <!-- Lightbox Modal -->
    <div v-if="selectedImage" class="fixed inset-0 z-[999] flex justify-center bg-black/95 p-4"
      @click="selectedImage = null">
      <img :src="selectedImage.url"
        class="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl border-4 border-indigo-600 bg-black"
        @click.stop />

      <button @click.stop="handleDelete(selectedImage.id)"
        class="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center px-6 py-3 bg-red-600/90 hover:bg-red-600 text-white font-medium rounded-full shadow-xl backdrop-blur-md transition-all hover:scale-105">
        <IconTrash class="h-5 w-5" />
        Delete Photo
      </button>
    </div>
  </div>
</template>
