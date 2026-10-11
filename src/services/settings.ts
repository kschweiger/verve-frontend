import { useUserStore } from '../stores/auth';
import type { UserProfile, UserSettings } from '../stores/settings';
import { defaultTimezone, isSupportedTimezone } from './timezones';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value);

export function parseUserSettings(value: unknown): UserSettings {
  if (!isRecord(value) || !isRecord(value.settings)) throw new Error('Invalid user settings.');
  const settings = value.settings;
  const timezone = settings.timezone === undefined ? defaultTimezone : settings.timezone;
  const locale = settings.locale === undefined ? 'en' : settings.locale;
  if (!isInteger(settings.default_type_id) ||
      !(settings.defautl_sub_type_id === null || isInteger(settings.defautl_sub_type_id)) ||
      (locale !== 'en' && locale !== 'de') || !isSupportedTimezone(timezone)) {
    throw new Error('Invalid user settings.');
  }
  const excluded: Array<[number, number | null]> = [];
  if (settings.heatmap_settings !== undefined) {
    if (!isRecord(settings.heatmap_settings)) throw new Error('Invalid heatmap settings.');
    const tuples = settings.heatmap_settings.excluded_activity_types === undefined
      ? [] : settings.heatmap_settings.excluded_activity_types;
    if (!Array.isArray(tuples)) throw new Error('Invalid heatmap settings.');
    for (const tuple of tuples) {
      if (!Array.isArray(tuple) || tuple.length !== 2 || !isInteger(tuple[0]) ||
          !(tuple[1] === null || isInteger(tuple[1]))) throw new Error('Invalid heatmap settings.');
      excluded.push([tuple[0], tuple[1]]);
    }
  }
  let records: UserSettings['records_settings'] = null;
  if (settings.records_settings !== undefined) {
    if (!isRecord(settings.records_settings)) throw new Error('Invalid records settings.');
    const type = settings.records_settings.default_activity_type === undefined
      ? 1 : settings.records_settings.default_activity_type;
    if (!isInteger(type)) throw new Error('Invalid records settings.');
    records = { default_activity_type: type };
  }
  return {
    default_type_id: settings.default_type_id,
    defautl_sub_type_id: settings.defautl_sub_type_id,
    locale, timezone,
    heatmap_settings: { excluded_activity_types: excluded }, records_settings: records,
  };
}

export function parseUserProfile(value: unknown): UserProfile {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string' ||
      typeof value.email !== 'string' ||
      !(value.full_name === undefined || value.full_name === null || typeof value.full_name === 'string')) {
    throw new Error('Invalid user profile.');
  }
  return { id: value.id, name: value.name, email: value.email, full_name: value.full_name ?? null };
}

function getAuthHeaders(): HeadersInit {
  const token = useUserStore().token;
  if (!token) throw new Error('Not authenticated.');
  return { Authorization: `Bearer ${token}` };
}

export async function fetchUserSettings(): Promise<UserSettings> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me/settings`, {
    method: 'GET', headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to load user settings.');
  const data: unknown = await response.json();
  return parseUserSettings(data);
}

export async function saveUserTimezone(timezone: string): Promise<void> {
  if (!isSupportedTimezone(timezone)) throw new Error('Select a supported timezone.');
  const query = new URLSearchParams({ timezone_name: timezone });
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me/timezone?${query}`, {
    method: 'PATCH', headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to save timezone. Please try again.');
}
