import { ApiResponseError, getAuthHeaders } from './authHeaders';
import type { UserPublic } from './users';

export interface AdminUserJob {
  user_id: string;
  task_id: string;
}
export interface TrackReprocessingJob extends AdminUserJob {
  activity_id: string;
}
export interface TrackReprocessingJobs {
  tracks: TrackReprocessingJob[];
  completion_tasks: AdminUserJob[];
}
export interface HighlightRecalculationJobs {
  users: AdminUserJob[];
}
export interface AdminTaskStatus {
  task_id: string;
  state: string;
  result?: Record<string, unknown> | null;
  error?: string | null;
}

async function requestAdmin<T>(path: string, method: 'GET' | 'POST', expectedStatus: number): Promise<T> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/${path}`, {
    method, headers: getAuthHeaders(),
  });
  if (response.status !== expectedStatus) {
    throw new ApiResponseError(
      method === 'POST'
        ? 'Could not confirm that the job was queued. Check before submitting again.'
        : 'Failed to load admin data. Please try again.',
      response.status
    );
  }
  const data: T = await response.json();
  return data;
}

export function fetchAdminUsers(): Promise<UserPublic[]> {
  return requestAdmin<UserPublic[]>('users', 'GET', 200);
}

function userQuery(userId: string): string {
  if (!userId) throw new Error('Select a user.');
  return new URLSearchParams({ user_id: userId }).toString();
}

export function reprocessUserTracks(userId: string): Promise<TrackReprocessingJobs> {
  return requestAdmin<TrackReprocessingJobs>(`reprocess_tracks?${userQuery(userId)}`, 'POST', 202);
}

export function recalculateUserHighlights(userId: string): Promise<HighlightRecalculationJobs> {
  return requestAdmin<HighlightRecalculationJobs>(`recalculate_highlights?${userQuery(userId)}`, 'POST', 202);
}

export function fetchAdminTask(taskId: string): Promise<AdminTaskStatus> {
  return requestAdmin<AdminTaskStatus>(`tasks/${encodeURIComponent(taskId)}`, 'GET', 200);
}
