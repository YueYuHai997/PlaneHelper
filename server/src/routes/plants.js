const express = require('express')

function normalizeScheduleValue(value, fallbackValue) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackValue
  }
  return Math.round(parsed)
}

function collectArchiveImagePaths(plant, logs) {
  const imagePaths = new Set()

  if (plant?.photo) {
    imagePaths.add(plant.photo)
  }

  for (const log of logs) {
    for (const imagePath of log.imgs || []) {
      if (imagePath) {
        imagePaths.add(imagePath)
      }
    }
  }

  return [...imagePaths]
}

function createPlantsRouter({ store, aiService, plantCareService }) {
  const router = express.Router()

  router.get('/', async (_request, response, next) => {
    try {
      const plants = await store.read('plants')
      response.json(plants)
    } catch (error) {
      next(error)
    }
  })

  router.get('/:id', async (request, response, next) => {
    try {
      const plants = await store.read('plants')
      const plant = plants.find((item) => item.id === Number(request.params.id))
      if (!plant) {
        response.status(404).json({ message: 'Plant not found' })
        return
      }
      response.json(plant)
    } catch (error) {
      next(error)
    }
  })

  router.post('/', async (request, response, next) => {
    try {
      const payload = request.body || {}
      if (!payload.name || !String(payload.name).trim()) {
        response.status(400).json({ message: 'Plant name is required' })
        return
      }

      if (!aiService?.generatePlantProfile) {
        response.status(503).json({ message: 'AI profile generation is not available' })
        return
      }

      const plantDraft = {
        name: String(payload.name).trim(),
        species: payload.species || '',
        photo: payload.photo || '',
        date: payload.date || '',
        status: payload.status || 'healthy',
        note: payload.note || '',
        tags: Array.isArray(payload.tags) ? payload.tags : [],
        schedules: {
          water: normalizeScheduleValue(payload.schedules?.water, 3),
          fertilize: normalizeScheduleValue(payload.schedules?.fertilize, 14),
          prune: normalizeScheduleValue(payload.schedules?.prune, 30),
          repot: normalizeScheduleValue(payload.schedules?.repot, 365),
        },
      }

      let aiProfile
      try {
        aiProfile = await aiService.generatePlantProfile(plantDraft)
      } catch (_error) {
        response.status(502).json({ message: 'AI 建档失败，植物未保存' })
        return
      }

      const plant = {
        id: Date.now(),
        ...plantDraft,
        carePlan: {
          lastWateredAt: plantDraft.date || '',
          lastFertilizedAt: '',
          lastPrunedAt: '',
          lastRepottedAt: '',
        },
        aiProfile,
      }

      const plants = await store.read('plants')
      const tasks = await store.read('tasks')
      const initialTasks = plantCareService.buildInitialTasksForPlant(plant)

      plants.push(plant)
      await store.write('plants', plants)
      await store.write('tasks', [...tasks, ...initialTasks])
      response.status(201).json(plant)
    } catch (error) {
      next(error)
    }
  })

  router.put('/:id', async (request, response, next) => {
    try {
      const plants = await store.read('plants')
      const index = plants.findIndex((item) => item.id === Number(request.params.id))
      if (index === -1) {
        response.status(404).json({ message: 'Plant not found' })
        return
      }

      const previousPlant = plants[index]
      const nextPlant = {
        ...previousPlant,
        ...request.body,
        id: previousPlant.id,
        schedules: {
          water: normalizeScheduleValue(request.body.schedules?.water, previousPlant.schedules?.water ?? 3),
          fertilize: normalizeScheduleValue(request.body.schedules?.fertilize, previousPlant.schedules?.fertilize ?? 14),
          prune: normalizeScheduleValue(request.body.schedules?.prune, previousPlant.schedules?.prune ?? 30),
          repot: normalizeScheduleValue(request.body.schedules?.repot, previousPlant.schedules?.repot ?? 365),
        },
      }

      plants[index] = nextPlant
      await store.write('plants', plants)

      for (const key of ['water', 'fertilize', 'prune', 'repot']) {
        if (nextPlant.schedules[key] !== previousPlant.schedules?.[key]) {
          await plantCareService.syncPlantSchedule(nextPlant.id, key, nextPlant.schedules[key])
        }
      }

      const refreshedPlants = await store.read('plants')
      response.json(refreshedPlants.find((item) => item.id === nextPlant.id))
    } catch (error) {
      next(error)
    }
  })

  router.post('/:id/ai-profile/regenerate', async (request, response, next) => {
    try {
      if (!aiService?.generatePlantProfile) {
        response.status(503).json({ message: 'AI profile generation is not available' })
        return
      }

      const plants = await store.read('plants')
      const index = plants.findIndex((item) => item.id === Number(request.params.id))
      if (index === -1) {
        response.status(404).json({ message: 'Plant not found' })
        return
      }

      let aiProfile
      try {
        aiProfile = await aiService.generatePlantProfile(plants[index])
      } catch (_error) {
        response.status(502).json({ message: 'AI 内容重新生成失败' })
        return
      }

      plants[index] = {
        ...plants[index],
        aiProfile,
      }

      await store.write('plants', plants)
      response.json(plants[index])
    } catch (error) {
      next(error)
    }
  })

  router.delete('/:id', async (request, response, next) => {
    try {
      const plantId = Number(request.params.id)
      const plants = await store.read('plants')
      const tasks = await store.read('tasks')
      const logs = await store.read('logs')
      const archives = await store.read('plant-archives')
      const plant = plants.find((item) => item.id === plantId)

      if (!plant) {
        response.status(404).json({ message: 'Plant not found' })
        return
      }

      const relatedTasks = tasks.filter((item) => item.plant === plantId)
      const relatedLogs = logs.filter((item) => item.plant === plantId)
      const archiveEntry = {
        id: Date.now(),
        plantId,
        deletedAt: new Date().toISOString(),
        plant,
        tasks: relatedTasks,
        logs: relatedLogs,
        imagePaths: collectArchiveImagePaths(plant, relatedLogs),
      }

      await store.write('plant-archives', [...archives, archiveEntry])
      await store.write('plants', plants.filter((item) => item.id !== plantId))
      await store.write('tasks', tasks.filter((item) => item.plant !== plantId))
      await store.write('logs', logs.filter((item) => item.plant !== plantId))
      response.status(204).end()
    } catch (error) {
      next(error)
    }
  })

  return router
}

module.exports = {
  createPlantsRouter,
}
