<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const auth = useAuthStore()
const theme = useThemeStore()
const router = useRouter()
const route = useRoute()
const loading = ref('')

const accounts = [
  { id: 'u-cao', name: '曹总', role: '管理员 / 老板', phone: '138****0000', desc: '团队项目 · 成员活跃 · 账户用量', tag: '管理员' },
  { id: 'u-yuanhong', name: '远弘', role: '设计师', phone: '139****1111', desc: '项目画板 · AI 生图 · 素材沉淀', tag: '设计师' },
  { id: 'u-a', name: '设计师A', role: '设计师', phone: '137****2222', desc: '项目画板 · AI 生图 · 素材沉淀', tag: '设计师' },
  { id: 'u-b', name: '设计师B', role: '设计师', phone: '136****3333', desc: '项目画板 · AI 生图 · 素材沉淀', tag: '设计师' },
]

async function pick(id: string) {
  loading.value = id
  try {
    await auth.login(id)
    const redirect = route.query.redirect as string | undefined
    router.replace(redirect || (auth.isAdmin ? '/dashboard' : '/projects'))
  } finally {
    loading.value = ''
  }
}
</script>

<template>
  <div class="login">
    <button class="theme-toggle icon-btn" @click="theme.toggle()">
      <svg v-if="theme.isDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.5A8.5 8.5 0 1 1 11.5 3 6.5 6.5 0 0 0 21 12.5z" /></svg>
    </button>

    <div class="panel">
      <div class="brand">
        <div class="mark" />
        <div>
          <b class="font-display">bebehaha 设计 AI 工作台</b>
          <span class="font-mono">DESIGN STUDIO · 外脑.ai</span>
        </div>
      </div>
      <h1 class="font-display">选择账号进入工作台</h1>
      <p class="sub">一期固定 1 名管理员 + 3 名设计师。登录通过外脑 OAuth 授权，此处为演示用快捷入口。</p>

      <div class="accounts">
        <button
          v-for="a in accounts"
          :key="a.id"
          class="account"
          :class="{ loading: loading === a.id }"
          :disabled="!!loading"
          @click="pick(a.id)"
        >
          <span class="tag font-mono" :class="a.tag === '管理员' ? 'admin' : 'designer'">{{ a.tag }}</span>
          <b>{{ a.name }}</b>
          <small class="font-mono">{{ a.phone }}</small>
          <p>{{ a.desc }}</p>
          <span class="enter">进入 →</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 40px 20px;
  background: var(--bg);
  background-image: var(--page-bg-image);
  position: relative;
}
.theme-toggle {
  position: fixed;
  top: 22px;
  right: 24px;
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
.icon-btn svg {
  width: 18px;
  height: 18px;
}
.panel {
  width: 100%;
  max-width: 760px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-bottom: 30px;
}
.mark {
  width: 46px;
  height: 46px;
  border-radius: 13px;
  background: linear-gradient(135deg, var(--primary), var(--primary-2));
  box-shadow: var(--glow);
}
.brand b {
  font-size: 19px;
  font-weight: 600;
  color: var(--ink);
  display: block;
}
.brand span {
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--muted);
}
h1 {
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 0 0 8px;
  color: var(--ink);
}
.sub {
  color: var(--muted);
  font-size: 14px;
  margin: 0 0 26px;
  line-height: 1.6;
  max-width: 520px;
}
.accounts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.account {
  text-align: left;
  border: 1px solid var(--line);
  background: var(--panel);
  border-radius: 16px;
  padding: 18px;
  cursor: pointer;
  position: relative;
  box-shadow: var(--shadow-sm);
  transition: transform 0.14s, box-shadow 0.14s, border-color 0.14s;
}
.account:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow);
  border-color: var(--primary);
}
.account:disabled {
  cursor: default;
}
.account.loading {
  opacity: 0.6;
}
.account .tag {
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 7px;
  letter-spacing: 0.04em;
}
.account .tag.admin {
  background: var(--primary-soft);
  color: var(--primary-2);
}
.account .tag.designer {
  background: var(--success-soft);
  color: var(--success);
}
.account b {
  display: block;
  font-size: 20px;
  margin: 12px 0 2px;
  color: var(--ink);
  font-family: var(--font-display);
  font-weight: 600;
}
.account small {
  color: var(--muted);
  font-size: 12px;
}
.account p {
  color: var(--ink-2);
  font-size: 12.5px;
  margin: 10px 0 0;
  line-height: 1.5;
}
.account .enter {
  position: absolute;
  right: 18px;
  bottom: 18px;
  font-size: 13px;
  font-weight: 700;
  color: var(--primary);
  opacity: 0;
  transition: opacity 0.14s;
}
.account:hover .enter {
  opacity: 1;
}
@media (max-width: 620px) {
  .accounts {
    grid-template-columns: 1fr;
  }
}
</style>
