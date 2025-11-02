import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

// The name of the store, 'auth', is a unique key
export const useUserStore = defineStore('user', () => {
  // --- STATE ---
  // Initialize the token from localStorage to persist login across page refreshes.
  const token = ref(localStorage.getItem('auth_token'));

  const user_full_name = ref(localStorage.getItem('user_full_name'));
  const user_name = ref(localStorage.getItem('user_name'));

  // --- GETTERS ---
  // A computed property to easily check if the user is authenticated.
  const isAuthenticated = computed(() => !!token.value);

  // --- ACTIONS ---
  /**
   * Sets the authentication token in state and localStorage.
   * @param {string} newToken The token received from the API.
   */
  function setToken(newToken: string) {
    localStorage.setItem('auth_token', newToken);
    token.value = newToken;
  }

  /**
   * Sets the user names in state and localStorage.
   * @param {string} name username  of the user
   * @param {string} fullName Full name of the user
   */
  function setUserInfo(info: { name?: string | null; fullName?: string | null }) {
    if (typeof info.name !== 'undefined') {
      if (info.name) {
        localStorage.setItem('user_name', info.name);
        user_name.value = info.name;
      } else {
        localStorage.removeItem('user_name');
        user_name.value = null;
      }
    }
    if (typeof info.fullName !== 'undefined') {
      if (info.fullName) {
        localStorage.setItem('user_full_name', info.fullName);
        user_full_name.value = info.fullName;
      } else {
        localStorage.removeItem('user_full_name');
        user_full_name.value = null;
      }
    }
  }

  /**
   * Clears the authentication token from state and localStorage.
   */
  function clearToken() {
    localStorage.removeItem('auth_token');
    token.value = null;
  }


  /**
   * Clears all user-specific information (but not the token).
   */
  function clearUserInfo() {
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_full_name');
    user_name.value = null;
    user_full_name.value = null;
  }


  /**
   * Attempts to log in the user by calling the API.
   * @param {string} email The user's email.
   * @param {string} password The user's password.
   * @returns {Promise<boolean>} True if login was successful, false otherwise.
   */
  async function login(email: string, password: string): Promise<boolean> {
    try {
      // IMPORTANT: Your FastAPI endpoint expects 'application/x-www-form-urlencoded'
      // We must format the body accordingly using URLSearchParams.
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
      const data = await response.json();
      if (!data.access_token) return false;

      // Token received, set it in the store immediately
      setToken(data.access_token);

      const response_user = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${data.access_token}`
        },
      }
      );

      if (!response_user.ok) {
        clearToken(); // Roll back the token
        return false;
      }

      const data_user = await response_user.json();

      setUserInfo({ name: data_user.name, fullName: data_user.full_name });
      return true;


    } catch (error) {
      console.error('Login API call error:', error);
      clearToken();
      clearUserInfo();
      return false;
    }
  }

  /**
   * Logs the user out.
   */
  function logout() {
    clearToken();
    clearUserInfo();
    // Here we can also add a redirect to the login page if needed.
    // For example: router.push({ name: 'login' });
  }


  // Expose the state, getters, and actions for components to use
  return {
    token, user_full_name, user_name, isAuthenticated, login, logout,
    setToken,
    setUserInfo,
  }
})
