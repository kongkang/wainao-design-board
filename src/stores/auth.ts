import { defineStore } from 'pinia'
import { http, setToken, getToken } from '@/api/http'
import type { User } from '@/api/types'

/** 认证 —— 简化 OAuth：登录页选账号即登录，mock 发含 role 的 token */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    ready: false,
  }),
  getters: {
    isAuthed: (s) => !!s.user,
    role: (s) => s.user?.role ?? null,
    isAdmin: (s) => s.user?.role === 'admin',
    isDesigner: (s) => s.user?.role === 'designer',
  },
  actions: {
    async login(accountId: string) {
      const res = await http.post<{ accessToken: string; user: User }>('/auth/login', { accountId })
      setToken(res.accessToken)
      this.user = res.user
      return res.user
    },
    async fetchMe() {
      if (!getToken()) {
        this.ready = true
        return null
      }
      try {
        this.user = await http.get<User>('/me')
      } catch {
        setToken(null)
        this.user = null
      } finally {
        this.ready = true
      }
      return this.user
    },
    async logout() {
      try {
        await http.post('/auth/logout')
      } catch {
        /* ignore */
      }
      setToken(null)
      this.user = null
    },
  },
})
