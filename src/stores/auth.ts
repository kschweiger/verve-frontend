import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

// The name of the store, 'auth', is a unique key
export const useAuthStore = defineStore('auth', () => {
  // --- STATE ---
  // Initialize the token from localStorage to persist login across page refreshes.
  const token = ref(localStorage.getItem('auth_token'));

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
   * Clears the authentication token from state and localStorage.
   */
  function clearToken() {
    localStorage.removeItem('auth_token');
    token.value = null;
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

      if (!response.ok) {
        // If the response is not 2xx, throw an error.
        return false;
      }

      const data = await response.json();

      // Check if the response contains the access_token
      if (data.access_token) {
        setToken(data.access_token);
        return true;
      } else {
        return false;
      }

    } catch (error) {
      console.error('Login API call error:', error);
      clearToken(); // Ensure any invalid token is cleared
      return false;
    }
  }

  /**
   * Logs the user out.
   */
  function logout() {
    clearToken();
    // Here we can also add a redirect to the login page if needed.
    // For example: router.push({ name: 'login' });
  }


  // Expose the state, getters, and actions for components to use
  return { token, isAuthenticated, login, logout, setToken }
})
