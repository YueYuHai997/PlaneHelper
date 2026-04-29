const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const sharp = require('sharp');

const { createApp } = require('../src/app');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'planehelper-app-'));
}

async function createPngBuffer(width, height) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 220, g: 120, b: 30 },
    },
  })
    .png()
    .toBuffer();
}

describe('createApp', () => {
  let tempDir;
  let app;

  beforeEach(async () => {
    tempDir = await makeTempDir();
    app = createApp({
      dataDir: path.join(tempDir, 'data'),
      uploadDir: path.join(tempDir, 'uploads'),
      aiService: {
        chat: async () => ({
          answer: 'unused',
          provider: 'doubao',
          model: 'doubao-1-5-vision-lite-250315',
        }),
        generatePlantProfile: async () => ({
          advice: ['保持稳定通风'],
          faq: [{ q: '多久浇水？', a: '根据盆土状态决定。' }],
          plan: {
            summary: '保持稳定通风和日照。',
            water: '按盆土干湿决定',
            fertilize: '两周一次薄肥',
            prune: '按长势修剪',
            repot: '根系顶盆时换盆',
          },
          generatedAt: '2026-04-28T00:00:00.000Z',
        }),
      },
    });
  });

  it('returns seeded plants on first read', async () => {
    const response = await request(app).get('/api/plants');

    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
      schedules: expect.any(Object),
    });
  });

  it('creates a plant record', async () => {
    const response = await request(app).post('/api/plants').send({
      name: '测试薄荷',
      species: 'Mentha',
      date: '2026-04-28',
      status: 'healthy',
      note: '窗台',
      tags: ['香草'],
      photo: '',
      schedules: {
        water: 2,
        fertilize: 14,
        prune: 10,
        repot: 180,
      },
    });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('测试薄荷');

    const plantsResponse = await request(app).get('/api/plants');
    expect(plantsResponse.body.some((item) => item.name === '测试薄荷')).toBe(true);
  });

  it('toggles task done status', async () => {
    const listResponse = await request(app).get('/api/tasks');
    const taskId = listResponse.body[0].id;

    const toggleResponse = await request(app).patch(`/api/tasks/${taskId}/toggle`);

    expect(toggleResponse.status).toBe(200);
    expect(toggleResponse.body.completedTask.done).toBe(true);
    expect(toggleResponse.body.nextTask.done).toBe(false);
  });

  it('stores an uploaded image as a compressed jpg file', async () => {
    const imageBuffer = await createPngBuffer(2200, 1800);

    const response = await request(app)
      .post('/api/upload')
      .attach('image', imageBuffer, 'leaf.png');

    expect(response.status).toBe(201);
    expect(response.body.path).toMatch(/^\/uploads\/.*\.jpg$/);

    const savedFile = path.join(tempDir, response.body.path.replace(/\//g, path.sep));
    await expect(fs.access(savedFile)).resolves.toBeUndefined();

    const metadata = await sharp(savedFile).metadata();
    expect(Math.max(metadata.width, metadata.height)).toBeLessThanOrEqual(1600);
  });

  it('rejects invalid image uploads', async () => {
    const response = await request(app)
      .post('/api/upload')
      .attach('image', Buffer.from('bad-data'), 'leaf.txt');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid image file');
  });

  it('returns 400 when the uploaded file exceeds the size limit', async () => {
    const response = await request(app)
      .post('/api/upload')
      .attach('image', Buffer.alloc(10 * 1024 * 1024 + 1, 1), 'huge.png');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Image file is too large');
  });
});
