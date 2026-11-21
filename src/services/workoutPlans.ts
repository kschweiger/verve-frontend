import type { ListResponse } from '@/types/api';
import { getAuthHeaders, getJsonAuthHeaders, responseError } from './authHeaders';

export interface ExerciseMuscle {
  code: string;
  id: string;
  name: string;
  role: 'primary' | 'secondary';
  muscle_groups: { code: string; id: string; name: string }[];
}
export interface Exercise {
  code: string;
  id: string;
  name: string;
  is_active: boolean;
  muscles: ExerciseMuscle[];
}
export interface PlanEntryInput {
  exercise_id: string;
  weight?: number | null;
  sets?: number | null;
  repetitions?: number | null;
}
export interface PlanEntry extends PlanEntryInput {
  id: number;
}
export interface WorkoutPlan {
  id: string;
  name: string;
  entries: PlanEntry[];
}
export interface PlanUpdate {
  name?: string;
  entries?: PlanEntryInput[];
}
const base = `${import.meta.env.VITE_API_BASE_URL}/strength_training`;
async function request<T>(path: string, init: RequestInit, message: string): Promise<T> {
  const response = await fetch(`${base}${path}`, init);
  if (!response.ok) throw await responseError(response, message);
  return response.json() as Promise<T>;
}
export async function fetchWorkoutPlans(): Promise<WorkoutPlan[]> {
  const result = await request<ListResponse<WorkoutPlan>>(
    '/exercise_plans',
    { headers: getAuthHeaders() },
    'Failed to load workout plans.'
  );
  return result.data.sort((a, b) => a.name.localeCompare(b.name));
}
export function fetchWorkoutPlan(id: string): Promise<WorkoutPlan> {
  return request(
    `/exercise_plans/${encodeURIComponent(id)}`,
    { headers: getAuthHeaders() },
    'Failed to load workout plan.'
  );
}
export async function fetchExercises(): Promise<Exercise[]> {
  const result = await request<ListResponse<Exercise>>(
    '/exercises',
    { headers: getAuthHeaders() },
    'Failed to load exercises.'
  );
  return result.data;
}
export function fetchExercise(id: string): Promise<Exercise> {
  return request(
    `/exercises/${encodeURIComponent(id)}`,
    { headers: getAuthHeaders() },
    'Failed to load exercise.'
  );
}
export function createWorkoutPlan(payload: {
  name: string;
  entries: PlanEntryInput[];
}): Promise<WorkoutPlan> {
  return request(
    '/exercise_plans',
    { method: 'POST', headers: getJsonAuthHeaders(), body: JSON.stringify(payload) },
    'Failed to create workout plan.'
  );
}
export function updateWorkoutPlan(id: string, payload: PlanUpdate): Promise<WorkoutPlan> {
  return request(
    `/exercise_plans/${encodeURIComponent(id)}`,
    { method: 'PATCH', headers: getJsonAuthHeaders(), body: JSON.stringify(payload) },
    'Failed to save workout plan.'
  );
}
export function duplicateWorkoutPlan(id: string, name: string): Promise<WorkoutPlan> {
  const query = new URLSearchParams({ name });
  return request(
    `/exercise_plans/${encodeURIComponent(id)}?${query}`,
    { method: 'POST', headers: getAuthHeaders() },
    'Failed to duplicate workout plan.'
  );
}
export async function deleteWorkoutPlan(id: string): Promise<void> {
  const response = await fetch(`${base}/exercise_plans/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (response.status !== 204)
    throw await responseError(response, 'Failed to delete workout plan.');
}
