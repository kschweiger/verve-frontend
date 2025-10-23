<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useTypeStore } from '@/stores/types';
import { useActivityStore } from '@/stores/activity';

// Get instances of our stores
const typeStore = useTypeStore();
const activityStore = useActivityStore();

// Local state for the form inputs
const selectedFile = ref<File | null>(null);
const selectedTypeId = ref<number | null>(null);
const selectedSubTypeId = ref<number | null>(null);

// Local state for UI feedback
const isLoading = ref(false);
const feedbackMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);

// --- DEPENDENT DROPDOWN LOGIC ---
// A computed property that reactively returns the list of sub-types
// based on the currently selected main type.
const availableSubTypes = computed(() => {
  if (!selectedTypeId.value) {
    return []; // No type selected, so no sub-types are available
  }
  const foundType = typeStore.activityTypes.find(t => t.id === selectedTypeId.value);
  return foundType ? foundType.sub_types : [];
});

// A "watcher" that resets the sub-type whenever the main type changes.
// This prevents having a sub-type selected that doesn't belong to the new main type.
watch(selectedTypeId, () => {
  selectedSubTypeId.value = null;
});

// --- DATA FETCHING ---
// Fetch the types when the component is first mounted
onMounted(() => {
  typeStore.fetchActivityTypes();
});

// --- FORM HANDLING ---
function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0];
  }
}

async function handleSubmit() {
  if (!selectedFile.value) {
    feedbackMessage.value = { type: 'error', text: 'Please select a file to upload.' };
    return;
  }

  isLoading.value = true;
  feedbackMessage.value = null;

  const result = await activityStore.uploadActivity(
    selectedFile.value,
    selectedTypeId.value,
    selectedSubTypeId.value
  );

  isLoading.value = false;
  feedbackMessage.value = {
    type: result.success ? 'success' : 'error',
    text: result.message
  };

  // If successful, reset the form
  if (result.success) {
    selectedFile.value = null;
    selectedTypeId.value = null;
    selectedSubTypeId.value = null;
    // Also reset the file input visually
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }
}
</script>

<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <h3 class="text-xl font-bold text-gray-800 mb-4">Upload New Activity</h3>
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label for="file-upload" class="block text-sm font-medium text-gray-700">GPX or FIT File</label>
        <input id="file-upload" type="file" @change="handleFileChange" required
          class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
      </div>

      <!-- Type Dropdown -->
      <div>
        <label for="type" class="block text-sm font-medium text-gray-700">Activity Type (Optional)</label>
        <select id="type" v-model="selectedTypeId"
          class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
          <option :value="null">None</option>
          <option v-for="type in typeStore.activityTypes" :key="type.id" :value="type.id">
            {{ type.name }}
          </option>
        </select>
      </div>

      <!-- Sub-Type Dropdown -->
      <div>
        <label for="sub-type" class="block text-sm font-medium text-gray-700">Sub-Type (Optional)</label>
        <select id="sub-type" v-model="selectedSubTypeId" :disabled="availableSubTypes.length === 0"
          class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-100">
          <option :value="null">None</option>
          <option v-for="subType in availableSubTypes" :key="subType.id" :value="subType.id">
            {{ subType.name }}
          </option>
        </select>
      </div>

      <!-- Feedback Message -->
      <div v-if="feedbackMessage" :class="feedbackMessage.type === 'success' ? 'text-green-600' : 'text-red-600'"
        class="text-sm">
        {{ feedbackMessage.text }}
      </div>

      <button type="submit" :disabled="isLoading"
        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300">
        {{ isLoading ? 'Uploading...' : 'Upload' }}
      </button>
    </form>
  </div>
</template>
