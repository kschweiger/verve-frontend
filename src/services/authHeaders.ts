import { useUserStore } from '../stores/auth';

export function getAuthHeaders(): HeadersInit {
  const token = useUserStore().token;
  if (!token) throw new Error('Not authenticated.');
  return { Authorization: `Bearer ${token}` };
}

export class ApiResponseError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiResponseError';
  }
}
