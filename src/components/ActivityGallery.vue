<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useAccountSession } from '@/composables/useAccountSession';
import { useActivityStore, type ActivityImage } from '@/stores/activity';
import { Trash2, Plus, X } from '@lucide/vue';

const props = defineProps<{
  activityId: string;
  images: ActivityImage[];
  isLoading?: boolean;
}>();

const activityStore = useActivityStore();
const isUploading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const selectedImage = ref<ActivityImage | null>(null);
const lightbox = ref<HTMLDialogElement | null>(null);
const addPhotoButton = ref<HTMLButtonElement | null>(null);
let opener: HTMLButtonElement | null = null;
let active = true;
const captureSession = useAccountSession(() => {
  isUploading.value = false;
  closeImage();
});

async function openImage(image: ActivityImage, event: MouseEvent) {
  opener = event.currentTarget as HTMLButtonElement;
  selectedImage.value = image;
  await nextTick();
  if (active && selectedImage.value?.id === image.id) lightbox.value?.showModal();
}
function closeImage() {
  lightbox.value?.close();
  selectedImage.value = null;
}
function restoreFocus() {
  selectedImage.value = null;
  if (!active) return;
  if (opener?.isConnected) opener.focus();
  else addPhotoButton.value?.focus();
  opener = null;
}
watch(() => props.activityId, closeImage);
watch(
  () => props.images,
  (images) => {
    if (selectedImage.value && !images.some((image) => image.id === selectedImage.value?.id))
      closeImage();
  }
);
onBeforeUnmount(() => {
  active = false;
  closeImage();
});

const triggerUpload = () => {
  fileInput.value?.click();
};

const handleFileChange = async (event: Event) => {
  if (isUploading.value) return;
  const isCurrentSession = captureSession();
  const activityId = props.activityId;
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    isUploading.value = true;
    const success = await activityStore.uploadActivityImage(activityId, file);
    if (!active || !isCurrentSession() || props.activityId !== activityId) return;
    isUploading.value = false;
    if (!success) alert('Failed to upload image.');
    target.value = '';
  }
};

const handleDelete = async (imageId: string) => {
  if (!confirm('Delete this photo?')) return;
  const isCurrentSession = captureSession();
  const activityId = props.activityId;
  if (selectedImage.value?.id === imageId) {
    opener = null;
    closeImage();
  }
  const success = await activityStore.deleteActivityImage(imageId);
  if (!active || !isCurrentSession() || props.activityId !== activityId) return;
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

        <button
          ref="addPhotoButton"
          type="button"
          @click="triggerUpload"
          :disabled="isUploading"
          class="px-4 py-2 bg-verve-neon text-verve-brown text-sm font-bold rounded-xl shadow-sm hover:brightness-105 disabled:opacity-50 transition-all flex items-center border border-verve-dark/5 focus-visible:outline-2 focus-visible:outline-verve-dark"
        >
          <Plus class="size-4 mr-2" />
          Add Photo
        </button>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handleFileChange"
      />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full size-8 border-b-2 border-verve-brown"></div>
    </div>

    <!-- Gallery Grid -->
    <div
      v-else-if="images && images.length > 0"
      class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
    >
      <button
        v-for="(img, index) in images"
        :key="img.id"
        type="button"
        :aria-label="`Open photo ${index + 1}`"
        class="relative aspect-square group bg-verve-light/20 rounded-xl overflow-hidden border border-verve-medium/20 cursor-pointer shadow-sm hover:shadow-md transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-verve-dark"
        @click="openImage(img, $event)"
      >
        <!-- Thumbnail Styling -->
        <img
          :src="img.url"
          alt=""
          loading="lazy"
          class="absolute inset-0 transition-transform duration-500 group-hover:scale-105 object-cover size-full"
        />
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="text-center py-12 bg-verve-light/20 rounded-xl border border-dashed border-verve-medium/40"
    >
      <p class="text-verve-brown/50 text-sm">No photos added yet.</p>
    </div>

    <dialog
      ref="lightbox"
      aria-label="Activity photo viewer"
      @close="restoreFocus"
      @click.self="closeImage"
      class="fixed inset-0 m-0 h-full w-full max-h-none max-w-none bg-black/95 p-4 text-white"
    >
      <div class="flex min-h-full items-center justify-center" @click.self="closeImage">
        <button
          type="button"
          autofocus
          aria-label="Close photo viewer"
          @click="closeImage"
          class="absolute top-4 right-4 rounded-full p-3 text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
        >
          <X class="size-6" aria-hidden="true" />
        </button>
        <img
          v-if="selectedImage"
          :src="selectedImage.url"
          alt="Expanded activity photo"
          class="max-h-[80vh] max-w-[95vw] h-auto w-auto object-contain rounded-lg shadow-2xl border-4 border-verve-orange bg-black"
        />
        <button
          v-if="selectedImage"
          type="button"
          @click="handleDelete(selectedImage.id)"
          class="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center px-6 py-3 bg-red-600/90 hover:bg-red-600 text-white font-medium rounded-full shadow-xl backdrop-blur-md transition-all focus-visible:outline-2 focus-visible:outline-white"
        >
          <Trash2 class="size-4 mr-2" aria-hidden="true" />Delete Photo
        </button>
      </div>
    </dialog>
  </div>
</template>
