import type { Asset, Project, Run, TeamMember, User } from '@/api/types'
import { buildSeed } from './seed'

/** 进程内可变数据库（刷新即重置）。所有 handler 读写这里。 */
export const db = buildSeed()

export const tokenFor = (userId: string) => `mock-token.${userId}`

/** 从 Authorization 头解析当前用户 */
export function currentUser(req: Request): User | null {
  const auth = req.headers.get('Authorization') || ''
  const m = auth.match(/^Bearer\s+mock-token\.(.+)$/)
  if (!m) return null
  return db.users.find((u) => u.userId === m[1]) || null
}

export const userById = (id: string) => db.users.find((u) => u.userId === id) || null
export const projectById = (id: string) => db.projects.find((p) => p.id === id) || null
export const assetById = (id: string) => db.assets.find((a) => a.id === id) || null

/** 项目可见/可操作权限：admin 任意；designer 仅创建人/负责人/协作成员 */
export function canAccessProject(user: User, p: Project): boolean {
  if (user.role === 'admin') return true
  return (
    p.createdByUserId === user.userId ||
    p.ownerUserId === user.userId ||
    p.collaboratorIds.includes(user.userId)
  )
}

export function visibleProjects(user: User): Project[] {
  return db.projects.filter((p) => canAccessProject(user, p))
}

/** designer 能看到的素材：来自其有权限的项目 */
export function visibleAssets(user: User): Asset[] {
  if (user.role === 'admin') return db.assets
  const ids = new Set(visibleProjects(user).map((p) => p.id))
  return db.assets.filter((a) => ids.has(a.projectId))
}

const WITHIN = (iso: string, days: number) => Date.now() - new Date(iso).getTime() <= days * 86_400_000

export function runsByMember(userId: string): Run[] {
  return db.runs.filter((r) => r.memberId === userId)
}

/** 计算成员统计卡片 */
export function computeMemberStats(u: User): TeamMember {
  const myProjects = db.projects.filter(
    (p) => p.createdByUserId === u.userId || p.ownerUserId === u.userId || p.collaboratorIds.includes(u.userId),
  )
  const myRuns = runsByMember(u.userId)
  const monthly = myRuns.filter((r) => r.status === 'success' && WITHIN(r.createdAt, 30)).length
  const last = myRuns.reduce<string | null>((acc, r) => (!acc || r.createdAt > acc ? r.createdAt : acc), null)
  let activityStatus: TeamMember['activityStatus'] = 'none'
  if (last && WITHIN(last, 7)) activityStatus = 'active'
  else if (last && WITHIN(last, 30)) activityStatus = 'low'
  return {
    userId: u.userId,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    phone: u.phone,
    role: u.role,
    projectsCount: myProjects.length,
    activeProjectsCount: myProjects.filter((p) => p.status === 'active').length,
    monthlyGenerations: u.role === 'admin' ? 0 : monthly || seedMonthly(u.userId),
    lastActiveAt: last ?? (u.userId === 'u-cao' ? new Date().toISOString() : ''),
    activityStatus: u.role === 'admin' ? 'active' : activityStatus,
  }
}

// 给少量种子月度数字兜底，让看板更真实
function seedMonthly(userId: string): number {
  return ({ 'u-yuanhong': 128, 'u-a': 89, 'u-b': 44 } as Record<string, number>)[userId] ?? 0
}
