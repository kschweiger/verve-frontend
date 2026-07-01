<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import CollectionActivityPicker from '@/components/collections/CollectionActivityPicker.vue';
import { createCollection } from '@/services/collections';
import type { Activity } from '@/stores/activity';

const router = useRouter();

const name = ref('');
const description = ref('');
const selectedActivities = ref<Activity[]>([]);
const isSaving = ref(false);
const error = ref<string | null>(null);

const canSave = computed(() => name.value.trim().length > 0 && selectedActivities.value.length > 0 && !isSaving.value);

async function handleSubmit() {
  if (!canSave.value) return;

  isSaving.value = true;
  error.value = null;

  try {
    const created = await createCollection({
      name: name.value.trim(),
      description: description.value.trim().length > 0 ? description.value.trim() : null,
      activityIds: selectedActivities.value.map((activity) => activity.id),
    });
    router.push({ name: 'collection-detail', params: { id: created.id } });
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to create collection.';
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-64px)] bg-verve-light/30 p-4 sm:p-6 lg:p-8">
    <form class="mx-auto max-w-7xl space-y-6" @submit.prevent="handleSubmit">
      <div class="rounded-xl border border-verve-medium/30 bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 class="text-3xl font-bold text-verve-brown">New Collection</h1>
            <p class="mt-2 text-sm text-verve-brown/60">
              Select activities manually and save them as one collection.
            </p>
          </div>
          <div class="flex gap-3">
            <router-link
              :to="{ name: 'collections' }"
              class="rounded-xl border border-verve-medium bg-white px-4 py-2 text-sm font-semibold text-verve-brown transition-colors hover:bg-verve-light"
            >
              Cancel
            </router-link>
            <button
              type="submit"
              :disabled="!canSave"
              class="rounded-xl bg-verve-brown px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-verve-brown/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ isSaving ? 'Saving...' : 'Save Collection' }}
            </button>
          </div>
        </div>

        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <label class="block text-sm font-semibold text-verve-brown">
            Name
            <input
              v-model="name"
              type="text"
              class="mt-2 w-full px-3 py-2"
              required
              placeholder="Weekend ride block"
            />
          </label>

          <label class="block text-sm font-semibold text-verve-brown">
            Description
            <textarea
              v-model="description"
              rows="3"
              class="mt-2 w-full px-3 py-2"
              placeholder="Optional notes"
            ></textarea>
          </label>
        </div>

        <div v-if="error" class="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {{ error }}
        </div>
      </div>

      <CollectionActivityPicker v-model:selected-activities="selectedActivities" />
    </form>
  </div>
</template>
