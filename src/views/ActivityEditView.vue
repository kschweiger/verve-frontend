<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'; // Import nextTick
import { useRouter } from 'vue-router';
import { useActivityStore, type ActivityUpdatePayload } from '@/stores/activity';
import { useTypeStore } from '@/stores/types';
import { fetchActivitySummary } from '@/services/api';

const props = defineProps<{
  id: string;
}>();

const router = useRouter();
const activityStore = useActivityStore();
const typeStore = useTypeStore();

// Original activity state (unchanged)
const originalActivity = ref<{ name: string; type_id: number | null; sub_type_id: number | null } | null>(null);

// Form state (unchanged)
const name = ref('');
const selectedTypeId = ref<number | null>(null);
const selectedSubTypeId = ref<number | null>(null);

// UI state (unchanged)
const isLoading = ref(true);
const error = ref<string | null>(null);
const isSaving = ref(false);


onMounted(async () => {
  try {
    const [_, currentActivity] = await Promise.all([
      typeStore.fetchActivityTypes(),
      fetchActivitySummary(props.id)
    ]);

    // Store original values
    originalActivity.value = {
      name: currentActivity.name || '',
      type_id: currentActivity.type_id,
      sub_type_id: currentActivity.sub_type_id,
    };

    // Pre-fill the form with fetched data
    name.value = originalActivity.value.name;
    selectedTypeId.value = originalActivity.value.type_id;
    selectedSubTypeId.value = originalActivity.value.sub_type_id;

    // Wait for the next DOM update cycle after setting the initial data.
    // This ensures the initial values have propagated before we start watching.
    await nextTick();

    // Now, set up the watcher that will only react to subsequent USER changes.
    watch(selectedTypeId, () => {
      // Since this watcher is only active *after* the initial setup,
      // it will now correctly reset the sub-type only when the user changes the main type.
      selectedSubTypeId.value = null;
    });

  } catch (e: any) {
    error.value = "Failed to load activity data.";
  } finally {
    isLoading.value = false;
  }
});

// Dropdown logic (unchanged)
const availableSubTypes = computed(() => {
  if (!selectedTypeId.value) return [];
  const foundType = typeStore.activityTypes.find(t => t.id === selectedTypeId.value);
  return foundType?.sub_types || [];
});

async function handleSubmit() {
  if (!originalActivity.value) return;
  isSaving.value = true;
  error.value = null;

  const payload: ActivityUpdatePayload = {};
  if (name.value !== originalActivity.value.name) payload.name = name.value;
  if (selectedTypeId.value !== originalActivity.value.type_id) payload.type_id = selectedTypeId.value;
  if (selectedSubTypeId.value !== originalActivity.value.sub_type_id) payload.sub_type_id = selectedSubTypeId.value;

  if (Object.keys(payload).length === 0) {
    router.push({ name: 'activity-detail', params: { id: props.id } });
    return;
  }

  const success = await activityStore.updateActivity(props.id, payload);

  if (success) {
    router.push({ name: 'activity-detail', params: { id: props.id } });
  } else {
    error.value = 'Failed to save changes. Please try again.';
  }
  isSaving.value = false;
}
</script>
<template>
  <div class="p-4 sm:p-6 lg:p-8">
    <div class="max-w-2xl mx-auto">
      <div v-if="isLoading" class="text-center">Loading...</div>
      <div v-else-if="error && !isSaving" class="p-4 bg-red-100 text-red-700 rounded-md">{{ error }}</div>

      <form v-else @submit.prevent="handleSubmit" class="bg-white p-6 rounded-lg shadow-md space-y-6">
        <h1 class="text-2xl font-bold text-gray-800">Edit Activity</h1>

        <!-- Name Input -->
        <div>
          <label for="activity-name" class="block text-sm font-medium text-gray-700">Name</label>
          <input v-model="name" type="text" id="activity-name"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" />
        </div>

        <!-- Type Dropdown -->
        <div>
          <label for="type" class="block text-sm font-medium text-gray-700">Activity Type</label>
          <select v-model="selectedTypeId" id="type" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
            <option :value="null">None</option>
            <option v-for="t in typeStore.activityTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </div>

        <!-- Sub-Type Dropdown -->
        <div>
          <label for="sub-type" class="block text-sm font-medium text-gray-700">Sub-Type</label>
          <select v-model="selectedSubTypeId" id="sub-type"
            :disabled="!selectedTypeId || availableSubTypes.length === 0"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm disabled:bg-gray-100">
            <option :value="null">None</option>
            <option v-for="st in availableSubTypes" :key="st.id" :value="st.id">{{ st.name }}</option>
          </select>
        </div>

        <!-- Submission Error -->
        <div v-if="error && isSaving" class="text-red-600 text-sm">{{ error }}</div>

        <!-- Action Buttons -->
        <div class="flex justify-end space-x-4">
          <router-link :to="{ name: 'activity-detail', params: { id: props.id } }"
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </router-link>
          <button type="submit" :disabled="isSaving"
            class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300">
            {{ isSaving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
