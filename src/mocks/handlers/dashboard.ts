import { http } from 'msw'
import { ok, unauth, forbidden, delay } from './_resp'
import { db, currentUser, computeMemberStats, userById } from '../db'
import type { DashboardOverview, MemberActivity, RecentProject, TrendPoint } from '@/api/types'

const TREND = [42, 58, 45, 72, 66, 88, 74]
const DAY = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export const dashboardHandlers = [
  http.get('/api/dashboard/overview', async ({ request }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    if (u.role !== 'admin') return forbidden('仅管理员可访问工作台')
    const overview: DashboardOverview = {
      activeProjects: db.projects.filter((p) => p.status === 'active').length,
      archivedProjects: 36,
      monthlyGenerations: 428,
      activeDesigners: db.users.filter((x) => x.role === 'designer').length,
    }
    await delay()
    return ok(overview)
  }),

  http.get('/api/dashboard/recent-projects', ({ request }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    if (u.role !== 'admin') return forbidden()
    const rows: RecentProject[] = [...db.projects]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 6)
      .map((p) => ({
        id: p.id,
        name: p.name,
        ownerName: userById(p.ownerUserId)?.displayName || '-',
        status: p.status,
        generationCount: p.generationCount,
        updatedAt: p.updatedAt,
      }))
    return ok(rows)
  }),

  http.get('/api/dashboard/member-activity', ({ request }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    if (u.role !== 'admin') return forbidden()
    const rows: MemberActivity[] = db.users
      .filter((x) => x.role === 'designer')
      .map((x) => {
        const s = computeMemberStats(x)
        return {
          userId: x.userId,
          displayName: x.displayName,
          avatarUrl: x.avatarUrl,
          projectsCount: s.projectsCount,
          monthlyGenerations: s.monthlyGenerations,
          lastActiveAt: s.lastActiveAt,
          activityStatus: s.activityStatus,
        }
      })
    return ok(rows)
  }),

  http.get('/api/dashboard/generation-trend', ({ request }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    if (u.role !== 'admin') return forbidden()
    const rows: TrendPoint[] = TREND.map((v, i) => ({ label: DAY[i], value: v }))
    return ok(rows)
  }),
]
