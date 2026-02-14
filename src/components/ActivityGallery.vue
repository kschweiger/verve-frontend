<script setup lang="ts">
import { ref } from 'vue';
import { useActivityStore, type ActivityImage } from '@/stores/activity';
import { Trash2, Plus } from 'lucide-vue-next';

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
  <div class="bg-white p-6 rounded-xl shadow-sm border border-verve-medium/30">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-xl font-bold text-verve-brown">Photos</h3>
      <div class="flex items-center space-x-3">
        <span v-if="isUploading" class="text-xs text-verve-brown/60 animate-pulse font-medium">
          Uploading...
        </span>

        <button @click="triggerUpload" :disabled="isUploading"
          class="px-4 py-2 bg-verve-neon text-verve-brown text-sm font-bold rounded-xl shadow-sm hover:brightness-105 disabled:opacity-50 transition-all flex items-center border border-verve-dark/5">
          <Plus class="size-4 mr-2" />
          Add Photo
        </button>
      </div>
      <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileChange" />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full size-8 border-b-2 border-verve-brown"></div>
    </div>

    <!-- Gallery Grid -->
    <div v-else-if="images && images.length > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div v-for="img in images" :key="img.id"
        class="relative aspect-square group bg-verve-light/20 rounded-xl overflow-hidden border border-verve-medium/20 cursor-pointer shadow-sm hover:shadow-md transition-all"
        @click="selectedImage = img">
        <!-- Thumbnail Styling -->
        <img :src="img.url" alt="Activity photo" loading="lazy"
          class="absolute inset-0 transition-transform duration-500 group-hover:scale-105 object-cover size-full" />
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12 bg-verve-light/20 rounded-xl border border-dashed border-verve-medium/40">
      <p class="text-verve-brown/50 text-sm">No photos added yet.</p>
    </div>

    <!-- Lightbox Modal -->
    <div v-if="selectedImage" class="fixed inset-0 z-[999] flex items-center justify-center bg-black/95 p-4"
      @click="selectedImage = null">
      <img :src="selectedImage.url"
        class="max-h-[80vh] max-w-[95vw] h-auto w-auto object-contain rounded-lg shadow-2xl border-4 border-verve-orange bg-black"
        @click.stop />

      <button @click.stop="handleDelete(selectedImage.id)"
        class="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center px-6 py-3 bg-red-600/90 hover:bg-red-600 text-white font-medium rounded-full shadow-xl backdrop-blur-md transition-all hover:scale-105">
        <Trash2 class="size-4 mr-2" />
        Delete Photo
      </button>
    </div>
  </div>
</template>
