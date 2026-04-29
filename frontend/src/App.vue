<script setup>
import { computed, onMounted } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useGardenData } from './composables/useGardenData'
import { UI_ICONS } from './utils/garden'

const route = useRoute()
const router = useRouter()
const { loadAll, loading, error, todayTasks } = useGardenData()

const pageTitles = {
  overview: '总览',
  plants: '我的植物',
  manage: '养护管理',
  ai: 'AI 园丁',
}

const pageTitle = computed(() => pageTitles[route.name] || '总览')
const topDate = computed(() =>
  new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }),
)
const taskBadge = computed(() => todayTasks.value.length)

function openAddPlant() {
  router.push({ name: 'plants', query: { modal: 'add' } })
}

onMounted(async () => {
  await loadAll(true)
})
</script>

<template>
  <div class="layout">
    <nav class="sidebar">
      <div class="logo">
        <div class="logo-mark">🌿</div>
        <div class="logo-name">绿意</div>
        <div class="logo-sub">植物养护助手</div>
      </div>

      <div class="nav">
        <div class="nav-sect">主要</div>
        <RouterLink class="nav-item" to="/overview">
          <span class="nav-icon">{{ UI_ICONS.overview }}</span>
          总览
        </RouterLink>
        <RouterLink class="nav-item" to="/plants">
          <span class="nav-icon">🌼</span>
          我的植物
        </RouterLink>

        <div class="nav-sect">养护</div>
        <RouterLink class="nav-item" to="/manage">
          <span class="nav-icon">📅</span>
          养护管理
          <span v-if="taskBadge" class="nav-badge">{{ taskBadge }}</span>
        </RouterLink>

        <div class="nav-sect">助手</div>
        <RouterLink class="nav-item" to="/ai">
          <span class="nav-icon">✦</span>
          AI 园丁
        </RouterLink>
      </div>

      <div class="sidebar-bottom">v3.1 · Doubao Ready</div>
    </nav>

    <div class="main">
      <div class="topbar">
        <div class="topbar-left">
          <div class="topbar-title">{{ pageTitle }}</div>
          <div class="topbar-date">{{ topDate }}</div>
        </div>
        <div class="topbar-right">
          <button class="btn btn-ghost" type="button" @click="openAddPlant()">+ 添加植物</button>
          <button class="btn btn-primary" type="button" @click="router.push({ name: 'ai' })">
            ✦ AI 园丁
          </button>
        </div>
      </div>

      <div class="content">
        <div v-if="error" class="notice notice-error">{{ error }}</div>
        <div v-if="loading" class="notice">正在同步本地数据...</div>
        <RouterView />
      </div>
    </div>
  </div>
</template>
