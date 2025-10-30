import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from './auth';

// --- INTERFACES to match your API responses ---
export interface UserProfile {
  name: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
}

export interface UserSettings {
  default_type_id: number | null;
  defautl_sub_type_id: number | null; // Note: possible typo in API? 'defautl'
  locale: string;
  heatmap_settings: {
    excluded_activity_types: number[];
  };
}

export const useSettingsStore = defineStore('settings', () => {
  // --- STATE ---
  const userProfile = ref<UserProfile | null>(null);
  const userSettings = ref<UserSettings | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // --- ACTION ---
  async function fetchAllSettings() {
    if (isLoading.value) return;
    isLoading.value = true;
    error.value = null;

    const userStore = useUserStore();
    if (!userStore.token) {
      error.value = 'Not authenticated.';
      isLoading.value = false;
      return;
    }

    try {
      // Fetch both endpoints in parallel for better performance
      const [profileResponse, settingsResponse] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${userStore.token}` }
        }),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me/settings/`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${userStore.token}` }
        })
      ]);

      if (!profileResponse.ok) throw new Error('Failed to load user profile.');
      if (!settingsResponse.ok) throw new Error('Failed to load user settings.');

      userProfile.value = await profileResponse.json();
      const settingsCollection = await settingsResponse.json();
      userSettings.value = settingsCollection.settings; // Unwrap the nested settings object

    } catch (e: any) {
      error.value = e.message;
    } finally {
      isLoading.value = false;
    }
  }

  return { userProfile, userSettings, isLoading, error, fetchAllSettings };
});
