import { createRouter, createWebHistory } from 'vue-router'

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
        component: () => import('../../views/DashboardView.vue'),
      },
  ],
})

export default router
