const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const request = require('supertest')

const { createApp } = require('../src/app')
const { createAiChatService } = require('../src/services/aiChatService')

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'planehelper-ai-analyze-'))
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8')
}

describe('analyzePlantLogs', () => {
  it('only includes recent logs and images from the last 30 days', async () => {
    const rootDir = await makeTempDir()
    const dataDir = path.join(rootDir, 'data')
    const uploadDir = path.join(rootDir, 'uploads')
    await fs.mkdir(uploadDir, { recursive: true })

    await fs.writeFile(path.join(uploadDir, 'recent-leaf.png'), Buffer.from('recent-image'))
    await writeJson(path.join(dataDir, 'plants.json'), [
      {
        id: 1,
        name: '迷迭香',
        species: 'Rosmarinus officinalis',
        date: '2026-04-01',
        status: 'healthy',
        note: '南向窗边',
        tags: ['香草', '喜阳'],
        schedules: { water: 5, fertilize: 14, prune: 30, repot: 365 },
      },
    ])
    await writeJson(path.join(dataDir, 'logs.json'), [
      {
        id: 101,
        plant: 1,
        date: '2026-04-25',
        text: '新叶颜色稳定，整体状态正常。',
        imgs: ['/uploads/recent-leaf.png'],
        source: 'user',
      },
      {
        id: 102,
        plant: 1,
        date: '2026-04-18',
        text: 'AI 上次建议继续观察土壤湿度。',
        imgs: [],
        source: 'ai',
      },
      {
        id: 103,
        plant: 1,
        date: '2026-03-01',
        text: '这是超过一个月的旧记录，不应继续参与分析。',
        imgs: [],
        source: 'user',
      },
    ])

    let capturedPayload = null
    const service = createAiChatService({
      uploadDir,
      dataDir,
      config: {
        apiKey: 'test-key',
        baseUrl: 'https://example.test/v3',
        model: 'doubao-1-5-vision-lite-250315',
      },
      fetchImpl: async (_url, options) => {
        capturedPayload = JSON.parse(options.body)
        return {
          ok: true,
          json: async () => ({
            model: 'doubao-1-5-vision-lite-250315',
            usage: { total_tokens: 128 },
            choices: [
              {
                message: {
                  content: '整体状态基本正常，继续观察叶色和浇水节奏。',
                },
              },
            ],
          }),
        }
      },
    })

    const result = await service.analyzePlantLogs({
      plantId: 1,
      message: '请根据近一个月记录判断植物是否正常，并给出建议。',
    })

    expect(result.answer).toBe('整体状态基本正常，继续观察叶色和浇水节奏。')
    expect(result.analyzedLogIds).toEqual([102, 101])
    expect(result.analyzedImagePaths).toEqual(['/uploads/recent-leaf.png'])
    expect(capturedPayload.messages[1].content[0].text).toContain('迷迭香')
    expect(capturedPayload.messages[1].content[0].text).toContain('新叶颜色稳定，整体状态正常。')
    expect(capturedPayload.messages[1].content[0].text).toContain('AI 上次建议继续观察土壤湿度。')
    expect(capturedPayload.messages[1].content[0].text).not.toContain('这是超过一个月的旧记录')
    expect(capturedPayload.messages[1].content[1].type).toBe('image_url')
  })

  it('uses the configured vision model when recent logs include images', async () => {
    const rootDir = await makeTempDir()
    const dataDir = path.join(rootDir, 'data')
    const uploadDir = path.join(rootDir, 'uploads')
    await fs.mkdir(uploadDir, { recursive: true })

    await fs.writeFile(path.join(uploadDir, 'vision.png'), Buffer.from('vision-image'))
    await writeJson(path.join(dataDir, 'plants.json'), [
      {
        id: 1,
        name: '薄荷',
        species: 'Mentha',
        date: '2026-04-01',
        status: 'healthy',
        note: '',
        tags: ['香草'],
        schedules: { water: 3, fertilize: 14, prune: 30, repot: 365 },
      },
    ])
    await writeJson(path.join(dataDir, 'logs.json'), [
      {
        id: 301,
        plant: 1,
        date: '2026-04-27',
        text: '叶片状态稳定。',
        imgs: ['/uploads/vision.png'],
        source: 'user',
      },
    ])

    let capturedPayload = null
    const service = createAiChatService({
      uploadDir,
      dataDir,
      config: {
        apiKey: 'test-key',
        baseUrl: 'https://example.test/v3',
        model: 'text-only-model',
        visionModel: 'vision-model-id',
      },
      fetchImpl: async (_url, options) => {
        capturedPayload = JSON.parse(options.body)
        return {
          ok: true,
          json: async () => ({
            model: 'vision-model-id',
            choices: [
              {
                message: {
                  content: '图片已分析。',
                },
              },
            ],
          }),
        }
      },
    })

    await service.analyzePlantLogs({
      plantId: 1,
      message: '请结合图片判断是否正常。',
    })

    expect(capturedPayload.model).toBe('vision-model-id')
  })
})

