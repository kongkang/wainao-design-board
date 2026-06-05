<script setup lang="ts">
import { computed } from 'vue'
import { darkTheme } from 'naive-ui'
import { useThemeStore } from '@/stores/theme'
import { lightOverrides, darkOverrides } from '@/theme/naive'

const theme = useThemeStore()
const naiveTheme = computed(() => (theme.isDark ? darkTheme : null))
const overrides = computed(() => (theme.isDark ? darkOverrides : lightOverrides))
</script>

<template>
  <n-config-provider :theme="naiveTheme" :theme-overrides="overrides" style="height: 100%">
    <n-loading-bar-provider>
      <n-message-provider>
        <n-dialog-provider>
          <n-notification-provider>
            <router-view />
          </n-notification-provider>
        </n-dialog-provider>
      </n-message-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>
