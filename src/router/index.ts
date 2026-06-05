import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'home', redirect: () => (useAuthStore().isAdmin ? '/dashboard' : '/projects') },
      { path: 'dashboard', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { adminOnly: true } },
      { path: 'projects', name: 'projects', component: () => import('@/views/ProjectsView.vue') },
      { path: 'projects/:id/board', name: 'board', component: () => import('@/views/BoardView.vue') },
      { path: 'materials', name: 'materials', component: () => import('@/views/MaterialsView.vue') },
      { path: 'members', name: 'members', component: () => import('@/views/MembersView.vue'), meta: { adminOnly: true } },
      { path: 'usage', name: 'usage', component: () => import('@/views/UsageView.vue'), meta: { adminOnly: true } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.ready) await auth.fetchMe()

  if (to.meta.public) {
    if (auth.isAuthed && to.name === 'login') return auth.isAdmin ? '/dashboard' : '/projects'
    return true
  }
  if (!auth.isAuthed) return { name: 'login', query: { redirect: to.fullPath } }
  if (to.meta.adminOnly && !auth.isAdmin) return '/projects'
  return true
})

export default router
