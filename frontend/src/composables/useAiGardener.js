import { ref } from 'vue'

const apiBase = (import.meta.env.VITE_API_BASE || 'http://localhost:3001').replace(/\/$/, '')
const defaultModel = 'doubao-1-5-vision-lite-250315'

function createWelcomeMessage() {
  return {
    id: 'welcome',
    role: 'assistant',
    content: '你好，我是 AI 园丁。你可以先选择一株植物，再问我浇水、黄叶、施肥、季节养护等问题。',
    provider: 'doubao',
    model: defaultModel,
    createdAt: new Date().toISOString(),
  }
}

const messages = ref([createWelcomeMessage()])
const sending = ref(false)
const error = ref('')
const selectedPlantId = ref(null)

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function appendMessage(message) {
  messages.value.push({
    id: createMessageId(),
    createdAt: new Date().toISOString(),
    ...message,
  })
}

async function sendMessage({ message, plantId = null }) {
  const trimmed = String(message || '').trim()
  if (!trimmed) {
    throw new Error('消息不能为空')
  }

  if (plantId != null) {
    selectedPlantId.value = plantId
  }

  error.value = ''
  sending.value = true

  appendMessage({
    role: 'user',
    content: trimmed,
    provider: null,
    model: null,
  })

  try {
    const response = await fetch(`${apiBase}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: trimmed,
        plantId,
        imagePaths: [],
      }),
    })

    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload.message || 'AI 请求失败')
    }

    appendMessage({
      role: 'assistant',
      content: payload.answer || '未获得有效回复',
      provider: payload.provider || 'doubao',
      model: payload.model || null,
      usage: payload.usage || null,
    })

    return payload
  } catch (currentError) {
    error.value = currentError.message
    throw currentError
  } finally {
    sending.value = false
  }
}

function selectPlantContext(plant, options = {}) {
  if (!plant) {
    return
  }

  const { announce = true } = options
  selectedPlantId.value = plant.id

  if (!announce) {
    return
  }

  const dateText = plant.date || '未填写'
  const noteText = plant.note ? `；备注：${plant.note}` : ''

  appendMessage({
    role: 'assistant',
    content: `已切换到 ${plant.name}。当前状态：${plant.status}；种植日期：${dateText}${noteText}。`,
    provider: 'doubao',
    model: 'context',
  })
}

function resetConversation() {
  messages.value = [createWelcomeMessage()]
  selectedPlantId.value = null
  error.value = ''
}

export function useAiGardener() {
  return {
    messages,
    sending,
    error,
    selectedPlantId,
    sendMessage,
    selectPlantContext,
    resetConversation,
  }
}
