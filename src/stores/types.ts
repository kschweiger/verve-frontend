import { responseError } from '../services/authHeaders';
import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { SupportedLocale } from '../types/api';

export interface SubType {
  id: number;
  name: string;
}

export interface CategoryType {
  id: number;
  name: string;
  sub_types: SubType[];
}

export type ActivityType = CategoryType;
export type LocationType = CategoryType;

interface ApiResponse<T> {
  data: T;
}

type Catalog = 'activity' | 'location';

export const useTypeStore = defineStore('type', () => {
  const activityTypes = ref<ActivityType[]>([]);
  const locationTypes = ref<LocationType[]>([]);
  const englishActivityTypes = ref<ActivityType[]>([]);
  const locale = ref<SupportedLocale>('en');
  let activityRequested = false;
  let locationRequested = false;

  const cache = new Map<Catalog, Map<SupportedLocale, CategoryType[]>>();
  const requests = new Map<string, Promise<CategoryType[] | undefined>>();

  async function requestCatalog(catalog: Catalog, requestLocale: SupportedLocale) {
    const key = `${catalog}:${requestLocale}`;
    const cached = cache.get(catalog)?.get(requestLocale);
    if (cached) return cached;
    const existing = requests.get(key);
    if (existing) return existing;

    const endpoint = catalog === 'activity' ? 'activity_types' : 'location_types';
    const promise = Promise.resolve().then(async (): Promise<CategoryType[] | undefined> => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/resolve/${endpoint}?locale=${requestLocale}`,
          { method: 'GET' }
        );
        if (!response.ok)
          throw await responseError(
            response,
            `Failed to fetch ${catalog} types.`
          );
        const responseData: ApiResponse<CategoryType[]> = await response.json();
        const catalogCache = cache.get(catalog) ?? new Map<SupportedLocale, CategoryType[]>();
        catalogCache.set(requestLocale, responseData.data);
        cache.set(catalog, catalogCache);
        return responseData.data;
      } catch (error) {
        console.error(error);
        return undefined;
      } finally {
        requests.delete(key);
      }
    });
    requests.set(key, promise);
    return promise;
  }

  async function fetchActivityTypes(): Promise<ActivityType[] | undefined> {
    activityRequested = true;
    const requestedLocale = locale.value;
    const types = await requestCatalog('activity', requestedLocale);
    if (types && requestedLocale === locale.value) activityTypes.value = types;
    return types;
  }

  async function fetchLocationTypes(): Promise<LocationType[] | undefined> {
    locationRequested = true;
    const requestedLocale = locale.value;
    const types = await requestCatalog('location', requestedLocale);
    if (types && requestedLocale === locale.value)
      locationTypes.value = types;
    return types;
  }

  async function fetchEnglishActivityTypes(): Promise<ActivityType[] | undefined> {
    const types = await requestCatalog('activity', 'en');
    if (types) englishActivityTypes.value = types;
    return types;
  }

  function setLocale(nextLocale: SupportedLocale) {
    if (locale.value === nextLocale) return;
    locale.value = nextLocale;
    if (activityRequested) void fetchActivityTypes();
    if (locationRequested) void fetchLocationTypes();
  }

  return {
    activityTypes,
    locationTypes,
    englishActivityTypes,
    locale,
    fetchActivityTypes,
    fetchLocationTypes,
    fetchEnglishActivityTypes,
    setLocale,
  };
});
