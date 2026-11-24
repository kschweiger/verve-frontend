<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { Edit, Trash2 } from '@lucide/vue';
import ActivityListItem from '@/components/ActivityListItem.vue';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal.vue';
import CollectionMap from '@/components/collections/CollectionMap.vue';
import { ApiResponseError } from '@/services/authHeaders';
import {
  deleteCollection,
  fetchCollection,
  fetchCollectionTrack,
  type CollectionDetail,
  type CollectionTrackPoint,
} from '@/services/collections';
import { formatDuration } from '@/utils/datetime';

const props = defineProps<{
  id: string;
}>();

const router = useRouter();
const { t, n, locale } = useI18n();
const collection = ref<CollectionDetail | null>(null);
const trackData = ref<CollectionTrackPoint[]>([]);
const isLoading = ref(true);
const error = ref<{ key: 'load' | 'delete'; detail?: string } | null>(null);
const showDeleteModal = ref(false);
const isDeleting = ref(false);

const hasLocationData = computed(() =>
  trackData.value.some((point) => point.lat !== null && point.lon !== null)
);

const dateRange = computed(() => {
  const activities = collection.value?.activities ?? [];
  const first = activities[0];
  const last = activities[activities.length - 1];
  if (!first || !last) return '';

  const date = new Intl.DateTimeFormat(locale.value);
  const start = date.format(new Date(first.start));
  const end = date.format(new Date(last.start));
  return start === end ? start : `${start} - ${end}`;
});

async function loadCollection() {
  isLoading.value = true;
  error.value = null;

  try {
    const [detail, track] = await Promise.all([
      fetchCollection(props.id),
      fetchCollectionTrack(props.id),
    ]);
    collection.value = detail;
    trackData.value = track;
  } catch (e: unknown) {
    error.value = { key: 'load', detail: e instanceof ApiResponseError ? e.detail : undefined };
  } finally {
    isLoading.value = false;
  }
}

async function handleDeleteConfirm() {
  isDeleting.value = true;
  try {
    await deleteCollection(props.id);
    router.replace({ name: 'collections' });
  } catch (e: unknown) {
    error.value = { key: 'delete', detail: e instanceof ApiResponseError ? e.detail : undefined };
  } finally {
    isDeleting.value = false;
    showDeleteModal.value = false;
  }
}

onMounted(loadCollection);
watch(() => props.id, loadCollection);
</script>