describe('AI log analysis route', () => {
  it('persists the AI result as a new growth log entry', async () => {
    const rootDir = await makeTempDir()
    const dataDir = path.join(rootDir, 'data')
    const uploadDir = path.join(rootDir, 'uploads')

    await writeJson(path.join(dataDir, 'plants.json'), [
      {
        id: 1,
        name: '虎皮蓝花',
        species: '',
        date: '2026-04-10',
        status: 'warning',
        note: '窗边散光',
        tags: ['室内'],
        schedules: { water: 4, fertilize: 14, prune: 30, repot: 365 },
      },
    ])
    await writeJson(path.join(dataDir, 'logs.json'), [
      {
        id: 201,
        plant: 1,
        date: '2026-04-28',
        text: '叶片边缘有轻微发黄。',
        imgs: [],
        source: 'user',
      },
    ])

    const app = createApp({
      dataDir,
      uploadDir,
      aiService: {
        chat: async () => ({
          answer: 'unused',
          provider: 'doubao',
          model: 'doubao-1-5-vision-lite-250315',
          usage: null,
        }),
        analyzePlantLogs: async ({ plantId, message, days }) => ({
          answer: `AI 分析结论：${plantId}-${days}-${message}`,
          provider: 'doubao',
          model: 'doubao-1-5-vision-lite-250315',
          usage: { total_tokens: 88 },
          analyzedLogIds: [201],
          analyzedImagePaths: [],
        }),
      },
    })

    const response = await request(app).post('/api/ai/analyze-logs').send({
      plantId: 1,
      message: '请判断是否需要处理黄叶问题。',
    })

    expect(response.status).toBe(200)
    expect(response.body.answer).toContain('AI 分析结论')
    expect(response.body.log.source).toBe('ai')
    expect(response.body.log.plant).toBe(1)

    const logsResponse = await request(app).get('/api/logs?plantId=1')
    expect(logsResponse.status).toBe(200)
    expect(logsResponse.body[0].source).toBe('ai')
    expect(logsResponse.body[0].text).toContain('AI 分析结论')
  })

  it('returns a clear message when the configured model does not support images', async () => {
    const app = createApp({
      aiService: {
        chat: async () => ({
          answer: 'unused',
          provider: 'doubao',
          model: 'doubao-1-5-vision-lite-250315',
          usage: null,
        }),
        analyzePlantLogs: async () => {
          throw new Error('Doubao model does not support multimodal messages')
        },
      },
    })

    const response = await request(app).post('/api/ai/analyze-logs').send({
      plantId: 1,
      message: '请分析图片。',
    })

    expect(response.status).toBe(400)
    expect(response.body.message).toBe('当前配置的 Doubao 模型不支持图片分析。请将 ARK_VISION_MODEL 配置为视觉模型或视觉 Endpoint ID。')
  })
})
