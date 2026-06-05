/**
 * 全部 DTO 类型 —— 统一干净契约，字段名复用 wainao 后端领域语言。
 * ◆ 对齐 wainao 真实形态　✚ bebehaha 一期扩展（详见 docs/wainao-mapping.md）
 */

export type Role = 'admin' | 'designer'

// 当前用户 ◆ /me
export interface User {
  userId: string
  email: string
  username: string
  displayName: string
  avatarUrl: string
  role: Role
  teamId: string
  phone: string
}

// 团队 ◆
export interface Team {
  id: string
  slug: string
  name: string
  ownerUserId: string
  description: string
}

export type ActivityStatus = 'active' | 'low' | 'none'

// 成员列表项 ◆ /teams/:id/members
export interface TeamMember {
  userId: string
  displayName: string
  avatarUrl: string
  phone: string
  role: Role
  projectsCount: number
  activeProjectsCount: number
  monthlyGenerations: number
  lastActiveAt: string
  activityStatus: ActivityStatus
}

export interface MemberProjectRef {
  id: string
  name: string
  memberRole: 'owner' | 'collaborator'
  status: ProjectStatus
}

export interface MemberDetail extends TeamMember {
  email: string
  uploadInputCount: number
  generateOutputCount: number
  projects: MemberProjectRef[]
}

export type ProjectStatus = 'active' | 'archived'
export type ProjectAccess = 'private' | 'public'

// 项目 ◆模型/✚归档态
export interface Project {
  id: string
  teamId: string
  name: string
  description: string
  createdByUserId: string
  ownerUserId: string
  collaboratorIds: string[]
  status: ProjectStatus
  access: ProjectAccess
  assetCount: number
  generationCount: number
  createdAt: string
  updatedAt: string
  slug: string
}

export interface CreateProjectInput {
  name: string
  description?: string
  ownerUserId: string
  collaboratorIds?: string[]
  initialPrompt?: string
}

export type AssetType = 'input' | 'output'
export type AssetSource = 'upload' | 'ai-generated'

// 素材 ◆ = storage 项目文件
export interface Asset {
  id: string
  projectId: string
  projectName: string
  type: AssetType
  source: AssetSource
  sourceRef: string | null
  creatorId: string
  creatorName: string
  mimeType: string
  sizeBytes: number
  url: string
  thumbnailUrl: string
  createdAt: string
  // Output 专有
  prompt?: string
  modelId?: string
  modelName?: string
  relatedInputIds?: string[]
  runId?: string
}

export type ModelCapability =
  | 'text'
  | 'vision'
  | 'image'
  | 'reasoning'
  | 'thinking'
  | 'structured'

// 模型 ◆ /api/models
export interface AIModel {
  id: string
  name: string
  provider: string
  logo: string
  description: string
  capabilities: ModelCapability[]
  recommended?: boolean
}

export type GenerationMode = 'text2img' | 'img2img' | 'edit'
export type RunStatus = 'pending' | 'success' | 'failed'

// 生成记录 / 模型调用明细 ◆
export interface Run {
  id: string
  projectId: string
  projectName: string
  memberId: string
  memberName: string
  modelId: string
  modelName: string
  operation: GenerationMode
  promptSummary: string
  prompt: string
  status: RunStatus
  outputAssetId: string | null
  outputThumbnailUrl: string | null
  inputAssetIds: string[]
  creditsCost: number
  createdAt: string
}

export interface GenerateInput {
  mode: GenerationMode
  prompt: string
  modelId: string
  inputAssetIds?: string[]
  promptNodeId?: string
}

// 画布 ✚
export type CanvasNodeType = 'input' | 'prompt' | 'output' | 'feedback'
export type CanvasRefType = 'asset' | 'prompt' | 'feedback' | 'none'

export interface CanvasNode {
  id: string
  type: CanvasNodeType
  position: { x: number; y: number }
  refType: CanvasRefType
  refId: string | null
}

export interface CanvasEdge {
  id: string
  source: string
  target: string
}

export interface Canvas {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  // 可沉淀内容，与坐标节点分离存储
  promptRecords: Record<string, string>
  feedbackNotes: Record<string, string>
  // 渲染辅助聚合：节点引用到的素材
  references: { assets: Record<string, Asset> }
}

// AI 助手对话 ✚
export type ChatAction =
  | { kind: 'applyPromptPatch'; targetNodeId: string; promptPatch: string }
  | { kind: 'generateFromPrompt'; promptNodeId: string; modelId: string }
  | { kind: 'editFromAsset'; assetId: string; promptPatch: string; modelId: string }
  | { kind: 'generateVariants'; promptNodeId: string; modelId: string; count: number }

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  suggestedPromptPatch?: string
  actions?: ChatAction[]
  createdAt: string
}

export interface Conversation {
  id: string
  projectId: string
  title: string
  createdAt: string
}

// 计费 / 积分 ◆
export interface CreditBalance {
  balanceCredits: number
  periodConsumedCredits: number
  periodStart: string
  periodEnd: string
}

export interface CreditTransaction {
  id: string
  type: 'consume' | 'topup' | 'grant'
  amountCredits: number
  balanceAfterCredits: number
  modelName?: string
  projectName?: string
  description: string
  createdAt: string
}

export interface UsageSummary {
  generations: number
  activeMembers: number
  projectsUsed: number
  topModel: string
}

export interface MemberUsage {
  memberId: string
  memberName: string
  generations: number
  projectsCount: number
  lastActiveAt: string
}

export interface ProjectUsage {
  projectId: string
  projectName: string
  ownerName: string
  generations: number
  outputs: number
}

export interface HeatmapPoint {
  date: string
  total: number
}

// 首页聚合 ✚
export interface DashboardOverview {
  activeProjects: number
  archivedProjects: number
  monthlyGenerations: number
  activeDesigners: number
}

export interface RecentProject {
  id: string
  name: string
  ownerName: string
  status: ProjectStatus
  generationCount: number
  updatedAt: string
}

export interface MemberActivity {
  userId: string
  displayName: string
  avatarUrl: string
  projectsCount: number
  monthlyGenerations: number
  lastActiveAt: string
  activityStatus: ActivityStatus
}

export interface TrendPoint {
  label: string
  value: number
}
