<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage, useDialog } from 'naive-ui'
import { billingApi, generationApi } from '@/api'
import { fmtNum, relativeTime } from '@/composables/format'
import type { CreditBalance, MemberUsage, ProjectUsage, Run, UsageSummary } from '@/api/types'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const balance = ref<CreditBalance | null>(null)
const summary = ref<UsageSummary | null>(null)
const byMember = ref<MemberUsage[]>([])
const byProject = ref<ProjectUsage[]>([])
const runs = ref<Run[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const [b, s, bm, bp, r] = await Promise.all([
      billingApi.balance(),
      billingApi.usageSummary(),
      billingApi.byMember(),
      billingApi.byProject(),
      generationApi.listRuns({ pageSize: 30 }),
    ])
    balance.value = b
    summary.value = s
    byMember.value = bm
    byProject.value = bp
    runs.value = r.items
  } finally {
    loading.value = false
  }
})

const OP: Record<string, string> = { text2img: '文生图', img2img: '图生图', edit: '改图' }

async function topup() {
  const { redirectUrl } = await billingApi.topup()
  window.open(redirectUrl, '_blank')
  message.info('已跳转平台充值流程')
}
async function upgrade() {
  const { message: msg } = await billingApi.projectUpgrade()
  dialog.info({ title: '项目升级', content: msg, positiveText: '知道了' })
}
</script>

<template>
  <div class="usage">
    <div class="page-head">
      <h1 class="font-display">账户用量</h1>
      <p>查看积分余额、充值入口、项目升级，以及团队 AI 使用情况与模型调用明细。</p>
    </div>

    <n-spin :show="loading">
      <div class="grid3">
        <div class="metric primary">
          <div class="k font-mono">当前积分余额</div>
          <div class="v font-display">{{ fmtNum(balance?.balanceCredits || 0) }}</div>
          <div class="t">积分用于模型调用、图片生成等 AI 能力消耗</div>
        </div>
        <div class="metric">
          <div class="k font-mono">本月已使用积分</div>
          <div class="v font-display">{{ fmtNum(balance?.periodConsumedCredits || 0) }}</div>
          <div class="t">按模型调用实际消耗统计</div>
        </div>
        <div class="card op-card">
          <h3 class="font-display">账户操作</h3>
          <div class="op-btns">
            <n-button type="primary" @click="topup">充值积分</n-button>
            <n-button type="primary" ghost @click="upgrade">项目升级</n-button>
          </div>
          <p>项目升级可扩展更多账号、模型能力或下一阶段建设。</p>
        </div>
      </div>

      <div class="grid4">
        <div class="mini"><span class="font-mono">本月生成次数</span><b class="font-display">{{ summary?.generations }}</b></div>
        <div class="mini"><span class="font-mono">活跃成员数</span><b class="font-display">{{ summary?.activeMembers }}</b></div>
        <div class="mini"><span class="font-mono">使用项目数</span><b class="font-display">{{ summary?.projectsUsed }}</b></div>
        <div class="mini"><span class="font-mono">主要使用模型</span><b class="font-display sm">{{ summary?.topModel }}</b></div>
      </div>

      <div class="cols">
        <div class="card">
          <div class="card-h"><h3 class="font-display">成员用量排行</h3></div>
          <table>
            <thead><tr><th>成员</th><th class="num">生成次数</th><th class="num">参与项目</th><th>最近使用</th></tr></thead>
            <tbody>
              <tr v-for="m in byMember" :key="m.memberId">
                <td><b>{{ m.memberName }}</b></td>
                <td class="num font-mono">{{ m.generations }}</td>
                <td class="num font-mono">{{ m.projectsCount }}</td>
                <td class="muted font-mono">{{ m.lastActiveAt ? relativeTime(m.lastActiveAt) : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="card">
          <div class="card-h"><h3 class="font-display">项目用量排行</h3></div>
          <table>
            <thead><tr><th>项目</th><th>负责人</th><th class="num">生成</th><th></th></tr></thead>
            <tbody>
              <tr v-for="p in byProject" :key="p.projectId">
                <td><b>{{ p.projectName }}</b></td>
                <td>{{ p.ownerName }}</td>
                <td class="num font-mono">{{ p.generations }}</td>
                <td><n-button size="tiny" tertiary @click="router.push(`/projects/${p.projectId}/board`)">查看</n-button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card detail-card">
        <div class="card-h"><h3 class="font-display">模型调用明细</h3></div>
        <table>
          <thead>
            <tr><th>时间</th><th>成员</th><th>项目</th><th>模型</th><th>操作</th><th>Prompt 摘要</th><th>结果</th><th class="num">消耗积分</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="r in runs" :key="r.id">
              <td class="muted font-mono">{{ relativeTime(r.createdAt) }}</td>
              <td>{{ r.memberName }}</td>
              <td>{{ r.projectName }}</td>
              <td>{{ r.modelName }}</td>
              <td><span class="op">{{ OP[r.operation] }}</span></td>
              <td class="summary">{{ r.promptSummary }}</td>
              <td><span class="tag" :class="r.status === 'success' ? 'ok' : 'warn'">{{ r.status === 'success' ? '成功' : '失败' }}</span></td>
              <td class="num font-mono">{{ r.creditsCost }}</td>
              <td>
                <n-button v-if="r.outputAssetId" size="tiny" tertiary @click="router.push(`/projects/${r.projectId}/board`)">进入</n-button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </n-spin>
  </div>
</template>

<style scoped>
.page-head {
  margin-bottom: 22px;
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
.grid3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1.3fr;
  gap: 16px;
}
.metric {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 22px;
  box-shadow: var(--shadow);
}
.metric.primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  border: 0;
}
.metric.primary .k,
.metric.primary .t {
  color: rgba(255, 255, 255, 0.78);
}
.metric.primary .v {
  color: #fff;
}
.metric .k {
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}
.metric .v {
  font-size: 38px;
  font-weight: 600;
  line-height: 1;
  margin: 14px 0 8px;
  color: var(--ink);
}
.metric .t {
  font-size: 12px;
  color: var(--muted);
}
.card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: var(--shadow);
  overflow: hidden;
}
.op-card {
  padding: 20px 22px;
}
.op-card h3 {
  margin: 0 0 14px;
  font-size: 16px;
  color: var(--ink);
}
.op-btns {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
.op-card p {
  font-size: 12px;
  color: var(--muted);
  margin: 0;
  line-height: 1.5;
}
.grid4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 16px;
}
.mini {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 18px;
  box-shadow: var(--shadow);
}
.mini span {
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.mini b {
  display: block;
  font-size: 30px;
  font-weight: 600;
  color: var(--ink);
  margin-top: 10px;
}
.mini b.sm {
  font-size: 20px;
}
.cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
}
.detail-card {
  margin-top: 16px;
}
.card-h {
  padding: 16px 20px;
  border-bottom: 1px solid var(--line);
}
.card-h h3 {
  margin: 0;
  font-size: 16px;
  color: var(--ink);
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
  padding: 11px 20px;
  font-weight: 700;
  background: var(--bg-2);
}
th.num,
td.num {
  text-align: right;
}
td {
  padding: 12px 20px;
  border-top: 1px solid var(--line);
  font-size: 13px;
  color: var(--ink);
}
td b {
  font-weight: 600;
}
td.muted {
  color: var(--muted);
}
.summary {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--muted);
}
.op {
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--bg-2);
  color: var(--ink-2);
}
.tag {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 7px;
}
.tag.ok { background: var(--success-soft); color: var(--success); }
.tag.warn { background: var(--warn-soft); color: var(--warn); }
</style>
