import { http } from 'msw'
import { ok, unauth, forbidden, notFound } from './_resp'
import { db, currentUser, canAccessProject, projectById, visibleProjects } from '../db'
import { genId, nowISO, paginate, pickGradient } from '../util'
import type { Asset, GenerateInput, GenerationMode, Run } from '@/api/types'

const COST: Record<string, number> = { seedream: 38, 'gpt-image': 120, 'flux-1': 44, 'nano-banana': 52 }

export const generationHandlers = [
  // 发起生成（异步）→ 返回 runId，前端轮询 /runs/:id
  http.post('/api/projects/:id/generate', async ({ request, params }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    const p = projectById(params.id as string)
    if (!p) return notFound()
    if (!canAccessProject(u, p)) return forbidden()
    if (u.role === 'admin') return forbidden('管理员为只读，不可生成')
    if (p.status === 'archived') return forbidden('已归档项目为只读')

    const body = (await request.json()) as GenerateInput
    const model = db.models.find((m) => m.id === body.modelId) || db.models[0]
    const run: Run = {
      id: genId('r'),
      projectId: p.id,
      projectName: p.name,
      memberId: u.userId,
      memberName: u.displayName,
      modelId: model.id,
      modelName: model.name,
      operation: body.mode,
      promptSummary: body.prompt.slice(0, 40),
      prompt: body.prompt,
      status: 'pending',
      outputAssetId: null,
      outputThumbnailUrl: null,
      inputAssetIds: body.inputAssetIds || [],
      creditsCost: 0,
      createdAt: nowISO(),
    }
    db.runs.unshift(run)

    // 模拟生成耗时，完成后落素材库 + 扣积分 + 计入项目
    setTimeout(() => {
      const grad = pickGradient(db.assets.length + 3)
      const cost = COST[model.id] ?? 40
      const asset: Asset = {
        id: genId('as'),
        projectId: p.id,
        projectName: p.name,
        type: 'output',
        source: 'ai-generated',
        sourceRef: `run:${run.id}`,
        creatorId: u.userId,
        creatorName: u.displayName,
        mimeType: 'image/png',
        sizeBytes: 320_000,
        url: grad,
        thumbnailUrl: grad,
        createdAt: nowISO(),
        prompt: body.prompt,
        modelId: model.id,
        modelName: model.name,
        relatedInputIds: body.inputAssetIds || [],
        runId: run.id,
      }
      db.assets.unshift(asset)
      run.status = 'success'
      run.outputAssetId = asset.id
      run.outputThumbnailUrl = grad
      run.creditsCost = cost
      db.transactions.unshift({
        id: genId('tx'),
        type: 'consume',
        amountCredits: -cost,
        balanceAfterCredits: db.balance.balanceCredits - cost,
        modelName: model.name,
        projectName: p.name,
        description: `${body.mode} · ${p.name}`,
        createdAt: nowISO(),
      })
      db.balance.balanceCredits -= cost
      db.balance.periodConsumedCredits += cost
      p.generationCount += 1
      p.assetCount += 1
      p.updatedAt = nowISO()
    }, 1800)

    return ok({ runId: run.id, status: 'pending' as const })
  }),

  http.get('/api/runs/:id', ({ request, params }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    const run = db.runs.find((r) => r.id === params.id)
    if (!run) return notFound()
    return ok(run)
  }),

  // 模型调用明细
  http.get('/api/runs', async ({ request }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    const memberId = url.searchParams.get('memberId')
    const model = url.searchParams.get('model')
    const operation = url.searchParams.get('operation') as GenerationMode | null
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const page = Number(url.searchParams.get('page') || 1)
    const pageSize = Number(url.searchParams.get('pageSize') || 20)

    let list = db.runs
    if (u.role !== 'admin') {
      const ids = new Set(visibleProjects(u).map((p) => p.id))
      list = list.filter((r) => ids.has(r.projectId))
    }
    if (projectId) list = list.filter((r) => r.projectId === projectId)
    if (memberId) list = list.filter((r) => r.memberId === memberId)
    if (model) list = list.filter((r) => r.modelId === model)
    if (operation) list = list.filter((r) => r.operation === operation)
    if (from) list = list.filter((r) => r.createdAt >= from)
    if (to) list = list.filter((r) => r.createdAt <= to)
    list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return ok(paginate(list, page, pageSize))
  }),
]
