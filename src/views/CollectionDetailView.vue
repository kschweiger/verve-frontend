<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Edit, Trash2 } from 'lucide-vue-next';
import ActivityListItem from '@/components/ActivityListItem.vue';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal.vue';
import CollectionMap from '@/components/collections/CollectionMap.vue';
import {
  deleteCollection,
  fetchCollection,
  fetchCollectionTrack,
  type CollectionDetail,
  type CollectionTrackPoint,
} from '@/services/collections';

const props = defineProps<{
  id: string;
}>();

const router = useRouter();
const collection = ref<CollectionDetail | null>(null);
const trackData = ref<CollectionTrackPoint[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
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

  const start = new Date(first.start).toLocaleDateString();
  const end = new Date(last.start).toLocaleDateString();
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
    error.value = e instanceof Error ? e.message : 'Failed to load collection.';
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
    error.value = e instanceof Error ? e.message : 'Failed to delete collection.';
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
      Loading collection...
    </div>

    <div v-else-if="error" class="rounded-xl border border-red-100 bg-red-50 p-4 text-red-600">
      {{ error }}
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
              <span>Edit</span>
            </router-link>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-red-600 transition-colors hover:bg-red-50"
              aria-label="Delete collection"
              @click="showDeleteModal = true"
            >
              <Trash2 class="size-4" />
            </button>
          </div>
        </div>

        <div class="mt-6 grid grid-cols-2 gap-4 text-center md:grid-cols-5">
          <div class="rounded-lg bg-verve-light/20 p-4">
            <p class="text-2xl font-bold text-verve-brown">{{ collection.activities.length }}</p>
            <p class="mt-1 text-xs font-bold uppercase tracking-wider text-verve-brown/50">Activities</p>
          </div>
          <div class="rounded-lg bg-verve-light/20 p-4">
            <p class="text-2xl font-bold text-verve-brown">
              {{ collection.totalDistance !== null ? collection.totalDistance.toFixed(2) : '-' }}
            </p>
            <p class="mt-1 text-xs font-bold uppercase tracking-wider text-verve-brown/50">km</p>
          </div>
          <div class="rounded-lg bg-verve-light/20 p-4">
            <p class="text-2xl font-bold text-verve-brown">{{ collection.totalDuration }}</p>
            <p class="mt-1 text-xs font-bold uppercase tracking-wider text-verve-brown/50">Duration</p>
          </div>
          <div class="rounded-lg bg-verve-light/20 p-4">
            <p class="text-2xl font-bold text-verve-brown">{{ collection.totalElevationGain?.toFixed(0) ?? '-' }}</p>
            <p class="mt-1 text-xs font-bold uppercase tracking-wider text-verve-brown/50">m Gain</p>
          </div>
          <div class="rounded-lg bg-verve-light/20 p-4">
            <p class="text-2xl font-bold text-verve-brown">{{ collection.totalElevationLoss?.toFixed(0) ?? '-' }}</p>
            <p class="mt-1 text-xs font-bold uppercase tracking-wider text-verve-brown/50">m Loss</p>
          </div>
        </div>
      </section>

      <section v-if="hasLocationData">
        <CollectionMap :track-data="trackData" :activities="collection.activities" />
      </section>

      <section class="rounded-xl border border-verve-medium/30 bg-white p-6 shadow-sm">
        <h2 class="text-xl font-bold text-verve-brown">Activities</h2>
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
    title="Delete Collection"
    message="Are you sure you want to delete this collection? Activities stay in your account, but the collection will be removed."
    @close="showDeleteModal = false"
    @confirm="handleDeleteConfirm"
  />
</template>
