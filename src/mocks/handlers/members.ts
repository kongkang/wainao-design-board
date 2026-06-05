import { http } from 'msw'
import { ok, unauth, forbidden, notFound } from './_resp'
import { db, currentUser, computeMemberStats, userById } from '../db'
import type { MemberDetail, MemberProjectRef } from '@/api/types'

export const memberHandlers = [
  http.get('/api/teams/current', ({ request }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    return ok(db.team)
  }),

  // 成员列表（用于成员管理页 + 邀请协作选择器）
  http.get('/api/teams/:teamId/members', ({ request }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    return ok(db.users.map((x) => computeMemberStats(x)))
  }),

  http.get('/api/teams/:teamId/members/:userId', ({ request, params }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    if (u.role !== 'admin') return forbidden('仅管理员可查看成员详情')
    const target = userById(params.userId as string)
    if (!target) return notFound('成员不存在')
    const base = computeMemberStats(target)
    const projects: MemberProjectRef[] = db.projects
      .filter(
        (p) =>
          p.createdByUserId === target.userId ||
          p.ownerUserId === target.userId ||
          p.collaboratorIds.includes(target.userId),
      )
      .map((p) => ({
        id: p.id,
        name: p.name,
        memberRole: p.ownerUserId === target.userId ? 'owner' : 'collaborator',
        status: p.status,
      }))
    const detail: MemberDetail = {
      ...base,
      email: target.email,
      uploadInputCount: db.assets.filter((a) => a.creatorId === target.userId && a.type === 'input').length || 34,
      generateOutputCount: db.assets.filter((a) => a.creatorId === target.userId && a.type === 'output').length || base.monthlyGenerations,
      projects,
    }
    return ok(detail)
  }),
]
