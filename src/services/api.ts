import { useUserStore } from '@/stores/auth';
import type { Activity } from '@/stores/activity';
import { parseISODuration, formatDuration } from '@/utils/datetime';

// Raw API Response Interface
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

  const responseData = await response.json();

  if (!responseData.data || !Array.isArray(responseData.data)) {
    return [];
  }

  // Explicit mapping ensures type safety for TrackPoint[]
  return responseData.data.map((p: any) => ({
    lat: p.latitude ?? null,
    lon: p.longitude ?? null,
    ele: p.elevation ?? null,
    dist: p.cum_distance ?? 0,
    time: p.time,
    speed: p.speed_m_s ?? null,
    hr: p.heartrate ?? null,
    cad: p.cadence ?? null,
    power: p.power ?? null,
  }));
}
