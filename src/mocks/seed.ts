import type {
  AIModel,
  Asset,
  ChatMessage,
  Conversation,
  Canvas,
  CreditBalance,
  CreditTransaction,
  Project,
  Run,
  Team,
  User,
} from '@/api/types'
import { daysAgo, hoursAgo, minutesAgo, pickGradient } from './util'

export interface SeedData {
  team: Team
  users: User[]
  models: AIModel[]
  projects: Project[]
  assets: Asset[]
  runs: Run[]
  transactions: CreditTransaction[]
  balance: CreditBalance
  canvases: Record<string, Canvas>
  conversations: Conversation[]
  messages: Record<string, ChatMessage[]>
}

const TEAM_ID = 't-bebehaha'

export function buildSeed(): SeedData {
  const team: Team = {
    id: TEAM_ID,
    slug: 'bebehaha',
    name: 'bebehaha 设计团队',
    ownerUserId: 'u-cao',
    description: '儿童生活方式品牌的设计团队',
  }

  const users: User[] = [
    { userId: 'u-cao', email: 'cao@bebehaha.com', username: 'caozong', displayName: '曹总', avatarUrl: pickGradient(6), role: 'admin', teamId: TEAM_ID, phone: '138****0000' },
    { userId: 'u-yuanhong', email: 'yuanhong@bebehaha.com', username: 'yuanhong', displayName: '远弘', avatarUrl: pickGradient(0), role: 'designer', teamId: TEAM_ID, phone: '139****1111' },
    { userId: 'u-a', email: 'sjsa@bebehaha.com', username: 'designer_a', displayName: '设计师A', avatarUrl: pickGradient(2), role: 'designer', teamId: TEAM_ID, phone: '137****2222' },
    { userId: 'u-b', email: 'sjsb@bebehaha.com', username: 'designer_b', displayName: '设计师B', avatarUrl: pickGradient(1), role: 'designer', teamId: TEAM_ID, phone: '136****3333' },
  ]

  const models: AIModel[] = [
    { id: 'seedream', name: 'Seedream 3.0', provider: '即梦 / 字节', logo: pickGradient(0), description: '电商主图与场景图的高质量中文生图模型', capabilities: ['image', 'vision'], recommended: true },
    { id: 'gpt-image', name: 'GPT Image', provider: 'OpenAI', logo: pickGradient(3), description: '强语义理解，擅长精确改图与局部编辑', capabilities: ['image', 'vision'] },
    { id: 'flux-1', name: 'FLUX.1', provider: 'Black Forest Labs', logo: pickGradient(4), description: '高保真文生图，质感细腻', capabilities: ['image'] },
    { id: 'nano-banana', name: 'Nano Banana', provider: 'Google', logo: pickGradient(5), description: '快速图生图与多图融合', capabilities: ['image', 'vision'] },
  ]

  const projects: Project[] = [
    project('p-cup', '儿童保温杯详情页设计', '围绕商品详情页和场景图进行 AI 生成和迭代。', 'u-yuanhong', 'u-yuanhong', ['u-a', 'u-b'], 'active', 12, 28, hoursAgo(1), daysAgo(9)),
    project('p-scene', '新品场景图探索', '探索新品在家庭、儿童房、厨房等场景中的视觉表达。', 'u-a', 'u-a', ['u-yuanhong'], 'active', 18, 33, hoursAgo(5), daysAgo(6)),
    project('p-brand', '品牌 VI 视觉延展', '将品牌视觉系统延展到电商物料与社媒模板。', 'u-yuanhong', 'u-yuanhong', ['u-a'], 'active', 9, 21, daysAgo(1), daysAgo(14)),
    project('p-pkg', '礼盒包装设计', '节日礼盒的外观与开箱视觉探索。', 'u-a', 'u-a', [], 'active', 6, 14, daysAgo(2), daysAgo(11)),
    project('p-poster', '夏季营销海报', '已完成的营销海报项目，保留全部历史记录和素材。', 'u-b', 'u-b', ['u-yuanhong'], 'archived', 8, 15, daysAgo(20), daysAgo(40)),
  ]

  // ---- assets ----
  const assets: Asset[] = []
  let gi = 0
  const addAsset = (a: Partial<Asset> & Pick<Asset, 'id' | 'projectId' | 'projectName' | 'type' | 'source' | 'creatorId' | 'creatorName' | 'createdAt'>): Asset => {
    const full: Asset = {
      sourceRef: null,
      mimeType: 'image/png',
      sizeBytes: 220_000 + ((gi * 31_000) % 900_000),
      url: pickGradient(gi),
      thumbnailUrl: pickGradient(gi),
      ...a,
    }
    gi += 1
    assets.push(full)
    return full
  }

  // p-cup 素材（画板会引用）
  addAsset({ id: 'as-cup-in1', projectId: 'p-cup', projectName: '儿童保温杯详情页设计', type: 'input', source: 'upload', creatorId: 'u-yuanhong', creatorName: '远弘', createdAt: daysAgo(8) })
  addAsset({ id: 'as-cup-in2', projectId: 'p-cup', projectName: '儿童保温杯详情页设计', type: 'input', source: 'upload', creatorId: 'u-a', creatorName: '设计师A', createdAt: daysAgo(7) })
  addAsset({ id: 'as-cup-out1', projectId: 'p-cup', projectName: '儿童保温杯详情页设计', type: 'output', source: 'ai-generated', sourceRef: 'run:r-cup-1', creatorId: 'u-yuanhong', creatorName: '远弘', createdAt: hoursAgo(20), prompt: '融合产品白底图与厨房场景参考，生成一张儿童保温杯电商详情图，风格明亮、干净、强调安全感。', modelId: 'seedream', modelName: 'Seedream 3.0', relatedInputIds: ['as-cup-in1', 'as-cup-in2'], runId: 'r-cup-1' })
  addAsset({ id: 'as-cup-out2', projectId: 'p-cup', projectName: '儿童保温杯详情页设计', type: 'output', source: 'ai-generated', sourceRef: 'run:r-cup-2', creatorId: 'u-a', creatorName: '设计师A', createdAt: hoursAgo(3), prompt: '在 V1 基础上减少背景杂物，突出杯身材质与品牌暖色调。', modelId: 'gpt-image', modelName: 'GPT Image', relatedInputIds: ['as-cup-in1'], runId: 'r-cup-2' })
  // 其它项目
  addAsset({ id: 'as-scene-in1', projectId: 'p-scene', projectName: '新品场景图探索', type: 'input', source: 'upload', creatorId: 'u-a', creatorName: '设计师A', createdAt: daysAgo(5) })
  addAsset({ id: 'as-scene-out1', projectId: 'p-scene', projectName: '新品场景图探索', type: 'output', source: 'ai-generated', sourceRef: 'run:r-scene-1', creatorId: 'u-a', creatorName: '设计师A', createdAt: daysAgo(2), prompt: '儿童房场景下的新品展示，柔和自然光，温馨。', modelId: 'seedream', modelName: 'Seedream 3.0', relatedInputIds: ['as-scene-in1'], runId: 'r-scene-1' })
  addAsset({ id: 'as-scene-out2', projectId: 'p-scene', projectName: '新品场景图探索', type: 'output', source: 'ai-generated', sourceRef: 'run:r-scene-2', creatorId: 'u-yuanhong', creatorName: '远弘', createdAt: hoursAgo(8), prompt: '厨房场景，新品与餐具搭配，干净构图。', modelId: 'flux-1', modelName: 'FLUX.1', relatedInputIds: ['as-scene-in1'], runId: 'r-scene-2' })
  addAsset({ id: 'as-brand-out1', projectId: 'p-brand', projectName: '品牌 VI 视觉延展', type: 'output', source: 'ai-generated', sourceRef: 'run:r-brand-1', creatorId: 'u-yuanhong', creatorName: '远弘', createdAt: daysAgo(1), prompt: '品牌主色延展的社媒模板主视觉。', modelId: 'gpt-image', modelName: 'GPT Image', relatedInputIds: [], runId: 'r-brand-1' })
  addAsset({ id: 'as-pkg-in1', projectId: 'p-pkg', projectName: '礼盒包装设计', type: 'input', source: 'upload', creatorId: 'u-a', creatorName: '设计师A', createdAt: daysAgo(4) })
  addAsset({ id: 'as-pkg-out1', projectId: 'p-pkg', projectName: '礼盒包装设计', type: 'output', source: 'ai-generated', sourceRef: 'run:r-pkg-1', creatorId: 'u-a', creatorName: '设计师A', createdAt: daysAgo(2), prompt: '节日礼盒开箱视觉，暖色调，节日氛围。', modelId: 'nano-banana', modelName: 'Nano Banana', relatedInputIds: ['as-pkg-in1'], runId: 'r-pkg-1' })
  addAsset({ id: 'as-poster-out1', projectId: 'p-poster', projectName: '夏季营销海报', type: 'output', source: 'ai-generated', sourceRef: 'run:r-poster-2', creatorId: 'u-b', creatorName: '设计师B', createdAt: daysAgo(22), prompt: '夏季促销主视觉海报，清凉色调。', modelId: 'seedream', modelName: 'Seedream 3.0', relatedInputIds: [], runId: 'r-poster-2' })

  // ---- runs（模型调用明细）----
  const runs: Run[] = [
    run('r-cup-1', 'p-cup', '儿童保温杯详情页设计', 'u-yuanhong', '远弘', 'seedream', 'Seedream 3.0', 'img2img', '融合产品白底图与厨房场景，生成明亮详情图…', 'success', 'as-cup-out1', ['as-cup-in1', 'as-cup-in2'], 38, hoursAgo(20)),
    run('r-cup-2', 'p-cup', '儿童保温杯详情页设计', 'u-a', '设计师A', 'gpt-image', 'GPT Image', 'edit', '减少背景杂物，突出杯身材质…', 'success', 'as-cup-out2', ['as-cup-in1'], 120, hoursAgo(3)),
    run('r-scene-1', 'p-scene', '新品场景图探索', 'u-a', '设计师A', 'seedream', 'Seedream 3.0', 'text2img', '儿童房场景下的新品展示，柔和自然光…', 'success', 'as-scene-out1', [], 36, daysAgo(2)),
    run('r-scene-2', 'p-scene', '新品场景图探索', 'u-yuanhong', '远弘', 'flux-1', 'FLUX.1', 'img2img', '厨房场景，新品与餐具搭配…', 'success', 'as-scene-out2', ['as-scene-in1'], 44, hoursAgo(8)),
    run('r-brand-1', 'p-brand', '品牌 VI 视觉延展', 'u-yuanhong', '远弘', 'gpt-image', 'GPT Image', 'text2img', '品牌主色延展的社媒模板主视觉…', 'success', 'as-brand-out1', [], 110, daysAgo(1)),
    run('r-pkg-1', 'p-pkg', '礼盒包装设计', 'u-a', '设计师A', 'nano-banana', 'Nano Banana', 'img2img', '节日礼盒开箱视觉，暖色调…', 'success', 'as-pkg-out1', ['as-pkg-in1'], 52, daysAgo(2)),
    run('r-poster-1', 'p-poster', '夏季营销海报', 'u-b', '设计师B', 'seedream', 'Seedream 3.0', 'text2img', '夏季促销海报，初版构图…', 'failed', null, [], 0, daysAgo(23)),
    run('r-poster-2', 'p-poster', '夏季营销海报', 'u-b', '设计师B', 'seedream', 'Seedream 3.0', 'text2img', '夏季促销主视觉海报，清凉色调…', 'success', 'as-poster-out1', [], 40, daysAgo(22)),
  ]

  // ---- 积分 ----
  const balance: CreditBalance = {
    balanceCredits: 8560,
    periodConsumedCredits: 1240,
    periodStart: daysAgo(30),
    periodEnd: daysAgo(-1),
  }
  const transactions: CreditTransaction[] = [
    tx('tx-1', 'topup', 5000, 8560, undefined, undefined, '积分充值', daysAgo(12)),
    ...runs
      .filter((r) => r.status === 'success')
      .map((r, i) => tx(`tx-run-${i}`, 'consume', -r.creditsCost, 8560 - 100 * (i + 1), r.modelName, r.projectName, `${r.operation} · ${r.projectName}`, r.createdAt)),
  ]

  // ---- p-cup 画板 ----
  const cupCanvas: Canvas = {
    nodes: [
      { id: 'n-in1', type: 'input', position: { x: 40, y: 90 }, refType: 'asset', refId: 'as-cup-in1' },
      { id: 'n-in2', type: 'input', position: { x: 40, y: 290 }, refType: 'asset', refId: 'as-cup-in2' },
      { id: 'n-prompt', type: 'prompt', position: { x: 320, y: 180 }, refType: 'prompt', refId: 'pr-1' },
      { id: 'n-out1', type: 'output', position: { x: 640, y: 110 }, refType: 'asset', refId: 'as-cup-out1' },
      { id: 'n-fb', type: 'feedback', position: { x: 360, y: 420 }, refType: 'feedback', refId: 'fb-1' },
      { id: 'n-out2', type: 'output', position: { x: 640, y: 400 }, refType: 'asset', refId: 'as-cup-out2' },
    ],
    edges: [
      { id: 'e1', source: 'n-in1', target: 'n-prompt' },
      { id: 'e2', source: 'n-in2', target: 'n-prompt' },
      { id: 'e3', source: 'n-prompt', target: 'n-out1' },
      { id: 'e4', source: 'n-out1', target: 'n-fb' },
      { id: 'e5', source: 'n-fb', target: 'n-prompt' },
      { id: 'e6', source: 'n-prompt', target: 'n-out2' },
    ],
    promptRecords: {
      'pr-1': '融合产品白底图与厨房场景参考，生成一张儿童保温杯电商详情图。当前版本强调明亮、干净、安全感，沿用品牌暖色调。',
    },
    feedbackNotes: {
      'fb-1': '产品主体还不够突出，背景有点杂。下一版减少背景杂物，突出杯身材质 → 再生成 V2。',
    },
    references: { assets: {} },
  }

  // ---- 对话 ----
  const conversations: Conversation[] = [
    { id: 'c-cup-1', projectId: 'p-cup', title: '优化保温杯主图 Prompt', createdAt: hoursAgo(4) },
  ]
  const messages: Record<string, ChatMessage[]> = {
    'c-cup-1': [
      { id: 'm1', role: 'user', content: '这三张参考图融合后，产品主体还是不够突出，背景也有点杂。', createdAt: hoursAgo(4) },
      {
        id: 'm2',
        role: 'assistant',
        content: '我会在原 Prompt 节点上优化：保留产品白底图中的杯身比例，参考厨房场景但减少背景物件，并沿用品牌风格的暖色调。你可以应用修改后直接再生成 V2。',
        suggestedPromptPatch: '保留杯身比例，弱化厨房背景物件，强化品牌暖色调，突出产品主体。',
        actions: [
          { kind: 'applyPromptPatch', targetNodeId: 'n-prompt', promptPatch: '保留杯身比例，弱化厨房背景物件，强化品牌暖色调，突出产品主体。' },
          { kind: 'generateFromPrompt', promptNodeId: 'n-prompt', modelId: 'seedream' },
        ],
        createdAt: minutesAgo(230),
      },
    ],
  }

  return { team, users, models, projects, assets, runs, transactions, balance, canvases: { 'p-cup': cupCanvas }, conversations, messages }
}

