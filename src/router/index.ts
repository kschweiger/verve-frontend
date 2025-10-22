import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true } // Mark this route as needing authentication
    },
    // A catch-all route to redirect the root path
    {
      path: '/',
      redirect: to => {
        const auth = useAuthStore();
        return auth.isAuthenticated ? '/dashboard' : '/login';
      }
    },
  ]
})

// Global Navigation Guard
router.beforeEach((to, from, next) => {
  const auth = useAuthStore();

  // Check if the route requires authentication
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    // If not authenticated, redirect to the login page
    next({ name: 'login' });
  } else if (to.name === 'login' && auth.isAuthenticated) {
    // If an authenticated user tries to visit the login page, redirect them to the dashboard
    next({ name: 'dashboard' });
  } else {
    // Otherwise, allow the navigation
    next();
  }
});

export default router
