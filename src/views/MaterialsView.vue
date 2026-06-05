<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { assetsApi, membersApi, modelsApi, projectsApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { relativeTime } from '@/composables/format'
import type { Asset } from '@/api/types'

const auth = useAuthStore()
const router = useRouter()
const message = useMessage()

const assets = ref<Asset[]>([])
const loading = ref(true)
const tab = ref<'' | 'input' | 'output'>('')
const keyword = ref('')
const projectFilter = ref<string | null>(null)
const memberFilter = ref<string | null>(null)
const modelFilter = ref<string | null>(null)

const projectOptions = ref<{ label: string; value: string }[]>([])
const memberOptions = ref<{ label: string; value: string }[]>([])
const modelOptions = ref<{ label: string; value: string }[]>([])

const showDrawer = ref(false)
const detail = ref<Asset | null>(null)
const relatedInputs = ref<Asset[]>([])

async function load() {
  loading.value = true
  try {
    const r = await assetsApi.listAll({
      type: tab.value || undefined,
      projectId: projectFilter.value || undefined,
      creatorId: memberFilter.value || undefined,
      model: modelFilter.value || undefined,
      keyword: keyword.value || undefined,
      pageSize: 60,
    })
    assets.value = r.items
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const [projs, models] = await Promise.all([projectsApi.list({ pageSize: 60 }), modelsApi.list()])
  projectOptions.value = projs.items.map((p) => ({ label: p.name, value: p.id }))
  modelOptions.value = models.map((m) => ({ label: m.name, value: m.id }))
  if (auth.isAdmin && auth.user) {
    const ms = await membersApi.list(auth.user.teamId)
    memberOptions.value = ms.filter((m) => m.role === 'designer').map((m) => ({ label: m.displayName, value: m.userId }))
  }
  await load()
})
watch([tab, projectFilter, memberFilter, modelFilter], load)
let t: ReturnType<typeof setTimeout>
watch(keyword, () => {
  clearTimeout(t)
  t = setTimeout(load, 280)
})

async function openDetail(a: Asset) {
  showDrawer.value = true
  detail.value = await assetsApi.get(a.id)
  relatedInputs.value = []
  if (detail.value.relatedInputIds?.length) {
    relatedInputs.value = await Promise.all(detail.value.relatedInputIds.map((id) => assetsApi.get(id)))
  }
}

function download(a: Asset) {
  const link = document.createElement('a')
  link.href = a.url
  link.download = `${a.id}.svg`
  link.click()
  message.success('已开始下载')
}
function enterProject(a: Asset) {
  router.push(`/projects/${a.projectId}/board`)
}
</script>

<template>
  <div class="materials">
    <div class="page-head">
      <h1 class="font-display">{{ auth.isAdmin ? '团队素材库' : '我的素材' }}</h1>
      <p>集中管理 Input 图与 Output 图。Output 图可查看完整 Prompt 和来源记录。</p>
    </div>

    <div class="toolbar">
      <n-input v-model:value="keyword" placeholder="搜索项目 / Prompt" clearable style="max-width: 240px" />
      <n-select v-model:value="projectFilter" :options="projectOptions" placeholder="全部项目" clearable style="width: 170px" />
      <n-select v-if="auth.isAdmin" v-model:value="memberFilter" :options="memberOptions" placeholder="全部成员" clearable style="width: 150px" />
      <n-select v-model:value="modelFilter" :options="modelOptions" placeholder="全部模型" clearable style="width: 150px" />
      <div class="seg">
        <button :class="{ on: tab === '' }" @click="tab = ''">全部</button>
        <button :class="{ on: tab === 'input' }" @click="tab = 'input'">Input 图</button>
        <button :class="{ on: tab === 'output' }" @click="tab = 'output'">Output 图</button>
      </div>
    </div>

    <n-spin :show="loading">
      <div v-if="assets.length" class="grid">
        <div v-for="a in assets" :key="a.id" class="m-card">
          <div class="thumb" :style="{ backgroundImage: `url(${a.thumbnailUrl})` }" @click="openDetail(a)">
            <span class="type-badge" :class="a.type">{{ a.type === 'output' ? 'OUTPUT' : 'INPUT' }}</span>
          </div>
          <div class="m-body">
            <b>{{ a.type === 'output' ? a.modelName : '参考图' }}</b>
            <small class="font-mono">{{ a.projectName }} · {{ a.creatorName }}</small>
            <div class="m-acts">
              <n-button size="tiny" tertiary @click="openDetail(a)">详情</n-button>
              <n-button size="tiny" tertiary @click="download(a)">下载</n-button>
            </div>
          </div>
        </div>
      </div>
      <n-empty v-else-if="!loading" description="没有符合条件的素材" style="padding: 60px 0" />
    </n-spin>

    <n-drawer v-model:show="showDrawer" :width="440">
      <n-drawer-content v-if="detail" title="素材详情" closable>
        <div class="d-preview" :style="{ backgroundImage: `url(${detail.url})` }" />
        <div class="field"><label>类型</label><div><span class="tag" :class="detail.type === 'output' ? 'ok' : 'info'">{{ detail.type === 'output' ? 'Output 图' : 'Input 图' }}</span></div></div>
        <div class="field"><label>所属项目</label><div>{{ detail.projectName }}</div></div>
        <div class="field"><label>创建人 / 时间</label><div>{{ detail.creatorName }} · {{ relativeTime(detail.createdAt) }}</div></div>
        <template v-if="detail.type === 'output'">
          <div class="field"><label>使用模型</label><div>{{ detail.modelName }}</div></div>
          <div class="field"><label>完整 Prompt</label><div class="prompt-box">{{ detail.prompt }}</div></div>
          <div v-if="relatedInputs.length" class="field">
            <label>关联 Input</label>
            <div class="rel-inputs">
              <div v-for="r in relatedInputs" :key="r.id" class="rel" :style="{ backgroundImage: `url(${r.thumbnailUrl})` }" />
            </div>
          </div>
          <div class="field"><label>来源记录</label><div class="font-mono muted">{{ detail.sourceRef }}</div></div>
        </template>
        <div class="d-acts">
          <n-button type="primary" @click="enterProject(detail)">进入来源项目</n-button>
          <n-button tertiary @click="download(detail)">下载</n-button>
          <n-button v-if="!auth.isAdmin && detail.type === 'output'" tertiary @click="enterProject(detail)">继续修改</n-button>
        </div>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<style scoped>
.page-head {
  margin-bottom: 18px;
}
.page-head h1 {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 6px;
  color: var(--ink);
}
.page-head p {
  color: var(--muted);
  font-size: 13.5px;
  margin: 0;
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.seg {
  display: inline-flex;
  gap: 3px;
  background: var(--panel);
  border: 1px solid var(--line);
  padding: 3px;
  border-radius: 10px;
  margin-left: auto;
}
.seg button {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  border: 0;
  background: transparent;
  color: var(--muted);
  padding: 7px 13px;
  border-radius: 7px;
  cursor: pointer;
}
.seg button.on {
  background: var(--primary);
  color: var(--on-primary);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 16px;
}
.m-card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--shadow);
  transition: transform 0.14s, box-shadow 0.14s;
}
.m-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
.thumb {
  height: 150px;
  background-size: cover;
  background-position: center;
  cursor: pointer;
  position: relative;
  border-bottom: 1px solid var(--line);
}
.type-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  padding: 3px 7px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  letter-spacing: 0.06em;
}
.m-body {
  padding: 12px 14px;
}
.m-body b {
  display: block;
  font-size: 13px;
  color: var(--ink);
  margin-bottom: 3px;
}
.m-body small {
  font-size: 10.5px;
  color: var(--muted);
}
.m-acts {
  display: flex;
  gap: 8px;
  margin-top: 11px;
}
.tag {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 7px;
}
.tag.ok { background: var(--success-soft); color: var(--success); }
.tag.info { background: var(--primary-soft); color: var(--primary-2); }
.muted { color: var(--muted); }
.d-preview {
  height: 200px;
  border-radius: 14px;
  background-size: cover;
  background-position: center;
  border: 1px solid var(--line);
  margin-bottom: 18px;
}
.field {
  margin-bottom: 15px;
}
.field label {
  display: block;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 6px;
}
.field > div {
  font-size: 13.5px;
  color: var(--ink);
}
.prompt-box {
  background: var(--bg-2);
  border-radius: 10px;
  padding: 11px 12px;
  font-size: 13px;
  line-height: 1.6;
}
.rel-inputs {
  display: flex;
  gap: 8px;
}
.rel {
  width: 56px;
  height: 56px;
  border-radius: 9px;
  background-size: cover;
  border: 1px solid var(--line-2);
}
.d-acts {
  display: flex;
  gap: 9px;
  margin-top: 22px;
  flex-wrap: wrap;
}
</style>
