// src/services/api.ts
import type { Activity } from '@/stores/activity';
import { useUserStore } from '@/stores/auth';
import { parseISODuration, formatDuration } from '@/utils/datetime'; // <-- Import your helpers

// Define the structure of our track point data to match the API response
export interface TrackPoint {
  lat: number;
  lon: number;
  ele: number | null;
  dist: number; // This is 'cum_distance' from your API
  speed?: number | null; // Optional speed in m/s
  hr?: number | null; // Optional heart rate
  cad?: number | null; // Optional cadence
  power?: number | null; // Optional power
}

const getAuthHeaders = () => {
  const userStore = useUserStore();
  if (!userStore.token) throw new Error('Not authenticated');
  return { 'Authorization': `Bearer ${userStore.token}` };
};

// This helper will map the raw API response to our clean Activity interface
const mapApiActivity = (apiActivity: any): Activity => {
  // Your API returns elevation_change_up/down, let's ensure they are handled
  const elevationGain = apiActivity.elevation_change_up ?? 0;
  const elevationLoss = apiActivity.elevation_change_down ?? 0;

  return {
    id: apiActivity.id,
    start: apiActivity.start,
    duration: formatDuration(parseISODuration(apiActivity.duration)),
    distance: apiActivity.distance,
    durationSeconds: parseISODuration(apiActivity.duration),
    elevationGain: elevationGain,
    elevationLoss: elevationLoss,
    type_id: apiActivity.type_id,
    sub_type_id: apiActivity.sub_type_id,
    name: apiActivity.name,
    avg_speed: apiActivity.avg_speed,
    max_speed: apiActivity.max_speed,
    // Add other summary fields like avg_speed, avg_hr if they exist on this object
  };
};

/**
 * Fetches the summary data for a single activity.
 */
export async function fetchActivitySummary(activityId: string): Promise<Activity> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/activity/${activityId}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Activity not found.');
  const apiActivity = await response.json();
  return mapApiActivity(apiActivity); // Use the mapping function for consistency
}
/**
 * Fetches the detailed track data for an activity.
 */
export async function fetchActivityTrack(activityId: string): Promise<TrackPoint[]> {
  // The endpoint is /track/{activity_id}, not /track/{activity_id}/data
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/track/${activityId}`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch activity track data.');

  const responseData = await response.json();

  // Your API wraps the list in a "data" property
  if (!responseData.data) {
    return []; // Handle cases where data is missing
  }

  // Map the API response fields to our cleaner TrackPoint interface
  return responseData.data.map((p: any) => ({
    lat: p.latitude,
    lon: p.longitude,
    ele: p.elevation,
    dist: p.cum_distance,
    speed: p.speed_m_s,
    hr: p.heartrate,
    cad: p.cadence,
    power: p.power,
  }));
}
