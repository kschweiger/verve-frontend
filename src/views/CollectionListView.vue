<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Plus } from '@lucide/vue';
import CollectionListItem from '@/components/collections/CollectionListItem.vue';
import { ApiResponseError } from '@/services/authHeaders';
import { fetchCollections, type CollectionOverview } from '@/services/collections';

const COLLECTIONS_PER_PAGE = 20;

const { t } = useI18n();
const collections = ref<CollectionOverview[]>([]);
const isLoading = ref(false);
const error = ref<{ detail?: string } | null>(null);
const offset = ref(0);
const canLoadMore = ref(true);

const sortedCollections = computed(() =>
  [...collections.value].sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
);

async function loadCollections(loadMore = false) {
  if (isLoading.value) return;

  isLoading.value = true;
  error.value = null;

  if (!loadMore) {
    collections.value = [];
    offset.value = 0;
    canLoadMore.value = true;
  }

  try {
    const page = await fetchCollections({
      limit: COLLECTIONS_PER_PAGE,
      offset: offset.value,
    });

    collections.value = loadMore ? [...collections.value, ...page] : page;
    offset.value += page.length;
    canLoadMore.value = page.length === COLLECTIONS_PER_PAGE;
  } catch (e: unknown) {
    error.value = { detail: e instanceof ApiResponseError ? e.detail : undefined };
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  loadCollections();
});
</script>

<template>
  <div class="min-h-[calc(100vh-64px)] bg-verve-medium p-4 sm:p-6 lg:p-8">
    <div class="mx-auto max-w-7xl">
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold text-verve-brown">{{ t('collections.title') }}</h1>
          <p class="mt-2 text-sm text-verve-brown/60">
            {{ t('collections.intro') }}
          </p>
        </div>

        <router-link
          :to="{ name: 'collection-create' }"
          class="inline-flex items-center justify-center gap-2 rounded-xl bg-verve-brown px-5 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-verve-brown/90"
        >
          <Plus class="size-4" />
          <span>{{ t('collections.newCollection') }}</span>
        </router-link>
      </div>

      <div v-if="error" role="alert" class="rounded-xl border border-red-100 bg-red-50 p-4 text-red-600">
        {{ t('collections.errors.loadList') }} {{ error.detail }}
      </div>

      <div v-else class="mt-6">
        <ul v-if="sortedCollections.length > 0" class="space-y-1">
          <li v-for="collection in sortedCollections" :key="collection.id">
            <CollectionListItem :collection="collection" />
          </li>
        </ul>

        <div v-else-if="!isLoading" class="bg-white p-12 text-center text-verve-brown/50">
          <p class="text-lg">{{ t('collections.empty') }}</p>
        </div>
      </div>

      <div class="mt-8 pb-8 text-center">
        <div v-if="isLoading" class="py-4 text-verve-brown/60">
          <span class="animate-pulse">{{ t('collections.loading') }}</span>
        </div>
        <button
          v-else-if="canLoadMore"
          type="button"
          class="rounded-xl bg-verve-brown px-8 py-3 font-bold text-white shadow-md transition-colors hover:bg-verve-brown/90"
          @click="loadCollections(true)"
        >
          {{ t('collections.loadMore') }}
        </button>
      </div>
    </div>
  </div>
</template>
