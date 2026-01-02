<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import { useTypeStore } from '@/stores/types';
import ProfileEditForm from '@/components/forms/ProfileEditForm.vue';
import PasswordChangeForm from '@/components/forms/PasswordChangeForm.vue';
import AppSettingsForm from '@/components/forms/AppSettingsForm.vue';
import HeatmapSettingsForm from '@/components/forms/HeatmapSettingsForm.vue';

const appVersion = import.meta.env.VITE_APP_VERSION || 'Dev';

const settingsStore = useSettingsStore();
const typeStore = useTypeStore();

// --- UI State ---
const isProfileEditing = ref(false);
const isPasswordEditing = ref(false);
const isAppSettingsEditing = ref(false);
const isHeatmapEditing = ref(false);

// --- Computed Helpers for App Settings ---
const defaultTypeName = computed(() => {
  const typeId = settingsStore.userSettings?.default_type_id;
  if (!typeId) return 'Not Set';
  const foundType = typeStore.activityTypes.find(t => t.id === typeId);
  return foundType?.name ?? `ID #${typeId}`;
});

const defaultSubTypeName = computed(() => {
  const typeId = settingsStore.userSettings?.default_type_id;
  const subTypeId = settingsStore.userSettings?.defautl_sub_type_id;
  if (!typeId || !subTypeId) return 'Not Set';

  const foundType = typeStore.activityTypes.find(t => t.id === typeId);
  const foundSubType = foundType?.sub_types.find(st => st.id === subTypeId);
  return foundSubType?.name ?? `ID #${subTypeId}`;
});

// --- Lifecycle ---
onMounted(() => {
  settingsStore.fetchAllSettings();
  typeStore.fetchActivityTypes();
});

// --- Action Handlers ---
async function handleProfileSave(payload: any) {
  const success = await settingsStore.updateUserProfile(payload);
  if (success) isProfileEditing.value = false;
}

async function handlePasswordSave(payload: any) {
  const result = await settingsStore.updatePassword(payload);
  if (result.success) isPasswordEditing.value = false;
  else alert(result.message); // Simple alert for error, could be improved
}

async function handleAppSettingsSave(payload: any) {
  const success = await settingsStore.updateDefaultTypes(payload.typeId, payload.subTypeId);
  if (success) isAppSettingsEditing.value = false;
}

async function handleHeatmapSave(excludedTypes: Array<[number, number | null]>) {
  const success = await settingsStore.updateHeatmapSettings(excludedTypes);
  if (success) isHeatmapEditing.value = false;
}

