const express = require('express');

function createLogsRouter({ store }) {
  const router = express.Router();

  router.get('/', async (request, response, next) => {
    try {
      const logs = await store.read('logs');
      const plantId = request.query.plantId ? Number(request.query.plantId) : null;
      const result = plantId ? logs.filter((item) => item.plant === plantId) : logs;
      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (request, response, next) => {
    try {
      const payload = request.body;
      if (!payload.text || !payload.plant || !payload.date) {
        response.status(400).json({ message: 'text, plant and date are required' });
        return;
      }

      const logs = await store.read('logs');
      const log = {
        id: Date.now(),
        plant: Number(payload.plant),
        date: payload.date,
        text: String(payload.text).trim(),
        imgs: Array.isArray(payload.imgs) ? payload.imgs : [],
        source: payload.source || 'user',
      };

      logs.unshift(log);
      await store.write('logs', logs);
      response.status(201).json(log);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (request, response, next) => {
    try {
      const logs = await store.read('logs');
      const filtered = logs.filter((item) => item.id !== Number(request.params.id));
      await store.write('logs', filtered);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createLogsRouter,
};
