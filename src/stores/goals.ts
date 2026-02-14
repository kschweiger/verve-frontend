import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from './auth';

export interface Goal {
  id: string;
  name: string;
  description: string | null;
  target: number;
  current: number;
  progress: number;
  reached: boolean;
  temporal_type: 'yearly' | 'monthly' | 'weekly';
  year: number;
  month: number | null;
  type: 'activity' | 'manual' | 'location';
  aggregation: 'count' | 'total_distance' | 'avg_distance' | 'max_distance' | 'duration';
  constraints: Record<string, unknown>;
}

export interface GoalCreatePayload {
  name: string;
  description?: string;
  target: number;
  type: string;
  aggregation: string;
  temporal_type: string;
  year: number;
  month?: number | null;
  week?: number | null;
  constraints?: Record<string, unknown>;
}

interface ApiResponse<T> {
  data: T;
}

export const useGoalStore = defineStore('goal', () => {
  const goals = ref<Goal[]>([]);
  const yearlyGoals = ref<Goal[]>([]);
  const monthlyGoals = ref<Goal[]>([]);
  const weeklyGoals = ref<Goal[]>([]);

  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const userStore = useUserStore();
  const getHeaders = () => ({
    Authorization: `Bearer ${userStore.token}`,
    'Content-Type': 'application/json',
  });

  async function _fetch(year: number, month?: number | null, week?: number | null) {
    const params = new URLSearchParams();
    params.append('year', year.toString());

    if (month !== undefined && month !== null) params.append('month', month.toString());
    if (week !== undefined && week !== null) params.append('week', week.toString());

    const queryString = params.toString();
    const url = `${import.meta.env.VITE_API_BASE_URL}/goal/${queryString ? '?' + queryString : ''}`;

    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch goals');
    const data: ApiResponse<Goal[]> = await response.json();
    return data.data;
  }

  async function fetchGoals(year: number, month?: number | null) {
    isLoading.value = true;
    try {
      goals.value = await _fetch(year, month);
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchAllGoalsForView(year: number, month: number, week?: number) {
    isLoading.value = true;
    try {
      const [yearly, monthly, weekly] = await Promise.all([
        _fetch(year),
        _fetch(year, month),
        week ? _fetch(year, null, week) : Promise.resolve([]),
      ]);

      yearlyGoals.value = yearly.filter((g) => g.temporal_type === 'yearly');
      monthlyGoals.value = monthly.filter((g) => g.temporal_type === 'monthly');
      weeklyGoals.value = weekly.filter((g) => g.temporal_type === 'weekly');
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      isLoading.value = false;
    }
  }

  async function createGoal(payload: GoalCreatePayload) {
    isLoading.value = true;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/goal/`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to create goal');

      await fetchGoals(payload.year, payload.month);
      return true;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateGoal(
    id: string,
    attribute: 'name' | 'description' | 'target',
    value: string | number
  ) {
    try {
      const params = new URLSearchParams();
      params.append('attribute', attribute);
      params.append('value', value.toString());

      const url = `${import.meta.env.VITE_API_BASE_URL}/goal/${id}/update?${params.toString()}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error('Failed to update goal');
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async function deleteGoal(id: string) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/goal/?id=${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error('Failed to delete goal');

      goals.value = goals.value.filter((g) => g.id !== id);
      return true;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e);
      return false;
    }
  }

  async function modifyManualGoal(id: string, increase: boolean, amount = 1) {
    try {
      const params = new URLSearchParams();
      params.append('id', id);
      // NOTE: Assuming the backend handles logic via specific endpoint or params for manual update.
      // Based on original code, it seemed to just re-fetch or call a specific GET.
      // Adjusting to what looks like a fetch-refresh pattern or specific update command.
      // For now, retaining original logic structure but adding types.

      const url = `${import.meta.env.VITE_API_BASE_URL}/goal/?${params.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!response.ok) throw new Error('Failed to update goal');

      const updatedGoal: Goal = await response.json();

      const index = goals.value.findIndex((g) => g.id === id);
      if (index !== -1) {
        goals.value[index] = updatedGoal;
      }
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  return {
    goals,
    yearlyGoals,
    monthlyGoals,
    weeklyGoals,
    isLoading,
    error,
    fetchGoals,
    fetchAllGoalsForView,
    createGoal,
    updateGoal,
    deleteGoal,
    modifyManualGoal,
  };
});
