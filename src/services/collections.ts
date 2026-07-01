import { useUserStore } from '../stores/auth';
import type { Activity } from '../stores/activity';
import { mapApiActivity, type ApiActivity, type TrackPoint } from './api';
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const toNumber = (value: unknown): number | null => (typeof value === 'number' ? value : null);

const toNullableNumber = (value: unknown): number | null =>
  typeof value === 'number' ? value : null;

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const parseDuration = (duration: string) => {
  const seconds = parseISODuration(duration);
  return {
    label: formatDuration(seconds),
    seconds,
  };
};

function parseOverview(value: unknown): CollectionOverview {
  if (!isRecord(value)) throw new Error('Invalid collection overview.');

  const id = toString(value.id);
  const name = toString(value.name);
  const activityIds = toStringArray(value.activity_ids);
  const count = toNumber(value.count);
  const duration = toString(value.duration);
  const start = toString(value.start);
  const end = toString(value.end);

  if (
    id === null ||
    name === null ||
    activityIds.length === 0 ||
    count === null ||
    duration === null ||
    start === null ||
    end === null
  ) {
    throw new Error('Invalid collection overview.');
  }

  const parsedDuration = parseDuration(duration);
  const movingDuration = toString(value.moving_duration);
  const parsedMovingDuration = movingDuration === null ? null : parseDuration(movingDuration);

  return {
    id,
    activityIds,
    name,
    description: toString(value.description),
    count,
    distance: toNullableNumber(value.distance),
    movingDuration: parsedMovingDuration?.label ?? null,
    movingDurationSeconds: parsedMovingDuration?.seconds ?? null,
    duration: parsedDuration.label,
    durationSeconds: parsedDuration.seconds,
    start,
    end,
    elevationGain: toNullableNumber(value.elevation_change_up),
    elevationLoss: toNullableNumber(value.elevation_change_down),
  };
}

export function parseCollectionListResponse(value: unknown): CollectionOverview[] {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new Error('Invalid collection list response.');
  }

  return value.data
    .map(parseOverview)
    .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
}

export function parseCollectionDetailResponse(value: unknown): CollectionDetail {
  if (!isRecord(value) || !Array.isArray(value.activities)) {
    throw new Error('Invalid collection detail response.');
  }

  const id = toString(value.id);
  const name = toString(value.name);
  const totalDuration = toString(value.total_duration);

  if (id === null || name === null || totalDuration === null) {
    throw new Error('Invalid collection detail response.');
  }

  const parsedDuration = parseDuration(totalDuration);
  const movingDuration = toString(value.total_moving_duration);
  const parsedMovingDuration = movingDuration === null ? null : parseDuration(movingDuration);
  const activities = value.activities
    .filter(isRecord)
    .map((activity) => mapApiActivity(activity as unknown as ApiActivity))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return {
    id,
    name,
    description: toString(value.description),
    activities,
    totalDistance: toNullableNumber(value.total_distance),
    totalDuration: parsedDuration.label,
    totalDurationSeconds: parsedDuration.seconds,
    totalMovingDuration: parsedMovingDuration?.label ?? null,
    totalMovingDurationSeconds: parsedMovingDuration?.seconds ?? null,
    totalElevationGain: toNullableNumber(value.total_elevation_change_up),
    totalElevationLoss: toNullableNumber(value.total_elevation_change_down),
  };
}

function parseCollectionTrackPoint(value: unknown): CollectionTrackPoint {
  if (!isRecord(value)) throw new Error('Invalid collection track point.');

  const id = toNumber(value.id);
  const activityId = toString(value.activity_id);
  const activityIndex = toNumber(value.activity_index);
  const time = toString(value.time);

  if (id === null || activityId === null || activityIndex === null || time === null) {
    throw new Error('Invalid collection track point.');
  }

  return {
    id,
    lat: toNullableNumber(value.latitude),
    lon: toNullableNumber(value.longitude),
    ele: toNullableNumber(value.elevation),
    time,
    dist: toNullableNumber(value.cum_distance) ?? 0,
    speed: toNullableNumber(value.speed),
    hr: toNullableNumber(value.heartrate),
    cad: toNullableNumber(value.cadence),
    power: toNullableNumber(value.power),
    activityId,
    activityIndex,
    collectionDist: toNullableNumber(value.collection_cum_distance),
  };
}

export function parseCollectionTrackResponse(value: unknown): CollectionTrackPoint[] {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new Error('Invalid collection track response.');
  }

  return value.data.map(parseCollectionTrackPoint);
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

const parseMutationResult = (value: unknown): CollectionMutationResult => {
  if (!isRecord(value)) throw new Error('Invalid collection mutation response.');

  const id = toString(value.id);
  const name = toString(value.name);
  const createdAt = toString(value.created_at);

  if (id === null || name === null || createdAt === null) {
    throw new Error('Invalid collection mutation response.');
  }

  return {
    id,
    name,
    description: toString(value.description),
    createdAt,
    activityIds: toStringArray(value.activity_ids),
  };
};

export async function fetchCollections(filters: CollectionListFilters): Promise<CollectionOverview[]> {
  const query = buildCollectionQuery(filters);
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/collection?${query}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw new Error('Failed to fetch collections.');
  return parseCollectionListResponse(await response.json());
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

  if (!response.ok) throw new Error('Failed to create collection.');
  return parseMutationResult(await response.json());
}

export async function fetchCollection(collectionId: string): Promise<CollectionDetail> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/collection/${collectionId}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw new Error('Failed to fetch collection.');
  return parseCollectionDetailResponse(await response.json());
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

  if (!response.ok) throw new Error('Failed to update collection.');
  return parseMutationResult(await response.json());
}

export async function deleteCollection(collectionId: string): Promise<void> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/collection/${collectionId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw new Error('Failed to delete collection.');
}

export async function fetchCollectionTrack(collectionId: string): Promise<CollectionTrackPoint[]> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/collection/${collectionId}/track`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw new Error('Failed to fetch collection track.');
  return parseCollectionTrackResponse(await response.json());
}
