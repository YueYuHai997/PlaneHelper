const express = require('express')

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function applyAiError(error, response, next) {
  if (error.message === 'Doubao API key is not configured') {
    response.status(503).json({ message: error.message })
    return
  }

  if (error.message === 'Doubao API key is invalid') {
    response.status(401).json({ message: 'Doubao API Key 无效，请更新 server/.env 后重启服务' })
    return
  }

  if (error.message === 'Doubao model or endpoint is not accessible') {
    response.status(404).json({
      message: 'Doubao 模型不可用。请确认模型已开通，或将 ARK_MODEL 改为你在火山方舟控制台创建的 Endpoint ID（形如 ep-xxxx）。',
    })
    return
  }

  if (error.message.startsWith('Failed to reach Doubao API:')) {
    response.status(502).json({ message: '无法连接 Doubao API，请检查网络、ARK_BASE_URL 或本机代理设置' })
    return
  }

  if (error.message === 'Invalid image path') {
    response.status(400).json({ message: error.message })
    return
  }

  if (error.message === 'Doubao model does not support multimodal messages') {
    response.status(400).json({ message: '当前配置的 Doubao 模型不支持图片分析。请将 ARK_VISION_MODEL 配置为视觉模型或视觉 Endpoint ID。' })
    return
  }

  next(error)
}

function createAiRouter({ aiService, store }) {
  const router = express.Router()

  router.post('/chat', async (request, response, next) => {
    try {
      const { message, plantId = null, imagePaths = [] } = request.body || {}
      if (!message || !String(message).trim()) {
        response.status(400).json({ message: 'message is required' })
        return
      }

      const result = await aiService.chat({
        message: String(message).trim(),
        plantId,
        imagePaths: Array.isArray(imagePaths) ? imagePaths : [],
      })

      response.json(result)
    } catch (error) {
      applyAiError(error, response, next)
    }
  })

  router.post('/analyze-logs', async (request, response, next) => {
    try {
      const { message, plantId } = request.body || {}
      if (!plantId || Number.isNaN(Number(plantId))) {
        response.status(400).json({ message: 'plantId is required' })
        return
      }

      if (!message || !String(message).trim()) {
        response.status(400).json({ message: 'message is required' })
        return
      }

      const result = await aiService.analyzePlantLogs({
        plantId: Number(plantId),
        message: String(message).trim(),
        days: 30,
      })

      const logs = await store.read('logs')
      const createdLog = {
        id: Date.now(),
        plant: Number(plantId),
        date: getToday(),
        text: result.answer,
        imgs: [],
        source: 'ai',
      }

      logs.unshift(createdLog)
      await store.write('logs', logs)

      response.json({
        ...result,
        log: createdLog,
      })
    } catch (error) {
      applyAiError(error, response, next)
    }
  })

  return router
}

module.exports = {
  createAiRouter,
}
