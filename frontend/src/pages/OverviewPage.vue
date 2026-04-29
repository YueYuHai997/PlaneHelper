<script setup>
import { computed } from 'vue'
import { useGardenData } from '../composables/useGardenData'
import {
  TASK_META,
  formatDateLabel,
  getSeasonInfo,
  healthColor,
  healthScore,
  plantEmoji,
  statusBadgeClass,
  statusLabel,
  taskIcon,
} from '../utils/garden'

const { plants, logs, todayTasks, completedTodayCount, getToday, getImageUrl } = useGardenData()

const season = getSeasonInfo()
const today = getToday()

const healthyCount = computed(() =>
  plants.value.filter((plant) => plant.status === 'healthy').length,
)

const latestLogs = computed(() =>
  logs.value
    .filter((log) => log.source !== 'ai')
    .slice(0, 5),
)

function plantById(id) {
  return plants.value.find((plant) => plant.id === id)
}
</script>

<template>
  <section>
    <div class="kpi-row">
      <div class="kpi">
        <div class="kpi-label">植物总数</div>
        <div class="kpi-val">{{ plants.length }}<span class="kpi-unit">株</span></div>
        <div class="kpi-sub">点击查看</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">今日任务</div>
        <div class="kpi-val">{{ todayTasks.length }}<span class="kpi-unit">项</span></div>
        <div class="kpi-sub">已完成 {{ completedTodayCount }} 项</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">健康状态</div>
        <div class="kpi-val">{{ healthyCount }}<span class="kpi-unit">株</span></div>
        <div class="kpi-sub">状态良好</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">当前季节</div>
        <div class="kpi-val season-kpi">{{ season.icon }}</div>
        <div class="kpi-sub">{{ season.name }}</div>
      </div>
    </div>

    <div class="overview-grid">
      <div class="card">
        <div class="card-hd">
          <span class="card-title">今日养护</span>
          <RouterLink class="btn btn-ghost btn-sm" to="/manage">全部</RouterLink>
        </div>
        <div class="card-bd">
          <div v-if="todayTasks.length">
            <div v-for="task in todayTasks.slice(0, 4)" :key="task.id" class="task-item">
              <div class="task-check" :class="{ done: task.done }">{{ task.done ? '✓' : '' }}</div>
              <div class="task-body">
                <div class="task-title" :class="{ 'task-done-text': task.done }">
                  {{ taskIcon(task.type) }}
                  {{ TASK_META[task.type]?.label || task.type }}
                  <span v-if="task.note"> · {{ task.note }}</span>
                </div>
                <div class="task-meta">
                  {{ plantById(task.plant) ? `${plantEmoji(plantById(task.plant))} ${plantById(task.plant).name}` : '未指定植物' }}
                  ·
                  {{ task.date === today ? '今日' : formatDateLabel(task.date) }}
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <div class="empty-icon">✓</div>
            <div class="empty-txt">今日无任务</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-hd">
          <span class="card-title">植物状态</span>
        </div>
        <div class="card-bd">
          <div v-for="plant in plants" :key="plant.id" class="health-row">
            <div class="health-thumb">
              <img v-if="plant.photo" :src="getImageUrl(plant.photo)" :alt="plant.name" />
              <span v-else>{{ plantEmoji(plant) }}</span>
            </div>
            <div class="health-main">
              <div class="health-name">{{ plant.name }}</div>
              <div class="prog">
                <div
                  class="prog-fill"
                  :style="{ width: `${healthScore(plant.status)}%`, background: healthColor(plant.status) }"
                ></div>
              </div>
            </div>
            <span class="badge" :class="statusBadgeClass(plant.status)">{{ statusLabel(plant.status) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card mt-18">
      <div class="card-hd">
        <span class="card-title">最近动态</span>
      </div>
      <div class="card-bd">
        <div class="log-timeline">
          <div
            v-for="log in latestLogs"
            :key="log.id"
            class="log-entry overview-log-entry"
            :data-overview-log-entry="log.id"
          >
            <div class="log-dot"></div>
            <div class="log-date">
              {{ formatDateLabel(log.date) }}
              ·
              {{ plantById(log.plant)?.name || '未命名植物' }}
            </div>
            <div class="log-text">{{ log.text }}</div>
            <div v-if="log.imgs?.length" class="overview-log-images">
              <img
                v-for="imagePath in log.imgs"
                :key="imagePath"
                class="overview-log-thumb"
                :src="getImageUrl(imagePath)"
                data-overview-log-image
                alt="日志图片"
              />
            </div>
          </div>
          <div v-if="!latestLogs.length" class="empty-state">
            <div class="empty-icon">📝</div>
            <div class="empty-txt">还没有记录</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
