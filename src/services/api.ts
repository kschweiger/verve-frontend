// src/services/api.ts
import { useUserStore } from '../stores/auth';
import type { Activity } from '../stores/activity';
import type * as Backend from '../types/api';
import { parseISODuration, formatDuration } from '../utils/datetime';

export type ApiActivity = Backend.ActivityPublic;

export interface ActivityPageParams {
  limit?: number;
  offset?: number;
  year?: number | null;
  month?: number | null;
  type_id?: number | null;
  sub_type_id?: number | null;
  category_id?: number | null;
  tag_id?: number | null;
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

export const supportedTrackExtensions = ['heartrate', 'power', 'cadence'] as const;
export type SupportedTrackExtension = (typeof supportedTrackExtensions)[number];

export type SegmentMetrics = Backend.SegmentMetrics;

export type SegmentMetric = Backend.SegmentMetric;

export interface SegmentDisplayMetadata {
  primaryMetric: SegmentMetric;
  displayMetrics: SegmentMetric[];
  speedUnit: 'm/s' | 'km/h' | 'miles/h';
  paceUnit: 's/km' | 's/mile' | 'min/km' | 'min/mile';
}

export interface SegmentStats {
  distanceM: number | null;
  durationS: number;
  elevationGain: number | null;
  elevationLoss: number | null;
  pace: SegmentMetrics | null;
  speed: SegmentMetrics | null;
  heartrate: SegmentMetrics | null;
  power: SegmentMetrics | null;
  cadence: SegmentMetrics | null;
}

export interface SegmentStatistics {
  segmentSetId: string;
  name: string;
  cuts: number[];
  displayMetadata: SegmentDisplayMetadata;
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

export const mapApiActivity = (apiActivity: ApiActivity): Activity => {
  const durationSeconds = parseISODuration(apiActivity.duration);
  const movingDurationSeconds =
    apiActivity.moving_duration === null || apiActivity.moving_duration === undefined
      ? null
      : parseISODuration(apiActivity.moving_duration);
  const effectiveDurationSeconds =
    movingDurationSeconds !== null && movingDurationSeconds > 0
      ? movingDurationSeconds
      : durationSeconds;

  return {
    id: apiActivity.id,
    start: apiActivity.start,
    timezone: apiActivity.timezone,
    duration: formatDuration(durationSeconds),
    durationSeconds: durationSeconds,
    movingDuration: movingDurationSeconds === null ? null : formatDuration(movingDurationSeconds),
    movingDurationSeconds,
    effectiveDuration: formatDuration(effectiveDurationSeconds),
    effectiveDurationSeconds,
    distance: apiActivity.distance,
    elevationGain: apiActivity.elevation_change_up ?? null,
    elevationLoss: apiActivity.elevation_change_down ?? null,
    type_id: apiActivity.type_id,
    sub_type_id: apiActivity.sub_type_id ?? null,
    name: apiActivity.name ?? null,
    avg_speed: apiActivity.avg_speed ?? null,
    max_speed: apiActivity.max_speed ?? null,
    avg_heartrate: apiActivity.avg_heartrate ?? null,
    max_heartrate: apiActivity.max_heartrate ?? null,
    avg_power: apiActivity.avg_power ?? null,
    max_power: apiActivity.max_power ?? null,
    metaData: apiActivity.meta_data ?? null,
    tags: apiActivity.tags.map((tag) => ({ ...tag, category_id: tag.category_id ?? null })),
  };
};

const appendNullableNumberParam = (
  params: URLSearchParams,
  key: string,
  value: number | null | undefined
) => {
  if (value !== null && value !== undefined) {
    params.set(key, value.toString());
  }
};

const mapSegmentStatistics = (value: Backend.SegmentStatisticsResponse): SegmentStatistics => ({
  segmentSetId: value.segment_set_id,
  name: value.name,
  cuts: value.cuts,
  displayMetadata: {
    primaryMetric: value.display_metadata.primary_metric,
    displayMetrics: value.display_metadata.display_metrics,
    speedUnit: value.display_metadata.speed_unit ?? 'km/h',
    paceUnit: value.display_metadata.pace_unit ?? 'min/km',
  },
  segments: value.segments.map((segment) => ({
    distanceM: segment.distance_m,
    durationS: segment.duration_s,
    elevationGain: segment.elevation_gain,
    elevationLoss: segment.elevation_loss,
    pace: segment.pace ?? null,
    speed: segment.speed ?? null,
    heartrate: segment.heartrate ?? null,
    power: segment.power ?? null,
    cadence: segment.cadence ?? null,
  })),
});

export const mapApiTrackPoint = (point: Backend.TrackPointResponse): TrackPoint => ({
  id: point.id,
  lat: point.latitude,
  lon: point.longitude,
  ele: point.elevation,
  dist: point.cum_distance ?? 0,
  time: point.time,
  speed: point.speed,
  hr: point.heartrate,
  cad: point.cadence,
  power: point.power,
});

export async function fetchActivitySummary(activityId: string): Promise<Activity> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/activity/${activityId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw new Error('Activity not found.');

  const apiActivity: ApiActivity = await response.json();
  return mapApiActivity(apiActivity);
}

export function buildActivityPageQuery(params: ActivityPageParams): string {
  const query = new URLSearchParams();

  query.set('limit', (params.limit ?? 20).toString());
  query.set('offset', (params.offset ?? 0).toString());
  appendNullableNumberParam(query, 'year', params.year);
  appendNullableNumberParam(query, 'month', params.month);
  appendNullableNumberParam(query, 'type_id', params.type_id);
  appendNullableNumberParam(query, 'sub_type_id', params.sub_type_id);
  appendNullableNumberParam(query, 'category_id', params.category_id);
  appendNullableNumberParam(query, 'tag_id', params.tag_id);

  return query.toString();
}

export async function fetchActivityPage(params: ActivityPageParams): Promise<Activity[]> {
  const query = buildActivityPageQuery(params);
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/activity/?${query}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw new Error('Failed to fetch activities.');

  const responseData: Backend.ListResponse<ApiActivity> = await response.json();
  return responseData.data.map(mapApiActivity);
}

export async function fetchActivityTrack(activityId: string): Promise<TrackPoint[]> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/track/${activityId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw new Error('Failed to fetch activity track data.');

  const responseData: Backend.ListResponse<Backend.TrackPointResponse> = await response.json();
  return responseData.data.map(mapApiTrackPoint);
}

export async function removeTrackExtensionData(
  activityId: string,
  extension: SupportedTrackExtension
): Promise<void> {
  const query = new URLSearchParams({ extension });
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/track/clear_track_extension_data/${activityId}?${query.toString()}`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
    }
  );

  if (response.status !== 204) throw new Error('Failed to remove track extension data.');
}

export async function fetchActivitySegmentSetIds(activityId: string): Promise<string[]> {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/track/segments/sets/${activityId}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) throw new Error('Failed to fetch segment sets.');

  const responseData: Backend.ListResponse<string> = await response.json();
  return responseData.data;
}

export async function fetchSegmentStatistics(segmentSetId: string): Promise<SegmentStatistics> {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/track/segments/set/${segmentSetId}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) throw new Error('Failed to fetch segment statistics.');

  const responseData: Backend.SegmentStatisticsResponse = await response.json();
  return mapSegmentStatistics(responseData);
}

export async function createSegmentSet(
  payload: SegmentSetCreatePayload
): Promise<SegmentSetPublic> {
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

  const responseData: Backend.SegmentSetPublic = await response.json();
  return { id: responseData.id, name: responseData.name, activityId: responseData.activity_id };
}

export async function updateSegmentSet(
  segmentSetId: string,
  payload: SegmentSetUpdatePayload
): Promise<void> {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/track/segments/set/${segmentSetId}`,
    {
      method: 'PATCH',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify({
        name: payload.name,
        cuts: payload.cuts,
      }),
    }
  );

  if (!response.ok) throw new Error('Failed to update segment set.');
}

export async function deleteSegmentSet(segmentSetId: string): Promise<void> {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/track/segments/set/${segmentSetId}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) throw new Error('Failed to delete segment set.');
}
