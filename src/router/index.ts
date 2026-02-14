import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useUserStore } from '@/stores/auth';

// Layouts & Views
import MainLayout from '@/layouts/MainLayout.vue';
import LoginView from '@/views/LoginView.vue';
import DashboardView from '@/views/DashboardView.vue';

// Type Augmentation for meta fields
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
  },
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard',
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: DashboardView,
      },
      {
        path: 'activity/:id',
        name: 'activity-detail',
        component: () => import('@/views/ActivityDetailView.vue'),
        props: true,
      },
      {
        path: 'activities/:id/edit',
        name: 'activity-edit',
        component: () => import('@/views/ActivityEditView.vue'),
        props: true,
      },
      {
        path: 'activities',
        name: 'activities',
        component: () => import('@/views/ActivityListView.vue'),
      },
      {
        path: 'calendar',
        name: 'calendar',
        component: () => import('@/views/CalendarView.vue'),
      },
      {
        path: 'heatmap',
        name: 'heatmap',
        component: () => import('@/views/HeatmapView.vue'),
      },
      {
        path: 'goals',
        name: 'goals',
        component: () => import('@/views/GoalsView.vue'),
      },
      {
        path: 'locations',
        name: 'locations',
        component: () => import('@/views/LocationsView.vue'),
      },
      {
        path: 'equipment',
        name: 'equipment',
        component: () => import('@/views/EquipmentView.vue'),
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/SettingsView.vue'),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to, from, next) => {
  const auth = useUserStore();

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next({ name: 'login' });
  } else if (to.name === 'login' && auth.isAuthenticated) {
    next({ name: 'dashboard' });
  } else {
    next();
  }
});

export default router;
