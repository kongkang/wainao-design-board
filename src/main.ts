import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useThemeStore } from './stores/theme'
import './theme/variables.css'

async function bootstrap() {
  // 开发态启用 MSW，拦截 /api/* 走 mock；切真后端时移除即可
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
  }

  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)

  // 初始化主题（明/暗）到 <html> class，必须在挂载前
  useThemeStore().apply()

  app.use(router)
  app.mount('#app')
}

bootstrap()
