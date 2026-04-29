const express = require('express');

function createTasksRouter({ store, plantCareService }) {
  const router = express.Router();

  router.get('/', async (_request, response, next) => {
    try {
      const tasks = await store.read('tasks');
      response.json(tasks);
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (request, response, next) => {
    try {
      const payload = request.body;
      if (!payload.type || !payload.plant || !payload.date) {
        response.status(400).json({ message: 'type, plant and date are required' });
        return;
      }

      const task = plantCareService
        ? await plantCareService.createOrReplaceTask({
          type: payload.type,
          plant: Number(payload.plant),
          date: payload.date,
          done: Boolean(payload.done),
          note: payload.note || '',
          source: payload.source || 'manual',
        })
        : {
          id: Date.now(),
          type: payload.type,
          plant: Number(payload.plant),
          date: payload.date,
          done: Boolean(payload.done),
          note: payload.note || '',
          source: payload.source || 'manual',
        };

      if (!plantCareService) {
        const tasks = await store.read('tasks');
        tasks.push(task);
        await store.write('tasks', tasks);
      }

      response.status(201).json(task);
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id', async (request, response, next) => {
    try {
      const tasks = await store.read('tasks');
      const index = tasks.findIndex((item) => item.id === Number(request.params.id));
      if (index === -1) {
        response.status(404).json({ message: 'Task not found' });
        return;
      }

      tasks[index] = {
        ...tasks[index],
        ...request.body,
        id: tasks[index].id,
      };

      await store.write('tasks', tasks);
      response.json(tasks[index]);
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id/toggle', async (request, response, next) => {
    try {
      if (plantCareService) {
        const result = await plantCareService.completeTask(Number(request.params.id));
        response.json(result);
        return;
      }

      const tasks = await store.read('tasks');
      const index = tasks.findIndex((item) => item.id === Number(request.params.id));
      if (index === -1) {
        response.status(404).json({ message: 'Task not found' });
        return;
      }
      tasks[index].done = !tasks[index].done;
      await store.write('tasks', tasks);
      response.json(tasks[index]);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (request, response, next) => {
    try {
      const tasks = await store.read('tasks');
      const filtered = tasks.filter((item) => item.id !== Number(request.params.id));
      await store.write('tasks', filtered);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createTasksRouter,
};
