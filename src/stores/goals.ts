import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from './auth';

export interface Goal {
  id: string;
  name: string;
  description: string | null;
  target: number;
  current: number;
  progress: number; // 0.0 to 1.0+
  reached: boolean;
  temporal_type: 'yearly' | 'monthly' | 'weekly';
  year: number;
  month: number | null;
  type: 'activity' | 'manual' | 'location';
  aggregation: 'count' | 'total_distance' | 'avg_distance' | 'max_distance' | 'duration';
  constraints: Record<string, any>;
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
  constraints?: Record<string, any>;
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
    'Authorization': `Bearer ${userStore.token}`,
    'Content-Type': 'application/json'
  });


  // Update the helper _fetch to support the week param
  async function _fetch(year: number, month?: number | null, week?: number | null) {
    const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/goal/`);
    url.searchParams.append('year', year.toString());
    if (month !== undefined && month !== null) url.searchParams.append('month', month.toString());
    if (week !== undefined && week !== null) url.searchParams.append('week', week.toString());

    const response = await fetch(url.toString(), { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch goals');
    const data = await response.json();
    return data.data as Goal[];
  }

  async function fetchGoals(year: number, month?: number | null) {
    isLoading.value = true;
    try {
      goals.value = await _fetch(year, month);
    } catch (e: any) {
      error.value = e.message;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchAllGoalsForView(year: number, month: number, week?: number) {
    isLoading.value = true;
    try {
      // Parallel fetch for all buckets
      // Note: Passing year, month, and week to the same endpoint relies on
      // the backend returning goals relevant to those filters.
      const [yearly, monthly, weekly] = await Promise.all([
        _fetch(year),
        _fetch(year, month),
        week ? _fetch(year, null, week) : Promise.resolve([])
      ]);

      yearlyGoals.value = yearly.filter(g => g.temporal_type === 'yearly');
      monthlyGoals.value = monthly.filter(g => g.temporal_type === 'monthly');
      weeklyGoals.value = weekly.filter(g => g.temporal_type === 'weekly');

    } catch (e: any) {
      error.value = e.message;
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
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Failed to create goal');

      // Refresh the list after creation
      await fetchGoals(payload.year, payload.month);
      return true;
    } catch (e: any) {
      error.value = e.message;
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateGoal(id: string, attribute: 'name' | 'description' | 'target', value: string | number) {
    try {
      // API expects query params for this POST/UPDATE
      const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/goal/${id}/update`);
      url.searchParams.append('attribute', attribute);
      url.searchParams.append('value', value.toString());

      const response = await fetch(url.toString(), {
        method: 'POST', // Changed to POST based on your latest OpenAPI spec
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Failed to update goal');
      return true;
    } catch (e: any) {
      console.error(e);
      return false;
    }
  }
  async function deleteGoal(id: string) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/goal/?id=${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Failed to delete goal');

      // Optimistically remove from list
      goals.value = goals.value.filter(g => g.id !== id);
      return true;
    } catch (e: any) {
      error.value = e.message;
      return false;
    }
  }
  async function modifyManualGoal(id: string, increase: boolean, amount: number = 1) {
    // We don't set global loading here to avoid flickering the whole list
    // Instead, we return the result so the UI can handle local loading state if needed
    try {
      const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/goal/${id}/modify_amount`);
      url.searchParams.append('increase', increase.toString());
      url.searchParams.append('amount', amount.toString());

      const response = await fetch(url.toString(), {
        method: 'GET', // Following your OpenAPI spec
        headers: getHeaders()
      });

      if (!response.ok) throw new Error('Failed to update goal');

      const updatedGoal = await response.json();

      // Update the specific goal in the local list instantly
      const index = goals.value.findIndex(g => g.id === id);
      if (index !== -1) {
        goals.value[index] = updatedGoal;
      }
      return true;
    } catch (e: any) {
      console.error(e); // Log error but don't break UI
      return false;
    }
  }
  return {
    goals, yearlyGoals, monthlyGoals, weeklyGoals, isLoading, error,
    fetchGoals, fetchAllGoalsForView, createGoal, updateGoal, deleteGoal, modifyManualGoal
  };
});
