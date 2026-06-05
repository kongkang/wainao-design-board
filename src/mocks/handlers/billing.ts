import { http } from 'msw'
import { ok, unauth, forbidden, delay } from './_resp'
import { db, currentUser } from '../db'
import { daysAgo, paginate } from '../util'
import type { MemberUsage, ProjectUsage, HeatmapPoint, UsageSummary } from '@/api/types'

const TREND = [42, 58, 45, 72, 66, 88, 74]
const DAY = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export const billingHandlers = [
  http.get('/api/billing/balance', ({ request }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    if (u.role !== 'admin') return forbidden('仅管理员可访问账户用量')
    return ok(db.balance)
  }),

  http.get('/api/billing/usage/summary', ({ request }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    if (u.role !== 'admin') return forbidden()
    const success = db.runs.filter((r) => r.status === 'success')
    const byModel = new Map<string, number>()
    success.forEach((r) => byModel.set(r.modelName, (byModel.get(r.modelName) || 0) + 1))
    const topModel = [...byModel.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Seedream 3.0'
    const summary: UsageSummary = {
      generations: 428,
      activeMembers: db.users.filter((x) => x.role === 'designer').length,
      projectsUsed: db.projects.length,
      topModel,
    }
    return ok(summary)
  }),

  http.get('/api/billing/usage/by-member', ({ request }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    if (u.role !== 'admin') return forbidden()
    const rows: MemberUsage[] = db.users
      .filter((x) => x.role === 'designer')
      .map((x) => {
        const runs = db.runs.filter((r) => r.memberId === x.userId)
        const projects = new Set(runs.map((r) => r.projectId))
        const monthly = ({ 'u-yuanhong': 128, 'u-a': 89, 'u-b': 44 } as Record<string, number>)[x.userId] ?? runs.length
        const last = runs.reduce<string>((acc, r) => (r.createdAt > acc ? r.createdAt : acc), '')
        return { memberId: x.userId, memberName: x.displayName, generations: monthly, projectsCount: projects.size, lastActiveAt: last }
      })
      .sort((a, b) => b.generations - a.generations)
    return ok(rows)
  }),

  http.get('/api/billing/usage/by-project', ({ request }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    if (u.role !== 'admin') return forbidden()
    const rows: ProjectUsage[] = db.projects
      .map((p) => {
        const owner = db.users.find((x) => x.userId === p.ownerUserId)
        const outputs = db.assets.filter((a) => a.projectId === p.id && a.type === 'output').length
        return { projectId: p.id, projectName: p.name, ownerName: owner?.displayName || '-', generations: p.generationCount, outputs }
      })
      .sort((a, b) => b.generations - a.generations)
    return ok(rows)
  }),

  http.get('/api/billing/usage/heatmap', ({ request }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    if (u.role !== 'admin') return forbidden()
    const points: HeatmapPoint[] = TREND.map((v, i) => ({ date: daysAgo(6 - i).slice(0, 10), total: v }))
    return ok(points)
  }),

  http.get('/api/billing/transactions', async ({ request }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    if (u.role !== 'admin') return forbidden()
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') || 1)
    const pageSize = Number(url.searchParams.get('pageSize') || 20)
    const list = [...db.transactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    await delay()
    return ok(paginate(list, page, pageSize))
  }),

  http.post('/api/billing/topup', ({ request }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    if (u.role !== 'admin') return forbidden()
    return ok({ redirectUrl: 'https://wainao.ai/billing/recharge' })
  }),

  http.post('/api/billing/project-upgrade', ({ request }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    if (u.role !== 'admin') return forbidden()
    return ok({ message: '请联系18682302338进行扩展升级' })
  }),
]
