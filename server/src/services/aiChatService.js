const fs = require('node:fs/promises')
const path = require('node:path')

function normalizeAssistantContent(content) {
  if (typeof content === 'string') {
    return content.trim()
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }
        if (item?.type === 'text') {
          return item.text || ''
        }
        return ''
      })
      .join('\n')
      .trim()
  }

  return ''
}

function normalizePlantProfile(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('AI 建档返回为空')
  }

  const advice = Array.isArray(payload.advice)
    ? payload.advice.map((item) => String(item || '').trim()).filter(Boolean)
    : []
  const faq = Array.isArray(payload.faq)
    ? payload.faq
      .map((item) => ({
        q: String(item?.q || '').trim(),
        a: String(item?.a || '').trim(),
      }))
      .filter((item) => item.q && item.a)
    : []
  const plan = payload.plan && typeof payload.plan === 'object'
    ? {
      summary: String(payload.plan.summary || '').trim(),
      water: String(payload.plan.water || '').trim(),
      fertilize: String(payload.plan.fertilize || '').trim(),
      prune: String(payload.plan.prune || '').trim(),
      repot: String(payload.plan.repot || '').trim(),
    }
    : null

  if (!advice.length || !faq.length || !plan || !plan.summary || !plan.water || !plan.fertilize || !plan.prune || !plan.repot) {
    throw new Error('AI 建档结果格式无效')
  }

  return {
    advice,
    faq,
    plan,
  }
}

async function safeReadJson(filePath, fallbackValue) {
  try {
    const content = await fs.readFile(filePath, 'utf8')
    if (!content.trim()) {
      return fallbackValue
    }
    return JSON.parse(content)
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallbackValue
    }
    throw error
  }
}

async function parseProviderResponse(response) {
  const contentType = response.headers?.get?.('content-type') || ''

  if (contentType.includes('application/json') || typeof response.text !== 'function') {
    return response.json()
  }

  const rawText = await response.text()
  try {
    return JSON.parse(rawText)
  } catch {
    return { message: rawText }
  }
}

