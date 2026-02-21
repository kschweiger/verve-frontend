<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useTypeStore } from '@/stores/types';
import { useActivityStore } from '@/stores/activity';
import ActivityCreateForm from '@/components/forms/ActivityCreateForm.vue';
import { FileText, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-vue-next';

const typeStore = useTypeStore();
const activityStore = useActivityStore();

const activeTab = ref<'auto' | 'manual'>('auto');
const showManualModal = ref(false);

interface QueueItem {
  id: string; // Unique ID for v-for
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  message?: string;
}

// --- State ---
const uploadQueue = ref<QueueItem[]>([]);
const isProcessing = ref(false);
const hasFinished = ref(false);

const selectedTypeId = ref<number | null>(null);
const selectedSubTypeId = ref<number | null>(null);

// Dependent dropdown logic
const availableSubTypes = computed(() => {
  if (!selectedTypeId.value) return [];
  const foundType = typeStore.activityTypes.find((t) => t.id === selectedTypeId.value);
  return foundType ? foundType.sub_types : [];
});

watch(selectedTypeId, () => {
  selectedSubTypeId.value = null;
});

onMounted(() => {
  typeStore.fetchActivityTypes();
});

// --- Methods ---

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    // Reset state
    uploadQueue.value = Array.from(target.files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: 'pending',
    }));
    hasFinished.value = false;
  }
}

async function handleBatchUpload() {
  if (uploadQueue.value.length === 0) return;

  isProcessing.value = true;
  hasFinished.value = false;

  // Process sequentially to avoid overwhelming the backend or browser
  // (Could be parallelized with Promise.all if backend supports concurrency well)
  for (const item of uploadQueue.value) {
    item.status = 'uploading';

    // Slight delay to allow UI update if processing is instant
    await new Promise(resolve => setTimeout(resolve, 50));

    const result = await activityStore.uploadActivity(
      item.file,
      selectedTypeId.value,
      selectedSubTypeId.value
    );

    if (result.success) {
      item.status = 'success';
      item.message = 'Uploaded';
    } else {
      item.status = 'error';
      item.message = result.message;
    }
  }

  isProcessing.value = false;
  hasFinished.value = true;

  // Clear the input so selecting the same files works again if needed
  const fileInput = document.getElementById('file-upload') as HTMLInputElement;
  if (fileInput) fileInput.value = '';
}

function resetForm() {
  uploadQueue.value = [];
  hasFinished.value = false;
  selectedTypeId.value = null;
  selectedSubTypeId.value = null;
}

// Computed for summary
const successCount = computed(() => uploadQueue.value.filter(i => i.status === 'success').length);
</script>

