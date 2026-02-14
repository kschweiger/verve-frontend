import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from './auth';
import router from '@/router';

// --- INTERFACES ---
export interface UserProfile {
  name: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
}

export interface HeatmapSettings {
  excluded_activity_types: Array<[number, number | null]>;
}

export interface UserSettings {
  default_type_id: number | null;
  defautl_sub_type_id: number | null; // API typo 'defautl' kept for compatibility
  locale: string;
  heatmap_settings: HeatmapSettings;
}

export interface UserProfilePayload {
  name?: string;
  email?: string;
  full_name?: string;
}

export interface PasswordUpdatePayload {
  old_password: string;
  new_password: string;
}

interface SettingsResponse {
  settings: UserSettings;
}

export const useSettingsStore = defineStore('settings', () => {
  // --- STATE ---
  const userProfile = ref<UserProfile | null>(null);
  const userSettings = ref<UserSettings | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // --- ACTIONS ---

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
      const [profileResponse, settingsResponse] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${userStore.token}` },
        }),
        fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me/settings`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${userStore.token}` },
        }),
      ]);

      if (!profileResponse.ok) throw new Error('Failed to load user profile.');
      if (!settingsResponse.ok) throw new Error('Failed to load user settings.');

      const profileData: UserProfile = await profileResponse.json();
      const settingsData: SettingsResponse = await settingsResponse.json();

      userProfile.value = profileData;
      userSettings.value = settingsData.settings;
    } catch (e: unknown) {
      console.error(e);
      error.value = e instanceof Error ? e.message : 'An error occurred while loading settings.';
    } finally {
      isLoading.value = false;
    }
  }

  async function updateUserProfile(payload: UserProfilePayload): Promise<boolean> {
    const userStore = useUserStore();
    if (!userStore.token) return false;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${userStore.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to update profile.');

      await fetchAllSettings();

      const userInfoUpdate: { name?: string; fullName?: string } = {};
      if (payload.name) userInfoUpdate.name = payload.name;
      if (payload.full_name) userInfoUpdate.fullName = payload.full_name;

      if (Object.keys(userInfoUpdate).length > 0) {
        userStore.setUserInfo(userInfoUpdate);
      }

      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async function updatePassword(
    payload: PasswordUpdatePayload
  ): Promise<{ success: boolean; message: string }> {
    const userStore = useUserStore();
    if (!userStore.token) {
      return { success: false, message: 'Not authenticated.' };
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me/password`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${userStore.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to update password.');
      }

      userStore.logout();
      router.push({
        name: 'login',
        query: { status: 'password-updated' },
      });

      return {
        success: true,
        message: 'Password updated successfully. Please log in again.',
      };
    } catch (e: unknown) {
      return { success: false, message: e instanceof Error ? e.message : String(e) };
    }
  }

  async function updateDefaultTypes(
    typeId: number | null,
    subTypeId: number | null
  ): Promise<boolean> {
    const userStore = useUserStore();
    if (!userStore.token) return false;

    try {
      const params = new URLSearchParams();
      if (typeId) params.append('type_id', typeId.toString());
      if (subTypeId) params.append('sub_type_id', subTypeId.toString());

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/users/me/set_default_activity_type?${params.toString()}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${userStore.token}` },
        }
      );
      if (!response.ok) throw new Error('Failed to update default types.');

      await fetchAllSettings();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async function updateHeatmapSettings(
    excludedTypes: Array<[number, number | null]>
  ): Promise<boolean> {
    const userStore = useUserStore();
    if (!userStore.token) return false;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me/heatmap_settings`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${userStore.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ excluded_activity_types: excludedTypes }),
      });

      if (!response.ok) throw new Error('Failed to update heatmap settings.');

      await fetchAllSettings();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  return {
    userProfile,
    userSettings,
    isLoading,
    error,
    fetchAllSettings,
    updateUserProfile,
    updatePassword,
    updateDefaultTypes,
    updateHeatmapSettings,
  };
});
