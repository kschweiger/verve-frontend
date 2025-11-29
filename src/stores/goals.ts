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
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const userStore = useUserStore();
  const getHeaders = () => ({
    'Authorization': `Bearer ${userStore.token}`,
    'Content-Type': 'application/json'
  });

  async function fetchGoals(year: number, month?: number | null) {
    isLoading.value = true;
    goals.value = [];
    try {
      const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/goal/`);
      url.searchParams.append('year', year.toString());
      if (month) url.searchParams.append('month', month.toString());

      const response = await fetch(url.toString(), { headers: getHeaders() });
      if (!response.ok) throw new Error('Failed to fetch goals');

      const data = await response.json();
      goals.value = data.data; // API returns { data: [], count: n }
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
  return { goals, isLoading, error, fetchGoals, createGoal, deleteGoal, modifyManualGoal };
});
