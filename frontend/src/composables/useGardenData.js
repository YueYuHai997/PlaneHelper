import { computed, ref } from 'vue'

const apiBase = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

const plants = ref([])
const tasks = ref([])
const logs = ref([])
const loading = ref(false)
const error = ref('')
const initialized = ref(false)

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

async function requestJson(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let message = `请求失败：${response.status}`
    try {
      const payload = await response.json()
      if (payload.message) {
        message = payload.message
      }
    } catch {
      // 响应体不是 JSON 时保留默认错误信息。
    }
    throw new Error(message)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

async function uploadImage(file) {
  const formData = new FormData()
  formData.append('image', file)

  return requestJson('/api/upload', {
    method: 'POST',
    body: formData,
  })
}

async function loadPlants() {
  plants.value = await requestJson('/api/plants')
}

async function loadTasks() {
  tasks.value = await requestJson('/api/tasks')
}

async function loadLogs() {
  logs.value = await requestJson('/api/logs')
}

async function loadAll(force = false) {
  if (initialized.value && !force) {
    return
  }

  loading.value = true
  error.value = ''

  try {
    await Promise.all([loadPlants(), loadTasks(), loadLogs()])
    initialized.value = true
  } catch (currentError) {
    error.value = currentError.message
    throw currentError
  } finally {
    loading.value = false
  }
}

async function refreshAll() {
  initialized.value = false
  await loadAll(true)
}

async function createPlant(payload, file) {
  loading.value = true
  error.value = ''

  try {
    let photo = payload.photo || ''
    if (file) {
      const upload = await uploadImage(file)
      photo = upload.path
    }

    const created = await requestJson('/api/plants', {
      method: 'POST',
      body: JSON.stringify({ ...payload, photo }),
    })
    await refreshAll()
    return created
  } catch (currentError) {
    error.value = currentError.message
    throw currentError
  } finally {
    loading.value = false
  }
}

async function updatePlant(id, payload) {
  loading.value = true
  error.value = ''

  try {
    const updated = await requestJson(`/api/plants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    await refreshAll()
    return updated
  } catch (currentError) {
    error.value = currentError.message
    throw currentError
  } finally {
    loading.value = false
  }
}

async function regeneratePlantProfile(id) {
  loading.value = true
  error.value = ''

  try {
    const updated = await requestJson(`/api/plants/${id}/ai-profile/regenerate`, {
      method: 'POST',
    })
    await refreshAll()
    return updated
  } catch (currentError) {
    error.value = currentError.message
    throw currentError
  } finally {
    loading.value = false
  }
}

async function deletePlant(id) {
  loading.value = true
  error.value = ''

  try {
    await requestJson(`/api/plants/${id}`, {
      method: 'DELETE',
    })
    await refreshAll()
  } catch (currentError) {
    error.value = currentError.message
    throw currentError
  } finally {
    loading.value = false
  }
}

async function createTask(payload) {
  loading.value = true
  error.value = ''

  try {
    const created = await requestJson('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    await refreshAll()
    return created
  } catch (currentError) {
    error.value = currentError.message
    throw currentError
  } finally {
    loading.value = false
  }
}

async function toggleTask(id) {
  loading.value = true
  error.value = ''

  try {
    const result = await requestJson(`/api/tasks/${id}/toggle`, {
      method: 'PATCH',
    })
    await refreshAll()
    return result
  } catch (currentError) {
    error.value = currentError.message
    throw currentError
  } finally {
    loading.value = false
  }
}

async function createLog(payload, file) {
  loading.value = true
  error.value = ''

  try {
    let imgs = payload.imgs || []
    if (file) {
      const upload = await uploadImage(file)
      imgs = [upload.path]
    }

    const created = await requestJson('/api/logs', {
      method: 'POST',
      body: JSON.stringify({ ...payload, imgs }),
    })
    await loadLogs()
    return created
  } catch (currentError) {
    error.value = currentError.message
    throw currentError
  } finally {
    loading.value = false
  }
}

async function askAiAboutLogs(plantId, message) {
  loading.value = true
  error.value = ''

  try {
    const result = await requestJson('/api/ai/analyze-logs', {
      method: 'POST',
      body: JSON.stringify({
        plantId,
        message,
      }),
    })
    await loadLogs()
    return result
  } catch (currentError) {
    error.value = currentError.message
    throw currentError
  } finally {
    loading.value = false
  }
}

function getImageUrl(filePath) {
  return filePath ? `${apiBase}${filePath}` : ''
}

const todayTasks = computed(() => tasks.value.filter((task) => task.date === getToday() && !task.done))
const completedTodayCount = computed(() => tasks.value.filter((task) => task.date === getToday() && task.done).length)

export function useGardenData() {
  return {
    plants,
    tasks,
    logs,
    loading,
    error,
    todayTasks,
    completedTodayCount,
    getToday,
    getImageUrl,
    loadAll,
    refreshAll,
    createPlant,
    updatePlant,
    regeneratePlantProfile,
    deletePlant,
    createTask,
    toggleTask,
    createLog,
    askAiAboutLogs,
  }
}
