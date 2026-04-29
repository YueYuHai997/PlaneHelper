const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createFileStore } = require('../src/lib/fileStore');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'planehelper-storage-'));
}

describe('createFileStore', () => {
  let rootDir;

  beforeEach(async () => {
    rootDir = await makeTempDir();
  });

  it('creates missing data files with default values', async () => {
    const store = createFileStore({
      dataDir: path.join(rootDir, 'data'),
      files: {
        plants: [],
        tasks: [],
        logs: [],
      },
    });

    await store.ensure();

    const plants = JSON.parse(
      await fs.readFile(path.join(rootDir, 'data', 'plants.json'), 'utf8'),
    );
    const tasks = JSON.parse(
      await fs.readFile(path.join(rootDir, 'data', 'tasks.json'), 'utf8'),
    );
    const logs = JSON.parse(
      await fs.readFile(path.join(rootDir, 'data', 'logs.json'), 'utf8'),
    );

    expect(plants).toEqual([]);
    expect(tasks).toEqual([]);
    expect(logs).toEqual([]);
  });

  it('writes and reloads persisted records', async () => {
    const store = createFileStore({
      dataDir: path.join(rootDir, 'data'),
      files: {
        plants: [],
      },
    });

    await store.ensure();
    await store.write('plants', [{ id: 1, name: '番茄' }]);

    const plants = await store.read('plants');

    expect(plants).toEqual([{ id: 1, name: '番茄' }]);
  });
});
