<script setup lang="ts">
import { useId } from 'vue';
import { X } from '@lucide/vue';
import type { Goal } from '@/stores/goals';
import { useGoalEditor } from '@/composables/useGoalEditor';

const props = defineProps<{ goal: Goal }>();
const emit = defineEmits<{ close: []; saved: [] }>();
const id = useId();
const { form, isSaving, error, save } = useGoalEditor(() => props.goal);
async function handleSave() {
  if (await save()) emit('saved');
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-verve-brown/20 backdrop-blur-sm"
  >
    <form
      role="dialog"
      aria-modal="true"
      :aria-labelledby="`${id}-title`"
      @submit.prevent="handleSave"
      class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-verve-medium/30"
    >
      <div class="flex justify-between items-center mb-4 border-b border-verve-medium/30 pb-3">
        <h3 :id="`${id}-title`" class="text-xl font-bold text-verve-brown">Edit Goal</h3>
        <button
          type="button"
          aria-label="Close goal editor"
          @click="emit('close')"
          class="text-verve-brown/60 hover:text-verve-brown focus-visible:outline-2 focus-visible:outline-verve-dark"
        >
          <X class="size-6" aria-hidden="true" />
        </button>
      </div>
      <fieldset :disabled="isSaving" class="space-y-4 disabled:opacity-60">
        <div>
          <label
            :for="`${id}-name`"
            class="block text-xs font-bold text-verve-brown/60 uppercase mb-1"
            >Name</label
          >
          <input
            :id="`${id}-name`"
            v-model="form.name"
            type="text"
            required
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white"
          />
        </div>
        <div>
          <label
            :for="`${id}-description`"
            class="block text-xs font-bold text-verve-brown/60 uppercase mb-1"
            >Description</label
          >
          <input
            :id="`${id}-description`"
            v-model="form.description"
            type="text"
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white"
          />
        </div>
        <div>
          <label
            :for="`${id}-target`"
            class="block text-xs font-bold text-verve-brown/60 uppercase mb-1"
            >Target</label
          >
          <input
            :id="`${id}-target`"
            v-model.number="form.target"
            type="number"
            step="any"
            required
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white"
          />
        </div>
      </fieldset>
      <p v-if="error" role="alert" class="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
        {{ error }}
      </p>
      <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-verve-medium/30">
        <button
          type="button"
          @click="emit('close')"
          class="px-5 py-2.5 border border-verve-medium/50 rounded-xl text-verve-brown font-semibold hover:bg-verve-light focus-visible:outline-2 focus-visible:outline-verve-dark"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="isSaving"
          class="px-6 py-2.5 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 border border-verve-dark/5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-verve-dark"
        >
          {{ isSaving ? 'Saving…' : 'Save Changes' }}
        </button>
      </div>
    </form>
  </div>
</template>
