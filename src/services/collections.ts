import { responseError, getAuthHeaders, getJsonAuthHeaders } from './authHeaders';
import type * as Backend from '../types/api';
import type { Activity } from '../stores/activity';
import { mapApiActivity, mapApiTrackPoint, type TrackPoint } from './api';
import { formatDuration, parseISODuration } from '../utils/datetime';

export interface CollectionListFilters {
  limit?: number;
  offset?: number;
  year?: number | null;
  month?: number | null;
}

export interface CollectionOverview {
  id: string;
  activityIds: string[];
  name: string;
  description: string | null;
  count: number;
  distance: number | null;
  movingDuration: string | null;
  movingDurationSeconds: number | null;
  effectiveDuration: string;
  effectiveDurationSeconds: number;
  pauseDuration: string | null;
  pauseDurationSeconds: number | null;
  duration: string;
  durationSeconds: number;
  start: string;
  end: string;
  elevationGain: number | null;
  elevationLoss: number | null;
}

export interface CollectionDetail {
  id: string;
  name: string;
  description: string | null;
  activities: Activity[];
  totalDistance: number | null;
  totalDuration: string;
  totalDurationSeconds: number;
  totalMovingDuration: string | null;
  totalMovingDurationSeconds: number | null;
  effectiveDuration: string;
  effectiveDurationSeconds: number;
  pauseDuration: string | null;
  pauseDurationSeconds: number | null;
  totalElevationGain: number | null;
  totalElevationLoss: number | null;
}

export interface CollectionCreatePayload {
  name: string;
  description: string | null;
  activityIds: string[];
}

export interface CollectionUpdatePayload {
  name?: string | null;
  description?: string | null;
  activityIds?: string[];
  replaceActivities?: boolean;
}

export interface CollectionMutationResult {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  activityIds: string[];
}

export interface CollectionTrackPoint extends TrackPoint {
  activityId: string;
  activityIndex: number;
  collectionDist: number | null;
}

const parseDuration = (duration: string) => {
  const seconds = parseISODuration(duration);
  return {
    label: formatDuration(seconds),
    seconds,
  };
};

const deriveEffectiveDuration = (durationSeconds: number, movingDurationSeconds: number | null) => {
  const effectiveDurationSeconds =
    movingDurationSeconds !== null && movingDurationSeconds > 0
      ? movingDurationSeconds
      : durationSeconds;
  const pauseDurationSeconds =
    movingDurationSeconds !== null &&
    movingDurationSeconds > 0 &&
    durationSeconds > movingDurationSeconds
      ? durationSeconds - movingDurationSeconds
      : null;

  return {
    effectiveDuration: formatDuration(effectiveDurationSeconds),
    effectiveDurationSeconds,
    pauseDuration: pauseDurationSeconds === null ? null : formatDuration(pauseDurationSeconds),
    pauseDurationSeconds,
  };
};

function mapOverview(value: Backend.CollectionOverview): CollectionOverview {
  const { id, name, activity_ids: activityIds, count, duration, start, end } = value;
  const parsedDuration = parseDuration(duration);
  const movingDuration = value.moving_duration;
  const parsedMovingDuration = movingDuration === null ? null : parseDuration(movingDuration);
  const effectiveDuration = deriveEffectiveDuration(
    parsedDuration.seconds,
    parsedMovingDuration?.seconds ?? null
  );

  return {
    id,
    activityIds,
    name,
    description: value.description ?? null,
    count,
    distance: value.distance ?? null,
    movingDuration: parsedMovingDuration?.label ?? null,
    movingDurationSeconds: parsedMovingDuration?.seconds ?? null,
    ...effectiveDuration,
    duration: parsedDuration.label,
    durationSeconds: parsedDuration.seconds,
    start,
    end,
    elevationGain: value.elevation_change_up ?? null,
    elevationLoss: value.elevation_change_down ?? null,
  };
}

export function mapCollectionListResponse(
  value: Backend.ListResponse<Backend.CollectionOverview>
): CollectionOverview[] {
  return value.data
    .map(mapOverview)
    .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
}

