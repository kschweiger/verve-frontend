import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/auth'

// Import the Layout and Views
import MainLayout from '@/layouts/MainLayout.vue'
import LoginView from '@/views/LoginView.vue'
import DashboardView from '@/views/DashboardView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // This is the top-level route for non-authenticated users
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },

    // This is a new "parent" route for all authenticated pages
    {
      path: '/',
      component: MainLayout, // All children of this route will be rendered inside MainLayout
      meta: { requiresAuth: true }, // Protect all child routes at once
      children: [
        {
          path: '', // Default child route, redirects to dashboard
          redirect: '/dashboard'
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: DashboardView
        },
        {
          // The ':id' is a dynamic parameter
          path: 'activity/:id',
          name: 'activity-detail',
          // Use a dynamic import for the component for better performance
          component: () => import('@/views/ActivityDetailView.vue'),
          // This automatically passes the ':id' from the URL as a prop to the component
          props: true
        },
        {
          path: 'activities/:id/edit',
          name: 'activity-edit',
          component: () => import('@/views/ActivityEditView.vue'),
          props: true // Pass the 'id' as a prop
        },
        {
          path: 'activities',
          name: 'activities',
          component: () => import('@/views/ActivityListView.vue')
        },
        {
          path: 'heatmap',
          name: 'heatmap',
          component: () => import('@/views/HeatmapView.vue')
        },
        {
          path: 'goals',
          name: 'goals',
          component: () => import('@/views/GoalsView.vue')
        },
        {
          path: 'locations',
          name: 'locations',
          component: () => import('@/views/LocationsView.vue')
        },
        {
          path: 'equipment',
          name: 'equipment',
          component: () => import('@/views/EquipmentView.vue')
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/SettingsView.vue')
        }
      ]
    },
  ]
})

// The global guard now protects any route with meta.requiresAuth
router.beforeEach((to, from, next) => {
  // We must initialize the store here to use it inside the guard
  const auth = useUserStore();

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    // If route requires auth and user is not logged in, redirect to login
    next({ name: 'login' });
  } else if (to.name === 'login' && auth.isAuthenticated) {
    // If a logged-in user tries to access the login page, send them to the dashboard
    next({ name: 'dashboard' });
  } else {
    // Otherwise, proceed
    next();
  }
});

export default router
