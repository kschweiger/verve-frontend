<script setup lang="ts">
import { onUnmounted, watch } from 'vue';
import type { SupportedTrackExtension } from '@/services/api';
import { trackExtensionLabels } from '@/utils/trackExtensions';
import { Trash2 } from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
  extensions: SupportedTrackExtension[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'remove', extension: SupportedTrackExtension): void;
}>();

watch(
  () => props.isOpen,
  (isOpen) => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }
);

onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>

<template>
  <Transition
    enter-active-class="transition ease-out duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition ease-in duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="track-extension-data-title"
    >
      <div
        class="fixed inset-0 bg-verve-brown/30 backdrop-blur-sm transition-opacity"
        @click="emit('close')"
      ></div>

      <div
        class="relative w-full max-w-lg overflow-hidden rounded-xl border border-verve-medium/30 bg-white text-left shadow-2xl"
      >
        <div class="p-6">
          <h2 id="track-extension-data-title" class="text-xl font-bold text-verve-brown">Sensor data</h2>
          <p class="mt-2 text-sm leading-relaxed text-verve-brown/70">
            Remove a sensor stream if its readings are unreliable. This permanently removes the selected data from this activity.
          </p>

          <ul class="mt-5 space-y-3">
            <li
              v-for="extension in extensions"
              :key="extension"
              class="flex items-center justify-between gap-4 rounded-xl border border-verve-medium/30 bg-verve-light/20 p-4"
            >
              <span class="font-semibold text-verve-brown">{{ trackExtensionLabels[extension] }}</span>
              <button
                type="button"
                class="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                :aria-label="`Remove ${trackExtensionLabels[extension]} data`"
                @click="emit('remove', extension)"
              >
                <Trash2 class="size-4" />
                Remove
              </button>
            </li>
          </ul>
        </div>

        <div class="border-t border-verve-medium/20 bg-verve-light/10 px-6 py-3">
          <button
            type="button"
            class="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-verve-brown ring-1 ring-inset ring-verve-medium/50 transition-colors hover:bg-verve-light/50"
            @click="emit('close')"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
