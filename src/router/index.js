import { createRouter, createWebHistory } from 'vue-router'
import { getStoredToken } from '../../apis/request'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: () => import('../../views/LoginView.vue'),
    },
    {
      path: '/login',
      redirect: '/',
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../../views/RegisterView.vue'),
    },
    {
      path: '/api-test',
      name: 'api-test',
      component: () => import('../../views/ApiTestView.vue'),
    },
      {
        path: '/dashboard',
        name: 'dashboard',
        meta: { requiresAuth: true },
        component: () => import('../../views/DashboardView.vue'),
      },
  ],
})

router.beforeEach((to) => {
  const hasToken = Boolean(getStoredToken())

  if (to.meta.requiresAuth && !hasToken) {
    return '/'
  }

  if (hasToken && (to.path === '/' || to.path === '/login')) {
    return '/dashboard'
  }

  return true
})

export default router
