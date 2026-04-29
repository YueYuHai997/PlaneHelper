const TASK_CONFIG = {
  water: {
    scheduleKey: 'water',
    careField: 'lastWateredAt',
    label: '浇水',
  },
  fertilize: {
    scheduleKey: 'fertilize',
    careField: 'lastFertilizedAt',
    label: '施肥',
  },
  prune: {
    scheduleKey: 'prune',
    careField: 'lastPrunedAt',
    label: '修剪',
  },
  repot: {
    scheduleKey: 'repot',
    careField: 'lastRepottedAt',
    label: '换盆',
  },
};

function formatDate(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function addDays(dateValue, days) {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + Number(days));
  return formatDate(date);
}

function normalizePositiveInteger(value, fallbackValue) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackValue;
  }
  return Math.round(parsed);
}

function createPlantCareService({ store, now = () => new Date(), idFactory = () => Date.now() }) {
  function getTaskConfig(type) {
    const config = TASK_CONFIG[type];
    if (!config) {
      throw new Error(`Unsupported task type: ${type}`);
    }
    return config;
  }

  function getToday() {
    return formatDate(now());
  }

  function createTaskRecord(payload) {
    return {
      id: idFactory(),
      type: payload.type,
      plant: Number(payload.plant),
      date: payload.date,
      done: Boolean(payload.done),
      note: payload.note || '',
      source: payload.source || 'auto',
      completedAt: payload.done ? payload.completedAt || getToday() : '',
    };
  }

  function buildNextTask(plant, type, baseDate, source = 'auto') {
    const config = getTaskConfig(type);
    const cycle = normalizePositiveInteger(plant.schedules?.[config.scheduleKey], 1);
    return createTaskRecord({
      type,
      plant: plant.id,
      date: addDays(baseDate, cycle),
      note: '',
      done: false,
      source,
    });
  }

  function buildInitialTasksForPlant(plant) {
    return Object.keys(TASK_CONFIG).map((type) => {
      const config = getTaskConfig(type);
      const baseDate = plant.carePlan?.[config.careField] || plant.date || getToday();
      return buildNextTask(plant, type, baseDate, 'auto');
    });
  }

  async function createOrReplaceTask(payload) {
    const tasks = await store.read('tasks');
    const filtered = tasks.filter((task) => !(
      task.plant === Number(payload.plant)
      && task.type === payload.type
      && !task.done
    ));

    const task = createTaskRecord(payload);
    filtered.push(task);
    await store.write('tasks', filtered);
    return task;
  }

  async function completeTask(taskId) {
    const plants = await store.read('plants');
    const tasks = await store.read('tasks');
    const logs = await store.read('logs');
    const index = tasks.findIndex((task) => task.id === Number(taskId));

    if (index === -1) {
      throw new Error('Task not found');
    }

    const existingTask = tasks[index];
    if (existingTask.done) {
      return {
        completedTask: existingTask,
        nextTask: tasks.find((task) => task.plant === existingTask.plant && task.type === existingTask.type && !task.done) || null,
      };
    }

    const plantIndex = plants.findIndex((plant) => plant.id === existingTask.plant);
    if (plantIndex === -1) {
      throw new Error('Plant not found');
    }

    const plant = plants[plantIndex];
    const config = getTaskConfig(existingTask.type);
    const completedAt = getToday();

    const completedTask = {
      ...existingTask,
      done: true,
      completedAt,
    };

    const nextPlant = {
      ...plant,
      carePlan: {
        lastWateredAt: plant.carePlan?.lastWateredAt || '',
        lastFertilizedAt: plant.carePlan?.lastFertilizedAt || '',
        lastPrunedAt: plant.carePlan?.lastPrunedAt || '',
        lastRepottedAt: plant.carePlan?.lastRepottedAt || '',
        [config.careField]: completedAt,
      },
    };

    const nextTask = buildNextTask(nextPlant, existingTask.type, completedAt, 'auto');
    const systemLog = {
      id: idFactory(),
      plant: nextPlant.id,
      date: completedAt,
      text: `已完成${config.label}，系统已同步下一次${config.label}任务。`,
      imgs: [],
      source: 'system',
    };

    const nextTasks = tasks
      .map((task, currentIndex) => (currentIndex === index ? completedTask : task))
      .filter((task) => !(
        task.plant === nextPlant.id
        && task.type === existingTask.type
        && !task.done
      ));

    nextTasks.push(nextTask);
    plants[plantIndex] = nextPlant;
    logs.unshift(systemLog);

    await store.write('plants', plants);
    await store.write('tasks', nextTasks);
    await store.write('logs', logs);

    return {
      completedTask,
      nextTask,
      systemLog,
      plant: nextPlant,
    };
  }

  async function syncPlantSchedule(plantId, type, cycle) {
    const plants = await store.read('plants');
    const plantIndex = plants.findIndex((plant) => plant.id === Number(plantId));

    if (plantIndex === -1) {
      throw new Error('Plant not found');
    }

    const config = getTaskConfig(type);
    const nextPlant = {
      ...plants[plantIndex],
      schedules: {
        ...plants[plantIndex].schedules,
        [config.scheduleKey]: normalizePositiveInteger(cycle, plants[plantIndex].schedules?.[config.scheduleKey] ?? 1),
      },
    };

    plants[plantIndex] = nextPlant;
    await store.write('plants', plants);

    const baseDate = nextPlant.carePlan?.[config.careField] || nextPlant.date || getToday();
    await createOrReplaceTask({
      type,
      plant: nextPlant.id,
      date: addDays(baseDate, nextPlant.schedules[config.scheduleKey]),
      note: '',
      done: false,
      source: 'auto',
    });

    return nextPlant;
  }

  return {
    buildInitialTasksForPlant,
    createOrReplaceTask,
    completeTask,
    syncPlantSchedule,
  };
}

module.exports = {
  TASK_CONFIG,
  createPlantCareService,
};
