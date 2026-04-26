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
  id: number;
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
  id?: number;
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

export interface SegmentMetrics {
  avg: number;
  min: number;
  max: number;
}

export interface SegmentStats {
  distanceM: number;
  durationS: number;
  elevationGain: number;
  elevationLoss: number;
  avgPaceSPerKm: number | null;
  speed: SegmentMetrics | null;
  heartrate: SegmentMetrics | null;
  power: SegmentMetrics | null;
  cadence: SegmentMetrics | null;
}

export interface SegmentStatistics {
  segmentSetId: string;
  name: string;
  cuts: number[];
  segments: SegmentStats[];
}

export interface SegmentSetPublic {
  id: string;
  name: string;
  activityId: string;
}

export interface SegmentSetCreatePayload {
  name: string;
  activityId: string;
  cuts: number[];
}

export interface SegmentSetUpdatePayload {
  name?: string | null;
  cuts?: number[] | null;
}

const getAuthHeaders = (): HeadersInit => {
  const userStore = useUserStore();
  if (!userStore.token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${userStore.token}` };
};

const getJsonAuthHeaders = (): HeadersInit => ({
  ...getAuthHeaders(),
  'Content-Type': 'application/json',
});

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

const toNumber = (value: unknown): number | null => (typeof value === 'number' ? value : null);

const toString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const toNumberArray = (value: unknown): number[] =>
  Array.isArray(value) ? value.filter((item): item is number => typeof item === 'number') : [];

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const mapSegmentMetrics = (value: unknown): SegmentMetrics | null => {
  if (!isRecord(value)) return null;

  const avg = toNumber(value.avg);
  const min = toNumber(value.min);
  const max = toNumber(value.max);

  if (avg === null || min === null || max === null) return null;

  return { avg, min, max };
};

const mapSegmentStats = (value: unknown): SegmentStats | null => {
  if (!isRecord(value)) return null;

  const distanceM = toNumber(value.distance_m);
  const durationS = toNumber(value.duration_s);
  const elevationGain = toNumber(value.elevation_gain);
  const elevationLoss = toNumber(value.elevation_loss);

  if (distanceM === null || durationS === null || elevationGain === null || elevationLoss === null) {
    return null;
  }

  return {
    distanceM,
    durationS,
    elevationGain,
    elevationLoss,
    avgPaceSPerKm: toNullableNumber(value.avg_pace_s_per_km),
    speed: mapSegmentMetrics(value.speed),
    heartrate: mapSegmentMetrics(value.heartrate),
    power: mapSegmentMetrics(value.power),
    cadence: mapSegmentMetrics(value.cadence),
  };
};

const mapSegmentStatistics = (value: unknown): SegmentStatistics => {
  if (!isRecord(value)) throw new Error('Invalid segment statistics response.');

  const segmentSetId = toString(value.segment_set_id);
  const name = toString(value.name);
  if (segmentSetId === null || name === null || !Array.isArray(value.segments)) {
    throw new Error('Invalid segment statistics response.');
  }

  return {
    segmentSetId,
    name,
    cuts: toNumberArray(value.cuts),
    segments: value.segments.map(mapSegmentStats).filter((segment): segment is SegmentStats => segment !== null),
  };
};

const mapSegmentSetPublic = (value: unknown): SegmentSetPublic => {
  if (!isRecord(value)) throw new Error('Invalid segment set response.');

  const id = toString(value.id);
  const name = toString(value.name);
  const activityId = toString(value.activity_id);

  if (id === null || name === null || activityId === null) {
    throw new Error('Invalid segment set response.');
  }

  return { id, name, activityId };
};

const mapApiTrackPoint = (point: ApiTrackPointResponse): TrackPoint | null => {
  if (typeof point.id !== 'number') return null;
  if (typeof point.time !== 'string') return null;

  return {
    id: point.id,
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
        id: toNumber(point.id) ?? undefined,
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

export async function fetchActivitySegmentSetIds(activityId: string): Promise<string[]> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/track/segments/sets/${activityId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw new Error('Failed to fetch segment sets.');

  const responseData: unknown = await response.json();
  if (!isRecord(responseData)) return [];

  return toStringArray(responseData.data);
}

export async function fetchSegmentStatistics(segmentSetId: string): Promise<SegmentStatistics> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/track/segments/set/${segmentSetId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw new Error('Failed to fetch segment statistics.');

  const responseData: unknown = await response.json();
  return mapSegmentStatistics(responseData);
}

export async function createSegmentSet(payload: SegmentSetCreatePayload): Promise<SegmentSetPublic> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/track/segments/set`, {
    method: 'POST',
    headers: getJsonAuthHeaders(),
    body: JSON.stringify({
      name: payload.name,
      activity_id: payload.activityId,
      cuts: payload.cuts,
    }),
  });

  if (!response.ok) throw new Error('Failed to create segment set.');

  const responseData: unknown = await response.json();
  return mapSegmentSetPublic(responseData);
}

export async function updateSegmentSet(
  segmentSetId: string,
  payload: SegmentSetUpdatePayload
): Promise<void> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/track/segments/set/${segmentSetId}`, {
    method: 'PATCH',
    headers: getJsonAuthHeaders(),
    body: JSON.stringify({
      name: payload.name,
      cuts: payload.cuts,
    }),
  });

  if (!response.ok) throw new Error('Failed to update segment set.');
}

export async function deleteSegmentSet(segmentSetId: string): Promise<void> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/track/segments/set/${segmentSetId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw new Error('Failed to delete segment set.');
}
