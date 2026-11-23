<script setup lang="ts">
import { ref, computed, onMounted, watch, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTypeStore } from '@/stores/types';
import { useActivityStore, type ActivityUploadFailure } from '@/stores/activity';
import ActivityCreateForm from '@/components/forms/ActivityCreateForm.vue';
import TimezonePicker from '@/components/forms/TimezonePicker.vue';
import { useSettingsStore } from '@/stores/settings';
import { FileText, CheckCircle, XCircle, Loader2, RefreshCw, HelpCircle } from '@lucide/vue';

const typeStore = useTypeStore();
const activityStore = useActivityStore();
const settingsStore = useSettingsStore();
const { t, n } = useI18n();
const controlId = useId();

defineProps<{
  embedded?: boolean;
}>();

const activeTab = ref<'auto' | 'manual'>('auto');
const showManualModal = ref(false);

interface QueueItem {
  id: string; // Unique ID for v-for
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  failure?: ActivityUploadFailure;
}

// --- State ---
const uploadQueue = ref<QueueItem[]>([]);
const isProcessing = ref(false);
const hasFinished = ref(false);

const selectedTypeId = ref<number | null>(null);
const selectedSubTypeId = ref<number | null>(null);
const selectedTimezone = ref('');

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
  void settingsStore.ensureSettings().catch(() => undefined);
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
  if (uploadQueue.value.length === 0 || isProcessing.value) return;
  const timezoneName = selectedTimezone.value || undefined;

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
      selectedSubTypeId.value,
      timezoneName
    );

    if (result.success) {
      item.status = 'success';
    } else {
      item.failure = result;
      item.status = 'error';
    }
  }

  isProcessing.value = false;
  hasFinished.value = true;
}

function uploadStatus(item: QueueItem): string {
  if (item.status === 'error') {
    return item.failure?.detail || t(`activities.upload.${item.failure?.reason ?? 'failed'}`);
  }
  return t(`activities.upload.${item.status}`);
}

function resetForm() {
  uploadQueue.value = [];
  hasFinished.value = false;
  selectedTypeId.value = null;
  selectedSubTypeId.value = null;
  selectedTimezone.value = '';
}

// Computed for summary
const successCount = computed(() => uploadQueue.value.filter(i => i.status === 'success').length);
</script>

