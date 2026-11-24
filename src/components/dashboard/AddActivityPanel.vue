<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Plus, X } from '@lucide/vue';
import UploadActivityWidget from '@/components/widgets/UploadActivityWidget.vue';

const isOpen = ref(false);
const { t } = useI18n();
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-xl bg-verve-neon px-4 py-2 text-sm font-bold text-verve-brown shadow-sm border border-verve-dark/5 hover:brightness-105 transition"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      @click="isOpen = true"
    >
      <Plus class="size-4" aria-hidden="true" />
      <span>{{ t('dashboard.add.action') }}</span>
    </button>

    <div
      v-if="isOpen"
      class="fixed inset-0 z-[100] bg-verve-brown/20 backdrop-blur-sm"
      @click.self="isOpen = false"
    >
      <aside
        class="absolute right-0 top-0 h-dvh w-full max-w-xl bg-white shadow-xl border-l border-verve-medium/30 p-5 sm:p-6 overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        :aria-label="t('dashboard.add.title')"
      >
        <div class="flex items-center justify-between mb-5 shrink-0">
          <div>
            <h2 class="text-xl font-bold text-verve-brown">{{ t('dashboard.add.title') }}</h2>
            <p class="text-sm text-verve-brown/60">{{ t('dashboard.add.instructions') }}</p>
          </div>
          <button
            type="button"
            class="size-9 inline-flex items-center justify-center rounded-lg text-verve-brown/60 hover:text-verve-brown hover:bg-verve-light transition"
            :aria-label="t('dashboard.add.close')"
            @click="isOpen = false"
          >
            <X class="size-5" aria-hidden="true" />
          </button>
        </div>

        <div class="grow min-h-0 overflow-y-auto">
          <UploadActivityWidget embedded />
        </div>
      </aside>
    </div>
  </div>
</template>
