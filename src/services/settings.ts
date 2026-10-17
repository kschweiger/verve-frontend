import { responseError, getAuthHeaders } from './authHeaders';
import type { UserPublic, UserSettingsCollection } from '../types/api';
import type { UserProfile, UserSettings } from '../stores/settings';
import { defaultTimezone, isSupportedTimezone } from './timezones';

export function mapUserSettings({ settings }: UserSettingsCollection): UserSettings {
  return {
    default_type_id: settings.default_type_id,
    defautl_sub_type_id: settings.defautl_sub_type_id,
    locale: settings.locale ?? 'en',
    timezone: settings.timezone ?? defaultTimezone,
    heatmap_settings: {
      excluded_activity_types: settings.heatmap_settings?.excluded_activity_types ?? [],
    },
    records_settings:
      settings.records_settings === undefined
        ? null
        : {
            default_activity_type: settings.records_settings.default_activity_type ?? 1,
          },
  };
}

export function mapUserProfile(value: UserPublic): UserProfile {
  return { id: value.id, name: value.name, email: value.email, full_name: value.full_name ?? null };
}

export async function fetchUserSettings(): Promise<UserSettings> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me/settings`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw await responseError(response, 'Failed to load user settings.');
  const data: UserSettingsCollection = await response.json();
  return mapUserSettings(data);
}

export async function saveUserTimezone(timezone: string): Promise<void> {
  if (!isSupportedTimezone(timezone)) throw new Error('Select a supported timezone.');
  const query = new URLSearchParams({ timezone_name: timezone });
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me/timezone?${query}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (!response.ok)
    throw await responseError(response, 'Failed to save timezone. Please try again.');
}