<template>
  <div :class="embedded ? 'h-full flex flex-col' : 'bg-white rounded-lg shadow-md p-6 h-full flex flex-col'">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-bold text-gray-800">{{ t('activities.upload.title') }}</h3>

      <!-- Tabs -->
      <div class="flex bg-verve-light p-1 rounded-xl">
        <button type="button" @click="activeTab = 'auto'" :aria-pressed="activeTab === 'auto'" :class="activeTab === 'auto'
          ? 'bg-white shadow-sm text-verve-brown'
          : 'text-verve-brown/60 hover:text-verve-brown hover:bg-white/50'
          " class="flex-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all" :disabled="isProcessing">
          {{ t('activities.upload.auto') }}
        </button>
        <button type="button" @click="activeTab = 'manual'" :aria-pressed="activeTab === 'manual'" :class="activeTab === 'manual'
          ? 'bg-white shadow-sm text-verve-brown'
          : 'text-verve-brown/60 hover:text-verve-brown hover:bg-white/50'
          " class="flex-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all" :disabled="isProcessing">
          {{ t('activities.upload.manual') }}
        </button>
      </div>
    </div>

    <!-- TAB 1: Auto / Batch Upload -->
    <div v-if="activeTab === 'auto'" class="flex-1 flex flex-col">

      <!-- MODE A: Processing / Result List -->
      <div v-if="isProcessing || hasFinished" class="flex-1 flex flex-col min-h-0">
        <div role="status" class="mb-2 text-sm font-bold text-verve-brown flex justify-between">
          <span>{{ t('activities.upload.progress') }}</span>
          <span v-if="hasFinished">{{ t('activities.upload.successCount', { successful: n(successCount), total: n(uploadQueue.length) }) }}</span>
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

            <div class="shrink-0" :title="item.status === 'pending' ? undefined : uploadStatus(item)">
              <span :class="item.status === 'pending' ? 'text-xs text-gray-400' : 'sr-only'">{{ uploadStatus(item) }}</span>
              <Loader2 v-if="item.status === 'uploading'" class="size-4 animate-spin text-blue-500" />
              <CheckCircle v-else-if="item.status === 'success'" class="size-4 text-green-600" />
              <XCircle v-else-if="item.status === 'error'" class="size-4 text-red-500" />
            </div>
          </div>
        </div>

        <button v-if="hasFinished" type="button" @click="resetForm" class="btn-primary w-full mt-4 flex items-center justify-center">
          <RefreshCw class="size-4 mr-2" /> {{ t('activities.upload.more') }}
        </button>
      </div>

      <!-- MODE B: Selection Form -->
      <form v-else @submit.prevent="handleBatchUpload" class="space-y-4 flex flex-col h-full">
        <div>
          <div class="flex justify-between items-center mb-1">
            <label :for="`${controlId}-file`" class="block text-sm font-medium text-gray-700">
              {{ t('activities.upload.files') }}
            </label>
            <router-link to="/help#formats" class="text-verve-brown/40 hover:text-verve-orange transition-colors"
              :aria-label="t('activities.upload.formats')" :title="t('activities.upload.formats')">
              <HelpCircle class="size-4" />
            </router-link>
          </div>
          <div class="relative">
            <input :id="`${controlId}-file`" type="file" @change="handleFileChange" multiple required
              class="file-input w-full" />
          </div>
          <p v-if="uploadQueue.length > 0" class="mt-1 text-xs font-bold text-verve-orange">
            {{ t('activities.upload.fileCount', { value: n(uploadQueue.length) }, uploadQueue.length) }}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label :for="`${controlId}-type`" class="block text-xs font-medium text-gray-700">{{ t('activities.upload.type') }}</label>
            <select :id="`${controlId}-type`" v-model="selectedTypeId" class="mt-1 block w-full border-gray-300 text-sm rounded-md bg-white">
              <option :value="null">{{ t('activities.upload.detect') }}</option>
              <option v-for="t in typeStore.activityTypes" :key="t.id" :value="t.id">
                {{ t.name }}
              </option>
            </select>
          </div>
          <div>
            <label :for="`${controlId}-sub-type`" class="block text-xs font-medium text-gray-700">{{ t('activities.upload.subType') }}</label>
            <select :id="`${controlId}-sub-type`" v-model="selectedSubTypeId" :disabled="!selectedTypeId"
              class="mt-1 block w-full border-gray-300 text-sm rounded-md bg-white disabled:bg-gray-100">
              <option :value="null">{{ t('activities.upload.detect') }}</option>
              <option v-for="st in availableSubTypes" :key="st.id" :value="st.id">
                {{ st.name }}
              </option>
            </select>
          </div>
        </div>

        <div>
          <TimezonePicker :id="`${controlId}-timezone`" v-model="selectedTimezone" :label="t('activities.upload.timezone')" allow-empty
            :disabled="isProcessing" :suggested-timezone="settingsStore.timezone ?? undefined" :described-by="`${controlId}-timezone-help`" />
          <p :id="`${controlId}-timezone-help`" class="mt-1 text-xs text-verve-brown/60">{{ t('activities.upload.timezoneHelp') }}</p>
        </div>

        <p class="text-xs text-verve-brown/60 italic">
          {{ t('activities.upload.typeHelp') }}
        </p>

        <div class="mt-auto">
          <button type="submit" class="btn-primary w-full">
            {{ uploadQueue.length > 1
              ? t('activities.upload.submitMultiple', { value: n(uploadQueue.length) })
              : t('activities.upload.submit') }}
          </button>
        </div>
      </form>
    </div>

    <!-- TAB 2: Manual Entry Entry Point -->
    <div v-else class="flex flex-col items-center justify-center h-48 space-y-4">
      <div class="text-center text-gray-500 text-sm">
        <p>{{ t('activities.upload.manualDescription') }}</p>
      </div>
      <button type="button" @click="showManualModal = true" class="btn-outline">{{ t('activities.upload.openManual') }}</button>
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
