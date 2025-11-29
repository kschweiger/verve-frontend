<script setup lang="ts">
import { ref } from 'vue';
import { useGoalStore, type Goal } from '@/stores/goals';

const props = defineProps<{ goal: Goal }>();
const emit = defineEmits(['close', 'saved']);
const goalStore = useGoalStore();

const form = ref({
  name: props.goal.name,
  description: props.goal.description || '',
  target: props.goal.target,
});

async function handleSave() {
  // We save fields sequentially since the API updates one attribute at a time
  // In a real app, you might want a 'PATCH' endpoint for bulk updates,
  // but we work with what we have.

  const promises = [];
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
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
      <h3 class="text-xl font-bold text-gray-800 mb-4">Edit Goal</h3>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Name</label>
          <input v-model="form.name" type="text" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Description</label>
          <input v-model="form.description" type="text"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Target</label>
          <input v-model="form.target" type="number" step="any"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
        </div>
      </div>

      <div class="flex justify-end space-x-3 mt-6">
        <button @click="$emit('close')"
          class="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
        <button @click="handleSave" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save
          Changes</button>
      </div>
    </div>
  </div>
</template>
