const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const request = require('supertest')

const { createApp } = require('../src/app')

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'planehelper-plants-ai-'))
}

function createMockAiService(profileFactory) {
  return {
    chat: async () => ({
      answer: 'unused',
      provider: 'doubao',
      model: 'doubao-1-5-vision-lite-250315',
    }),
    generatePlantProfile: profileFactory,
  }
}

describe('plants route with ai generation', () => {
  it('creates plant with ai profile and initial tasks', async () => {
    const tempDir = await makeTempDir()
    const app = createApp({
      dataDir: path.join(tempDir, 'data'),
      uploadDir: path.join(tempDir, 'uploads'),
      aiService: createMockAiService(async () => ({
        advice: ['保持稳定日照'],
        faq: [{ q: '多久浇一次水？', a: '观察盆土后再决定。' }],
        plan: {
          summary: '保持通风并避免积水。',
          water: '5 天一次',
          fertilize: '14 天一次',
          prune: '按长势修剪',
          repot: '根系顶盆时换盆',
        },
      })),
    })

    const response = await request(app).post('/api/plants').send({
      name: '迷迭香',
      species: 'Rosmarinus officinalis',
      date: '2026-04-28',
      status: 'healthy',
      note: '南向阳台',
      tags: ['香草'],
      photo: '',
      schedules: {
        water: 5,
        fertilize: 14,
        prune: 30,
        repot: 365,
      },
    })

    expect(response.status).toBe(201)
    expect(response.body.aiProfile.advice).toContain('保持稳定日照')
    expect(response.body.carePlan.lastWateredAt).toBe('2026-04-28')

    const tasksResponse = await request(app).get('/api/tasks')
    const pendingPlantTasks = tasksResponse.body.filter((task) => task.plant === response.body.id && !task.done)
    expect(pendingPlantTasks).toHaveLength(4)
    expect(pendingPlantTasks.find((task) => task.type === 'water')?.date).toBe('2026-05-03')
  })

  it('does not persist plant when ai generation fails', async () => {
    const tempDir = await makeTempDir()
    const app = createApp({
      dataDir: path.join(tempDir, 'data'),
      uploadDir: path.join(tempDir, 'uploads'),
      aiService: createMockAiService(async () => {
        throw new Error('AI 建档失败')
      }),
    })

    const response = await request(app).post('/api/plants').send({
      name: '迷迭香',
      species: 'Rosmarinus officinalis',
      date: '2026-04-28',
      status: 'healthy',
      note: '南向阳台',
      tags: ['香草'],
      photo: '',
      schedules: {
        water: 5,
        fertilize: 14,
        prune: 30,
        repot: 365,
      },
    })

    expect(response.status).toBe(502)
    expect(response.body.message).toBe('AI 建档失败，植物未保存')

    const plantsResponse = await request(app).get('/api/plants')
    expect(plantsResponse.body.some((plant) => plant.name === '迷迭香')).toBe(false)
  })

  it('regenerates ai profile for an existing plant', async () => {
    const tempDir = await makeTempDir()
    const app = createApp({
      dataDir: path.join(tempDir, 'data'),
      uploadDir: path.join(tempDir, 'uploads'),
      aiService: createMockAiService(async () => ({
        advice: ['重新生成的建议'],
        faq: [{ q: '重新生成的问题？', a: '重新生成的回答。' }],
        plan: {
          summary: '重新生成的整体策略。',
          water: '新的浇水建议',
          fertilize: '新的施肥建议',
          prune: '新的修剪建议',
          repot: '新的换盆建议',
        },
      })),
    })

    const createResponse = await request(app).post('/api/plants').send({
      name: '迷迭香',
      species: 'Rosmarinus officinalis',
      date: '2026-04-28',
      status: 'healthy',
      note: '南向阳台',
      tags: ['香草'],
      photo: '',
      schedules: {
        water: 5,
        fertilize: 14,
        prune: 30,
        repot: 365,
      },
    })

    const regenerateResponse = await request(app)
      .post(`/api/plants/${createResponse.body.id}/ai-profile/regenerate`)
      .send()

    expect(regenerateResponse.status).toBe(200)
    expect(regenerateResponse.body.aiProfile.advice).toContain('重新生成的建议')
    expect(regenerateResponse.body.aiProfile.plan.summary).toBe('重新生成的整体策略。')
  })
})
