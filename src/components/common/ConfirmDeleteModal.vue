<script setup lang="ts">
import { watch, onUnmounted } from 'vue';

const props = defineProps<{
  isOpen: boolean;
  title: string;
  message: string;
  isDeleting: boolean;
}>();

const emit = defineEmits(['close', 'confirm']);

watch(() => props.isOpen, (val) => {
  document.body.style.overflow = val ? 'hidden' : '';
});

// Cleanup in case the component is destroyed while the modal is open
onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>

<template>
  <Transition enter-active-class="transition ease-out duration-200" enter-from-class="opacity-0"
    enter-to-class="opacity-100" leave-active-class="transition ease-in duration-150" leave-from-class="opacity-100"
    leave-to-class="opacity-0">
    <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" role="dialog"
      aria-modal="true">

      <!-- Backdrop -->
      <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" @click="$emit('close')"></div>

      <!-- Modal Panel -->
      <div
        class="relative transform overflow-hidden rounded-xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-gray-100">
        <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
          <div class="sm:flex sm:items-start">

            <!-- Warning Icon -->
            <div
              class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
              <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
                aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>

            <!-- Content -->
            <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <h3 class="text-lg font-semibold leading-6 text-gray-900">{{ title }}</h3>
              <div class="mt-2">
                <p class="text-sm text-gray-500">{{ message }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
          <button type="button" @click="$emit('confirm')" :disabled="isDeleting"
            class="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <span v-if="isDeleting" class="flex items-center">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none"
                viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Deleting...
            </span>
            <span v-else>Delete</span>
          </button>
          <button type="button" @click="$emit('close')" :disabled="isDeleting"
            class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto disabled:opacity-50 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
