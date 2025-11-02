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

export interface UserProfilePayload {
  name?: string;
  email?: string;
  full_name?: string;
}
export interface PasswordUpdatePayload {
  old_password: string;
  new_password: string;
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

  async function updateUserProfile(payload: UserProfilePayload): Promise<boolean> {
    const userStore = useUserStore();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${userStore.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Failed to update profile.');
      await fetchAllSettings(); // Re-fetch to get the latest data
      // --- THIS IS THE FIX ---
      // Create an update object for the user store.
      const userInfoUpdate: { name?: string; fullName?: string } = {};
      if (payload.name) userInfoUpdate.name = payload.name;
      if (payload.full_name) userInfoUpdate.fullName = payload.full_name;

      // If we have updates, call the user store's action.
      if (Object.keys(userInfoUpdate).length > 0) {
        userStore.setUserInfo(userInfoUpdate);
      }

      return true;
    } catch (e: any) {
      console.error(e); return false;
    }
  }

  // --- NEW: Action to update the password ---
  async function updatePassword(payload: PasswordUpdatePayload): Promise<{ success: boolean; message: string }> {
    const userStore = useUserStore();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me/password`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${userStore.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to update password.');
      }

      // 2. On success, log the user out
      userStore.logout();

      // 3. Use the router (now available via `this.$router`) to navigate to the login page
      //    We pass a query parameter to show a success message on the login screen.
      this.$router.push({
        name: 'login',
        query: { status: 'password-updated' }
      });

      return { success: true, message: 'Password updated successfully. Please log in again.' };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  // --- NEW: Action to update default activity types ---
  async function updateDefaultTypes(typeId: number | null, subTypeId: number | null): Promise<boolean> {
    const userStore = useUserStore();
    try {
      const params = new URLSearchParams();
      if (typeId) params.append('type_id', typeId.toString());
      if (subTypeId) params.append('sub_type_id', subTypeId.toString());

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me/set_default_activity_type?${params.toString()}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${userStore.token}` }
      });
      if (!response.ok) throw new Error('Failed to update default types.');
      await fetchAllSettings(); // Re-fetch to get the latest data
      return true;
    } catch (e: any) {
      console.error(e); return false;
    }
  }

  return {
    userProfile, userSettings, isLoading, error, fetchAllSettings,
    updateUserProfile,
    updatePassword,
    updateDefaultTypes,
  };
});
