import {
  ApiResponseError,
  responseError,
  getAuthHeaders,
  getJsonAuthHeaders,
} from '../services/authHeaders';
import type { SupportedLocale, UserPublic } from '../types/api';
import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from './auth';
import { fetchUserSettings, mapUserProfile, saveUserLocale, saveUserTimezone } from '../services/settings';

// --- INTERFACES ---
export interface UserProfile {
  name: string;
  email: string;
  full_name: string | null;
  id: string;
}

export interface HeatmapSettings {
  excluded_activity_types: Array<[number, number | null]>;
}

export interface RecordsSettings {
  default_activity_type: number;
}

export interface UserSettings {
  default_type_id: number;
  defautl_sub_type_id: number | null; // API typo 'defautl' kept for compatibility
  locale: SupportedLocale;
  timezone: string;
  heatmap_settings: HeatmapSettings;
  records_settings: RecordsSettings | null;
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
  const errorDetail = ref<string | null>(null);
  const timezone = computed(() => userSettings.value?.timezone ?? null);
  const isSavingTimezone = ref(false);
  const timezoneError = ref<string | null>(null);
  const timezoneErrorDetail = ref<string | null>(null);
  const isSavingLocale = ref(false);
  const localeError = ref<{ detail?: string } | null>(null);
  const userStore = useUserStore();
  let session = 0;
  let settingsRequest: Promise<UserSettings> | null = null;

  watch(
    () => userStore.token,
    () => {
      session++;
      userProfile.value = null;
      userSettings.value = null;
      settingsRequest = null;
      isLoading.value = false;
      isSavingTimezone.value = false;
      error.value = null;
      errorDetail.value = null;
      timezoneError.value = null;
      timezoneErrorDetail.value = null;
      isSavingLocale.value = false;
      localeError.value = null;
    },
    { flush: 'sync' }
  );

  function ensureSettings(refresh = false): Promise<UserSettings> {
    if (!userStore.token) return Promise.reject(new Error('Not authenticated.'));
    if (settingsRequest) return settingsRequest;
    if (!refresh && userSettings.value) return Promise.resolve(userSettings.value);
    const currentSession = session;
    const request = fetchUserSettings()
      .then((settings) => {
        if (currentSession !== session) throw new Error('Account changed while loading settings.');
        userSettings.value = settings;
        return settings;
      })
      .finally(() => {
        if (settingsRequest === request) settingsRequest = null;
      });
    settingsRequest = request;
    return request;
  }

  async function updateTimezone(value: string): Promise<boolean> {
    if (isSavingTimezone.value) return false;
    const currentSession = session;
    isSavingTimezone.value = true;
    timezoneError.value = null;
    timezoneErrorDetail.value = null;
    try {
      await saveUserTimezone(value);
      if (currentSession !== session) return false;
      // A pre-save load may be obsolete; its failure must not prevent the refresh.
      if (settingsRequest) await settingsRequest.catch(() => undefined);
      if (currentSession !== session) return false;
      await ensureSettings(true);
      return currentSession === session;
    } catch (e: unknown) {
      if (currentSession === session) {
        timezoneError.value = 'Failed to save timezone.';
        timezoneErrorDetail.value = e instanceof ApiResponseError ? (e.detail ?? null) : null;
      }
      return false;
    } finally {
      if (currentSession === session) isSavingTimezone.value = false;
    }
  }

  async function updateLocale(value: SupportedLocale): Promise<boolean> {
    if (isSavingLocale.value) return false;
    const currentSession = session;
    isSavingLocale.value = true;
    localeError.value = null;
    try {
      await saveUserLocale(value);
      if (currentSession !== session) return false;
      if (settingsRequest) await settingsRequest.catch(() => undefined);
      if (currentSession !== session) return false;
      await ensureSettings(true);
      return currentSession === session;
    } catch (e: unknown) {
      if (currentSession === session) {
        localeError.value = { detail: e instanceof ApiResponseError ? e.detail : undefined };
      }
      return false;
    } finally {
      if (currentSession === session) isSavingLocale.value = false;
    }
  }

  // --- ACTIONS ---

