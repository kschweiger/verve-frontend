import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

interface LoginResponse {
  access_token: string;
  token_type: string;
}

interface UserInfoPayload {
  name?: string | null;
  fullName?: string | null;
}

interface UserMeResponse {
  name: string;
  full_name: string;
  email: string;
  // add other fields if needed
}

export const useUserStore = defineStore('user', () => {
  // --- STATE ---
  const token = ref<string | null>(localStorage.getItem('auth_token'));
  const user_full_name = ref<string | null>(localStorage.getItem('user_full_name'));
  const user_name = ref<string | null>(localStorage.getItem('user_name'));

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
    try {
      const body = new URLSearchParams();
      body.append('username', email);
      body.append('password', password);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/login/access-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body,
      });

      if (!response.ok) return false;

      const data: LoginResponse = await response.json();
      if (!data.access_token) return false;

      setToken(data.access_token);

      // Fetch User Details immediately
      const responseUser = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      });

      if (!responseUser.ok) {
        clearToken();
        return false;
      }

      const dataUser: UserMeResponse = await responseUser.json();
      setUserInfo({ name: dataUser.name, fullName: dataUser.full_name });
      return true;

    } catch (error) {
      console.error('Login API call error:', error);
      clearToken();
      clearUserInfo();
      return false;
    }
  }

  function logout() {
    clearToken();
    clearUserInfo();
  }

  return {
    token,
    user_full_name,
    user_name,
    isAuthenticated,
    login,
    logout,
    setToken,
    setUserInfo,
  };
});
