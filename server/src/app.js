const fs = require('node:fs/promises');
const cors = require('cors');
const express = require('express');
const multer = require('multer');

const { resolveAiConfig, resolveDefaultPaths } = require('./config');
const { createFileStore } = require('./lib/fileStore');
const { createSeedLogs, createSeedPlants, createSeedTasks } = require('./lib/seedData');
const { createAiRouter } = require('./routes/ai');
const { createLogsRouter } = require('./routes/logs');
const { createAiChatService } = require('./services/aiChatService');
const { createImageCompressionService } = require('./services/imageCompressionService');
const { createPlantCareService } = require('./services/plantCareService');
const { createPlantsRouter } = require('./routes/plants');
const { createTasksRouter } = require('./routes/tasks');
const { createUploadRouter } = require('./routes/upload');

function createUploadMiddleware() {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });
}

function createApp(options = {}) {
  const defaults = resolveDefaultPaths();
  const dataDir = options.dataDir || defaults.dataDir;
  const uploadDir = options.uploadDir || defaults.uploadDir;
  const aiConfig = options.aiConfig || resolveAiConfig();

  const store = createFileStore({
    dataDir,
    files: {
      plants: createSeedPlants(),
      tasks: createSeedTasks(),
      logs: createSeedLogs(),
      'plant-archives': [],
    },
  });

  const ready = (async () => {
    await store.ensure();
    await fs.mkdir(uploadDir, { recursive: true });
  })();

  const uploadMiddleware = createUploadMiddleware();
  const imageCompressionService =
    options.imageCompressionService || createImageCompressionService();
  const aiService = options.aiService || createAiChatService({
    uploadDir,
    dataDir,
    config: aiConfig,
  });
  const plantCareService = options.plantCareService || createPlantCareService({
    store,
  });
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.use(async (_request, _response, next) => {
    try {
      await ready;
      next();
    } catch (error) {
      next(error);
    }
  });

  app.use('/uploads', express.static(uploadDir));
  app.use('/api/plants', createPlantsRouter({ store, aiService, plantCareService }));
  app.use('/api/tasks', createTasksRouter({ store, plantCareService }));
  app.use('/api/logs', createLogsRouter({ store }));
  app.use(
    '/api/upload',
    createUploadRouter({
      uploadMiddleware,
      imageCompressionService,
      uploadDir,
    }),
  );
  app.use('/api/ai', createAiRouter({ aiService, store }));

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

  return app;
}

module.exports = {
  createApp,
};
