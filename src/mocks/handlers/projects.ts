import { http } from 'msw'
import { ok, fail, unauth, forbidden, notFound, delay } from './_resp'
import { db, currentUser, canAccessProject, visibleProjects, projectById } from '../db'
import { genId, nowISO, paginate } from '../util'
import type { CreateProjectInput, Project, ProjectStatus } from '@/api/types'

export const projectHandlers = [
  http.get('/api/projects', async ({ request }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    const url = new URL(request.url)
    const status = url.searchParams.get('status') as ProjectStatus | null
    const ownerId = url.searchParams.get('ownerId')
    const memberId = url.searchParams.get('memberId')
    const keyword = url.searchParams.get('keyword')?.toLowerCase()
    const page = Number(url.searchParams.get('page') || 1)
    const pageSize = Number(url.searchParams.get('pageSize') || 12)

    let list = visibleProjects(u)
    if (status) list = list.filter((p) => p.status === status)
    if (ownerId) list = list.filter((p) => p.ownerUserId === ownerId)
    if (memberId)
      list = list.filter(
        (p) => p.ownerUserId === memberId || p.createdByUserId === memberId || p.collaboratorIds.includes(memberId),
      )
    if (keyword)
      list = list.filter((p) => p.name.toLowerCase().includes(keyword) || p.description.toLowerCase().includes(keyword))
    list = [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

    await delay()
    return ok(paginate(list, page, pageSize))
  }),

  http.get('/api/projects/:id', ({ request, params }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    const p = projectById(params.id as string)
    if (!p) return notFound('项目不存在')
    if (!canAccessProject(u, p)) return forbidden('无权访问该项目')
    return ok(p)
  }),

  http.post('/api/projects', async ({ request }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    const body = (await request.json()) as CreateProjectInput
    if (!body.name?.trim()) return fail(400, 'name_required', '项目名称必填')
    const now = nowISO()
    const p: Project = {
      id: genId('p'),
      teamId: u.teamId,
      name: body.name.trim(),
      description: body.description || '',
      createdByUserId: u.userId,
      ownerUserId: body.ownerUserId || u.userId,
      collaboratorIds: body.collaboratorIds || [],
      status: 'active',
      access: 'private',
      assetCount: 0,
      generationCount: 0,
      createdAt: now,
      updatedAt: now,
      slug: genId('s'),
    }
    db.projects.unshift(p)
    db.canvases[p.id] = { nodes: [], edges: [], promptRecords: {}, feedbackNotes: {}, references: { assets: {} } }
    await delay(200)
    return ok(p, { status: 201 })
  }),

  http.patch('/api/projects/:id', async ({ request, params }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    const p = projectById(params.id as string)
    if (!p) return notFound()
    if (!canAccessProject(u, p)) return forbidden()
    const body = (await request.json()) as Partial<Project>
    Object.assign(p, {
      name: body.name ?? p.name,
      description: body.description ?? p.description,
      ownerUserId: body.ownerUserId ?? p.ownerUserId,
      collaboratorIds: body.collaboratorIds ?? p.collaboratorIds,
      updatedAt: nowISO(),
    })
    return ok(p)
  }),

  http.post('/api/projects/:id/archive', ({ request, params }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    const p = projectById(params.id as string)
    if (!p) return notFound()
    if (!canAccessProject(u, p)) return forbidden('无权归档该项目')
    p.status = 'archived'
    p.updatedAt = nowISO()
    return ok(p)
  }),

  http.post('/api/projects/:id/restore', ({ request, params }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    const p = projectById(params.id as string)
    if (!p) return notFound()
    if (!canAccessProject(u, p)) return forbidden('无权恢复该项目')
    p.status = 'active'
    p.updatedAt = nowISO()
    return ok(p)
  }),

  http.post('/api/projects/:id/collaborators', async ({ request, params }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    const p = projectById(params.id as string)
    if (!p) return notFound()
    if (!canAccessProject(u, p)) return forbidden()
    const { userIds } = (await request.json()) as { userIds: string[] }
    p.collaboratorIds = Array.from(new Set([...p.collaboratorIds, ...userIds]))
    p.updatedAt = nowISO()
    return ok(p)
  }),
]
