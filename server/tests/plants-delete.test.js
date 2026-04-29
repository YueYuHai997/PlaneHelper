const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const request = require('supertest')

const { createApp } = require('../src/app')

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'planehelper-plants-delete-'))
}

describe('plants route delete archive flow', () => {
  it('archives the plant and removes related tasks and logs', async () => {
    const tempDir = await makeTempDir()
    const app = createApp({
      dataDir: path.join(tempDir, 'data'),
      uploadDir: path.join(tempDir, 'uploads'),
      aiService: {
        generatePlantProfile: async () => ({
          advice: ['保持稳定'],
          faq: [{ q: '怎么养？', a: '按周期养护。' }],
          plan: {
            summary: '稳定通风',
            water: '5 天一次',
            fertilize: '14 天一次',
            prune: '按需修剪',
            repot: '按年换盆',
          },
        }),
      },
    })

    const createResponse = await request(app).post('/api/plants').send({
      name: '荣誉室候选',
      species: 'Test Plant',
      date: '2026-04-28',
      status: 'healthy',
      note: '测试删除归档',
      tags: ['室内'],
      photo: '/uploads/plant-a.jpg',
      schedules: {
        water: 5,
        fertilize: 14,
        prune: 30,
        repot: 365,
      },
    })

    expect(createResponse.status).toBe(201)

    const plantId = createResponse.body.id

    const logResponse = await request(app).post('/api/logs').send({
      plant: plantId,
      date: '2026-04-29',
      text: '保留一张照片做归档',
      imgs: ['/uploads/log-a.jpg'],
      source: 'user',
    })

    expect(logResponse.status).toBe(201)

    const deleteResponse = await request(app).delete(`/api/plants/${plantId}`)
    expect(deleteResponse.status).toBe(204)

    const plantsResponse = await request(app).get('/api/plants')
    expect(plantsResponse.body.some((plant) => plant.id === plantId)).toBe(false)

    const tasksResponse = await request(app).get('/api/tasks')
    expect(tasksResponse.body.some((task) => task.plant === plantId)).toBe(false)

    const logsResponse = await request(app).get('/api/logs')
    expect(logsResponse.body.some((log) => log.plant === plantId)).toBe(false)

    const archivesPath = path.join(tempDir, 'data', 'plant-archives.json')
    const archives = JSON.parse(await fs.readFile(archivesPath, 'utf8'))
    expect(archives).toHaveLength(1)
    expect(archives[0].plant.id).toBe(plantId)
    expect(archives[0].tasks.length).toBeGreaterThan(0)
    expect(archives[0].logs).toHaveLength(1)
    expect(archives[0].imagePaths).toEqual(
      expect.arrayContaining(['/uploads/plant-a.jpg', '/uploads/log-a.jpg']),
    )
  })
})