export function mapCollectionDetailResponse(
  value: Backend.CollectionDetailResponse
): CollectionDetail {
  const { id, name, total_duration: totalDuration } = value;
  const parsedDuration = parseDuration(totalDuration);
  const movingDuration = value.total_moving_duration;
  const parsedMovingDuration = movingDuration === null ? null : parseDuration(movingDuration);
  const effectiveDuration = deriveEffectiveDuration(
    parsedDuration.seconds,
    parsedMovingDuration?.seconds ?? null
  );
  const activities = value.activities
    .map(mapApiActivity)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return {
    id,
    name,
    description: value.description ?? null,
    activities,
    totalDistance: value.total_distance ?? null,
    totalDuration: parsedDuration.label,
    totalDurationSeconds: parsedDuration.seconds,
    totalMovingDuration: parsedMovingDuration?.label ?? null,
    totalMovingDurationSeconds: parsedMovingDuration?.seconds ?? null,
    ...effectiveDuration,
    totalElevationGain: value.total_elevation_change_up ?? null,
    totalElevationLoss: value.total_elevation_change_down ?? null,
  };
}

export function mapCollectionTrackResponse(
  value: Backend.ListResponse<Backend.CollectionTrackPointResponse>
): CollectionTrackPoint[] {
  return value.data.map((point) => ({
    ...mapApiTrackPoint(point),
    activityId: point.activity_id,
    activityIndex: point.activity_index,
    collectionDist: point.collection_cum_distance,
  }));
}

const appendNullableNumberParam = (
  params: URLSearchParams,
  key: string,
  value: number | null | undefined
) => {
  if (value !== null && value !== undefined) {
    params.set(key, value.toString());
  }
};

const buildCollectionQuery = (filters: CollectionListFilters) => {
  const query = new URLSearchParams();
  query.set('limit', (filters.limit ?? 20).toString());
  query.set('offset', (filters.offset ?? 0).toString());
  appendNullableNumberParam(query, 'year', filters.year);
  appendNullableNumberParam(query, 'month', filters.month);
  return query.toString();
};

const mapMutationResult = (value: Backend.ActivityCollectionPublic): CollectionMutationResult => ({
  id: value.id,
  name: value.name,
  description: value.description ?? null,
  createdAt: value.created_at,
  activityIds: value.activity_ids,
});

export async function fetchCollections(
  filters: CollectionListFilters
): Promise<CollectionOverview[]> {
  const query = buildCollectionQuery(filters);
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/collection?${query}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw await responseError(response, 'Failed to fetch collections.');
  const data: Backend.ListResponse<Backend.CollectionOverview> = await response.json();
  return mapCollectionListResponse(data);
}

export async function createCollection(
  payload: CollectionCreatePayload
): Promise<CollectionMutationResult> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/collection`, {
    method: 'POST',
    headers: getJsonAuthHeaders(),
    body: JSON.stringify({
      name: payload.name,
      description: payload.description,
      activity_ids: payload.activityIds,
    }),
  });

  if (!response.ok) throw await responseError(response, 'Failed to create collection.');
  const data: Backend.ActivityCollectionPublic = await response.json();
  return mapMutationResult(data);
}

export async function fetchCollection(collectionId: string): Promise<CollectionDetail> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/collection/${collectionId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw await responseError(response, 'Failed to fetch collection.');
  const data: Backend.CollectionDetailResponse = await response.json();
  return mapCollectionDetailResponse(data);
}

export async function updateCollection(
  collectionId: string,
  payload: CollectionUpdatePayload
): Promise<CollectionMutationResult> {
  const body: Record<string, string | string[] | boolean | null> = {};
  if (payload.name !== undefined) body.name = payload.name;
  if (payload.description !== undefined) body.description = payload.description;
  if (payload.activityIds !== undefined) body.activity_ids = payload.activityIds;
  if (payload.replaceActivities !== undefined) body.replace_activities = payload.replaceActivities;

  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/collection/${collectionId}`, {
    method: 'PATCH',
    headers: getJsonAuthHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) throw await responseError(response, 'Failed to update collection.');
  const data: Backend.ActivityCollectionPublic = await response.json();
  return mapMutationResult(data);
}

export async function deleteCollection(collectionId: string): Promise<void> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/collection/${collectionId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw await responseError(response, 'Failed to delete collection.');
}

export async function fetchCollectionTrack(collectionId: string): Promise<CollectionTrackPoint[]> {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/collection/${collectionId}/track`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) throw await responseError(response, 'Failed to fetch collection track.');
  const data: Backend.ListResponse<Backend.CollectionTrackPointResponse> = await response.json();
  return mapCollectionTrackResponse(data);
}
