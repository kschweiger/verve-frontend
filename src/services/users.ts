import type { UserMe } from '../types/api';
import { ApiResponseError, getAuthHeaders } from './authHeaders';

export type { UserPublic, UserMe } from '../types/api';

export async function fetchCurrentUser(): Promise<UserMe> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new ApiResponseError('Failed to load your account.', response.status);
  const data: UserMe = await response.json();
  return data;
}
