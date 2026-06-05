# Mock REST API 契约

前端唯一认这一套契约（`src/api/`）。后端 / BFF 按此实现即可让前端「关掉 mock 切真」。完整类型定义见 `src/api/types.ts`，mock 实现见 `src/mocks/handlers/`。

## 统一约定

- **baseURL**：`/api`
- **鉴权**：`Authorization: Bearer <token>`（token 内含用户身份与角色）
- **成功**：`{ "data": T }`
- **分页**：`{ "data": { "items": T[], "total": number, "page": number, "pageSize": number } }`
- **错误**：`{ "error": { "code": string, "message": string } }` + 语义化 HTTP 状态（401/403/404/400…）
- **时间**：ISO 8601 字符串；**积分单位**：credits（整数）
- **权限**：服务端按 token 角色过滤数据——管理员看全团队，设计师仅看其创建 / 负责 / 协作的项目及其素材

## 认证 / 用户

| 方法 | 路径 | 请求 | 响应 |
| --- | --- | --- | --- |
| POST | `/auth/login` | `{ accountId }` | `{ accessToken, user: User }` |
| GET | `/me` | — | `User` |
| POST | `/auth/logout` | — | `{ success }` |

## 团队 / 成员

| 方法 | 路径 | 响应 |
| --- | --- | --- |
| GET | `/teams/current` | `Team` |
| GET | `/teams/:teamId/members` | `TeamMember[]`（含统计、手机号、活跃状态） |
| GET | `/teams/:teamId/members/:userId` | `MemberDetail`（管理员限定；含上传/生成数、参与项目） |

## 项目

| 方法 | 路径 | 请求 / 查询 | 响应 |
| --- | --- | --- | --- |
| GET | `/projects` | `?status=&ownerId=&memberId=&keyword=&page=&pageSize=` | 分页 `Project` |
| POST | `/projects` | `CreateProjectInput` | `Project`(201) |
| GET | `/projects/:id` | — | `Project` |
| PATCH | `/projects/:id` | `Partial<Project>` | `Project` |
| POST | `/projects/:id/archive` | — | `Project`（status=archived） |
| POST | `/projects/:id/restore` | — | `Project`（status=active） |
| POST | `/projects/:id/collaborators` | `{ userIds }` | `Project` |

## 素材（= storage 项目文件）

| 方法 | 路径 | 请求 / 查询 | 响应 |
| --- | --- | --- | --- |
| GET | `/projects/:id/assets` | `?type=&model=&creatorId=&from=&to=` | `Asset[]` |
| GET | `/assets` | `?projectId=&type=&creatorId=&model=&from=&to=&keyword=&page=` | 分页 `Asset` |
| GET | `/assets/:id` | — | `Asset`（Output 含完整 prompt / 关联 Input / 来源 run） |
| GET | `/assets/:id/download` | — | `{ url, filename }` |
| POST | `/projects/:id/assets/upload` | multipart：`file, fileType=image, source=upload` | `Asset`(201) |

## 模型 / 生成（异步）

| 方法 | 路径 | 请求 | 响应 |
| --- | --- | --- | --- |
| GET | `/models` | — | `AIModel[]`（`capabilities` 含 `image` 者可生图） |
| POST | `/projects/:id/generate` | `GenerateInput`（mode/prompt/modelId/inputAssetIds/promptNodeId） | `{ runId, status: "pending" }` |
| GET | `/runs/:id` | — | `Run`（success 时含 outputAssetId/creditsCost…） |
| GET | `/runs` | `?projectId=&memberId=&model=&operation=&from=&to=&page=` | 分页 `Run`（模型调用明细） |

生成闭环：`POST /generate` → 轮询 `GET /runs/:id` → success 后 Output 落画布节点 + 素材库（source=ai-generated）+ runs 记录 + 扣 credits。

## 画布

| 方法 | 路径 | 请求 | 响应 |
| --- | --- | --- | --- |
| GET | `/projects/:id/canvas` | — | `Canvas`（nodes 坐标+引用、edges、promptRecords、feedbackNotes、references.assets 聚合） |
| PUT | `/projects/:id/canvas` | `{ nodes, edges, promptRecords, feedbackNotes }` | `Canvas` |

> 存储分层：节点只存坐标 + 引用（`refType`/`refId`）；图片内容存 asset，Prompt / 反馈文本存各自记录，缩略图运行时由 `assets/:id` 派生。

## AI 设计助手对话

| 方法 | 路径 | 请求 | 响应 |
| --- | --- | --- | --- |
| GET | `/projects/:id/conversations` | — | `Conversation[]` |
| POST | `/projects/:id/conversations` | — | `Conversation`(201) |
| GET | `/conversations/:id/messages` | — | `ChatMessage[]` |
| POST | `/conversations/:id/messages` | `{ content, contextNodeIds? }` | `ChatMessage`（含 `actions: ChatAction[]`） |

`ChatAction`：`applyPromptPatch` / `generateFromPrompt` / `editFromAsset` / `generateVariants`（后三者触发 `/generate`）。

## 账户用量 / 积分（管理员限定）

| 方法 | 路径 | 响应 |
| --- | --- | --- |
| GET | `/billing/balance` | `CreditBalance`（balanceCredits / periodConsumedCredits / period） |
| GET | `/billing/usage/summary?period=` | `UsageSummary`（generations / activeMembers / projectsUsed / topModel） |
| GET | `/billing/usage/by-member` | `MemberUsage[]`（成员用量排行） |
| GET | `/billing/usage/by-project` | `ProjectUsage[]`（项目用量排行） |
| GET | `/billing/usage/heatmap?from=&to=` | `HeatmapPoint[]`（趋势） |
| GET | `/billing/transactions?page=` | 分页 `CreditTransaction` |
| POST | `/billing/topup` | `{ redirectUrl }`（进平台充值流程） |
| POST | `/billing/project-upgrade` | `{ message: "请联系18682302338进行扩展升级" }` |

## 工作台首页聚合（管理员限定）

| 方法 | 路径 | 响应 |
| --- | --- | --- |
| GET | `/dashboard/overview` | `DashboardOverview`（进行中/已归档/本月生成/活跃设计师） |
| GET | `/dashboard/recent-projects` | `RecentProject[]` |
| GET | `/dashboard/member-activity` | `MemberActivity[]` |
| GET | `/dashboard/generation-trend?days=7` | `TrendPoint[]` |

## DTO

所有数据结构定义在 `src/api/types.ts`，字段名复用 wainao 领域语言（`ownerUserId`、`teamId`、`source`、`sourceRef`、`balanceCredits`、`capabilities` 等），便于后端 / BFF 低成本对齐。
