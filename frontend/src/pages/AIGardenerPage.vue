<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useGardenData } from '../composables/useGardenData'
import { useAiGardener } from '../composables/useAiGardener'
import { formatDateLabel, plantEmoji, statusLabel } from '../utils/garden'

const route = useRoute()
const { plants } = useGardenData()
const { messages, sending, error, selectedPlantId, sendMessage, selectPlantContext } = useAiGardener()

const draft = ref('')

const selectedPlant = computed(() =>
  plants.value.find((plant) => plant.id === selectedPlantId.value) || null,
)

const quickQuestions = computed(() => {
  if (!selectedPlant.value) {
    return [
      '最近适合给它浇水吗？',
      '怎样判断植物现在是否健康？',
      '当前季节的养护重点是什么？',
    ]
  }

  return [
    `${selectedPlant.value.name} 最近需要浇水吗？`,
    `${selectedPlant.value.name} 当前状态正常吗？`,
    `${selectedPlant.value.name} 这周养护重点是什么？`,
  ]
})

function choosePlant(plant, options) {
  selectPlantContext(plant, options)
}

function syncPlantContext() {
  const routePlantId = route.query.plantId
  if (routePlantId) {
    const targetPlant = plants.value.find((item) => String(item.id) === String(routePlantId))
    if (targetPlant && selectedPlantId.value !== targetPlant.id) {
      choosePlant(targetPlant, { announce: false })
    }
    return
  }

  if (!selectedPlantId.value && plants.value[0]) {
    choosePlant(plants.value[0], { announce: false })
  }
}

async function submitMessage(prefilledMessage = '') {
  const message = (prefilledMessage || draft.value).trim()
  if (!message) {
    return
  }

  draft.value = ''

  try {
    await sendMessage({
      message,
      plantId: selectedPlantId.value,
    })
  } catch {
    // 错误信息已经写入 composable，页面只负责展示。
  }
}

watch([() => route.query.plantId, plants], () => {
  syncPlantContext()
}, { immediate: true })
</script>

<template>
  <section>
    <div class="ai-chat">
      <div class="ai-header">
        <div class="ai-avatar">🌶</div>
        <div>
          <div class="ai-name">AI 园丁</div>
          <div class="ai-status-txt">Doubao 1.5 Vision Lite · 当前仅启用文本问答</div>
        </div>
      </div>

      <div class="ai-plant-selector">
        <span class="ai-selector-label">快速选择植物：</span>
        <button
          v-for="plant in plants"
          :key="plant.id"
          class="ai-plant-chip"
          :class="{ selected: selectedPlantId === plant.id }"
          type="button"
          @click="choosePlant(plant)"
        >
          <span>{{ plantEmoji(plant) }}</span>
          {{ plant.name }}
        </button>
      </div>

      <div v-if="selectedPlant" class="ai-context-bar">
        <span>{{ plantEmoji(selectedPlant) }} {{ selectedPlant.name }}</span>
        <span>状态：{{ statusLabel(selectedPlant.status) }}</span>
        <span>种植日期：{{ formatDateLabel(selectedPlant.date) || '未填写' }}</span>
      </div>

      <div class="quick-qs">
        <button
          v-for="question in quickQuestions"
          :key="question"
          class="quick-q"
          type="button"
          :disabled="sending"
          @click="submitMessage(question)"
        >
          {{ question }}
        </button>
      </div>

      <div class="ai-messages">
        <div
          v-for="message in messages"
          :key="message.id"
          :class="message.role === 'assistant' ? 'msg-ai' : 'msg-user'"
        >
          <div v-if="message.role === 'assistant' && message.model" class="msg-context">
            {{ message.provider === 'doubao' ? 'Doubao' : message.provider }}
            <span v-if="message.model !== 'context'">· {{ message.model }}</span>
          </div>
          <div class="msg-bubble">{{ message.content }}</div>
          <div class="msg-time">
            {{ new Date(message.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}
          </div>
        </div>

        <div v-if="sending" class="msg-ai">
          <div class="msg-context">Doubao · 正在思考</div>
          <div class="msg-bubble">
            <div class="dot-pulse"><span></span><span></span><span></span></div>
          </div>
        </div>
      </div>

      <div v-if="error" class="ai-inline-error">{{ error }}</div>

      <div class="ai-input-row">
        <input
          v-model="draft"
          class="ai-input"
          placeholder="问问 AI 园丁..."
          :disabled="sending"
          @keydown.enter.prevent="submitMessage()"
        />
        <button class="ai-send" type="button" :disabled="sending || !draft.trim()" @click="submitMessage()">➜</button>
      </div>
    </div>
  </section>
</template>
