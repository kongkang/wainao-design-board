<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VueFlow, addEdge, applyEdgeChanges, applyNodeChanges } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { useMessage, useDialog } from 'naive-ui'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import CanvasNode from '@/components/canvas/CanvasNode.vue'
import { assetsApi, canvasApi, conversationsApi, generationApi, modelsApi, projectsApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { relativeTime } from '@/composables/format'
import type { AIModel, Asset, ChatAction, ChatMessage, Conversation, Project } from '@/api/types'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const message = useMessage()
const dialog = useDialog()

const projectId = route.params.id as string
const project = ref<Project | null>(null)
// 用 any[] 避免与 Vue Flow 内部 GraphNode/Elements 严格类型冲突（受控模式下我们自管序列化）
const flowNodes = ref<any[]>([])
const flowEdges = ref<any[]>([])
const assets = ref<Asset[]>([])
const models = ref<AIModel[]>([])
const selectedId = ref<string | null>(null)
const selectedModel = ref<string>('seedream')
const assetTab = ref<'all' | 'input' | 'output'>('all')
const loaded = ref(false)
const generating = ref(false)

const readonly = computed(() => auth.isAdmin || project.value?.status === 'archived')
const selectedNode = computed(() => flowNodes.value.find((n) => n.id === selectedId.value) || null)
const selectedPrompt = computed(() => (selectedNode.value?.type === 'prompt' ? selectedNode.value : null))
const imageModels = computed(() => models.value.filter((m) => m.capabilities.includes('image')))
const filteredAssets = computed(() =>
  assetTab.value === 'all' ? assets.value : assets.value.filter((a) => a.type === assetTab.value),
)

let uidc = 0
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${uidc++}`

function nodeFromCanvas(refType: string, refId: string | null, type: string, refAssets: Record<string, Asset>, prompts: Record<string, string>, feedbacks: Record<string, string>) {
  const data: Record<string, unknown> = { refType, refId, readonly: readonly.value }
  if (refType === 'asset' && refId) data.asset = refAssets[refId]
  if (type === 'prompt') {
    data.text = (refId && prompts[refId]) || ''
    data.onInput = undefined
  }
  if (type === 'feedback') data.text = (refId && feedbacks[refId]) || ''
  return data
}

async function loadAll() {
  const [p, canvas, as, ms] = await Promise.all([
    projectsApi.get(projectId),
    canvasApi.get(projectId),
    assetsApi.listByProject(projectId),
    modelsApi.list(),
  ])
  project.value = p
  assets.value = as
  models.value = ms
  if (ms[0]) selectedModel.value = ms.find((m) => m.recommended)?.id || ms[0].id

  flowNodes.value = canvas.nodes.map((n) => {
    const data = nodeFromCanvas(n.refType, n.refId, n.type, canvas.references.assets, canvas.promptRecords, canvas.feedbackNotes)
    if (n.type === 'prompt' || n.type === 'feedback') data.onInput = (t: string) => onPromptInput(n.id, t)
    return { id: n.id, type: n.type, position: n.position, data }
  })
  flowEdges.value = canvas.edges.map((e) => ({ id: e.id, source: e.source, target: e.target }))
  loaded.value = true

  // AI 助手会话
  const convs = await conversationsApi.list(projectId)
  conversation.value = convs[0] || (await conversationsApi.create(projectId))
  messages.value = await conversationsApi.messages(conversation.value.id)
  scrollChat()
}

onMounted(loadAll)

// ---------- 画布交互 ----------
let saveTimer: ReturnType<typeof setTimeout>
function scheduleSave() {
  if (readonly.value) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(persist, 500)
}
async function persist() {
  if (readonly.value) return
  const apiNodes = flowNodes.value.map((n) => ({
    id: n.id,
    type: n.type as 'input' | 'prompt' | 'output' | 'feedback',
    position: n.position,
    refType: (n.data?.refType as 'asset' | 'prompt' | 'feedback' | 'none') ?? 'none',
    refId: (n.data?.refId as string | null) ?? null,
  }))
  const apiEdges = flowEdges.value.map((e) => ({ id: e.id, source: e.source, target: e.target }))
  const promptRecords: Record<string, string> = {}
  const feedbackNotes: Record<string, string> = {}
  flowNodes.value.forEach((n) => {
    const refId = n.data?.refId as string | null
    if (n.type === 'prompt' && refId) promptRecords[refId] = (n.data?.text as string) || ''
    if (n.type === 'feedback' && refId) feedbackNotes[refId] = (n.data?.text as string) || ''
  })
  await canvasApi.save(projectId, { nodes: apiNodes, edges: apiEdges, promptRecords, feedbackNotes })
}

function onNodesChange(changes: any[]) {
  flowNodes.value = applyNodeChanges(changes, flowNodes.value)
  if (changes.some((c) => c.type === 'position' && c.dragging === false)) scheduleSave()
}
function onEdgesChange(changes: any[]) {
  flowEdges.value = applyEdgeChanges(changes, flowEdges.value)
  scheduleSave()
}
function onConnect(conn: any) {
  if (readonly.value) return
  flowEdges.value = addEdge({ ...conn, id: uid('e') }, flowEdges.value)
  scheduleSave()
}
function onNodeClick(e: any) {
  selectedId.value = e.node.id
}
function onPromptInput(nodeId: string, text: string) {
  const n = flowNodes.value.find((x) => x.id === nodeId)
  if (n) {
    n.data!.text = text
    scheduleSave()
  }
}

function addAssetToCanvas(a: Asset) {
  if (readonly.value) return
  const id = uid('n')
  flowNodes.value.push({
    id,
    type: a.type,
    position: { x: 60 + Math.random() * 120, y: 80 + Math.random() * 200 },
    data: { refType: 'asset', refId: a.id, asset: a, readonly: readonly.value },
  })
  scheduleSave()
  message.success('已添加到画布')
}

let addCount = 0
function addNode(type: 'output' | 'prompt' | 'feedback') {
  if (readonly.value) return
  const id = uid('n')
  addCount += 1
  const position = { x: 150 + ((addCount * 36) % 240), y: 110 + ((addCount * 30) % 210) }
  const data: Record<string, unknown> = { readonly: false }
  if (type === 'prompt') {
    data.refType = 'prompt'
    data.refId = `pr-${id}`
    data.text = ''
    data.caption = 'Prompt 节点'
    data.onInput = (t: string) => onPromptInput(id, t)
  } else if (type === 'feedback') {
    data.refType = 'feedback'
    data.refId = `fb-${id}`
    data.text = ''
    data.caption = '反馈 / 备注'
    data.onInput = (t: string) => onPromptInput(id, t)
  } else {
    data.refType = 'none'
    data.refId = null
    data.caption = '设计稿（待绑定）'
    data.onPick = () => openAssetPicker(id)
  }
  flowNodes.value.push({ id, type, position, data })
  selectedId.value = id
  scheduleSave()
}

// ---------- 生成闭环 ----------
async function pollRun(runId: string): Promise<Asset | null> {
  for (let i = 0; i < 40; i++) {
    const run = await generationApi.getRun(runId)
    if (run.status === 'success' && run.outputAssetId) return assetsApi.get(run.outputAssetId)
    if (run.status === 'failed') return null
    await new Promise((r) => setTimeout(r, 500))
  }
  return null
}

async function generate(fromPromptId?: string, modelId?: string) {
  if (readonly.value) return message.warning('当前为只读，无法生成')
  const prompt = fromPromptId ? flowNodes.value.find((n) => n.id === fromPromptId) : selectedPrompt.value
  if (!prompt) return message.warning('请先在画布上选择一个 Prompt 节点')
  const text = (prompt.data?.text as string) || ''
  if (!text.trim()) return message.warning('Prompt 内容为空')

  const inputIds = flowEdges.value
    .filter((e) => e.target === prompt.id)
    .map((e) => flowNodes.value.find((n) => n.id === e.source))
    .filter((n) => n?.type === 'input')
    .map((n) => n!.data?.refId as string)
    .filter(Boolean)
  const mode = inputIds.length ? 'img2img' : 'text2img'

  const tmpId = uid('n')
  flowNodes.value.push({
    id: tmpId,
    type: 'output',
    position: { x: prompt.position.x + 300, y: prompt.position.y - 10 },
    data: { refType: 'none', refId: null, pending: true, caption: 'Output 生成中' },
  })
  flowEdges.value = addEdge({ source: prompt.id, target: tmpId, id: uid('e') }, flowEdges.value)
  generating.value = true
  try {
    const { runId } = await generationApi.generate(projectId, {
      mode,
      prompt: text,
      modelId: modelId || selectedModel.value,
      inputAssetIds: inputIds,
      promptNodeId: prompt.id,
    })
    const asset = await pollRun(runId)
    if (asset) {
      // 替换整个数组触发 Vue Flow 重渲染（受控模式下直接 mutate node.data 不生效）
      flowNodes.value = flowNodes.value.map((n) =>
        n.id === tmpId
          ? { ...n, data: { refType: 'asset', refId: asset.id, asset, pending: false, caption: 'Output 图', readonly: readonly.value } }
          : n,
      )
      await refreshSide()
      scheduleSave()
      message.success('已生成并落入画布与素材库')
    } else {
      flowNodes.value = flowNodes.value.filter((n) => n.id !== tmpId)
      message.error('生成失败，请重试')
    }
  } finally {
    generating.value = false
  }
}

async function refreshSide() {
  assets.value = await assetsApi.listByProject(projectId)
  project.value = await projectsApi.get(projectId)
}

// 设计稿节点：点击占位 → 选素材绑定
const showPicker = ref(false)
const pickerTargetId = ref<string | null>(null)
function openAssetPicker(nodeId: string) {
  pickerTargetId.value = nodeId
  showPicker.value = true
}
function bindAsset(asset: Asset) {
  const id = pickerTargetId.value
  if (!id) return
  flowNodes.value = flowNodes.value.map((n) =>
    n.id === id
      ? { ...n, data: { ...n.data, refType: 'asset', refId: asset.id, asset, caption: asset.type === 'output' ? 'Output 图' : '设计稿' } }
      : n,
  )
  showPicker.value = false
  pickerTargetId.value = null
  scheduleSave()
  message.success('已绑定素材')
}

// ---------- AI 助手 ----------
const conversation = ref<Conversation | null>(null)
const messages = ref<ChatMessage[]>([])
const draft = ref('')
const sending = ref(false)
const chatRef = ref<HTMLElement | null>(null)
const QUICK = ['优化当前 Prompt', '整合多图意图', '按当前 Prompt 再生成', '总结 Prompt 版本']

function scrollChat() {
  nextTick(() => {
    if (chatRef.value) chatRef.value.scrollTop = chatRef.value.scrollHeight
  })
}

async function send(text?: string) {
  const content = (text ?? draft.value).trim()
  if (!content || !conversation.value) return
  draft.value = ''
  sending.value = true
  messages.value.push({ id: uid('m'), role: 'user', content, createdAt: new Date().toISOString() })
  scrollChat()
  try {
    const ctx = selectedId.value ? [selectedId.value] : []
    const reply = await conversationsApi.send(conversation.value.id, content, ctx)
    messages.value.push(reply)
    scrollChat()
  } finally {
    sending.value = false
  }
}

function runAction(action: ChatAction) {
  if (action.kind === 'applyPromptPatch') {
    flowNodes.value = flowNodes.value.map((n) =>
      n.id === action.targetNodeId ? { ...n, data: { ...n.data, text: action.promptPatch } } : n,
    )
    selectedId.value = action.targetNodeId
    scheduleSave()
    message.success('已应用到 Prompt 节点')
  } else if (action.kind === 'generateFromPrompt') {
    generate(action.promptNodeId, action.modelId)
  }
}

// ---------- 顶部操作 ----------
function downloadAsset(a: Asset) {
  const link = document.createElement('a')
  link.href = a.url
  link.download = `${a.id}.svg`
  link.click()
}
function confirmArchive() {
  if (!project.value) return
  const p = project.value
  if (p.status === 'archived') {
    projectsApi.restore(p.id).then(() => { p.status = 'active'; message.success('已恢复为进行中') })
    return
  }
  dialog.warning({
    title: '归档项目',
    content: '归档后画板变为只读，需恢复后才能继续编辑。',
    positiveText: '归档',
    negativeText: '取消',
    onPositiveClick: async () => {
      await projectsApi.archive(p.id)
      p.status = 'archived'
      message.success('已归档')
    },
  })
}
</script>

<template>
  <div v-if="project" class="board">
    <div class="board-head">
      <div class="bh-left">
        <button class="back" @click="router.push('/projects')">←</button>
        <div>
          <h1 class="font-display">
            {{ project.name }}
            <span class="tag" :class="project.status === 'active' ? 'ok' : 'warn'">{{ project.status === 'active' ? '进行中' : '已归档' }}</span>
            <span v-if="readonly" class="tag ro">只读</span>
          </h1>
          <p class="font-mono">最近更新 {{ relativeTime(project.updatedAt) }} · 多张 Input → Prompt 融合 → Output</p>
        </div>
      </div>
      <div class="bh-acts">
        <n-button tertiary @click="confirmArchive">{{ project.status === 'archived' ? '恢复项目' : '归档项目' }}</n-button>
        <n-button @click="router.push('/projects')">返回</n-button>
      </div>
    </div>

    <div class="board-grid">
      <!-- 素材区 -->
      <section class="panel assets">
        <div class="panel-h">
          <b class="font-display">项目素材</b>
        </div>
        <div class="panel-b">
          <div class="seg">
            <button :class="{ on: assetTab === 'all' }" @click="assetTab = 'all'">全部</button>
            <button :class="{ on: assetTab === 'input' }" @click="assetTab = 'input'">Input</button>
            <button :class="{ on: assetTab === 'output' }" @click="assetTab = 'output'">Output</button>
          </div>
          <div
            v-for="a in filteredAssets"
            :key="a.id"
            class="asset-row"
            :class="{ disabled: readonly }"
            @click="addAssetToCanvas(a)"
          >
            <div class="thumb" :style='{ backgroundImage: `url("${a.thumbnailUrl}")` }' />
            <div class="a-meta">
              <b>{{ a.type === 'output' ? a.modelName : '参考图' }}</b>
              <small class="font-mono">{{ a.type.toUpperCase() }} · {{ a.creatorName }}</small>
            </div>
            <button class="dl" title="下载" @click.stop="downloadAsset(a)">⬇</button>
          </div>
        </div>
      </section>

      <!-- 画布 -->
      <section class="panel canvas-area">
        <div v-if="!readonly" class="canvas-tools">
          <span class="ct-label font-mono">添加节点</span>
          <button @click="addNode('output')"><i class="d-dot design" />设计稿</button>
          <button @click="addNode('prompt')"><i class="d-dot prompt" />Prompt</button>
          <button @click="addNode('feedback')"><i class="d-dot fb" />反馈</button>
        </div>
        <VueFlow
          v-if="loaded"
          :nodes="flowNodes"
          :edges="flowEdges"
          :nodes-draggable="!readonly"
          :nodes-connectable="!readonly"
          :elements-selectable="true"
          :min-zoom="0.4"
          :max-zoom="1.6"
          fit-view-on-init
          @nodes-change="onNodesChange"
          @edges-change="onEdgesChange"
          @connect="onConnect"
          @node-click="onNodeClick"
          @pane-click="selectedId = null"
        >
          <Background :gap="26" pattern-color="var(--canvas-grid)" />
          <template #node-input="p"><CanvasNode v-bind="p" /></template>
          <template #node-prompt="p"><CanvasNode v-bind="p" /></template>
          <template #node-output="p"><CanvasNode v-bind="p" /></template>
          <template #node-feedback="p"><CanvasNode v-bind="p" /></template>
        </VueFlow>
      </section>

      <!-- AI 助手 -->
      <section class="panel agent">
        <div class="panel-h">
          <b class="font-display">AI 设计助手</b>
          <span class="ctx-tag" :class="{ active: selectedPrompt }">
            {{ selectedPrompt ? '选中 Prompt' : selectedNode ? '选中节点' : '未选中' }}
          </span>
        </div>
        <div class="panel-b agent-body">
          <div class="note">
            {{ selectedPrompt ? '已选择 Prompt 节点，对话将持续优化这个节点；可一键应用或再生成。' : '在画布上点选一个 Prompt 节点，助手就能把建议直接应用到它上面。' }}
          </div>

          <div v-if="!readonly" class="gen-bar">
            <n-select v-model:value="selectedModel" size="small" :options="imageModels.map((m) => ({ label: m.name, value: m.id }))" style="flex: 1" />
            <n-button size="small" type="primary" :loading="generating" :disabled="!selectedPrompt" @click="generate()">⚡ 生成</n-button>
          </div>

          <div v-if="!readonly" class="chips">
            <button v-for="q in QUICK" :key="q" class="chip" @click="send(q)">{{ q }}</button>
          </div>

          <div ref="chatRef" class="chat">
            <div v-for="m in messages" :key="m.id" class="bubble" :class="m.role">
              <div>{{ m.content }}</div>
              <div v-if="m.actions?.length" class="actions">
                <n-button
                  v-for="(a, i) in m.actions"
                  :key="i"
                  size="tiny"
                  :type="a.kind === 'applyPromptPatch' ? 'default' : 'primary'"
                  :disabled="readonly"
                  @click="runAction(a)"
                >
                  {{ a.kind === 'applyPromptPatch' ? '应用到 Prompt' : a.kind === 'generateFromPrompt' ? '直接生成' : a.kind }}
                </n-button>
              </div>
            </div>
          </div>

          <div v-if="!readonly" class="composer">
            <n-input
              v-model:value="draft"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 4 }"
              placeholder="描述你对当前 Prompt 节点的修改要求…"
              @keydown.enter.prevent="send()"
            />
            <n-button block type="primary" size="small" :loading="sending" style="margin-top: 8px" @click="send()">发送</n-button>
          </div>
          <div v-else class="callout">老板视角为只读：可查看画布、素材、Prompt 与对话记录、下载素材，不可编辑或生成。</div>
        </div>
      </section>
    </div>

    <n-modal v-model:show="showPicker" preset="card" title="选择素材绑定到设计稿节点" style="max-width: 600px">
      <div v-if="assets.length" class="picker-grid">
        <div v-for="a in assets" :key="a.id" class="picker-item" @click="bindAsset(a)">
          <div class="p-thumb" :style='{ backgroundImage: `url("${a.thumbnailUrl}")` }' />
          <small class="font-mono">{{ a.type === 'output' ? a.modelName : '参考图' }} · {{ a.type.toUpperCase() }}</small>
        </div>
      </div>
      <n-empty v-else description="项目暂无素材，先上传或生成" />
    </n-modal>
  </div>
  <n-spin v-else :show="true" style="display: block; padding: 120px 0" />
</template>

<style scoped>
.board {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 124px);
}
.board-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.bh-left {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}
.back {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink);
  cursor: pointer;
  font-size: 16px;
}
.board-head h1 {
  font-size: 22px;
  font-weight: 600;
  margin: 0 0 5px;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 10px;
}
.board-head p {
  color: var(--muted);
  font-size: 11.5px;
  margin: 0;
}
.tag {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 8px;
}
.tag.ok { background: var(--success-soft); color: var(--success); }
.tag.warn { background: var(--warn-soft); color: var(--warn); }
.tag.ro { background: var(--primary-soft); color: var(--primary-2); }
.bh-acts {
  display: flex;
  gap: 8px;
}
.board-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 264px 1fr 336px;
  gap: 16px;
  min-height: 0;
}
.panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.panel-h {
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.panel-h b {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
}
.panel-b {
  padding: 14px;
  overflow: auto;
  flex: 1;
}
.seg {
  display: flex;
  gap: 3px;
  background: var(--bg-2);
  padding: 3px;
  border-radius: 9px;
  margin-bottom: 12px;
}
.seg button {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  border: 0;
  background: transparent;
  color: var(--muted);
  padding: 6px;
  border-radius: 7px;
  cursor: pointer;
}
.seg button.on {
  background: var(--primary);
  color: var(--on-primary);
}
.asset-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: 12px;
  margin-bottom: 9px;
  background: var(--bg-2);
  cursor: pointer;
  transition: border-color 0.14s;
}
.asset-row:hover {
  border-color: var(--primary);
}
.asset-row.disabled {
  cursor: default;
}
.asset-row .thumb {
  width: 48px;
  height: 48px;
  border-radius: 9px;
  flex: none;
  border: 1px solid var(--line-2);
  background-size: cover;
  background-position: center;
}
.a-meta {
  flex: 1;
  min-width: 0;
}
.a-meta b {
  display: block;
  font-size: 12.5px;
  color: var(--ink);
}
.a-meta small {
  font-size: 10px;
  color: var(--muted);
}
.dl {
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font-size: 14px;
}
.dl:hover {
  color: var(--primary);
}
.canvas-area {
  padding: 0;
  background: var(--canvas-bg);
  position: relative;
}
.canvas-tools {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 11px;
  padding: 6px;
  box-shadow: var(--shadow);
}
.canvas-tools .ct-label {
  font-size: 10px;
  letter-spacing: 0.04em;
  color: var(--muted);
  padding: 0 4px 0 6px;
}
.canvas-tools button {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid var(--line);
  background: var(--bg-2);
  color: var(--ink);
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
  transition: border-color 0.14s, color 0.14s;
}
.canvas-tools button:hover {
  border-color: var(--primary);
  color: var(--primary);
}
.d-dot {
  width: 7px;
  height: 7px;
  border-radius: 2px;
  display: inline-block;
}
.d-dot.design { background: var(--success); }
.d-dot.prompt { background: var(--accent); }
.d-dot.fb { background: var(--warn); }
.canvas-area :deep(.vue-flow) {
  border-radius: 16px;
}
.agent-body {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden; /* 覆盖 panel-b 的 auto，让内部消息区独立滚动 */
  padding-bottom: 14px;
}
.note {
  background: var(--primary-soft);
  border: 1px solid color-mix(in srgb, var(--primary) 22%, transparent);
  border-radius: 12px;
  padding: 11px 12px;
  font-size: 12px;
  color: var(--primary-2);
  line-height: 1.5;
  margin-bottom: 12px;
}
.gen-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 14px;
}
.chip {
  font-family: var(--font-mono);
  font-size: 11px;
  border: 1px solid var(--line-2);
  background: var(--bg-2);
  border-radius: 9px;
  padding: 7px 9px;
  cursor: pointer;
  color: var(--ink-2);
}
.chip:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.chat {
  display: flex;
  flex-direction: column;
  gap: 9px;
  flex: 1;
  min-height: 0; /* 关键：允许收缩，让消息区独立滚动而非撑高容器 */
  overflow-y: auto;
  padding-right: 2px;
}
.bubble {
  padding: 10px 12px;
  border-radius: 13px;
  font-size: 12.5px;
  line-height: 1.55;
  max-width: 92%;
}
.bubble.user {
  background: var(--ink);
  color: var(--bg);
  align-self: flex-end;
  border-bottom-right-radius: 5px;
}
.bubble.assistant {
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-bottom-left-radius: 5px;
}
.actions {
  display: flex;
  gap: 7px;
  margin-top: 9px;
}
.ctx-tag {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 7px;
  background: var(--bg-2);
  color: var(--muted);
}
.ctx-tag.active {
  background: var(--primary-soft);
  color: var(--primary-2);
}
.composer {
  margin-top: 12px;
  flex: none; /* 固定在底部，不被消息流挤压 */
}
.callout {
  margin-top: 12px;
  padding: 12px;
  border-radius: 12px;
  background: var(--warn-soft);
  color: var(--warn);
  font-size: 12px;
  line-height: 1.55;
}
.picker-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  max-height: 420px;
  overflow: auto;
}
.picker-item {
  cursor: pointer;
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
  transition: border-color 0.14s, transform 0.14s;
}
.picker-item:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
}
.p-thumb {
  height: 90px;
  background-size: cover;
  background-position: center;
}
.picker-item small {
  display: block;
  padding: 8px 10px;
  font-size: 10px;
  color: var(--muted);
}
</style>
