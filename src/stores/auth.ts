import { ref, computed, watch } from 'vue';
import { defineStore } from 'pinia';
import { fetchCurrentUser, type UserMe } from '../services/users';
import { ApiResponseError } from '../services/authHeaders';

interface LoginResponse {
  access_token: string;
  token_type?: string;
}

interface UserInfoPayload {
  name?: string | null;
  fullName?: string | null;
}

export const useUserStore = defineStore('user', () => {
  // --- STATE ---
  const token = ref<string | null>(localStorage.getItem('auth_token'));
  const user_full_name = ref<string | null>(localStorage.getItem('user_full_name'));
  const user_name = ref<string | null>(localStorage.getItem('user_name'));

  const currentUser = ref<UserMe | null>(null);
  const currentUserError = ref<string | null>(null);
  const isLoadingCurrentUser = ref(false);
  let session = 0;
  let loginAttempt = 0;
  let userRequest: Promise<UserMe> | null = null;

  watch(token, () => {
    session++;
    currentUser.value = null;
    currentUserError.value = null;
    isLoadingCurrentUser.value = false;
    userRequest = null;
    clearUserInfo();
  }, { flush: 'sync' });

  const isAdmin = computed(() => isAuthenticated.value && currentUser.value?.is_admin === true);

  function ensureCurrentUser(refresh = false): Promise<UserMe> {
    if (!token.value) return Promise.reject(new Error('Not authenticated.'));
    if (userRequest) return userRequest;
    if (!refresh && currentUser.value) return Promise.resolve(currentUser.value);
    const currentSession = session;
    isLoadingCurrentUser.value = true;
    currentUserError.value = null;
    const request = fetchCurrentUser().then(user => {
      if (currentSession !== session) throw new Error('Account changed while loading your profile.');
      currentUser.value = user;
      setUserInfo({ name: user.name, fullName: user.full_name });
      return user;
    }).catch((error: unknown) => {
      if (currentSession === session) {
        currentUser.value = null;
        currentUserError.value = error instanceof Error ? error.message : 'Failed to load your account.';
        if (error instanceof ApiResponseError && error.status === 401) logout();
      }
      throw error;
    }).finally(() => {
      if (currentSession === session) isLoadingCurrentUser.value = false;
      if (userRequest === request) userRequest = null;
    });
    userRequest = request;
    return request;
  }

  function revokeAdmin() {
    session++;
    userRequest = null;
    isLoadingCurrentUser.value = false;
    if (currentUser.value) currentUser.value = { ...currentUser.value, is_admin: false };
  }

  // --- GETTERS ---
  const isAuthenticated = computed(() => !!token.value);

  // --- ACTIONS ---
  function setToken(newToken: string) {
    localStorage.setItem('auth_token', newToken);
    token.value = newToken;
  }

  function setUserInfo(info: UserInfoPayload) {
    if (info.name !== undefined) {
      if (info.name) {
        localStorage.setItem('user_name', info.name);
        user_name.value = info.name;
      } else {
        localStorage.removeItem('user_name');
        user_name.value = null;
      }
    }
    if (info.fullName !== undefined) {
      if (info.fullName) {
        localStorage.setItem('user_full_name', info.fullName);
        user_full_name.value = info.fullName;
      } else {
        localStorage.removeItem('user_full_name');
        user_full_name.value = null;
      }
    }
  }

  function clearToken() {
    localStorage.removeItem('auth_token');
    token.value = null;
  }

  function clearUserInfo() {
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_full_name');
    user_name.value = null;
    user_full_name.value = null;
  }

  async function login(email: string, password: string): Promise<boolean> {
    const attempt = ++loginAttempt;
    let loginSession = session;
    try {
      const body = new URLSearchParams();
      body.append('username', email);
      body.append('password', password);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/login/access_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body,
      });

      if (!response.ok) return false;

      const data: LoginResponse = await response.json();
      if (attempt !== loginAttempt || loginSession !== session) return false;
      if (!data.access_token) return false;

      setToken(data.access_token);
      loginSession = session;
      await ensureCurrentUser(true);
      return attempt === loginAttempt && loginSession === session;

    } catch {
      if (attempt === loginAttempt && loginSession === session) logout();
      return false;
    }
  }

  function logout() {
    loginAttempt++;
    clearToken();
    clearUserInfo();
  }

  return {
    token,
    user_full_name,
    user_name,
    isAuthenticated,
    currentUser,
    currentUserError,
    isLoadingCurrentUser,
    isAdmin,
    ensureCurrentUser,
    revokeAdmin,
    login,
    logout,
    setToken,
    setUserInfo,
  };
});