  async function fetchAllSettings() {
    if (isLoading.value) {
      if (settingsRequest) await settingsRequest.catch(() => undefined);
      return;
    }

    isLoading.value = true;
    error.value = null;
    errorDetail.value = null;

    const currentSession = session;
    if (!userStore.token) {
      error.value = 'Not authenticated.';
      isLoading.value = false;
      return;
    }

    try {
      const [profileResponse] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me`, {
          method: 'GET',
          headers: getAuthHeaders(),
        }),
        ensureSettings(true),
      ]);

      if (!profileResponse.ok)
        throw await responseError(profileResponse, 'Failed to load user profile.');
      const profileData: UserPublic = await profileResponse.json();
      const profile = mapUserProfile(profileData);
      if (currentSession === session) userProfile.value = profile;
    } catch (e: unknown) {
      if (currentSession === session) {
        error.value = 'An error occurred while loading settings.';
        errorDetail.value = e instanceof ApiResponseError ? (e.detail ?? null) : null;
      }
    } finally {
      if (currentSession === session) isLoading.value = false;
    }
  }

  async function updateUserProfile(payload: UserProfilePayload): Promise<boolean> {
    const currentSession = session;
    const userStore = useUserStore();
    if (!userStore.token) return false;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me`, {
        method: 'PATCH',
        headers: getJsonAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (currentSession !== session) return false;
      if (!response.ok) throw await responseError(response, 'Failed to update profile.');

      await fetchAllSettings();
      if (currentSession !== session) return false;

      const userInfoUpdate: { name?: string; fullName?: string } = {};
      if (payload.name) userInfoUpdate.name = payload.name;
      if (payload.full_name) userInfoUpdate.fullName = payload.full_name;

      if (Object.keys(userInfoUpdate).length > 0) {
        userStore.setUserInfo(userInfoUpdate);
      }

      return true;
    } catch (e) {
      if (currentSession !== session) return false;
      console.error(e);
      return false;
    }
  }

  async function updatePassword(
    payload: PasswordUpdatePayload
  ): Promise<{
    success: boolean;
    message: string;
    detail?: string;
    reason?: 'notAuthenticated' | 'accountChanged' | 'failed';
  }> {
    const currentSession = session;
    const userStore = useUserStore();
    if (!userStore.token) {
      return { success: false, message: 'Not authenticated.', reason: 'notAuthenticated' };
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me/password`, {
        method: 'PATCH',
        headers: getJsonAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (currentSession !== session)
        return {
          success: false,
          message: 'Account changed while processing the request.',
          reason: 'accountChanged',
        };

      if (!response.ok) throw await responseError(response, 'Failed to update password.');

      const { default: router } = await import('../router');
      if (currentSession !== session)
        return {
          success: false,
          message: 'Account changed while processing the request.',
          reason: 'accountChanged',
        };
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
      if (currentSession !== session)
        return {
          success: false,
          message: 'Account changed while processing the request.',
          reason: 'accountChanged',
        };
      const detail = e instanceof ApiResponseError ? e.detail : undefined;
      return {
        success: false,
        message: detail ?? 'Failed to update password.',
        detail,
        reason: 'failed',
      };
    }
  }

  async function updateDefaultTypes(
    typeId: number | null,
    subTypeId: number | null
  ): Promise<boolean> {
    const currentSession = session;
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
          headers: getAuthHeaders(),
        }
      );
      if (currentSession !== session) return false;
      if (!response.ok) throw await responseError(response, 'Failed to update default types.');

      await fetchAllSettings();
      if (currentSession !== session) return false;
      return true;
    } catch (e) {
      if (currentSession !== session) return false;
      console.error(e);
      return false;
    }
  }

  async function updateHeatmapSettings(
    excludedTypes: Array<[number, number | null]>
  ): Promise<boolean> {
    const currentSession = session;
    const userStore = useUserStore();
    if (!userStore.token) return false;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/users/me/heatmap_settings`,
        {
          method: 'PATCH',
          headers: getJsonAuthHeaders(),
          body: JSON.stringify({ excluded_activity_types: excludedTypes }),
        }
      );
      if (currentSession !== session) return false;

      if (!response.ok) throw await responseError(response, 'Failed to update heatmap settings.');

      await fetchAllSettings();
      if (currentSession !== session) return false;
      return true;
    } catch (e) {
      if (currentSession !== session) return false;
      console.error(e);
      return false;
    }
  }

  async function updateRecordsSettings(defaultActivityType: number): Promise<boolean> {
    const currentSession = session;
    const userStore = useUserStore();
    if (!userStore.token) return false;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/users/me/records_settings`,
        {
          method: 'PATCH',
          headers: getJsonAuthHeaders(),
          body: JSON.stringify({ default_activity_type: defaultActivityType }),
        }
      );
      if (currentSession !== session) return false;

      if (!response.ok) throw await responseError(response, 'Failed to update records settings.');

      await fetchAllSettings();
      if (currentSession !== session) return false;
      return true;
    } catch (e) {
      if (currentSession !== session) return false;
      console.error(e);
      return false;
    }
  }

  return {
    userProfile,
    userSettings,
    isLoading,
    error,
    errorDetail,
    timezone,
    isSavingTimezone,
    timezoneError,
    timezoneErrorDetail,
    isSavingLocale,
    localeError,
    ensureSettings,
    updateTimezone,
    updateLocale,
    fetchAllSettings,
    updateUserProfile,
    updatePassword,
    updateDefaultTypes,
    updateHeatmapSettings,
    updateRecordsSettings,
  };
});
