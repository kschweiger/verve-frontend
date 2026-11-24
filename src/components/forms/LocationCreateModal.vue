<script setup lang="ts">
import { ref, watch, onMounted, computed, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLocationStore, type LocationCreatePayload } from '@/stores/location';
import { useTypeStore } from '@/stores/types';

const props = defineProps<{
  initialLat?: number;
  initialLng?: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved'): void;
}>();

const { t } = useI18n();
const id = useId();
const locationStore = useLocationStore();
const typeStore = useTypeStore();

const form = ref({
  name: '',
  description: '',
  latitude: props.initialLat || 0,
  longitude: props.initialLng || 0,
  typeId: null as number | null,
  subTypeId: null as number | null,
});

const isSaving = ref(false);
const error = ref<{ reason: 'nameRequired' | 'createFailed'; detail?: string } | null>(null);

onMounted(() => {
  typeStore.fetchLocationTypes();
});

watch(
  () => props.initialLat,
  (val) => {
    if (val) form.value.latitude = val;
  }
);
watch(
  () => props.initialLng,
  (val) => {
    if (val) form.value.longitude = val;
  }
);

// Reset sub-type when main type changes
watch(() => form.value.typeId, () => {
  form.value.subTypeId = null;
});

const availableSubTypes = computed(() => {
  if (!form.value.typeId) return [];
  const found = typeStore.locationTypes.find(t => t.id === form.value.typeId);
  return found ? found.sub_types : [];
});

async function handleSubmit() {
  if (!form.value.name) {
    error.value = { reason: 'nameRequired' };
    return;
  }

  isSaving.value = true;
  error.value = null;

  const payload: LocationCreatePayload = {
    name: form.value.name,
    description: form.value.description ? form.value.description : null,
    latitude: Number(form.value.latitude),
    longitude: Number(form.value.longitude),
    type_id: form.value.typeId,
    sub_type_id: form.value.subTypeId,
  };

  const success = await locationStore.createLocation(payload);
  isSaving.value = false;

  if (success) {
    emit('saved');
    emit('close');
  } else {
    error.value = locationStore.creationError ?? { reason: 'createFailed' };
  }
}
</script>

<template>
  <div class="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-verve-brown/20 backdrop-blur-sm">
    <div role="dialog" aria-modal="true" :aria-labelledby="`${id}-title`" class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-verve-medium/30">
      <!-- Header -->
      <div class="flex justify-between items-center mb-5 border-b border-verve-medium/30 pb-3">
        <h3 :id="`${id}-title`" class="text-xl font-bold text-verve-brown">{{ t('locations.addLocation') }}</h3>
        <button type="button" :aria-label="t('locations.closeCreation')" @click="$emit('close')" class="text-verve-brown/40 hover:text-verve-brown transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div v-if="error" role="alert" class="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
        {{ error.detail ?? t(`locations.errors.${error.reason}`) }}
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label :for="`${id}-name`" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">{{ t('locations.name') }}</label>
          <input :id="`${id}-name`" v-model="form.name" type="text" :placeholder="t('locations.nameExample')" required
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white placeholder-verve-brown/30" />
        </div>

        <div>
          <label :for="`${id}-description`" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">{{ t('locations.description') }}</label>
          <textarea :id="`${id}-description`" v-model="form.description" rows="2"
            class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white placeholder-verve-brown/30"></textarea>
        </div>

        <!-- Types Row -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label :for="`${id}-typeId`" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">{{ t('locations.category') }}</label>
            <select :id="`${id}-typeId`" v-model="form.typeId"
              class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white">
              <option :value="null">{{ t('locations.none') }}</option>
              <option v-for="t in typeStore.locationTypes" :key="t.id" :value="t.id">
                {{ t.name }}
              </option>
            </select>
          </div>
          <div>
            <label :for="`${id}-subTypeId`" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">{{ t('locations.subcategory') }}</label>
            <select :id="`${id}-subTypeId`" v-model="form.subTypeId" :disabled="!form.typeId || availableSubTypes.length === 0"
              class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-white disabled:bg-gray-50 disabled:text-gray-400">
              <option :value="null">{{ t('locations.none') }}</option>
              <option v-for="st in availableSubTypes" :key="st.id" :value="st.id">
                {{ st.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label :for="`${id}-latitude`" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">{{ t('locations.latitude') }}</label>
            <input :id="`${id}-latitude`" v-model="form.latitude" type="number" step="any" required
              class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-verve-light/20" />
          </div>
          <div>
            <label :for="`${id}-longitude`" class="block text-xs font-bold text-verve-brown/60 uppercase mb-1">{{ t('locations.longitude') }}</label>
            <input :id="`${id}-longitude`" v-model="form.longitude" type="number" step="any" required
              class="w-full border-verve-medium rounded-xl text-sm py-2 px-3 text-verve-brown focus:ring-verve-dark focus:border-verve-dark bg-verve-light/20" />
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t border-verve-medium/30">
          <button type="button" @click="$emit('close')"
            class="px-5 py-2.5 border border-verve-medium/50 rounded-xl text-verve-brown font-semibold hover:bg-verve-light transition-colors">
            {{ t('locations.cancel') }}
          </button>
          <button type="submit" :disabled="isSaving"
            class="px-6 py-2.5 bg-verve-neon text-verve-brown font-bold rounded-xl shadow-sm hover:brightness-105 border border-verve-dark/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {{ isSaving ? t('locations.creating') : t('locations.createLocation') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
