<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage, useDialog } from 'naive-ui'
import { projectsApi, membersApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { relativeTime } from '@/composables/format'
import type { Project, TeamMember } from '@/api/types'

const auth = useAuthStore()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const projects = ref<Project[]>([])
const members = ref<TeamMember[]>([])
const loading = ref(true)
const tab = ref<'' | 'active' | 'archived'>('')
const keyword = ref('')
const ownerFilter = ref<string | null>(null)

const nameOf = (id: string) => members.value.find((m) => m.userId === id)?.displayName || id
const memberOptions = computed(() => members.value.map((m) => ({ label: m.displayName, value: m.userId })))

async function load() {
  loading.value = true
  try {
    const r = await projectsApi.list({
      status: tab.value || undefined,
      ownerId: ownerFilter.value || undefined,
      keyword: keyword.value || undefined,
      pageSize: 60,
    })
    projects.value = r.items
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (auth.user) members.value = await membersApi.list(auth.user.teamId)
  await load()
})
watch([tab, ownerFilter], load)
let kwTimer: ReturnType<typeof setTimeout>
watch(keyword, () => {
  clearTimeout(kwTimer)
  kwTimer = setTimeout(load, 280)
})

function canManage(p: Project) {
  if (auth.isAdmin) return true
  const me = auth.user?.userId
  return p.createdByUserId === me || p.ownerUserId === me || p.collaboratorIds.includes(me || '')
}

function enterBoard(p: Project) {
  router.push(`/projects/${p.id}/board`)
}

function confirmArchive(p: Project) {
  dialog.warning({
    title: '归档项目',
    content: `归档后「${p.name}」变为只读，需恢复后才能继续编辑。数据与记录会完整保留。`,
    positiveText: '归档',
    negativeText: '取消',
    onPositiveClick: async () => {
      await projectsApi.archive(p.id)
      message.success('已归档')
      load()
    },
  })
}
async function restore(p: Project) {
  await projectsApi.restore(p.id)
  message.success('已恢复为进行中')
  load()
}

// 新建项目
const showCreate = ref(false)
const submitting = ref(false)
const form = reactive({ name: '', description: '', ownerUserId: '', collaboratorIds: [] as string[], initialPrompt: '' })
const collabOptions = computed(() => memberOptions.value.filter((o) => o.value !== form.ownerUserId))

function openCreate() {
  form.name = ''
  form.description = ''
  form.ownerUserId = auth.user?.userId || ''
  form.collaboratorIds = []
  form.initialPrompt = ''
  showCreate.value = true
}
async function submitCreate() {
  if (!form.name.trim()) {
    message.warning('请填写项目名称')
    return
  }
  submitting.value = true
  try {
    const p = await projectsApi.create({
      name: form.name.trim(),
      description: form.description,
      ownerUserId: form.ownerUserId,
      collaboratorIds: form.collaboratorIds,
      initialPrompt: form.initialPrompt,
    })
    message.success('项目已创建')
    showCreate.value = false
    await load()
    enterBoard(p)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="projects">
    <div class="page-head">
      <div>
        <h1 class="font-display">{{ auth.isAdmin ? '全部项目' : '我的项目' }}</h1>
        <p>每个项目对应一个设计任务，沉淀画板、素材、Prompt、对话与生成记录。</p>
      </div>
      <n-button type="primary" size="large" @click="openCreate">＋ 新建项目</n-button>
    </div>

    <div class="toolbar">
      <n-input v-model:value="keyword" placeholder="搜索项目名称 / 说明" clearable style="max-width: 280px">
        <template #prefix><span class="ic-search" /></template>
      </n-input>
      <n-select
        v-if="auth.isAdmin"
        v-model:value="ownerFilter"
        :options="memberOptions"
        placeholder="全部负责人"
        clearable
        style="width: 170px"
      />
      <div class="seg">
        <button :class="{ on: tab === '' }" @click="tab = ''">全部</button>
        <button :class="{ on: tab === 'active' }" @click="tab = 'active'">进行中</button>
        <button :class="{ on: tab === 'archived' }" @click="tab = 'archived'">已归档</button>
      </div>
    </div>

    <n-spin :show="loading">
      <div v-if="projects.length" class="project-grid">
        <div v-for="p in projects" :key="p.id" class="project-card" :class="{ archived: p.status === 'archived' }">
          <div class="meta">
            <span class="tag" :class="p.status === 'active' ? 'ok' : 'warn'">{{ p.status === 'active' ? '进行中' : '已归档' }}</span>
            <span class="owner"><span class="dot" />负责人 {{ nameOf(p.ownerUserId) }}</span>
          </div>
          <h3>{{ p.name }}</h3>
          <p class="desc">{{ p.description || '暂无说明' }}</p>
          <div class="stats">
            <div><b class="font-mono">{{ p.assetCount }}</b><span>素材</span></div>
            <div><b class="font-mono">{{ p.generationCount }}</b><span>生成</span></div>
            <div><b class="font-mono">{{ p.collaboratorIds.length }}</b><span>协作</span></div>
          </div>
          <div class="card-foot">
            <span class="upd font-mono">{{ relativeTime(p.updatedAt) }}</span>
            <div class="acts">
              <n-button v-if="p.status === 'archived' && canManage(p)" size="small" tertiary @click="restore(p)">恢复</n-button>
              <n-button v-else-if="canManage(p)" size="small" tertiary @click="confirmArchive(p)">归档</n-button>
              <n-button size="small" type="primary" @click="enterBoard(p)">
                {{ p.status === 'archived' ? '查看' : '进入画板' }}
              </n-button>
            </div>
          </div>
        </div>
      </div>
      <n-empty v-else-if="!loading" description="没有符合条件的项目" style="padding: 60px 0">
        <template #extra><n-button size="small" @click="openCreate">新建一个项目</n-button></template>
      </n-empty>
    </n-spin>

    <n-modal v-model:show="showCreate" preset="card" title="新建设计项目" style="max-width: 560px">
      <n-form label-placement="top">
        <n-form-item label="项目名称" required>
          <n-input v-model:value="form.name" placeholder="例如：儿童保温杯详情页设计" />
        </n-form-item>
        <n-form-item label="项目说明">
          <n-input v-model:value="form.description" type="textarea" placeholder="简述本次设计目标" :autosize="{ minRows: 2 }" />
        </n-form-item>
        <div class="form-row">
          <n-form-item label="负责人">
            <n-select v-model:value="form.ownerUserId" :options="memberOptions" />
          </n-form-item>
          <n-form-item label="协作成员">
            <n-select v-model:value="form.collaboratorIds" multiple :options="collabOptions" placeholder="可选" />
          </n-form-item>
        </div>
        <n-form-item label="初始 Prompt">
          <n-input v-model:value="form.initialPrompt" type="textarea" placeholder="可选，初始生成需求" :autosize="{ minRows: 2 }" />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="modal-foot">
          <n-button @click="showCreate = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="submitCreate">创建并进入画板</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
}
.page-head h1 {
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.02em;
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
  padding: 7px 14px;
  border-radius: 7px;
  cursor: pointer;
}
.seg button.on {
  background: var(--primary);
  color: var(--on-primary);
}
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}
.project-card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 18px;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  transition: transform 0.14s, box-shadow 0.14s;
}
.project-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
.project-card.archived {
  opacity: 0.86;
}
.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.tag {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  padding: 4px 9px;
  border-radius: 8px;
}
.tag.ok {
  background: var(--success-soft);
  color: var(--success);
}
.tag.warn {
  background: var(--warn-soft);
  color: var(--warn);
}
.owner {
  font-size: 12px;
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.owner .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary);
}
.project-card h3 {
  margin: 0 0 7px;
  font-size: 17px;
  font-family: var(--font-display);
  font-weight: 600;
  color: var(--ink);
}
.desc {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
  margin: 0 0 14px;
  min-height: 38px;
}
.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}
.stats div {
  background: var(--bg-2);
  border-radius: 10px;
  padding: 9px;
  text-align: center;
}
.stats b {
  display: block;
  font-size: 17px;
  color: var(--ink);
}
.stats span {
  font-size: 11px;
  color: var(--muted);
}
.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}
.upd {
  font-size: 11px;
  color: var(--muted);
}
.acts {
  display: flex;
  gap: 8px;
}
.ic-search {
  width: 14px;
  height: 14px;
  display: inline-block;
  background: currentColor;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m20 20-3-3'/%3E%3C/svg%3E") center/contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m20 20-3-3'/%3E%3C/svg%3E") center/contain no-repeat;
  opacity: 0.5;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
