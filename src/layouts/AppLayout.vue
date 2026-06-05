<script setup lang="ts">
import { computed, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NDropdown } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const auth = useAuthStore()
const theme = useThemeStore()
const route = useRoute()
const router = useRouter()

const ICONS: Record<string, string> = {
  dashboard:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  projects:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>',
  materials:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M4 16l5-6 4 4 3-4 4 6"/><circle cx="9" cy="9" r="1.4"/></svg>',
  members:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5M16 11a3 3 0 100-6"/></svg>',
  usage:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="13" rx="2.5"/><path d="M2 10h20M6 15h4"/></svg>',
}

const adminNav = [
  { to: '/dashboard', label: '工作台', icon: 'dashboard' },
  { to: '/projects', label: '全部项目', icon: 'projects' },
  { to: '/materials', label: '团队素材库', icon: 'materials' },
  { to: '/members', label: '成员管理', icon: 'members' },
  { to: '/usage', label: '账户用量', icon: 'usage' },
]
const designerNav = [
  { to: '/projects', label: '我的项目', icon: 'projects' },
  { to: '/materials', label: '我的素材', icon: 'materials' },
]
const navItems = computed(() => (auth.isAdmin ? adminNav : designerNav))

const TITLES: Record<string, string> = {
  dashboard: '工作台首页',
  projects: auth.isAdmin ? '全部项目' : '我的项目',
  board: '项目画板',
  materials: auth.isAdmin ? '团队素材库' : '我的素材',
  members: '成员管理',
  usage: '账户用量',
}
const pageTitle = computed(() => TITLES[(route.name as string) || ''] || 'bebehaha 设计工作台')

const userOptions = [
  { label: '退出登录', key: 'logout' },
]
async function onUserSelect(key: string) {
  if (key === 'logout') {
    await auth.logout()
    router.replace('/login')
  }
}

async function switchRole(role: 'admin' | 'designer') {
  await auth.login(role === 'admin' ? 'u-cao' : 'u-yuanhong')
  router.replace(auth.isAdmin ? '/dashboard' : '/projects')
}

const renderUser = () =>
  h('div', { class: 'user-chip' }, [
    h('div', { class: 'user-av', style: { backgroundImage: `url("${auth.user?.avatarUrl}")` } }, auth.user?.displayName?.[0] ?? ''),
    h('div', { class: 'user-meta' }, [
      h('b', auth.user?.displayName ?? ''),
      h('small', auth.isAdmin ? '管理员 · 老板视角' : '设计师 · 员工视角'),
    ]),
  ])
</script>

<template>
  <div class="shell">
    <aside class="side">
      <div class="brand">
        <div class="mark" />
        <div class="brand-text">
          <b class="font-display">bebehaha</b>
          <span class="font-mono">DESIGN STUDIO</span>
        </div>
      </div>

      <div class="nav-label font-mono">{{ auth.isAdmin ? '工作区 / 管理' : '工作区' }}</div>
      <nav class="nav">
        <RouterLink v-for="it in navItems" :key="it.to" :to="it.to" class="nav-item" active-class="on">
          <span class="nav-ic" v-html="ICONS[it.icon]" />
          <span>{{ it.label }}</span>
        </RouterLink>
      </nav>

      <NDropdown trigger="click" :options="userOptions" @select="onUserSelect" class="user-dd">
        <div class="user-foot">
          <component :is="renderUser" />
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:.5"><path d="m6 9 6 6 6-6" /></svg>
        </div>
      </NDropdown>
    </aside>

    <div class="main">
      <header class="topbar">
        <div>
          <h2 class="font-display page-title">{{ pageTitle }}</h2>
        </div>
        <div class="top-actions">
          <div class="role-pill">
            <button :class="{ on: auth.isAdmin }" @click="switchRole('admin')">老板视角</button>
            <button :class="{ on: !auth.isAdmin }" @click="switchRole('designer')">员工视角</button>
          </div>
          <button class="icon-btn" :title="theme.isDark ? '切换浅色' : '切换暗色'" @click="theme.toggle()">
            <svg v-if="theme.isDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.5A8.5 8.5 0 1 1 11.5 3 6.5 6.5 0 0 0 21 12.5z" /></svg>
          </button>
        </div>
      </header>

      <main class="content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 248px 1fr;
  min-height: 100vh;
  background-image: var(--page-bg-image);
  background-attachment: fixed;
}
.side {
  background: var(--panel);
  border-right: 1px solid var(--line);
  padding: 22px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: sticky;
  top: 0;
  height: 100vh;
}
.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 4px 8px 18px;
}
.mark {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  flex: none;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  box-shadow: var(--glow);
  position: relative;
}
.mark::after {
  content: '';
  position: absolute;
  inset: 9px;
  border-radius: 5px;
  background: radial-gradient(circle at 32% 30%, var(--panel), transparent);
  opacity: 0.65;
}
.brand-text b {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.1;
  color: var(--ink);
}
.brand-text span {
  display: block;
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--muted);
}
.nav-label {
  font-size: 10px;
  letter-spacing: 0.14em;
  color: var(--muted);
  padding: 12px 10px 6px;
}
.nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 11px;
  border-radius: 12px;
  color: var(--ink-2);
  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
  position: relative;
  transition: background 0.15s, color 0.15s;
}
.nav-item:hover {
  background: var(--bg-2);
  color: var(--ink);
}
.nav-item.on {
  background: var(--primary-soft);
  color: var(--primary-2);
}
.nav-item.on::before {
  content: '';
  position: absolute;
  left: -16px;
  top: 9px;
  bottom: 9px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--primary);
}
.nav-ic {
  width: 18px;
  height: 18px;
  flex: none;
  opacity: 0.75;
  display: inline-flex;
}
.nav-ic :deep(svg) {
  width: 18px;
  height: 18px;
}
.user-dd {
  margin-top: auto;
}
.user-foot {
  margin-top: auto;
  padding: 11px 10px;
  border-top: 1px solid var(--line);
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  border-radius: 12px;
}
.user-foot:hover {
  background: var(--bg-2);
}
.user-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}
.user-av {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  flex: none;
  background-size: cover;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
  font-size: 13px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}
.user-meta {
  min-width: 0;
}
.user-meta b {
  font-size: 13px;
  display: block;
  color: var(--ink);
}
.user-meta small {
  font-size: 11px;
  color: var(--muted);
}
.main {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.topbar {
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30px;
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--bg) 82%, transparent);
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 5;
}
.page-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--ink);
}
.top-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}
.role-pill {
  display: inline-flex;
  padding: 4px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 10px;
}
.role-pill button {
  font-family: var(--font-mono);
  font-size: 11px;
  border: 0;
  background: transparent;
  color: var(--muted);
  padding: 6px 12px;
  border-radius: 7px;
  cursor: pointer;
  letter-spacing: 0.02em;
}
.role-pill button.on {
  background: var(--ink);
  color: var(--bg);
}
.icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink-2);
  cursor: pointer;
  display: grid;
  place-items: center;
}
.icon-btn:hover {
  color: var(--primary);
  border-color: var(--primary);
}
.icon-btn svg {
  width: 18px;
  height: 18px;
}
.content {
  padding: 28px 30px;
  max-width: 1340px;
  width: 100%;
}
@media (max-width: 980px) {
  .shell {
    grid-template-columns: 76px 1fr;
  }
  .brand-text,
  .nav-item span:last-child,
  .nav-label,
  .user-meta {
    display: none;
  }
}
</style>
