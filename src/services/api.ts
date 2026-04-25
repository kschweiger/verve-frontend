// src/services/api.ts
import { useUserStore } from '@/stores/auth';
import type { Activity } from '@/stores/activity';
import type { ActivityTagPublic } from '@/stores/tags';
import { parseISODuration, formatDuration } from '@/utils/datetime';

export interface ApiActivity {
  id: string;
  start: string;
  duration: string;
  distance: number;
  elevation_change_up?: number | null;
  elevation_change_down?: number | null;
  type_id: number;
  sub_type_id?: number | null;
  name?: string | null;
  avg_speed?: number | null;
  max_speed?: number | null;
  tags?: ActivityTagPublic[];
}

export interface TrackPoint {
  lat: number | null;
  lon: number | null;
  ele: number | null;
  time: string;
  dist: number;
  speed?: number | null;
  hr?: number | null;
  cad?: number | null;
  power?: number | null;
}

interface ApiTrackPointResponse {
  latitude?: number | null;
  longitude?: number | null;
  elevation?: number | null;
  cum_distance?: number | null;
  time?: string;
  speed?: number | null;
  heartrate?: number | null;
  cadence?: number | null;
  power?: number | null;
}

const getAuthHeaders = (): HeadersInit => {
  const userStore = useUserStore();
  if (!userStore.token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${userStore.token}` };
};

const mapApiActivity = (apiActivity: ApiActivity): Activity => {
  const durationSeconds = parseISODuration(apiActivity.duration);

  return {
    id: apiActivity.id,
    start: apiActivity.start,
    duration: formatDuration(durationSeconds),
    durationSeconds: durationSeconds,
    distance: apiActivity.distance,
    elevationGain: apiActivity.elevation_change_up ?? null,
    elevationLoss: apiActivity.elevation_change_down ?? null,
    type_id: apiActivity.type_id,
    sub_type_id: apiActivity.sub_type_id ?? null,
    name: apiActivity.name ?? null,
    avg_speed: apiActivity.avg_speed ?? null,
    max_speed: apiActivity.max_speed ?? null,
    tags: apiActivity.tags ?? [],
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toNullableNumber = (value: unknown): number | null =>
  typeof value === 'number' ? value : null;

const mapApiTrackPoint = (point: ApiTrackPointResponse): TrackPoint | null => {
  if (typeof point.time !== 'string') return null;

  return {
    lat: point.latitude ?? null,
    lon: point.longitude ?? null,
    ele: point.elevation ?? null,
    dist: point.cum_distance ?? 0,
    time: point.time,
    speed: point.speed ?? null,
    hr: point.heartrate ?? null,
    cad: point.cadence ?? null,
    power: point.power ?? null,
  };
};

export async function fetchActivitySummary(activityId: string): Promise<Activity> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/activity/${activityId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw new Error('Activity not found.');

  const apiActivity: ApiActivity = await response.json();
  return mapApiActivity(apiActivity);
}

export async function fetchActivityTrack(activityId: string): Promise<TrackPoint[]> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/track/${activityId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw new Error('Failed to fetch activity track data.');

  const responseData: unknown = await response.json();

  if (!isRecord(responseData) || !Array.isArray(responseData.data)) {
    return [];
  }

  return responseData.data
    .filter(isRecord)
    .map((point) =>
      mapApiTrackPoint({
        latitude: toNullableNumber(point.latitude),
        longitude: toNullableNumber(point.longitude),
        elevation: toNullableNumber(point.elevation),
        cum_distance: toNullableNumber(point.cum_distance),
        time: typeof point.time === 'string' ? point.time : undefined,
        speed: toNullableNumber(point.speed),
        heartrate: toNullableNumber(point.heartrate),
        cadence: toNullableNumber(point.cadence),
        power: toNullableNumber(point.power),
      })
    )
    .filter((point): point is TrackPoint => point !== null);
}
