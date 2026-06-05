<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { membersApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { relativeTime } from '@/composables/format'
import type { MemberDetail, TeamMember } from '@/api/types'

const auth = useAuthStore()
const members = ref<TeamMember[]>([])
const loading = ref(true)
const showDrawer = ref(false)
const detail = ref<MemberDetail | null>(null)
const detailLoading = ref(false)

onMounted(async () => {
  try {
    if (auth.user) members.value = await membersApi.list(auth.user.teamId)
  } finally {
    loading.value = false
  }
})

async function openDetail(userId: string) {
  showDrawer.value = true
  detailLoading.value = true
  detail.value = null
  try {
    if (auth.user) detail.value = await membersApi.detail(auth.user.teamId, userId)
  } finally {
    detailLoading.value = false
  }
}

const STATUS: Record<string, { t: string; c: string }> = {
  active: { t: '活跃', c: 'ok' },
  low: { t: '低活跃', c: 'info' },
  none: { t: '暂无使用', c: 'muted' },
}
</script>

<template>
  <div class="members">
    <div class="page-head">
      <h1 class="font-display">成员管理</h1>
      <p>查看团队成员、角色、参与项目和使用情况。一期不做新增管理员、停用启用与复杂权限设置。</p>
    </div>

    <div class="note">
      首期账号配置：<b>1 名管理员 + 3 名设计师</b>。如需新增账号或调整权限，可联系服务方另行确认。
    </div>

    <div class="card">
      <n-spin :show="loading">
        <table>
          <thead>
            <tr>
              <th>成员</th><th>手机号</th><th>角色</th><th class="num">参与项目</th><th class="num">进行中</th><th class="num">本月生成</th><th>最近活跃</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in members" :key="m.userId">
              <td>
                <span class="who"><span class="av" :style='{ backgroundImage: `url("${m.avatarUrl}")` }' />{{ m.displayName }}</span>
              </td>
              <td class="font-mono">{{ m.phone }}</td>
              <td><span class="tag" :class="m.role === 'admin' ? 'info' : 'ok'">{{ m.role === 'admin' ? '管理员' : '设计师' }}</span></td>
              <td class="num font-mono">{{ m.projectsCount }}</td>
              <td class="num font-mono">{{ m.activeProjectsCount }}</td>
              <td class="num font-mono">{{ m.role === 'admin' ? '—' : m.monthlyGenerations }}</td>
              <td class="muted font-mono">{{ m.lastActiveAt ? relativeTime(m.lastActiveAt) : '—' }}</td>
              <td><n-button size="small" tertiary @click="openDetail(m.userId)">查看</n-button></td>
            </tr>
          </tbody>
        </table>
      </n-spin>
    </div>

    <n-drawer v-model:show="showDrawer" :width="420">
      <n-drawer-content title="成员详情" closable>
        <n-spin :show="detailLoading">
          <div v-if="detail" class="detail">
            <div class="d-head">
              <div class="d-av" :style='{ backgroundImage: `url("${detail.avatarUrl}")` }' />
              <div>
                <h2 class="font-display">{{ detail.displayName }}</h2>
                <span class="tag" :class="detail.role === 'admin' ? 'info' : 'ok'">{{ detail.role === 'admin' ? '管理员' : '设计师' }}</span>
              </div>
            </div>
            <div class="d-stats">
              <div><b class="font-mono">{{ detail.monthlyGenerations }}</b><span>本月生成</span></div>
              <div><b class="font-mono">{{ detail.uploadInputCount }}</b><span>上传 Input</span></div>
              <div><b class="font-mono">{{ detail.generateOutputCount }}</b><span>生成 Output</span></div>
            </div>
            <div class="field"><label>手机号</label><div class="font-mono">{{ detail.phone }}</div></div>
            <div class="field"><label>邮箱</label><div class="font-mono">{{ detail.email }}</div></div>
            <div class="field"><label>最近活跃</label><div>{{ detail.lastActiveAt ? relativeTime(detail.lastActiveAt) : '—' }}</div></div>
            <div class="field">
              <label>参与项目（{{ detail.projects.length }}）</label>
              <div class="proj-list">
                <div v-for="p in detail.projects" :key="p.id" class="proj">
                  <span>{{ p.name }}</span>
                  <span class="tags">
                    <span class="tag sm" :class="p.memberRole === 'owner' ? 'info' : 'muted'">{{ p.memberRole === 'owner' ? '负责人' : '协作' }}</span>
                    <span class="tag sm" :class="p.status === 'active' ? 'ok' : 'warn'">{{ p.status === 'active' ? '进行中' : '已归档' }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </n-spin>
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
.note {
  padding: 13px 16px;
  background: var(--primary-soft);
  border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
  border-radius: 13px;
  color: var(--primary-2);
  font-size: 13px;
  margin-bottom: 18px;
}
.card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: var(--shadow);
  overflow: hidden;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  text-align: left;
  padding: 13px 20px;
  font-weight: 700;
  background: var(--bg-2);
}
th.num,
td.num {
  text-align: right;
}
td {
  padding: 14px 20px;
  border-top: 1px solid var(--line);
  font-size: 13px;
  color: var(--ink);
}
td.muted {
  color: var(--muted);
}
.who {
  display: flex;
  align-items: center;
  gap: 10px;
}
.av {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background-size: cover;
}
.tag {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 7px;
}
.tag.sm {
  font-size: 10px;
  padding: 2px 7px;
}
.tag.ok { background: var(--success-soft); color: var(--success); }
.tag.warn { background: var(--warn-soft); color: var(--warn); }
.tag.info { background: var(--primary-soft); color: var(--primary-2); }
.tag.muted { background: var(--bg-2); color: var(--muted); }
.detail {
  padding: 4px;
}
.d-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}
.d-av {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background-size: cover;
}
.d-head h2 {
  margin: 0 0 6px;
  font-size: 20px;
  color: var(--ink);
}
.d-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}
.d-stats div {
  background: var(--bg-2);
  border-radius: 12px;
  padding: 12px;
  text-align: center;
}
.d-stats b {
  display: block;
  font-size: 20px;
  color: var(--ink);
}
.d-stats span {
  font-size: 11px;
  color: var(--muted);
}
.field {
  margin-bottom: 16px;
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
.proj-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.proj {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--bg-2);
  border-radius: 10px;
  font-size: 13px;
}
.proj .tags {
  display: flex;
  gap: 6px;
}
</style>