function project(
  id: string, name: string, description: string, createdBy: string, owner: string,
  collaborators: string[], status: Project['status'], assetCount: number, generationCount: number,
  updatedAt: string, createdAt: string,
): Project {
  return { id, teamId: TEAM_ID, name, description, createdByUserId: createdBy, ownerUserId: owner, collaboratorIds: collaborators, status, access: 'private', assetCount, generationCount, createdAt, updatedAt, slug: id.replace('p-', '') }
}

function run(
  id: string, projectId: string, projectName: string, memberId: string, memberName: string,
  modelId: string, modelName: string, operation: Run['operation'], promptSummary: string,
  status: Run['status'], outputAssetId: string | null, inputAssetIds: string[], creditsCost: number, createdAt: string,
): Run {
  return { id, projectId, projectName, memberId, memberName, modelId, modelName, operation, promptSummary, prompt: promptSummary, status, outputAssetId, outputThumbnailUrl: outputAssetId ? pickGradient(id.length) : null, inputAssetIds, creditsCost, createdAt }
}

function tx(
  id: string, type: CreditTransaction['type'], amountCredits: number, balanceAfterCredits: number,
  modelName: string | undefined, projectName: string | undefined, description: string, createdAt: string,
): CreditTransaction {
  return { id, type, amountCredits, balanceAfterCredits, modelName, projectName, description, createdAt }
}
