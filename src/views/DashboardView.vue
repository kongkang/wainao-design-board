<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { dashboardApi } from '@/api'
import { fmtNum, relativeTime } from '@/composables/format'
import type { DashboardOverview, MemberActivity, RecentProject, TrendPoint } from '@/api/types'

const router = useRouter()
const overview = ref<DashboardOverview | null>(null)
const recent = ref<RecentProject[]>([])
const activity = ref<MemberActivity[]>([])
const trend = ref<TrendPoint[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const [o, r, a, t] = await Promise.all([
      dashboardApi.overview(),
      dashboardApi.recentProjects(),
      dashboardApi.memberActivity(),
      dashboardApi.generationTrend(),
    ])
    overview.value = o
    recent.value = r
    activity.value = a
    trend.value = t
  } finally {
    loading.value = false
  }
})

const maxTrend = computed(() => Math.max(...trend.value.map((t) => t.value), 1))
const metrics = computed(() =>
  overview.value
    ? [
        { k: '进行中项目', v: overview.value.activeProjects, t: '当前正在推进', cls: '' },
        { k: '已归档项目', v: overview.value.archivedProjects, t: '可追溯历史设计过程', cls: 'amb' },
        { k: '本月生成次数', v: overview.value.monthlyGenerations, t: '首页不展示费用金额', cls: 'acc' },
        { k: '活跃设计师', v: overview.value.activeDesigners, t: '近 7 天均有使用', cls: 'grn' },
      ]
    : [],
)

const STATUS: Record<string, { t: string; c: string }> = {
  active: { t: '活跃', c: 'ok' },
  low: { t: '低活跃', c: 'info' },
  none: { t: '暂无使用', c: 'muted' },
}
</script>

<template>
  <div class="dash">
    <div class="page-head">
      <div>
        <h1 class="font-display">工作台首页</h1>
        <p>团队设计 AI 的整体使用情况 · 首页不展示费用金额</p>
      </div>
      <n-button type="primary" size="large" @click="router.push('/projects')">查看全部项目 →</n-button>
    </div>

    <n-spin :show="loading">
      <div class="grid4">
        <div v-for="m in metrics" :key="m.k" class="metric" :class="m.cls">
          <div class="k font-mono"><span class="dot" />{{ m.k }}</div>
          <div class="v font-display">{{ fmtNum(m.v) }}</div>
          <div class="t">{{ m.t }}</div>
        </div>
      </div>

      <div class="cols">
        <div class="card">
          <div class="card-h"><h3 class="font-display">最近项目</h3><a @click="router.push('/projects')">全部 →</a></div>
          <table>
            <thead><tr><th>项目</th><th>负责人</th><th>状态</th><th class="num">生成</th><th>更新</th></tr></thead>
            <tbody>
              <tr v-for="p in recent" :key="p.id" @click="router.push(`/projects/${p.id}/board`)">
                <td><b>{{ p.name }}</b></td>
                <td>{{ p.ownerName }}</td>
                <td><span class="tag" :class="p.status === 'active' ? 'ok' : 'warn'">{{ p.status === 'active' ? '进行中' : '已归档' }}</span></td>
                <td class="num font-mono">{{ p.generationCount }}</td>
                <td class="muted font-mono">{{ relativeTime(p.updatedAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="card">
          <div class="card-h"><h3 class="font-display">成员活跃</h3></div>
          <table>
            <thead><tr><th>成员</th><th class="num">本月</th><th>状态</th></tr></thead>
            <tbody>
              <tr v-for="m in activity" :key="m.userId">
                <td>
                  <span class="who"><span class="av" :style='{ backgroundImage: `url("${m.avatarUrl}")` }' />{{ m.displayName }}</span>
                </td>
                <td class="num font-mono">{{ m.monthlyGenerations }}</td>
                <td><span class="tag" :class="STATUS[m.activityStatus].c">{{ STATUS[m.activityStatus].t }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card trend-card">
        <div class="card-h"><h3 class="font-display">最近 7 天生成趋势</h3><span class="muted font-mono">{{ overview?.monthlyGenerations }} 次 / 本月</span></div>
        <div class="trend">
          <div v-for="(p, i) in trend" :key="i" class="bar-wrap">
            <span class="bv font-mono">{{ p.value }}</span>
            <div class="bar" :class="{ last: i === trend.length - 1 }" :style="{ height: `${(p.value / maxTrend) * 100}%` }" />
            <small class="font-mono">{{ p.label }}</small>
          </div>
        </div>
      </div>
    </n-spin>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}
.page-head h1 {
  font-size: 30px;
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
.grid4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.metric {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--shadow);
  position: relative;
  overflow: hidden;
}
.metric::after {
  content: '';
  position: absolute;
  right: -28px;
  top: -28px;
  width: 92px;
  height: 92px;
  border-radius: 50%;
  background: var(--primary-soft);
  opacity: 0.7;
}
.metric.amb::after { background: var(--warn-soft); }
.metric.acc::after { background: var(--accent-soft); }
.metric.grn::after { background: var(--success-soft); }
.metric .k {
  position: relative;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 8px;
}
.metric .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--primary);
}
.metric.amb .dot { background: var(--warn); }
.metric.acc .dot { background: var(--accent); }
.metric.grn .dot { background: var(--success); }
.metric .v {
  position: relative;
  font-size: 40px;
  font-weight: 600;
  line-height: 1;
  margin: 14px 0 8px;
  letter-spacing: -0.02em;
  color: var(--ink);
}
.metric .t {
  position: relative;
  font-size: 12px;
  color: var(--muted);
}
.cols {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 16px;
  margin-top: 16px;
}
.card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 16px;
  box-shadow: var(--shadow);
  overflow: hidden;
}
.card-h {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
}
.card-h h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
}
.card-h a {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--primary);
  cursor: pointer;
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
  padding: 13px 20px;
  border-top: 1px solid var(--line);
  font-size: 13px;
  color: var(--ink);
}
tbody tr {
  cursor: pointer;
}
tbody tr:hover td {
  background: var(--bg-2);
}
td b {
  font-weight: 600;
}
td.muted {
  color: var(--muted);
}
.who {
  display: flex;
  align-items: center;
  gap: 9px;
}
.av {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background-size: cover;
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
.tag.info { background: var(--primary-soft); color: var(--primary-2); }
.tag.muted { background: var(--bg-2); color: var(--muted); }
.muted { color: var(--muted); }
.trend-card {
  margin-top: 16px;
}
.trend {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  height: 170px;
  padding: 34px 26px 22px;
}
.bar-wrap {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  position: relative;
}
.bv {
  font-size: 11px;
  font-weight: 700;
  color: var(--ink-2);
  margin-bottom: 6px;
}
.bar {
  width: 100%;
  max-width: 52px;
  border-radius: 8px 8px 3px 3px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--primary) 78%, white), var(--primary));
  min-height: 6px;
}
.bar.last {
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 78%, white), var(--accent));
}
.bar-wrap small {
  margin-top: 8px;
  font-size: 10px;
  color: var(--muted);
}
</style>
