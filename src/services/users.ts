import { ApiResponseError, getAuthHeaders } from './authHeaders';

export interface UserPublic {
  id: string;
  name: string;
  email: string;
  full_name?: string | null;
}

export interface UserMe extends UserPublic {
  is_admin: boolean;
}

export async function fetchCurrentUser(): Promise<UserMe> {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me`, {
    method: 'GET', headers: getAuthHeaders(),
  });
  if (!response.ok) throw new ApiResponseError('Failed to load your account.', response.status);
  const data: UserMe = await response.json();
  return data;
}
