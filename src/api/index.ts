import { http, type Paginated } from './http'
import type {
  AIModel,
  Asset,
  Canvas,
  Conversation,
  ChatMessage,
  CreateProjectInput,
  CreditBalance,
  CreditTransaction,
  DashboardOverview,
  GenerateInput,
  HeatmapPoint,
  MemberActivity,
  MemberDetail,
  MemberUsage,
  Project,
  ProjectUsage,
  RecentProject,
  Run,
  Team,
  TeamMember,
  TrendPoint,
  UsageSummary,
} from './types'

export type ProjectListQuery = {
  status?: string
  ownerId?: string
  memberId?: string
  keyword?: string
  page?: number
  pageSize?: number
}

export type AssetListQuery = {
  projectId?: string
  type?: string
  creatorId?: string
  model?: string
  from?: string
  to?: string
  keyword?: string
  page?: number
  pageSize?: number
}

export type RunListQuery = {
  projectId?: string
  memberId?: string
  model?: string
  operation?: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export const projectsApi = {
  list: (q: ProjectListQuery = {}) => http.get<Paginated<Project>>('/projects', q),
  get: (id: string) => http.get<Project>(`/projects/${id}`),
  create: (body: CreateProjectInput) => http.post<Project>('/projects', body),
  update: (id: string, body: Partial<Project>) => http.patch<Project>(`/projects/${id}`, body),
  archive: (id: string) => http.post<Project>(`/projects/${id}/archive`),
  restore: (id: string) => http.post<Project>(`/projects/${id}/restore`),
  addCollaborators: (id: string, userIds: string[]) => http.post<Project>(`/projects/${id}/collaborators`, { userIds }),
}

export const assetsApi = {
  listByProject: (projectId: string, q: Omit<AssetListQuery, 'projectId'> = {}) =>
    http.get<Asset[]>(`/projects/${projectId}/assets`, q),
  listAll: (q: AssetListQuery = {}) => http.get<Paginated<Asset>>('/assets', q),
  get: (id: string) => http.get<Asset>(`/assets/${id}`),
  download: (id: string) => http.get<{ url: string; filename: string }>(`/assets/${id}/download`),
  upload: (projectId: string, formData: FormData) => http.upload<Asset>(`/projects/${projectId}/assets/upload`, formData),
}

export const modelsApi = {
  list: () => http.get<AIModel[]>('/models'),
}

export const generationApi = {
  generate: (projectId: string, body: GenerateInput) =>
    http.post<{ runId: string; status: 'pending' }>(`/projects/${projectId}/generate`, body),
  getRun: (id: string) => http.get<Run>(`/runs/${id}`),
  listRuns: (q: RunListQuery = {}) => http.get<Paginated<Run>>('/runs', q),
}

export const canvasApi = {
  get: (projectId: string) => http.get<Canvas>(`/projects/${projectId}/canvas`),
  save: (projectId: string, body: Pick<Canvas, 'nodes' | 'edges' | 'promptRecords' | 'feedbackNotes'>) =>
    http.put<Canvas>(`/projects/${projectId}/canvas`, body),
}

export const conversationsApi = {
  list: (projectId: string) => http.get<Conversation[]>(`/projects/${projectId}/conversations`),
  create: (projectId: string) => http.post<Conversation>(`/projects/${projectId}/conversations`),
  messages: (convId: string) => http.get<ChatMessage[]>(`/conversations/${convId}/messages`),
  send: (convId: string, content: string, contextNodeIds?: string[]) =>
    http.post<ChatMessage>(`/conversations/${convId}/messages`, { content, contextNodeIds }),
}

export const billingApi = {
  balance: () => http.get<CreditBalance>('/billing/balance'),
  usageSummary: (period?: string) => http.get<UsageSummary>('/billing/usage/summary', { period }),
  byMember: () => http.get<MemberUsage[]>('/billing/usage/by-member'),
  byProject: () => http.get<ProjectUsage[]>('/billing/usage/by-project'),
  heatmap: (from?: string, to?: string) => http.get<HeatmapPoint[]>('/billing/usage/heatmap', { from, to }),
  transactions: (page = 1, pageSize = 20) => http.get<Paginated<CreditTransaction>>('/billing/transactions', { page, pageSize }),
  topup: () => http.post<{ redirectUrl: string }>('/billing/topup'),
  projectUpgrade: (projectId?: string) => http.post<{ message: string }>('/billing/project-upgrade', { projectId }),
}

export const membersApi = {
  currentTeam: () => http.get<Team>('/teams/current'),
  list: (teamId: string) => http.get<TeamMember[]>(`/teams/${teamId}/members`),
  detail: (teamId: string, userId: string) => http.get<MemberDetail>(`/teams/${teamId}/members/${userId}`),
}

export const dashboardApi = {
  overview: () => http.get<DashboardOverview>('/dashboard/overview'),
  recentProjects: () => http.get<RecentProject[]>('/dashboard/recent-projects'),
  memberActivity: () => http.get<MemberActivity[]>('/dashboard/member-activity'),
  generationTrend: (days = 7) => http.get<TrendPoint[]>('/dashboard/generation-trend', { days }),
}
