# bebehaha 设计 AI 工作台（前端）

面向 bebehaha 设计团队的 AI 设计工作台前端。本质是 **wainao 后端系统的一层简化皮肤/模板**：核心对应关系是 team 内的 project。

一期交付 6 个页面：工作台首页、项目管理、项目画板、素材库、成员管理、账户用量。所有接口先用 **MSW mock**，契约尽量贴合 wainao 已有真实 API，后续由真实后端 / BFF 按契约对接，前端关掉 mock 即可切真。

## 技术栈

- **Vue 3**（`<script setup>` + TS）+ **Vite 6**
- **Naive UI** 组件库 + 一套**明亮 / 暗色双主题**（同一 UX 换肤）
- **Pinia**（auth / theme）+ **Vue Router**（含角色守卫）
- **@vue-flow/core** 画布（项目画板）
- **MSW**（Mock Service Worker）拦截 `/api/*`
- 字体：Fraunces（标题）/ Manrope（正文）/ Space Mono（数据）

## 快速开始

```bash
pnpm install
pnpm dev        # http://localhost:5275
pnpm build      # 类型检查 + 生产构建
pnpm preview    # 预览构建产物
```

> 首次安装后 `public/mockServiceWorker.js` 已生成；若缺失运行 `pnpm mock:init`。

## 登录账号（mock）

登录通过外脑 OAuth 授权，演示态用快捷入口——登录页点选账号即登录：

| 账号 | 角色 | 可见范围 |
| --- | --- | --- |
| 曹总 | 管理员 / 老板 | 工作台、全部项目、团队素材库、成员管理、账户用量（画板只读） |
| 远弘 / 设计师A / 设计师B | 设计师 | 我的项目、我的素材、项目画板（可编辑、生成） |

顶栏「老板视角 / 员工视角」可快速切换（**仅 dev 演示用**），右上角按钮切换明暗主题。

## Mock 与切真

- 开发态 `main.ts` 启动 MSW 拦截所有 `/api/*` 请求，内存数据库见 `src/mocks/`，刷新即重置为种子数据。
- 前端只认 `src/api/` 这一套统一契约（`{ data }` / `{ data: { items,total,page,pageSize } }` / `{ error: { code,message } }`，Bearer JWT）。
- **切真**：实现该契约的后端 / BFF 后，移除 MSW 启动、把 `src/api/http.ts` 的 `BASE` 指向真实地址即可。哪些能直接对齐、哪些需后端补建，见 [`docs/wainao-mapping.md`](docs/wainao-mapping.md)。

## 目录结构

```
src/
├─ api/            # http 封装 + 全部 DTO 类型 + 各域 API 模块（前端唯一数据入口）
├─ mocks/          # MSW worker + 内存库 db + 种子 seed + 各域 handler
├─ stores/         # Pinia：auth（认证/角色）、theme（明暗）
├─ router/         # 路由 + 角色守卫
├─ layouts/        # AppLayout（侧栏 + 顶栏）
├─ views/          # 6 个页面 + 登录页
├─ components/canvas/  # 画布自定义节点
├─ composables/    # 格式化等
└─ theme/          # 设计 token（明暗两套）+ Naive themeOverrides
```

## 相关文档

- [`docs/api-contract.md`](docs/api-contract.md) —— mock REST 契约全清单
- [`docs/wainao-mapping.md`](docs/wainao-mapping.md) —— 与 wainao 后端端点映射 + 切真三级
- `docs/bebehaha设计AI工作台一期PRD-20260604-V1.1.md` —— 一期 PRD
- `docs/style-options/` —— 两个风格方向高保真稿（明亮精工 / 暗房质感）