<template>
  <div class="min-h-[calc(100vh-64px)] bg-verve-light/30 p-4 sm:p-6 lg:p-8">
    <div v-if="isLoading" class="py-12 text-center text-verve-brown/60">
      {{ t('collections.loadingCollection') }}
    </div>

    <div v-else-if="error" role="alert" class="rounded-xl border border-red-100 bg-red-50 p-4 text-red-600">
      {{ t(`collections.errors.${error.key}`) }} {{ error.detail }}
    </div>

    <div v-else-if="collection" class="mx-auto max-w-7xl space-y-8">
      <section class="rounded-xl border border-verve-medium/30 bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 class="text-3xl font-bold text-verve-brown">{{ collection.name }}</h1>
            <p class="mt-1 text-sm text-verve-brown/60">{{ dateRange }}</p>
            <p v-if="collection.description" class="mt-3 max-w-3xl text-sm text-verve-brown/75">
              {{ collection.description }}
            </p>
          </div>

          <div class="flex gap-3">
            <router-link
              :to="{ name: 'collection-edit', params: { id } }"
              class="inline-flex items-center justify-center gap-2 rounded-xl border border-verve-medium bg-white px-4 py-2 text-sm font-semibold text-verve-brown transition-colors hover:bg-verve-light"
            >
              <Edit class="size-4" />
              <span>{{ t('collections.edit') }}</span>
            </router-link>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-red-600 transition-colors hover:bg-red-50"
              :aria-label="t('collections.deleteCollection')"
              @click="showDeleteModal = true"
            >
              <Trash2 class="size-4" />
            </button>
          </div>
        </div>

        <div class="mt-6 grid grid-cols-2 gap-4 text-center md:grid-cols-4 xl:grid-cols-7">
          <div class="rounded-lg bg-verve-light/20 p-4">
            <p class="text-2xl font-bold text-verve-brown">{{ n(collection.activities.length) }}</p>
            <p class="mt-1 text-xs font-bold uppercase tracking-wider text-verve-brown/50">{{ t('collections.activities') }}</p>
          </div>
          <div class="rounded-lg bg-verve-light/20 p-4">
            <p class="text-2xl font-bold text-verve-brown">
              {{ collection.totalDistance === null ? '-' : n(collection.totalDistance, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </p>
            <p class="mt-1 text-xs font-bold uppercase tracking-wider text-verve-brown/50">km</p>
          </div>
          <div class="rounded-lg bg-verve-light/20 p-4">
            <p class="text-2xl font-bold text-verve-brown">{{ formatDuration(collection.effectiveDurationSeconds, locale) }}</p>
            <p class="mt-1 text-xs font-bold uppercase tracking-wider text-verve-brown/50">{{ t('collections.activeTime') }}</p>
          </div>
          <div class="rounded-lg bg-verve-light/20 p-4">
            <p class="text-2xl font-bold text-verve-brown">{{ formatDuration(collection.totalDurationSeconds, locale) }}</p>
            <p class="mt-1 text-xs font-bold uppercase tracking-wider text-verve-brown/50">{{ t('collections.totalTime') }}</p>
          </div>
          <div class="rounded-lg bg-verve-light/20 p-4">
            <p class="text-2xl font-bold text-verve-brown">{{ collection.pauseDurationSeconds === null ? '-' : formatDuration(collection.pauseDurationSeconds, locale) }}</p>
            <p class="mt-1 text-xs font-bold uppercase tracking-wider text-verve-brown/50">{{ t('collections.pause') }}</p>
          </div>
          <div class="rounded-lg bg-verve-light/20 p-4">
            <p class="text-2xl font-bold text-verve-brown">{{ collection.totalElevationGain === null ? '-' : n(collection.totalElevationGain, { maximumFractionDigits: 0 }) }}</p>
            <p class="mt-1 text-xs font-bold uppercase tracking-wider text-verve-brown/50">{{ t('collections.elevationGain') }}</p>
          </div>
          <div class="rounded-lg bg-verve-light/20 p-4">
            <p class="text-2xl font-bold text-verve-brown">{{ collection.totalElevationLoss === null ? '-' : n(collection.totalElevationLoss, { maximumFractionDigits: 0 }) }}</p>
            <p class="mt-1 text-xs font-bold uppercase tracking-wider text-verve-brown/50">{{ t('collections.elevationLoss') }}</p>
          </div>
        </div>
      </section>

      <section v-if="hasLocationData">
        <CollectionMap :track-data="trackData" :activities="collection.activities" />
      </section>

      <section class="rounded-xl border border-verve-medium/30 bg-white p-6 shadow-sm">
        <h2 class="text-xl font-bold text-verve-brown">{{ t('collections.activities') }}</h2>
        <ul class="mt-4 space-y-1">
          <li v-for="activity in collection.activities" :key="activity.id">
            <ActivityListItem :activity="activity" />
          </li>
        </ul>
      </section>
    </div>
  </div>

  <ConfirmDeleteModal
    :is-open="showDeleteModal"
    :is-deleting="isDeleting"
    :title="t('collections.deleteCollection')"
    :message="t('collections.deleteMessage')"
    :confirm-label="t('collections.delete')"
    :confirming-label="t('collections.deleting')"
    :cancel-label="t('collections.cancel')"
    @close="showDeleteModal = false"
    @confirm="handleDeleteConfirm"
  />
</template>
