<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import CollectionActivityPicker from '@/components/collections/CollectionActivityPicker.vue';
import { ApiResponseError } from '@/services/authHeaders';
import { createCollection } from '@/services/collections';
import type { Activity } from '@/stores/activity';

const router = useRouter();
const { t } = useI18n();

const name = ref('');
const description = ref('');
const selectedActivities = ref<Activity[]>([]);
const isSaving = ref(false);
const error = ref<{ detail?: string } | null>(null);

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
    error.value = { detail: e instanceof ApiResponseError ? e.detail : undefined };
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
            <h1 class="text-3xl font-bold text-verve-brown">{{ t('collections.newCollection') }}</h1>
            <p class="mt-2 text-sm text-verve-brown/60">
              {{ t('collections.createIntro') }}
            </p>
          </div>
          <div class="flex gap-3">
            <router-link
              :to="{ name: 'collections' }"
              class="rounded-xl border border-verve-medium bg-white px-4 py-2 text-sm font-semibold text-verve-brown transition-colors hover:bg-verve-light"
            >
              {{ t('collections.cancel') }}
            </router-link>
            <button
              type="submit"
              :disabled="!canSave"
              class="rounded-xl bg-verve-brown px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-verve-brown/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {{ isSaving ? t('collections.saving') : t('collections.saveCollection') }}
            </button>
          </div>
        </div>

        <div class="mt-6 grid gap-4 md:grid-cols-2">
          <label class="block text-sm font-semibold text-verve-brown">
            {{ t('collections.name') }}
            <input
              v-model="name"
              type="text"
              class="mt-2 w-full px-3 py-2"
              required
              :placeholder="t('collections.nameExample')"
            />
          </label>

          <label class="block text-sm font-semibold text-verve-brown">
            {{ t('collections.description') }}
            <textarea
              v-model="description"
              rows="3"
              class="mt-2 w-full px-3 py-2"
              :placeholder="t('collections.optionalNotes')"
            ></textarea>
          </label>
        </div>

        <div v-if="error" role="alert" class="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {{ t('collections.errors.create') }} {{ error.detail }}
        </div>
      </div>

      <CollectionActivityPicker v-model:selected-activities="selectedActivities" />
    </form>
  </div>
</template>
