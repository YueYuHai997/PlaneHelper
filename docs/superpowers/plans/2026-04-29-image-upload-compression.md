# Image Upload Compression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让服务端对所有新上传照片执行统一压缩后再落盘，减少磁盘占用并降低后续 AI 图像输入体积。

**Architecture:** 保持前端上传接口和业务数据结构不变，仅重构服务端上传收口。`multer` 改为内存存储，上传路由调用独立的图片压缩服务生成 `.jpg` 文件并写入 `storage/uploads`，再由现有静态资源路径对外提供访问。

**Tech Stack:** Node.js, Express, Multer, Sharp, Vitest, Supertest

---

## 文件结构

**Create:**

- `server/src/services/imageCompressionService.js`：封装图片压缩、命名和输出格式逻辑
- `server/tests/imageCompressionService.test.js`：覆盖压缩服务的单元测试

**Modify:**

- `server/package.json`：新增 `sharp` 依赖
- `server/package-lock.json`：同步锁文件
- `server/src/app.js`：调整上传中间件为内存存储和大小限制，补充上传相关错误处理
- `server/src/routes/upload.js`：将“直接返回原始落盘结果”改为“压缩后写盘并返回路径”
- `server/tests/app.test.js`：更新上传接口测试，覆盖 `.jpg` 输出和无效输入

### Task 1: 压缩服务测试与实现

**Files:**

- Create: `server/src/services/imageCompressionService.js`
- Test: `server/tests/imageCompressionService.test.js`

- [ ] **Step 1: 写失败测试，定义压缩服务的目标行为**

```js
const sharp = require('sharp');
const { describe, expect, it } = require('vitest');

const { createImageCompressionService } = require('../src/services/imageCompressionService');

async function createPngBuffer(width, height) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 12, g: 180, b: 90 },
    },
  })
    .png()
    .toBuffer();
}

describe('createImageCompressionService', () => {
  it('compresses an uploaded image into a jpg file with bounded dimensions', async () => {
    const service = createImageCompressionService();
    const source = await createPngBuffer(2400, 1800);

    const result = await service.compressImage({
      originalName: 'leaf.png',
      buffer: source,
    });

    expect(result.filename).toMatch(/\.jpg$/);
    expect(result.mimeType).toBe('image/jpeg');

    const metadata = await sharp(result.buffer).metadata();
    expect(Math.max(metadata.width, metadata.height)).toBeLessThanOrEqual(1600);
  });

  it('throws a clear error when the uploaded content is not a valid image', async () => {
    const service = createImageCompressionService();

    await expect(
      service.compressImage({
        originalName: 'bad.txt',
        buffer: Buffer.from('not-an-image'),
      }),
    ).rejects.toThrow('Invalid image file');
  });
});
```

- [ ] **Step 2: 运行测试，确认按预期失败**

Run:

```powershell
npm --prefix server run test -- imageCompressionService.test.js
```

Expected:

- 失败原因是 `Cannot find module '../src/services/imageCompressionService'`

- [ ] **Step 3: 写最小实现，让测试转绿**

