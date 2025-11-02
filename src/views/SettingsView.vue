<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import { useTypeStore } from '@/stores/types'; // For looking up type names
import ProfileEditForm from '@/components/forms/ProfileEditForm.vue';
import PasswordChangeForm from '@/components/forms/PasswordChangeForm.vue';
import AppSettingsForm from '@/components/forms/AppSettingsForm.vue';

const settingsStore = useSettingsStore();
const typeStore = useTypeStore();

const isProfileEditing = ref(false);
const isPasswordEditing = ref(false);
const isAppSettingsEditing = ref(false);


// Computed property to find the name of the default activity type
const defaultTypeName = computed(() => {
  const typeId = settingsStore.userSettings?.default_type_id;
  if (!typeId) return 'Not Set';
  const foundType = typeStore.activityTypes.find(t => t.id === typeId);
  return foundType?.name ?? `ID #${typeId}`;
});

// Computed property for the default sub-type name
const defaultSubTypeName = computed(() => {
  const typeId = settingsStore.userSettings?.default_type_id;
  const subTypeId = settingsStore.userSettings?.defautl_sub_type_id; // Using typo to match API
  if (!typeId || !subTypeId) return 'Not Set';

  const foundType = typeStore.activityTypes.find(t => t.id === typeId);
  const foundSubType = foundType?.sub_types.find(st => st.id === subTypeId);
  return foundSubType?.name ?? `ID #${subTypeId}`;
});

onMounted(() => {
  // Fetch all data when the component is created
  settingsStore.fetchAllSettings();
  // Also ensure activity types are available for name lookups
  typeStore.fetchActivityTypes();
});

async function handleProfileSave(payload) {
  const success = await settingsStore.updateUserProfile(payload);
  if (success) isProfileEditing.value = false;
  // else, form can show an error
}
async function handlePasswordSave(payload) {
  const result = await settingsStore.updatePassword(payload);
  if (result.success) isPasswordEditing.value = false;
  // else, form can show the error message
}
async function handleAppSettingsSave(payload) {
  const success = await settingsStore.updateDefaultTypes(payload.typeId, payload.subTypeId);
  if (success) isAppSettingsEditing.value = false;
}

</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8">
    <div class="max-w-4xl mx-auto space-y-8">
      <h1 class="text-3xl font-bold text-gray-900">Settings</h1>

      <div v-if="settingsStore.isLoading" class="text-center text-gray-500">Loading settings...</div>
      <div v-else-if="settingsStore.error" class="p-4 bg-red-100 text-red-700 rounded-md">
        Error: {{ settingsStore.error }}
      </div>

      <div v-else class="space-y-8">
        <!-- Section 1: User Profile -->
        <div class="bg-white p-6 rounded-lg shadow-md">
          <div class="flex justify-between items-center border-b pb-4 mb-4">
            <h2 class="text-xl font-bold text-gray-800">User Profile</h2>
            <!-- Future Edit Button -->
            <button v-if="!isProfileEditing" @click="isProfileEditing = true"
              class="px-4 py-2 border rounded-md text-sm">Edit Profile</button>
          </div>
          <ProfileEditForm v-if="isProfileEditing" :initial-profile="settingsStore.userProfile"
            @save="handleProfileSave" @cancel="isProfileEditing = false" />
          <div v-if="settingsStore.userProfile" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="font-medium text-gray-500">Username</p>
              <p>{{ settingsStore.userProfile.name }}</p>
            </div>
            <div>
              <p class="font-medium text-gray-500">Full Name</p>
              <p>{{ settingsStore.userProfile.full_name || 'Not Set' }}</p>
            </div>
            <div>
              <p class="font-medium text-gray-500">Email</p>
              <p>{{ settingsStore.userProfile.email }}</p>
            </div>
            <div>
              <p class="font-medium text-gray-500">Password</p>
              <p>••••••••</p>
            </div>
          </div>
        </div>

        <div class="bg-white p-6 rounded-lg shadow-md">
          <div class="flex justify-between items-center border-b pb-4 mb-4">
            <h2 class="text-xl font-bold">Security</h2>
            <button v-if="!isPasswordEditing" @click="isPasswordEditing = true"
              class="px-4 py-2 border rounded-md text-sm">Change Password</button>
          </div>
          <PasswordChangeForm v-if="isPasswordEditing" @save="handlePasswordSave" @cancel="isPasswordEditing = false" />
          <div v-else>
            <p class="font-medium text-gray-500">Password</p>
            <p>••••••••</p>
          </div>
        </div>

        <!-- Section 3: Application Settings -->
        <div class="bg-white p-6 rounded-lg shadow-md">
          <div class="flex justify-between items-center border-b pb-4 mb-4">
            <h2 class="text-xl font-bold text-gray-800">Application Settings</h2>

            <button v-if="!isAppSettingsEditing" @click="isAppSettingsEditing = true"
              class="px-4 py-2 border rounded-md text-sm">Edit Settings</button>

          </div>
          <AppSettingsForm v-if="isAppSettingsEditing" :initial-settings="settingsStore.userSettings"
            @save="handleAppSettingsSave" @cancel="isAppSettingsEditing = false" />
          <div v-if="settingsStore.userSettings" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="font-medium text-gray-500">Default Activity Type</p>
              <p>{{ defaultTypeName }}</p>
            </div>
            <div>
              <p class="font-medium text-gray-500">Default Sub-Type</p>
              <p>{{ defaultSubTypeName }}</p>
            </div>
            <div>
              <p class="font-medium text-gray-500">Locale</p>
              <p>{{ settingsStore.userSettings.locale }}</p>
            </div>
          </div>
        </div>

        <!-- Section 3: Other settings can be added here -->
        <!-- e.g., Heatmap Settings -->

      </div>
    </div>
  </div>
</template>