function sanitizeImagePath(uploadDir, imagePath) {
  if (typeof imagePath !== 'string' || !imagePath.startsWith('/uploads/')) {
    throw new Error('Invalid image path')
  }

  const relativePath = imagePath.replace(/^\/uploads\//, '')
  const resolvedPath = path.resolve(uploadDir, relativePath)
  const normalizedUploadDir = path.resolve(uploadDir)

  if (!resolvedPath.startsWith(normalizedUploadDir)) {
    throw new Error('Invalid image path')
  }

  return resolvedPath
}

async function buildImagePart(uploadDir, imagePath) {
  const resolvedPath = sanitizeImagePath(uploadDir, imagePath)
  const ext = path.extname(resolvedPath).toLowerCase()
  const mimeType = ext === '.png'
    ? 'image/png'
    : ext === '.webp'
      ? 'image/webp'
      : ext === '.gif'
        ? 'image/gif'
        : 'image/jpeg'
  const bytes = await fs.readFile(resolvedPath)

  return {
    type: 'image_url',
    image_url: {
      url: `data:${mimeType};base64,${bytes.toString('base64')}`,
    },
  }
}

function mapProviderError(result) {
  const providerCode = result?.error?.code || ''
  const providerMessage = result?.error?.message || result?.message || 'Doubao request failed'

  if (/multi-modal messages/i.test(providerMessage) || /multimodal/i.test(providerMessage)) {
    throw new Error('Doubao model does not support multimodal messages')
  }

  if (/api key is invalid/i.test(providerMessage)) {
    throw new Error('Doubao API key is invalid')
  }

  if (
    providerCode === 'InvalidEndpointOrModel.NotFound'
    || providerCode === 'InvalidEndpointOrModel.ModelIDAccessDisabled'
    || providerCode === 'ModelNotOpen'
    || /model or endpoint .* does not exist or you do not have access/i.test(providerMessage)
  ) {
    throw new Error('Doubao model or endpoint is not accessible')
  }

  throw new Error(providerMessage)
}

function buildPlantContext({ plant, logs }) {
  if (!plant) {
    return '当前没有指定具体植物，请基于通用园艺经验回答。'
  }

  const recentLogs = logs
    .slice(0, 3)
    .map((item) => `${item.date}：${item.text}`)
    .join('\n')
  const tags = Array.isArray(plant.tags) && plant.tags.length ? plant.tags.join('、') : '无'

  return [
    `当前植物：${plant.name}`,
    `学名：${plant.species || '未填写'}`,
    `状态：${plant.status}`,
    `种植日期：${plant.date || '未填写'}`,
    `标签：${tags}`,
    `备注：${plant.note || '无'}`,
    `养护周期：浇水${plant.schedules?.water ?? '-'}天，施肥${plant.schedules?.fertilize ?? '-'}天，修剪${plant.schedules?.prune ?? '-'}天，换盆${plant.schedules?.repot ?? '-'}天`,
    `最近日志：${recentLogs || '暂无'}`,
  ].join('\n')
}

function getCutoffDate(days) {
  const current = new Date()
  current.setHours(0, 0, 0, 0)
  current.setDate(current.getDate() - Math.max(0, Number(days) - 1))
  return current
}

function getRecentLogs(logs, days) {
  const cutoff = getCutoffDate(days)
  return logs
    .filter((item) => {
      if (!item?.date) {
        return false
      }
      const parsed = new Date(`${item.date}T00:00:00`)
      return !Number.isNaN(parsed.getTime()) && parsed >= cutoff
    })
    .sort((left, right) => left.date.localeCompare(right.date))
}

function collectImagePaths(logs) {
  const paths = new Set()

  for (const item of logs) {
    for (const imagePath of Array.isArray(item.imgs) ? item.imgs : []) {
      if (imagePath) {
        paths.add(imagePath)
      }
    }
  }

  return [...paths]
}

function formatLogSource(source) {
  if (source === 'system') {
    return '系统记录'
  }
  if (source === 'ai') {
    return 'AI 分析记录'
  }
  return '观察记录'
}

function buildAnalyzeLogsText({ plant, logs, message, days }) {
  const tags = Array.isArray(plant?.tags) && plant.tags.length ? plant.tags.join('、') : '无'
  const carePlan = plant?.carePlan || {}
  const timeline = logs.length
    ? logs.map((item) => {
      const imageCount = Array.isArray(item.imgs) && item.imgs.length ? `，附图 ${item.imgs.length} 张` : ''
      return `- [${formatLogSource(item.source)}] ${item.date}：${item.text}${imageCount}`
    }).join('\n')
    : `近 ${days} 天没有可用观察记录。`

  return [
    `请基于以下植物资料、近 ${days} 天记录和用户问题，判断植物当前是否正常、可能存在什么问题、建议怎么处理，以及是否需要继续观察。`,
    '',
    `植物名称：${plant?.name || '未指定'}`,
    `学名：${plant?.species || '未填写'}`,
    `当前状态：${plant?.status || 'unknown'}`,
    `种植日期：${plant?.date || '未填写'}`,
    `标签：${tags}`,
    `备注：${plant?.note || '无'}`,
    `养护周期：浇水${plant?.schedules?.water ?? '-'}天，施肥${plant?.schedules?.fertilize ?? '-'}天，修剪${plant?.schedules?.prune ?? '-'}天，换盆${plant?.schedules?.repot ?? '-'}天`,
    `最近养护锚点：浇水 ${carePlan.lastWateredAt || '未记录'}，施肥 ${carePlan.lastFertilizedAt || '未记录'}，修剪 ${carePlan.lastPrunedAt || '未记录'}，换盆 ${carePlan.lastRepottedAt || '未记录'}`,
    '',
    `近 ${days} 天生长记录：`,
    timeline,
    '',
    `用户问题：${message}`,
    '',
    '回答要求：',
    '1. 先给出总体判断。',
    '2. 再列出可能问题或风险。',
    '3. 再给出明确处理建议。',
    '4. 信息不足时要明确指出，不要编造。',
  ].join('\n')
}

function createAiChatService({ uploadDir, dataDir, config, fetchImpl = fetch }) {
  async function loadContext(plantId) {
    const plants = await safeReadJson(path.join(dataDir, 'plants.json'), [])
    const logs = await safeReadJson(path.join(dataDir, 'logs.json'), [])

    const plant = plantId ? plants.find((item) => item.id === Number(plantId)) || null : null
    const plantLogs = plant ? logs.filter((item) => item.plant === plant.id) : []

    return { plant, logs: plantLogs }
  }

  async function requestCompletion(messages, options = {}) {
    if (!config?.apiKey) {
      throw new Error('Doubao API key is not configured')
    }

    let response
    try {
      response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: options.modelOverride || config.model,
          stream: false,
          temperature: options.temperature ?? 0.2,
          max_tokens: options.maxTokens ?? 800,
          ...('responseFormat' in options ? { response_format: options.responseFormat } : {}),
          messages,
        }),
      })
    } catch (error) {
      throw new Error(`Failed to reach Doubao API: ${error.message}`)
    }

    const result = await parseProviderResponse(response)
    if (!response.ok) {
      mapProviderError(result)
    }

    return result
  }

  async function chat({ message, plantId, imagePaths = [] }) {
    if (!message || !String(message).trim()) {
      throw new Error('message is required')
    }

    const { plant, logs } = await loadContext(plantId)
    const systemPrompt = [
      '你是一个专业、克制、实用的 AI 园丁助手。',
      '回答必须使用简体中文。',
      '优先结合用户提供的植物信息、养护周期和最近日志给出建议。',
      '如果信息不足，要明确指出不确定点，不要编造。',
      '回答尽量结构化，优先给出：判断、原因、建议、风险。',
    ].join('\n')

    const userParts = [{
      type: 'text',
      text: [
        buildPlantContext({ plant, logs }),
        `用户问题：${String(message).trim()}`,
      ].join('\n\n'),
    }]

    for (const imagePath of imagePaths) {
      userParts.push(await buildImagePart(uploadDir, imagePath))
    }

    const result = await requestCompletion([
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: imagePaths.length ? userParts : userParts[0].text,
      },
    ], {
      modelOverride: imagePaths.length ? (config.visionModel || config.model) : config.model,
    })

    return {
      answer: normalizeAssistantContent(result?.choices?.[0]?.message?.content) || '未获得有效回答',
      provider: 'doubao',
      model: result?.model || config.model,
      usage: result?.usage || null,
    }
  }

  async function analyzePlantLogs({ plantId, message, days = 30 }) {
    if (!plantId || Number.isNaN(Number(plantId))) {
      throw new Error('plantId is required')
    }

    if (!message || !String(message).trim()) {
      throw new Error('message is required')
    }

    const { plant, logs } = await loadContext(plantId)
    const recentLogs = getRecentLogs(logs, days)
    const imagePaths = collectImagePaths(recentLogs)
    const userParts = [{
      type: 'text',
      text: buildAnalyzeLogsText({
        plant,
        logs: recentLogs,
        message: String(message).trim(),
        days,
      }),
    }]

    for (const imagePath of imagePaths) {
      userParts.push(await buildImagePart(uploadDir, imagePath))
    }

    const result = await requestCompletion([
      {
        role: 'system',
        content: [
          '你是一名专业植物医生和 AI 园丁助手。',
          '请严格根据提供的植物资料、近一个月记录和图片进行判断。',
          '回答必须使用简体中文，禁止编造无法从资料中确认的细节。',
        ].join('\n'),
      },
      {
        role: 'user',
        content: imagePaths.length ? userParts : userParts[0].text,
      },
    ], {
      temperature: 0.3,
      maxTokens: 1000,
      modelOverride: imagePaths.length ? (config.visionModel || config.model) : config.model,
    })

    return {
      answer: normalizeAssistantContent(result?.choices?.[0]?.message?.content) || '未获得有效回答',
      provider: 'doubao',
      model: result?.model || config.model,
      usage: result?.usage || null,
      analyzedLogIds: recentLogs.map((item) => item.id),
      analyzedImagePaths: imagePaths,
    }
  }

  async function generatePlantProfile(payload) {
    const prompt = {
      name: payload.name || '',
      species: payload.species || '',
      date: payload.date || '',
      status: payload.status || 'healthy',
      note: payload.note || '',
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      schedules: payload.schedules || {},
    }

    const result = await requestCompletion([
      {
        role: 'system',
        content: [
          '你是植物资料建档助手。',
          '必须返回合法 JSON。',
          '返回结构只允许包含 advice、faq、plan 三个字段。',
          'advice 必须是字符串数组。',
          'faq 必须是 { q, a } 数组。',
          'plan 必须包含 summary、water、fertilize、prune、repot。',
          '不要输出 Markdown，不要解释，不要包裹代码块。',
        ].join('\n'),
      },
      {
        role: 'user',
        content: `请为以下植物生成种植建议、常见问题和养护计划：\n${JSON.stringify(prompt, null, 2)}`,
      },
    ], {
      temperature: 0.4,
      maxTokens: 1200,
      responseFormat: { type: 'json_object' },
    })

    const rawContent = normalizeAssistantContent(result?.choices?.[0]?.message?.content)
    if (!rawContent) {
      throw new Error('AI 建档返回为空')
    }

    let parsed
    try {
      parsed = JSON.parse(rawContent)
    } catch {
      throw new Error('AI 建档结果格式无效')
    }

    return {
      ...normalizePlantProfile(parsed),
      generatedAt: new Date().toISOString(),
    }
  }

  return {
    chat,
    analyzePlantLogs,
    generatePlantProfile,
  }
}

module.exports = {
  createAiChatService,
}
