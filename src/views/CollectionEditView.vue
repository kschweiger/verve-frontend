<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import CollectionActivityPicker from '@/components/collections/CollectionActivityPicker.vue';
import { fetchCollection, updateCollection, type CollectionDetail } from '@/services/collections';
import type { Activity } from '@/stores/activity';

const props = defineProps<{
  id: string;
}>();

const router = useRouter();
const collection = ref<CollectionDetail | null>(null);
const name = ref('');
const description = ref('');
const selectedActivities = ref<Activity[]>([]);
const originalActivityIds = ref<string[]>([]);
const isLoading = ref(true);
const isSaving = ref(false);
const error = ref<string | null>(null);

const canSave = computed(() => name.value.trim().length > 0 && selectedActivities.value.length > 0 && !isSaving.value);

const appendedActivityIds = computed(() => {
  const originalIds = new Set(originalActivityIds.value);
  return selectedActivities.value
    .map((activity) => activity.id)
    .filter((activityId) => !originalIds.has(activityId));
});

async function loadCollection() {
  isLoading.value = true;
  error.value = null;

  try {
    const detail = await fetchCollection(props.id);
    collection.value = detail;
    name.value = detail.name;
    description.value = detail.description ?? '';
    selectedActivities.value = detail.activities;
    originalActivityIds.value = detail.activities.map((activity) => activity.id);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load collection.';
  } finally {
    isLoading.value = false;
  }
}

async function handleSubmit() {
  if (!canSave.value) return;

  isSaving.value = true;
  error.value = null;

  try {
    await updateCollection(props.id, {
      name: name.value.trim(),
      description: description.value.trim().length > 0 ? description.value.trim() : null,
      activityIds: appendedActivityIds.value.length > 0 ? appendedActivityIds.value : undefined,
      replaceActivities: appendedActivityIds.value.length > 0 ? false : undefined,
    });
    router.push({ name: 'collection-detail', params: { id: props.id } });
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to update collection.';
  } finally {
    isSaving.value = false;
  }
}

onMounted(loadCollection);
</script>

<template>
  <div class="min-h-[calc(100vh-64px)] bg-verve-light/30 p-4 sm:p-6 lg:p-8">
    <div v-if="isLoading" class="py-12 text-center text-verve-brown/60">
      Loading collection...
    </div>

    <form v-else class="mx-auto max-w-7xl space-y-6" @submit.prevent="handleSubmit">
      <div class="rounded-xl border border-verve-medium/30 bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 class="text-3xl font-bold text-verve-brown">Edit Collection</h1>
            <p class="mt-2 text-sm text-verve-brown/60">
              Update metadata or append activities. Existing activities are locked in beta.
            </p>
          </div>
          <div class="flex gap-3">
            <router-link
              :to="{ name: 'collection-detail', params: { id } }"
              class="rounded-xl border border-verve-medium bg-white px-4 py-2 text-sm font-semibold text-verve-brown transition-colors hover:bg-verve-light"
            >
              Cancel
            </router-link>
            <button
              type="submit"
              :disabled="!canSave"
              class="rounded-xl bg-verve-brown px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-verve-brown/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ isSaving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>

        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <label class="block text-sm font-semibold text-verve-brown">
            Name
            <input v-model="name" type="text" class="mt-2 w-full px-3 py-2" required />
          </label>

          <label class="block text-sm font-semibold text-verve-brown">
            Description
            <textarea v-model="description" rows="3" class="mt-2 w-full px-3 py-2"></textarea>
          </label>
        </div>

        <div v-if="error" class="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {{ error }}
        </div>
      </div>

      <CollectionActivityPicker
        v-model:selected-activities="selectedActivities"
        :locked-activity-ids="originalActivityIds"
      />
    </form>
  </div>
</template>
