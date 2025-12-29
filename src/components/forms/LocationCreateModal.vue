<script setup lang="ts">
import { ref, watch } from 'vue';
import { useLocationStore, type LocationCreatePayload } from '@/stores/location';

const props = defineProps<{
  initialLat?: number;
  initialLng?: number;
}>();

const emit = defineEmits(['close', 'saved']);
const locationStore = useLocationStore();

const form = ref({
  name: '',
  description: '',
  latitude: props.initialLat || 0,
  longitude: props.initialLng || 0,
});

const isSaving = ref(false);
const error = ref<string | null>(null);

// Update form if props change (e.g. if user clicks a different spot while modal is open, though rare)
watch(() => props.initialLat, (val) => { if (val) form.value.latitude = val; });
watch(() => props.initialLng, (val) => { if (val) form.value.longitude = val; });

async function handleSubmit() {
  if (!form.value.name) {
    error.value = "Name is required.";
    return;
  }

  isSaving.value = true;
  error.value = null;

  const payload: LocationCreatePayload = {
    name: form.value.name,
    description: form.value.description ? form.value.description : null,
    latitude: Number(form.value.latitude),
    longitude: Number(form.value.longitude)
  };

  const success = await locationStore.createLocation(payload);
  isSaving.value = false;

  if (success) {
    emit('saved');
    emit('close');
  } else {
    error.value = locationStore.error || "Failed to create location.";
  }
}
</script>

<template>
  <div class="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold text-gray-800">Add Location</h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">&times;</button>
      </div>

      <div v-if="error" class="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded">{{ error }}</div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Name</label>
          <input v-model="form.name" type="text" placeholder="e.g. Hidden Lake Trailhead" required
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Description</label>
          <textarea v-model="form.description" rows="2"
            class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"></textarea>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Latitude</label>
            <input v-model="form.latitude" type="number" step="any" required
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Longitude</label>
            <input v-model="form.longitude" type="number" step="any" required
              class="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50" />
          </div>
        </div>

        <div class="flex justify-end space-x-3 pt-2">
          <button type="button" @click="$emit('close')"
            class="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" :disabled="isSaving"
            class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300">
            {{ isSaving ? 'Creating...' : 'Create Location' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
