# 与 wainao 后端映射 & 切真三级

本前端是 wainao 后端的简化皮肤。下表把前端契约（`/api/*`）映射到 wainao 真实形态，并按切真成本分三级。调研来源：wainao_editor（Hono + Supabase）的 `apps/backend/src/routes/`、`docs/features/`、`apps/frontend`。

## 切真三级

- **L1 可直接对齐**：wainao 已有对应能力，BFF 透传 / 字段改名即可。
- **L2 需 BFF 适配**：wainao 形态不同（如走 Supabase 直连、无归档态、聚合靠 RPC），需要一层 BFF 包成本前端契约。
- **L3 需后端新增能力**：wainao 暂无对应，需后端补建。

> 结论：**只有当 BFF / 后端实现了本前端的 `/api/*` 契约后，前端才是「关掉 mock 切真」**——不是单纯换 baseURL。

## 映射表

| 前端契约 | 层级 | wainao 真实形态 / 来源 |
| --- | --- | --- |
| `POST /auth/login`、`GET /me` | **L1** | OAuth 2.0 **PKCE**：`/oauth/authorize`→`/oauth/token`→`/oauth/userinfo`（token `wno-` 前缀，`/oauth/*` 开 CORS）；`GET /my`、`GET /profile`。参考实现 `clients/page-agent/src/oauth.ts` |
| `GET /teams/current`、`/teams/:id/members` | **L1** | `routes/teams.ts`：`TeamResponse{id,slug,name,owner_user_id}`、成员 `role:member\|admin`+派生 `is_owner` |
| `GET /teams/:id/members/:userId`（含统计） | **L2** | 基础成员有；上传/生成数、活跃状态等统计需 BFF 聚合（wainao 用量在 `credit_transactions` + RPC） |
| `GET /projects`、`/projects/:id`、`POST /projects`、`PATCH` | **L2** | wainao 项目 **CRUD 走前端直连 Supabase `projects` 表**（`projectService.ts`），仅 `GET /projects/by-slug` 是 REST。需 BFF 包成 REST |
| `POST /projects/:id/archive`、`/restore` + `status` 字段 | **L2** | wainao **无归档态**，只有软删 `deleted_at` + `access:private\|public`。需 BFF / 后端加 `status:active\|archived` 语义 |
| `POST /projects/:id/collaborators` | **L2** | wainao 项目成员走 `grants`/`user_roles`/`user_permissions` 表 + `projectMemberService`，非项目行字段 |
| 素材 `GET/POST /projects/:id/assets*`、`/assets`、上传、下载 | **L1** | **= storage 项目文件**：`/storage/:projectId/files`、`POST /storage/:projectId/upload`（带 `source`/`sourceRef`/`fileType`）、`signed-url`/`preview-url`。`StorageFile{id,name,mimeType,sizeBytes,url,metadata{thumbnailPath,source,sourceRef}}`。input=上传(source=upload)，output=AI生成(source=ai-generated, sourceRef=run:…) |
| `GET /models` | **L1** | `routes/models.ts` → `GET /api/models`，`PublicAIModel{id,name,provider,logo,capabilities[vision\|image…]}` |
| `POST /projects/:id/generate`、`GET /runs/:id`、`GET /runs` | **L3 / L1** | wainao **无文生图/图生图/改图 REST**（其「生成」是文字→网页 Stitch 与工作流执行）。AI 绘画能力**需后端新增**；但 runs 记录结构可对齐 `routes/runs.ts`（`GET /runs?projectId&page&pageSize`，余额不足 402） |
| 画布 `GET/PUT /projects/:id/canvas` | **L3** | wainao 画布是 **Vue Flow** 但只有单一 `ui-card` 节点，存 `projects.config.uiFlowJson{nodes:[{id,position}],edges}`。本前端的多节点类型（input/prompt/output/feedback）持久化**需后端新增**；存储分层思路可照搬 |
| AI 助手对话 `/conversations`、`/messages` | **L3** | wainao 无面向设计场景的 Agent 对话接口，需后端新增（可参考其 ROMP 会话/消息结构） |
| `GET /billing/balance`、`/transactions` | **L1** | `credit_balances{balance_credits,period_consumed_credits}`、`credit_transactions{amount_credits,usage_details{model,tokens}}`（前端直连表 + `billing-subscription.ts`） |
| `/billing/usage/summary`、`/by-member`、`/by-project` | **L2** | wainao 用量靠直连 `credit_transactions` + RPC `get_usage_heatmap`，无现成聚合 REST，需 BFF 聚合 |
| `/billing/usage/heatmap` | **L1** | 对应 RPC `get_usage_heatmap(team_id,start,end)` |
| `POST /billing/topup` | **L1** | `routes/payment.ts`：`POST /payment/orders` + `/pay`（平台完整充值流程，返回支付链接） |
| `POST /billing/project-upgrade` | **L3** | 纯前端提示（联系电话），无后端依赖 |
| `/dashboard/*` 首页聚合 | **L2** | wainao 无 dashboard 聚合 REST，需 BFF 基于 projects/runs/credits 聚合 |

## 切真步骤

1. 选定后端形态：纯前端直连（需 wainao 开放业务接口 CORS + OAuth scope 覆盖）或加一层 **BFF 中转**（推荐：BFF 持 OAuth confidential client、用 httpOnly cookie 管会话、把 wainao 形态翻译成本前端契约）。
2. BFF / 后端实现本仓 `docs/api-contract.md` 的契约。
3. 前端：移除 `main.ts` 中 MSW 启动；将 `src/api/http.ts` 的 `BASE` 指向真实地址；登录改为真实 OAuth PKCE（参考 `clients/page-agent/src/oauth.ts`）。
4. 待确认事项：wainao 业务接口（teams/projects/storage）当前走 Supabase JWT，OAuth scope 偏 `chat:completions`——两套鉴权如何打通需与 wainao 后端确认。
