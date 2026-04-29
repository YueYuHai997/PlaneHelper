const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');

const { createApp } = require('../src/app');
const { createAiChatService } = require('../src/services/aiChatService');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'planehelper-ai-'));
}

describe('createAiChatService', () => {
  it('converts uploaded image paths into data urls for Doubao requests', async () => {
    const rootDir = await makeTempDir();
    const uploadDir = path.join(rootDir, 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const imagePath = path.join(uploadDir, 'leaf.png');
    await fs.writeFile(imagePath, Buffer.from('fake-image'));

    let capturedPayload;
    const service = createAiChatService({
      uploadDir,
      dataDir: path.join(rootDir, 'data'),
      config: {
        apiKey: 'test-key',
        baseUrl: 'https://example.test/v3',
        model: 'doubao-1-5-vision-lite-250315',
      },
      fetchImpl: async (_url, options) => {
        capturedPayload = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: '这是 AI 回复',
                },
              },
            ],
          }),
        };
      },
    });

    const result = await service.chat({
      message: '帮我看看这株植物状态',
      imagePaths: ['/uploads/leaf.png'],
    });

    expect(result.answer).toBe('这是 AI 回复');
    expect(capturedPayload.model).toBe('doubao-1-5-vision-lite-250315');
    expect(capturedPayload.messages[1].content[0].type).toBe('text');
    expect(capturedPayload.messages[1].content[1].type).toBe('image_url');
    expect(capturedPayload.messages[1].content[1].image_url.url.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('rejects image paths outside the upload directory', async () => {
    const rootDir = await makeTempDir();
    const uploadDir = path.join(rootDir, 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const service = createAiChatService({
      uploadDir,
      dataDir: path.join(rootDir, 'data'),
      config: {
        apiKey: 'test-key',
        baseUrl: 'https://example.test/v3',
        model: 'doubao-1-5-vision-lite-250315',
      },
      fetchImpl: async () => {
        throw new Error('should not call provider');
      },
    });

    await expect(
      service.chat({
        message: '查看图片',
        imagePaths: ['/uploads/../secret.txt'],
      }),
    ).rejects.toThrow('Invalid image path');
  });

  it('normalizes invalid api key errors from Doubao', async () => {
    const rootDir = await makeTempDir();
    const service = createAiChatService({
      uploadDir: path.join(rootDir, 'uploads'),
      dataDir: path.join(rootDir, 'data'),
      config: {
        apiKey: 'bad-key',
        baseUrl: 'https://example.test/v3',
        model: 'doubao-1-5-vision-lite-250315',
      },
      fetchImpl: async () => ({
        ok: false,
        headers: {
          get: () => 'application/json',
        },
        json: async () => ({
          error: {
            message: 'The api key is invalid. Request id: test-request-id',
          },
        }),
      }),
    });

    await expect(
      service.chat({
        message: '测试一下',
        imagePaths: [],
      }),
    ).rejects.toThrow('Doubao API key is invalid');
  });

  it('wraps provider network errors with a clearer message', async () => {
    const rootDir = await makeTempDir();
    const service = createAiChatService({
      uploadDir: path.join(rootDir, 'uploads'),
      dataDir: path.join(rootDir, 'data'),
      config: {
        apiKey: 'test-key',
        baseUrl: 'https://example.test/v3',
        model: 'doubao-1-5-vision-lite-250315',
      },
      fetchImpl: async () => {
        throw new Error('fetch failed');
      },
    });

    await expect(
      service.chat({
        message: '测试一下',
        imagePaths: [],
      }),
    ).rejects.toThrow('Failed to reach Doubao API: fetch failed');
  });

  it('normalizes inaccessible model or endpoint errors from Ark', async () => {
    const rootDir = await makeTempDir();
    const service = createAiChatService({
      uploadDir: path.join(rootDir, 'uploads'),
      dataDir: path.join(rootDir, 'data'),
      config: {
        apiKey: 'test-key',
        baseUrl: 'https://example.test/v3',
        model: 'doubao-1-5-vision-lite-250315',
      },
      fetchImpl: async () => ({
        ok: false,
        headers: {
          get: () => 'application/json',
        },
        json: async () => ({
          error: {
            code: 'InvalidEndpointOrModel.NotFound',
            message: 'The model or endpoint doubao-1-5-vision-lite-250315 does not exist or you do not have access to it.',
          },
        }),
      }),
    });

    await expect(
      service.chat({
        message: '测试一下',
        imagePaths: [],
      }),
    ).rejects.toThrow('Doubao model or endpoint is not accessible');
  });
});

describe('AI chat route', () => {
  it('returns ai response from configured service', async () => {
    const app = createApp({
      aiService: {
        chat: async ({ message, plantId }) => ({
          answer: `AI:${message}:${plantId}`,
          provider: 'doubao',
          model: 'doubao-1-5-vision-lite-250315',
          usage: null,
        }),
      },
    });

    const response = await request(app).post('/api/ai/chat').send({
      message: '你好',
      plantId: 1,
      imagePaths: [],
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      answer: 'AI:你好:1',
      provider: 'doubao',
      model: 'doubao-1-5-vision-lite-250315',
    });
  });

  it('rejects empty messages', async () => {
    const app = createApp({
      aiService: {
        chat: async () => ({ answer: 'unused' }),
      },
    });

    const response = await request(app).post('/api/ai/chat').send({
      message: '   ',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('message is required');
  });

  it('returns a clear message when the api key is invalid', async () => {
    const app = createApp({
      aiService: {
        chat: async () => {
          throw new Error('Doubao API key is invalid');
        },
      },
    });

    const response = await request(app).post('/api/ai/chat').send({
      message: '你好',
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Doubao API Key 无效，请更新 server/.env 后重启服务');
  });

  it('returns a clear message when the model or endpoint is not accessible', async () => {
    const app = createApp({
      aiService: {
        chat: async () => {
          throw new Error('Doubao model or endpoint is not accessible');
        },
      },
    });

    const response = await request(app).post('/api/ai/chat').send({
      message: '你好',
    });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe(
      'Doubao 模型不可用。请确认模型已开通，或将 ARK_MODEL 改为你在火山方舟控制台创建的 Endpoint ID（形如 ep-xxxx）。',
    );
  });
});
