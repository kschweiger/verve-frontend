import { useAccountSession } from '../composables/useAccountSession';
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

  const captureSession = useAccountSession(() => {
    goals.value = [];
    yearlyGoals.value = [];
    monthlyGoals.value = [];
    weeklyGoals.value = [];
    isLoading.value = false;
    error.value = null;
  });

  async function _fetch(year: number, month?: number | null, week?: number | null) {
    const isCurrent = captureSession();
    const params = new URLSearchParams();
    params.append('year', year.toString());

    if (month !== undefined && month !== null) params.append('month', month.toString());
    if (week !== undefined && week !== null) params.append('week', week.toString());

    const queryString = params.toString();
    const url = `${import.meta.env.VITE_API_BASE_URL}/goal/${queryString ? '?' + queryString : ''}`;

    const response = await fetch(url, { headers: getHeaders() });
    if (!isCurrent()) return [];
    if (!response.ok) throw new Error('Failed to fetch goals');
    const data: ApiResponse<Goal[]> = await response.json();
    if (!isCurrent()) return [];
    return data.data;
  }

  async function fetchGoals(year: number, month?: number | null) {
    const isCurrent = captureSession();
    isLoading.value = true;
    try {
      const loadedGoals: typeof goals.value = await _fetch(year, month);
      if (!isCurrent()) return;
      goals.value = loadedGoals;
    } catch (e: unknown) {
      if (!isCurrent()) return;
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      if (isCurrent()) {
        isLoading.value = false;
      }
    }
  }

  async function fetchAllGoalsForView(year: number, month: number, week?: number) {
    const isCurrent = captureSession();
    isLoading.value = true;
    try {
      const [yearly, monthly, weekly] = await Promise.all([
        _fetch(year),
        _fetch(year, month),
        week ? _fetch(year, null, week) : Promise.resolve([]),
      ]);
      if (!isCurrent()) return;

      yearlyGoals.value = yearly.filter((g) => g.temporal_type === 'yearly');
      monthlyGoals.value = monthly.filter((g) => g.temporal_type === 'monthly');
      weeklyGoals.value = weekly.filter((g) => g.temporal_type === 'weekly');
    } catch (e: unknown) {
      if (!isCurrent()) return;
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      if (isCurrent()) {
        isLoading.value = false;
      }
    }
  }

  async function createGoal(payload: GoalCreatePayload) {
    const isCurrent = captureSession();
    isLoading.value = true;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/goal/`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (!isCurrent()) return false;
      if (!response.ok) throw new Error('Failed to create goal');

      await fetchGoals(payload.year, payload.month);
      if (!isCurrent()) return false;
      return true;
    } catch (e: unknown) {
      if (!isCurrent()) return false;
      error.value = e instanceof Error ? e.message : String(e);
      return false;
    } finally {
      if (isCurrent()) {
        isLoading.value = false;
      }
    }
  }

  async function updateGoal(
    id: string,
    attribute: 'name' | 'description' | 'target',
    value: string | number
  ) {
    const isCurrent = captureSession();
    try {
      const params = new URLSearchParams();
      params.append('attribute', attribute);
      params.append('value', value.toString());

      const url = `${import.meta.env.VITE_API_BASE_URL}/goal/${id}/update?${params.toString()}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!isCurrent()) return false;
      if (!response.ok) throw new Error('Failed to update goal');
      return true;
    } catch (e) {
      if (!isCurrent()) return false;
      console.error(e);
      return false;
    }
  }

  async function deleteGoal(id: string) {
    const isCurrent = captureSession();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/goal/?id=${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!isCurrent()) return false;
      if (!response.ok) throw new Error('Failed to delete goal');

      goals.value = goals.value.filter((g) => g.id !== id);
      return true;
    } catch (e: unknown) {
      if (!isCurrent()) return false;
      error.value = e instanceof Error ? e.message : String(e);
      return false;
    }
  }

  async function modifyManualGoal(id: string, increase: boolean, amount = 1) {
    const isCurrent = captureSession();
    error.value = null;
    try {
      const params = new URLSearchParams({ increase: String(increase), amount: String(amount) });
      const url = `${import.meta.env.VITE_API_BASE_URL}/goal/${id}/modify_amount?${params.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });
      if (!isCurrent()) return false;

      if (!response.ok) throw new Error('Failed to update goal');

      const updatedGoal: Goal = await response.json();
      if (!isCurrent()) return false;

      for (const cache of [goals, yearlyGoals, monthlyGoals, weeklyGoals]) {
        cache.value = cache.value.map((goal) => (goal.id === id ? updatedGoal : goal));
      }
      return true;
    } catch (e: unknown) {
      if (!isCurrent()) return false;
      error.value = e instanceof Error ? e.message : 'Failed to update goal';
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