<template>
  <div class="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-bold text-gray-800">Add Activity</h3>

      <!-- Tabs -->
      <div class="flex bg-verve-light p-1 rounded-xl">
        <button @click="activeTab = 'auto'" :class="activeTab === 'auto'
          ? 'bg-white shadow-sm text-verve-brown'
          : 'text-verve-brown/60 hover:text-verve-brown hover:bg-white/50'
          " class="flex-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all" :disabled="isProcessing">
          Auto Upload
        </button>
        <button @click="activeTab = 'manual'" :class="activeTab === 'manual'
          ? 'bg-white shadow-sm text-verve-brown'
          : 'text-verve-brown/60 hover:text-verve-brown hover:bg-white/50'
          " class="flex-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all" :disabled="isProcessing">
          Manual
        </button>
      </div>
    </div>

    <!-- TAB 1: Auto / Batch Upload -->
    <div v-if="activeTab === 'auto'" class="flex-1 flex flex-col">

      <!-- MODE A: Processing / Result List -->
      <div v-if="isProcessing || hasFinished" class="flex-1 flex flex-col min-h-0">
        <div class="mb-2 text-sm font-bold text-verve-brown flex justify-between">
          <span>Progress</span>
          <span v-if="hasFinished">{{ successCount }} / {{ uploadQueue.length }} Success</span>
        </div>

        <div class="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          <div v-for="item in uploadQueue" :key="item.id"
            class="flex items-center justify-between p-2 rounded-lg border text-sm" :class="{
              'border-gray-200 bg-gray-50': item.status === 'pending',
              'border-blue-200 bg-blue-50': item.status === 'uploading',
              'border-green-200 bg-green-50': item.status === 'success',
              'border-red-200 bg-red-50': item.status === 'error'
            }">
            <div class="flex items-center truncate mr-2">
              <FileText class="size-4 mr-2 text-verve-brown/50 shrink-0" />
              <span class="truncate text-verve-brown font-medium" :title="item.file.name">{{ item.file.name }}</span>
            </div>

            <div class="shrink-0">
              <span v-if="item.status === 'pending'" class="text-xs text-gray-400">Waiting...</span>
              <Loader2 v-else-if="item.status === 'uploading'" class="size-4 animate-spin text-blue-500" />
              <CheckCircle v-else-if="item.status === 'success'" class="size-4 text-green-600" />
              <XCircle v-else-if="item.status === 'error'" class="size-4 text-red-500" :title="item.message" />
            </div>
          </div>
        </div>

        <button v-if="hasFinished" @click="resetForm" class="btn-primary w-full mt-4 flex items-center justify-center">
          <RefreshCw class="size-4 mr-2" /> Upload More
        </button>
      </div>

      <!-- MODE B: Selection Form -->
      <form v-else @submit.prevent="handleBatchUpload" class="space-y-4 flex flex-col h-full">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            GPX/FIT/GeoJSON Files
          </label>
          <div class="relative">
            <input id="file-upload" type="file" @change="handleFileChange" multiple required
              class="file-input w-full" />
          </div>
          <p v-if="uploadQueue.length > 0" class="mt-1 text-xs font-bold text-verve-orange">
            {{ uploadQueue.length }} file{{ uploadQueue.length !== 1 ? 's' : '' }} selected
          </p>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-xs font-medium text-gray-700">Type (Optional)</label>
            <select v-model="selectedTypeId" class="mt-1 block w-full border-gray-300 text-sm rounded-md bg-white">
              <option :value="null">Auto-detect</option>
              <option v-for="t in typeStore.activityTypes" :key="t.id" :value="t.id">
                {{ t.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700">Sub-Type (Optional)</label>
            <select v-model="selectedSubTypeId" :disabled="!selectedTypeId"
              class="mt-1 block w-full border-gray-300 text-sm rounded-md bg-white disabled:bg-gray-100">
              <option :value="null">Auto-detect</option>
              <option v-for="st in availableSubTypes" :key="st.id" :value="st.id">
                {{ st.name }}
              </option>
            </select>
          </div>
        </div>

        <p class="text-xs text-verve-brown/60 italic">
          Selected types apply to all files unless overridden by file metadata (e.g. Verve JSON).
        </p>

        <div class="mt-auto">
          <button type="submit" class="btn-primary w-full">
            <span v-if="uploadQueue.length > 1">Upload {{ uploadQueue.length }} Activities</span>
            <span v-else>Upload</span>
          </button>
        </div>
      </form>
    </div>

    <!-- TAB 2: Manual Entry Entry Point -->
    <div v-else class="flex flex-col items-center justify-center h-48 space-y-4">
      <div class="text-center text-gray-500 text-sm">
        <p>Log a gym session, yoga class,</p>
        <p>or an activity without GPS data.</p>
      </div>
      <button @click="showManualModal = true" class="btn-outline">Open Manual Entry Form</button>
    </div>

    <!-- Manual Modal -->
    <div v-if="showManualModal"
      class="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <ActivityCreateForm @close="showManualModal = false" @saved="showManualModal = false" />
      </div>
    </div>
  </div>
</template>
