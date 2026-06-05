import { http } from 'msw'
import { ok, unauth, forbidden, notFound, delay } from './_resp'
import { db, currentUser, canAccessProject, visibleAssets, projectById, assetById } from '../db'
import { genId, nowISO, paginate, pickGradient } from '../util'
import type { Asset, AssetType } from '@/api/types'

const within = (iso: string, from?: string | null, to?: string | null) => {
  if (from && iso < from) return false
  if (to && iso > to) return false
  return true
}

export const assetHandlers = [
  // 项目内素材
  http.get('/api/projects/:id/assets', ({ request, params }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    const p = projectById(params.id as string)
    if (!p) return notFound()
    if (!canAccessProject(u, p)) return forbidden()
    const url = new URL(request.url)
    const type = url.searchParams.get('type') as AssetType | null
    const model = url.searchParams.get('model')
    const creatorId = url.searchParams.get('creatorId')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    let list = db.assets.filter((a) => a.projectId === p.id)
    if (type) list = list.filter((a) => a.type === type)
    if (model) list = list.filter((a) => a.modelId === model)
    if (creatorId) list = list.filter((a) => a.creatorId === creatorId)
    list = list.filter((a) => within(a.createdAt, from, to))
    list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return ok(list)
  }),

  // 素材库（全局，按权限）
  http.get('/api/assets', async ({ request }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    const type = url.searchParams.get('type') as AssetType | null
    const creatorId = url.searchParams.get('creatorId')
    const model = url.searchParams.get('model')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const keyword = url.searchParams.get('keyword')?.toLowerCase()
    const page = Number(url.searchParams.get('page') || 1)
    const pageSize = Number(url.searchParams.get('pageSize') || 24)

    let list = visibleAssets(u)
    if (projectId) list = list.filter((a) => a.projectId === projectId)
    if (type) list = list.filter((a) => a.type === type)
    if (creatorId) list = list.filter((a) => a.creatorId === creatorId)
    if (model) list = list.filter((a) => a.modelId === model)
    list = list.filter((a) => within(a.createdAt, from, to))
    if (keyword)
      list = list.filter(
        (a) => a.projectName.toLowerCase().includes(keyword) || (a.prompt?.toLowerCase().includes(keyword) ?? false),
      )
    list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    await delay()
    return ok(paginate(list, page, pageSize))
  }),

  http.get('/api/assets/:id', ({ request, params }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    const a = assetById(params.id as string)
    if (!a) return notFound('素材不存在')
    const p = projectById(a.projectId)
    if (p && !canAccessProject(u, p)) return forbidden()
    return ok(a)
  }),

  http.get('/api/assets/:id/download', ({ request, params }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    const a = assetById(params.id as string)
    if (!a) return notFound()
    return ok({ url: a.url, filename: `${a.id}.png` })
  }),

  // 上传 Input 图
  http.post('/api/projects/:id/assets/upload', async ({ request, params }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    const p = projectById(params.id as string)
    if (!p) return notFound()
    if (!canAccessProject(u, p)) return forbidden('无权上传')
    if (p.status === 'archived') return forbidden('已归档项目为只读')
    const form = await request.formData()
    const file = form.get('file') as File | null
    const grad = pickGradient(db.assets.length)
    const asset: Asset = {
      id: genId('as'),
      projectId: p.id,
      projectName: p.name,
      type: 'input',
      source: 'upload',
      sourceRef: null,
      creatorId: u.userId,
      creatorName: u.displayName,
      mimeType: file?.type || 'image/png',
      sizeBytes: file?.size || 240_000,
      url: grad,
      thumbnailUrl: grad,
      createdAt: nowISO(),
    }
    db.assets.unshift(asset)
    p.assetCount += 1
    p.updatedAt = nowISO()
    await delay(200)
    return ok(asset, { status: 201 })
  }),
]
