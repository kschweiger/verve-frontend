<script setup lang="ts">
import { ref } from 'vue';
import { useGoalStore, type Goal } from '@/stores/goals';

const props = defineProps<{ goal: Goal }>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved'): void;
}>();

const goalStore = useGoalStore();

const form = ref({
  name: props.goal.name,
  description: props.goal.description || '',
  target: props.goal.target,
});

async function handleSave() {
  const promises: Promise<boolean>[] = [];
  if (form.value.name !== props.goal.name)
    promises.push(goalStore.updateGoal(props.goal.id, 'name', form.value.name));

  if (form.value.description !== (props.goal.description || ''))
    promises.push(goalStore.updateGoal(props.goal.id, 'description', form.value.description));

  if (form.value.target !== props.goal.target)
    promises.push(goalStore.updateGoal(props.goal.id, 'target', form.value.target));

  await Promise.all(promises);
  emit('saved');
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-verve-brown/20 backdrop-blur-sm">
    <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-verve-medium/30">
      <!-- Header -->
      <div class="flex justify-between items-center mb-4 border-b border-verve-medium/30 pb-3">
        <h3 class="text-xl font-bold text-verve-brown">Edit Goal</h3>
        <button @click="$emit('close')" class="text-verve-brown/40 hover:text-verve-brown transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Form Fields -->
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Name</label>
          <input v-model="form.name" type="text"
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
        </div>

        <div>
          <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Description</label>
          <input v-model="form.description" type="text"
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
        </div>

        <div>
          <label class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">Target</label>
          <input v-model="form.target" type="number" step="any"
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white" />
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-verve-medium/30">
        <button @click="$emit('close')"
          class="px-5 py-2.5 border border-verve-medium/50 rounded-xl text-verve-brown font-semibold hover:bg-verve-light transition-colors">
          Cancel
        </button>
        <button @click="handleSave"
          class="px-6 py-2.5 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 border border-verve-dark/5 transition-all">
          Save Changes
        </button>
      </div>
    </div>
  </div>
</template>
