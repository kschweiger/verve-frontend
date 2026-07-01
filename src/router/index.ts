import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useUserStore } from '@/stores/auth';

// Layouts & Views
import MainLayout from '@/layouts/MainLayout.vue';
import LoginView from '@/views/LoginView.vue';
import ForgotPasswordView from '@/views/ForgotPasswordView.vue';
import ResetPasswordView from '@/views/ResetPasswordView.vue';
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
    path: '/forgot-password',
    name: 'forgot-password',
    component: ForgotPasswordView,
  },
  {
    path: '/reset-password/:token?',
    name: 'reset-password',
    component: ResetPasswordView,
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
        path: 'collections',
        name: 'collections',
        component: () => import('@/views/CollectionListView.vue'),
      },
      {
        path: 'collections/new',
        name: 'collection-create',
        component: () => import('@/views/CollectionCreateView.vue'),
      },
      {
        path: 'collections/:id',
        name: 'collection-detail',
        component: () => import('@/views/CollectionDetailView.vue'),
        props: true,
      },
      {
        path: 'collections/:id/edit',
        name: 'collection-edit',
        component: () => import('@/views/CollectionEditView.vue'),
        props: true,
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
        path: 'records',
        name: 'records',
        component: () => import('@/views/RecordsView.vue'),
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
      {
        path: 'tags',
        name: 'tags',
        component: () => import('@/views/TagsView.vue'),
      },
      {
        path: 'help',
        name: 'help',
        component: () => import('@/views/HelpView.vue'),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to) => {
  const auth = useUserStore();

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' };
  }

  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'dashboard' };
  }

  return true;
});

export default router;
