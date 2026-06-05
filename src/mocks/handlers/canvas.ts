import { http } from 'msw'
import { ok, unauth, forbidden, notFound, delay } from './_resp'
import { db, currentUser, canAccessProject, projectById, assetById } from '../db'
import { genId, nowISO } from '../util'
import type { Asset, Canvas, CanvasNode, ChatAction, ChatMessage, Conversation } from '@/api/types'

function buildCanvas(projectId: string): Canvas {
  const c = db.canvases[projectId] || { nodes: [], edges: [], promptRecords: {}, feedbackNotes: {}, references: { assets: {} } }
  const assets: Record<string, Asset> = {}
  for (const n of c.nodes) {
    if (n.refType === 'asset' && n.refId) {
      const a = assetById(n.refId)
      if (a) assets[n.refId] = a
    }
  }
  return { ...c, references: { assets } }
}

export const canvasHandlers = [
  http.get('/api/projects/:id/canvas', ({ request, params }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    const p = projectById(params.id as string)
    if (!p) return notFound()
    if (!canAccessProject(u, p)) return forbidden()
    return ok(buildCanvas(p.id))
  }),

  http.put('/api/projects/:id/canvas', async ({ request, params }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    const p = projectById(params.id as string)
    if (!p) return notFound()
    if (!canAccessProject(u, p)) return forbidden()
    if (u.role === 'admin') return forbidden('管理员为只读')
    if (p.status === 'archived') return forbidden('已归档项目为只读')
    const body = (await request.json()) as Pick<Canvas, 'nodes' | 'edges' | 'promptRecords' | 'feedbackNotes'>
    db.canvases[p.id] = {
      nodes: body.nodes as CanvasNode[],
      edges: body.edges,
      promptRecords: body.promptRecords || {},
      feedbackNotes: body.feedbackNotes || {},
      references: { assets: {} },
    }
    p.updatedAt = nowISO()
    return ok(buildCanvas(p.id))
  }),

  // ---- AI 设计助手对话 ----
  http.get('/api/projects/:id/conversations', ({ request, params }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    return ok(db.conversations.filter((c) => c.projectId === (params.id as string)))
  }),

  http.post('/api/projects/:id/conversations', async ({ request, params }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    const conv: Conversation = { id: genId('c'), projectId: params.id as string, title: '新的对话', createdAt: nowISO() }
    db.conversations.unshift(conv)
    db.messages[conv.id] = []
    return ok(conv, { status: 201 })
  }),

  http.get('/api/conversations/:id/messages', ({ request, params }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    return ok(db.messages[params.id as string] || [])
  }),

  http.post('/api/conversations/:id/messages', async ({ request, params }) => {
    const u = currentUser(request)
    if (!u) return unauth()
    const convId = params.id as string
    const { content, contextNodeIds } = (await request.json()) as { content: string; contextNodeIds?: string[] }
    const list = db.messages[convId] || (db.messages[convId] = [])

    const userMsg: ChatMessage = { id: genId('m'), role: 'user', content, createdAt: nowISO() }
    list.push(userMsg)

    // 找上下文里的 Prompt 节点，生成可执行 actions
    const conv = db.conversations.find((c) => c.id === convId)
    const canvas = conv ? db.canvases[conv.projectId] : undefined
    const promptNode = (contextNodeIds || [])
      .map((id) => canvas?.nodes.find((n) => n.id === id))
      .find((n) => n?.type === 'prompt')

    const patch = `结合你的反馈「${content.slice(0, 24)}…」，建议：突出产品主体、弱化背景干扰、保留品牌暖色调，并提高画面整洁度。`
    const actions: ChatAction[] = []
    if (promptNode) {
      actions.push({ kind: 'applyPromptPatch', targetNodeId: promptNode.id, promptPatch: patch })
      actions.push({ kind: 'generateFromPrompt', promptNodeId: promptNode.id, modelId: 'seedream' })
    }

    await delay(420)
    const aiMsg: ChatMessage = {
      id: genId('m'),
      role: 'assistant',
      content: promptNode
        ? '我会在选中的 Prompt 节点上做这些调整，你可以一键应用或直接按新 Prompt 再生成。'
        : '请先在画布上选择一个 Prompt 节点，我就能把建议直接应用到它上面。',
      suggestedPromptPatch: promptNode ? patch : undefined,
      actions,
      createdAt: nowISO(),
    }
    list.push(aiMsg)
    return ok(aiMsg)
  }),
]
