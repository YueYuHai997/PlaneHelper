const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createFileStore } = require('../src/lib/fileStore');
const { createPlantCareService } = require('../src/services/plantCareService');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'planehelper-care-'));
}

async function createStoreWithFixture(rootDir) {
  const store = createFileStore({
    dataDir: path.join(rootDir, 'data'),
    files: {
      plants: [],
      tasks: [],
      logs: [],
    },
  });

  await store.ensure();
  await store.write('plants', [
    {
      id: 1,
      name: '圣女果',
      species: 'Solanum lycopersicum',
      photo: '',
      date: '2026-04-20',
      status: 'healthy',
      note: '阳台种植',
      tags: ['蔬果'],
      schedules: { water: 5, fertilize: 14, prune: 30, repot: 365 },
      carePlan: {
        lastWateredAt: '2026-04-20',
        lastFertilizedAt: '',
        lastPrunedAt: '',
        lastRepottedAt: '',
      },
      aiProfile: {
        advice: ['保持日照'],
        faq: [{ q: '多久浇水？', a: '看盆土状态。' }],
        plan: {
          summary: '保持稳定通风。',
          water: '5 天一次',
          fertilize: '14 天一次',
          prune: '按长势修剪',
          repot: '根系顶盆时换盆',
        },
        generatedAt: '2026-04-28T00:00:00.000Z',
      },
    },
  ]);
  await store.write('tasks', [
    {
      id: 101,
      type: 'water',
      plant: 1,
      date: '2026-04-25',
      done: false,
      note: '',
      source: 'auto',
    },
  ]);
  await store.write('logs', []);

  return store;
}

describe('createPlantCareService', () => {
  it('creates replacement next water task after completing water', async () => {
    const rootDir = await makeTempDir();
    const store = await createStoreWithFixture(rootDir);
    const service = createPlantCareService({
      store,
      now: () => new Date('2026-04-28T10:00:00.000Z'),
      idFactory: (() => {
        let current = 500;
        return () => current++;
      })(),
    });

    const result = await service.completeTask(101);

    expect(result.completedTask.done).toBe(true);
    expect(result.completedTask.completedAt).toBe('2026-04-28');
    expect(result.nextTask).toMatchObject({
      id: 500,
      type: 'water',
      plant: 1,
      date: '2026-05-03',
      done: false,
      source: 'auto',
    });

    const plants = await store.read('plants');
    expect(plants[0].carePlan.lastWateredAt).toBe('2026-04-28');

    const logs = await store.read('logs');
    expect(logs[0]).toMatchObject({
      plant: 1,
      date: '2026-04-28',
      source: 'system',
    });
    expect(logs[0].text).toContain('已完成浇水');

    const tasks = await store.read('tasks');
    expect(tasks.filter((task) => task.type === 'water' && !task.done)).toHaveLength(1);
    expect(tasks.find((task) => task.id === 500)?.date).toBe('2026-05-03');
  });

  it('replaces pending task when manually creating the same type', async () => {
    const rootDir = await makeTempDir();
    const store = await createStoreWithFixture(rootDir);
    const service = createPlantCareService({
      store,
      now: () => new Date('2026-04-28T10:00:00.000Z'),
      idFactory: (() => {
        let current = 700;
        return () => current++;
      })(),
    });

    const task = await service.createOrReplaceTask({
      type: 'water',
      plant: 1,
      date: '2026-04-29',
      note: '提前浇水',
      done: false,
      source: 'manual',
    });

    expect(task).toMatchObject({
      id: 700,
      type: 'water',
      plant: 1,
      date: '2026-04-29',
      source: 'manual',
    });

    const tasks = await store.read('tasks');
    expect(tasks.filter((item) => item.type === 'water' && !item.done)).toHaveLength(1);
    expect(tasks.find((item) => item.id === 700)).toBeTruthy();
  });

  it('recalculates the next pending task when schedules change', async () => {
    const rootDir = await makeTempDir();
    const store = await createStoreWithFixture(rootDir);
    const service = createPlantCareService({
      store,
      now: () => new Date('2026-04-28T10:00:00.000Z'),
      idFactory: (() => {
        let current = 900;
        return () => current++;
      })(),
    });

    const plant = await service.syncPlantSchedule(1, 'water', 7);

    expect(plant.schedules.water).toBe(7);

    const tasks = await store.read('tasks');
    expect(tasks.filter((item) => item.type === 'water' && !item.done)).toHaveLength(1);
    expect(tasks.find((item) => item.id === 900)?.date).toBe('2026-04-27');
  });
});