```js
const path = require('node:path');
const sharp = require('sharp');

function createImageCompressionService(options = {}) {
  const maxDimension = options.maxDimension || 1600;
  const quality = options.quality || 78;

  async function compressImage({ originalName, buffer }) {
    try {
      const outputBuffer = await sharp(buffer)
        .rotate()
        .resize({
          width: maxDimension,
          height: maxDimension,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({
          quality,
          mozjpeg: true,
        })
        .toBuffer();

      return {
        filename: `${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`,
        mimeType: 'image/jpeg',
        originalName: originalName || path.basename('upload.jpg'),
        buffer: outputBuffer,
      };
    } catch (error) {
      error.message = 'Invalid image file';
      throw error;
    }
  }

  return {
    compressImage,
  };
}

module.exports = {
  createImageCompressionService,
};
```

- [ ] **Step 4: 重新运行测试，确认通过**

Run:

```powershell
npm --prefix server run test -- imageCompressionService.test.js
```

Expected:

- `2 passed`

- [ ] **Step 5: 小步提交**

```powershell
git add server/src/services/imageCompressionService.js server/tests/imageCompressionService.test.js
git commit -m "test: add image compression service coverage"
```

### Task 2: 上传接口失败测试与最小实现

**Files:**

- Modify: `server/src/app.js`
- Modify: `server/src/routes/upload.js`
- Modify: `server/tests/app.test.js`

- [ ] **Step 1: 在接口测试里补失败用例，约束上传行为**

```js
it('stores an uploaded image as a compressed jpg file', async () => {
  const imageBuffer = await require('sharp')({
    create: {
      width: 2200,
      height: 1800,
      channels: 3,
      background: { r: 220, g: 120, b: 30 },
    },
  })
    .png()
    .toBuffer();

  const response = await request(app)
    .post('/api/upload')
    .attach('image', imageBuffer, 'leaf.png');

  expect(response.status).toBe(201);
  expect(response.body.path).toMatch(/^\/uploads\/.*\.jpg$/);

  const savedFile = path.join(tempDir, response.body.path.replace(/\//g, path.sep));
  const metadata = await require('sharp')(savedFile).metadata();
  expect(Math.max(metadata.width, metadata.height)).toBeLessThanOrEqual(1600);
});

it('rejects invalid image uploads', async () => {
  const response = await request(app)
    .post('/api/upload')
    .attach('image', Buffer.from('bad-data'), 'leaf.txt');

  expect(response.status).toBe(400);
  expect(response.body.message).toBe('Invalid image file');
});
```

- [ ] **Step 2: 运行接口测试，确认新增用例先失败**

Run:

```powershell
npm --prefix server run test -- app.test.js
```

Expected:

- 失败原因是当前接口仍然返回原始扩展名文件，且不会拒绝伪造图片

- [ ] **Step 3: 改上传实现为内存压缩后写盘**

`server/src/app.js` 关键代码：

```js
function createUploadMiddleware() {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });
}
```

`server/src/routes/upload.js` 关键代码：

```js
const fs = require('node:fs/promises');
const path = require('node:path');
const express = require('express');

function createUploadRouter({ uploadMiddleware, imageCompressionService, uploadDir }) {
  const router = express.Router();

  router.post('/', uploadMiddleware.single('image'), async (request, response, next) => {
    if (!request.file) {
      response.status(400).json({ message: 'Image file is required' });
      return;
    }

    try {
      const compressed = await imageCompressionService.compressImage({
        originalName: request.file.originalname,
        buffer: request.file.buffer,
      });

      const targetPath = path.join(uploadDir, compressed.filename);
      await fs.writeFile(targetPath, compressed.buffer);

      response.status(201).json({
        path: `/uploads/${compressed.filename}`,
        originalName: request.file.originalname,
      });
    } catch (error) {
      if (error.message === 'Invalid image file') {
        response.status(400).json({ message: error.message });
        return;
      }

      next(error);
    }
  });

  return router;
}
```

`server/src/app.js` 注入路由时：

```js
const { createImageCompressionService } = require('./services/imageCompressionService');

const uploadMiddleware = createUploadMiddleware();
const imageCompressionService = createImageCompressionService();

app.use(
  '/api/upload',
  createUploadRouter({
    uploadMiddleware,
    imageCompressionService,
    uploadDir,
  }),
);
```

- [ ] **Step 4: 再跑接口测试，确认转绿**

Run:

```powershell
npm --prefix server run test -- app.test.js
```

Expected:

- `app.test.js` 全部通过

- [ ] **Step 5: 小步提交**

```powershell
git add server/src/app.js server/src/routes/upload.js server/tests/app.test.js
git commit -m "feat: compress uploaded images before storage"
```

### Task 3: 文件大小限制、依赖与回归验证

**Files:**

- Modify: `server/package.json`
- Modify: `server/package-lock.json`
- Modify: `server/src/app.js`
- Modify: `server/tests/app.test.js`

- [ ] **Step 1: 加失败测试，覆盖超大文件限制**

```js
it('returns 400 when the uploaded file exceeds the size limit', async () => {
  const response = await request(app)
    .post('/api/upload')
    .attach('image', Buffer.alloc(10 * 1024 * 1024 + 1, 1), 'huge.png');

  expect(response.status).toBe(400);
  expect(response.body.message).toBe('Image file is too large');
});
```

- [ ] **Step 2: 运行测试，确认先失败**

Run:

```powershell
npm --prefix server run test -- app.test.js
```

Expected:

- 失败原因是当前 `MulterError` 还没有被映射成清晰的 `400` 消息

- [ ] **Step 3: 增加依赖和错误映射的最小实现**

`server/package.json` 依赖段补充：

```json
"dependencies": {
  "cors": "^2.8.5",
  "dotenv": "^16.6.1",
  "express": "^5.1.0",
  "multer": "^2.0.2",
  "sharp": "0.34.5"
}
```

`server/src/app.js` 错误处理中补充：

```js
app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    response.status(400).json({
      message: 'Image file is too large',
    });
    return;
  }

  response.status(500).json({
    message: error.message || 'Internal server error',
  });
});
```

安装依赖：

```powershell
npm --prefix server install sharp@0.34.5
```

- [ ] **Step 4: 运行目标测试和完整服务端测试**

Run:

```powershell
npm --prefix server run test -- app.test.js
npm --prefix server run test
```

Expected:

- `app.test.js` 全部通过
- 服务端 Vitest 全绿

- [ ] **Step 5: 运行前端构建，确认接口兼容性未破坏**

Run:

```powershell
npm --prefix frontend run build
```

Expected:

- Vite build 成功，无上传相关类型或运行时构建错误

- [ ] **Step 6: 小步提交**

```powershell
git add server/package.json server/package-lock.json server/src/app.js server/tests/app.test.js
git commit -m "chore: enforce upload limits for compressed images"
```

## 自检

- Spec coverage：已覆盖压缩格式、尺寸限制、异常分支、依赖、测试和前端兼容性验证
- Placeholder scan：无 `TODO` / `TBD` / “自行处理”之类占位描述
- Type consistency：统一使用 `createImageCompressionService().compressImage(...)`、`/uploads/<filename>.jpg`、`Image file is required`、`Invalid image file`、`Image file is too large`
