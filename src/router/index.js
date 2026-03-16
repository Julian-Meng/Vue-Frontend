import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'api-test',
      component: () => import('../../views/ApiTestView.vue'),
    },
  ],
})

export default router
