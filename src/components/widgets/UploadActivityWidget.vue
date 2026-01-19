<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useTypeStore } from '@/stores/types';
import { useActivityStore } from '@/stores/activity';
import ActivityCreateForm from '@/components/forms/ActivityCreateForm.vue';

// Get instances of our stores
const typeStore = useTypeStore();
const activityStore = useActivityStore();

const activeTab = ref<'auto' | 'manual'>('auto');
const showManualModal = ref(false);

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

async function handleAutoSubmit() {
  if (!selectedFile.value) {
    feedbackMessage.value = { type: 'error', text: 'Please select a file.' };
    return;
  }
  isLoading.value = true;
  feedbackMessage.value = null;
  const result = await activityStore.uploadActivity(selectedFile.value, selectedTypeId.value, selectedSubTypeId.value);
  isLoading.value = false;
  feedbackMessage.value = { type: result.success ? 'success' : 'error', text: result.message };
  if (result.success) {
    selectedFile.value = null;
    selectedTypeId.value = null;
    selectedSubTypeId.value = null;
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }
}</script>

<template>
  <div class="bg-white rounded-lg shadow-md p-6 h-full">

    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-bold text-gray-800">Add Activity</h3>

      <!-- Tabs -->
      <div class="flex bg-verve-light p-1 rounded-xl">
        <button @click="activeTab = 'auto'" :class="activeTab === 'auto'
          ? 'bg-white shadow-sm text-verve-brown'
          : 'text-verve-brown/60 hover:text-verve-brown hover:bg-white/50'"
          class="flex-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all">
          Auto Upload
        </button>
        <button @click="activeTab = 'manual'" :class="activeTab === 'manual'
          ? 'bg-white shadow-sm text-verve-brown'
          : 'text-verve-brown/60 hover:text-verve-brown hover:bg-white/50'"
          class="flex-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all">
          Manual
        </button>
      </div>
    </div>

    <!-- TAB 1: Auto Upload (Existing) -->
    <div v-if="activeTab === 'auto'">
      <form @submit.prevent="handleAutoSubmit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">GPX/FIT/GeoJSON File</label>
          <input id="file-upload" type="file" @change="handleFileChange" required class="file-input w-full" />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-xs font-medium text-gray-700">Type (Opt)</label>
            <select v-model="selectedTypeId" class="mt-1 block w-full border-gray-300 text-sm rounded-md">
              <option :value="null">Auto-detect</option>
              <option v-for="t in typeStore.activityTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700">Sub-Type (Opt)</label>
            <select v-model="selectedSubTypeId" :disabled="!selectedTypeId"
              class="mt-1 block w-full border-gray-300 text-sm rounded-md disabled:bg-gray-100">
              <option :value="null">Auto-detect</option>
              <option v-for="st in availableSubTypes" :key="st.id" :value="st.id">{{ st.name }}</option>
            </select>
          </div>
        </div>

        <div v-if="feedbackMessage" :class="feedbackMessage.type === 'success' ? 'text-green-600' : 'text-red-600'"
          class="text-sm">
          {{ feedbackMessage.text }}
        </div>

        <button type="submit" :disabled="isLoading" class="btn-primary w-full">
          {{ isLoading ? 'Uploading...' : 'Upload' }}
        </button>
      </form>
    </div>

    <!-- TAB 2: Manual Entry Entry Point -->
    <div v-else class="flex flex-col items-center justify-center h-48 space-y-4">
      <div class="text-center text-gray-500 text-sm">
        <p>Log a gym session, yoga class,</p>
        <p>or an activity without GPS data.</p>
      </div>
      <button @click="showManualModal = true" class="btn-outline">
        Open Manual Entry Form
      </button>
    </div>

    <!-- Modal -->
    <div v-if="showManualModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <ActivityCreateForm @close="showManualModal = false" @saved="showManualModal = false" />
      </div>
    </div>

  </div>
</template>