// --- Helper to resolve names for Heatmap Summary ---
const getExcludedLabel = (tuple: [number, number | null]) => {
  const [tId, stId] = tuple;
  const mainType = typeStore.activityTypes.find(t => t.id === tId);
  if (!mainType) return `Unknown Type (${tId})`;

  if (stId === null) {
    return `${mainType.name} (All)`;
  }

  const subType = mainType.sub_types.find(s => s.id === stId);
  return `${mainType.name}: ${subType?.name || 'Unknown Subtype'}`;
};
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8">
    <div class="max-w-4xl mx-auto space-y-8">
      <h1 class="text-3xl font-bold text-gray-900">Settings</h1>

      <!-- Loading State -->
      <div v-if="settingsStore.isLoading && !settingsStore.userProfile" class="text-center text-gray-500 py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        Loading settings...
      </div>

      <!-- Error State -->
      <div v-else-if="settingsStore.error" class="p-4 bg-red-100 text-red-700 rounded-md">
        Error: {{ settingsStore.error }}
      </div>

      <!-- Content -->
      <div v-else class="space-y-8">

        <!-- SECTION 1: User Profile -->
        <div class="bg-white p-6 rounded-lg shadow-md">
          <div class="flex justify-between items-center border-b pb-4 mb-4">
            <h2 class="text-xl font-bold text-gray-800">User Profile</h2>
            <button v-if="!isProfileEditing" @click="isProfileEditing = true"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition">
              Edit Profile
            </button>
          </div>

          <ProfileEditForm v-if="isProfileEditing" :initial-profile="settingsStore.userProfile!"
            @save="handleProfileSave" @cancel="isProfileEditing = false" />

          <div v-else-if="settingsStore.userProfile" class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p class="text-sm font-medium text-gray-500">Username</p>
              <p class="mt-1 text-gray-900">{{ settingsStore.userProfile.name }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Full Name</p>
              <p class="mt-1 text-gray-900">{{ settingsStore.userProfile.full_name || 'Not Set' }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Email</p>
              <p class="mt-1 text-gray-900">{{ settingsStore.userProfile.email }}</p>
            </div>
          </div>
        </div>

        <!-- SECTION 2: Security -->
        <div class="bg-white p-6 rounded-lg shadow-md">
          <div class="flex justify-between items-center border-b pb-4 mb-4">
            <h2 class="text-xl font-bold text-gray-800">Security</h2>
            <button v-if="!isPasswordEditing" @click="isPasswordEditing = true"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition">
              Change Password
            </button>
          </div>

          <PasswordChangeForm v-if="isPasswordEditing" @save="handlePasswordSave" @cancel="isPasswordEditing = false" />

          <div v-else>
            <p class="text-sm font-medium text-gray-500">Password</p>
            <p class="mt-1 text-gray-900">•••••••••••••</p>
          </div>
        </div>

        <!-- SECTION 3: Application Settings -->
        <div class="bg-white p-6 rounded-lg shadow-md">
          <div class="flex justify-between items-center border-b pb-4 mb-4">
            <h2 class="text-xl font-bold text-gray-800">Application Defaults</h2>
            <button v-if="!isAppSettingsEditing" @click="isAppSettingsEditing = true"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition">
              Edit Settings
            </button>
          </div>

          <AppSettingsForm v-if="isAppSettingsEditing" :initial-settings="settingsStore.userSettings!"
            @save="handleAppSettingsSave" @cancel="isAppSettingsEditing = false" />

          <div v-else-if="settingsStore.userSettings" class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p class="text-sm font-medium text-gray-500">Default Activity Type</p>
              <p class="mt-1 text-gray-900">{{ defaultTypeName }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Default Sub-Type</p>
              <p class="mt-1 text-gray-900">{{ defaultSubTypeName }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-gray-500">Locale</p>
              <p class="mt-1 text-gray-900">{{ settingsStore.userSettings.locale }}</p>
            </div>
          </div>
        </div>

        <!-- SECTION 4: Heatmap Configuration -->
        <div class="bg-white p-6 rounded-lg shadow-md">
          <div class="flex justify-between items-center border-b pb-4 mb-4">
            <div>
              <h2 class="text-xl font-bold text-gray-800">Heatmap Configuration</h2>
              <p class="text-sm text-gray-500 mt-1">Control which activities appear on your global heatmap.</p>
            </div>

            <button v-if="!isHeatmapEditing" @click="isHeatmapEditing = true"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition">
              Edit Visibility
            </button>
          </div>

          <div v-if="isHeatmapEditing">
            <HeatmapSettingsForm
              :initial-settings="settingsStore.userSettings?.heatmap_settings || { excluded_activity_types: [] }"
              @save="handleHeatmapSave" @cancel="isHeatmapEditing = false" />
          </div>

          <!-- Summary View (Read Only) -->
          <div v-else>
            <div v-if="!settingsStore.userSettings?.heatmap_settings.excluded_activity_types.length">
              <p
                class="text-green-700 text-sm font-medium flex items-center bg-green-50 p-3 rounded-md border border-green-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clip-rule="evenodd" />
                </svg>
                All activities are visible on the heatmap.
              </p>
            </div>
            <div v-else>
              <p class="text-gray-700 text-sm font-semibold mb-3">Hidden Categories:</p>
              <div class="flex flex-wrap gap-2">
                <span v-for="(tuple, idx) in settingsStore.userSettings?.heatmap_settings.excluded_activity_types"
                  :key="idx"
                  class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium border border-gray-200 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1 text-gray-400" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                  {{ getExcludedLabel(tuple) }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="text-center border-t border-gray-200 pt-6 mt-8">
          <p class="text-xs text-gray-400 font-mono">
            Verve Outdoors Frontend v{{ appVersion }}
          </p>
        </div>

      </div>
    </div>
  </div>
</template>
