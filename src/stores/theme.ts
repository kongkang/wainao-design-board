import { defineStore } from 'pinia'

export type ThemeMode = 'light' | 'dark'
const STORAGE_KEY = 'bb-theme'

/** 明/暗双主题 —— 同一套 UX，切 <html> 的 class 即换肤 */
export const useThemeStore = defineStore('theme', {
  state: () => ({
    mode: ((localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'light') as ThemeMode,
  }),
  getters: {
    isDark: (s) => s.mode === 'dark',
  },
  actions: {
    apply() {
      const el = document.documentElement
      el.classList.remove('theme-light', 'theme-dark')
      el.classList.add(this.mode === 'dark' ? 'theme-dark' : 'theme-light')
    },
    set(mode: ThemeMode) {
      this.mode = mode
      localStorage.setItem(STORAGE_KEY, mode)
      this.apply()
    },
    toggle() {
      this.set(this.mode === 'dark' ? 'light' : 'dark')
    },
  },
})
