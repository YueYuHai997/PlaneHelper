const fs = require('node:fs/promises');
const path = require('node:path');

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function createFileStore({ dataDir, files }) {
  const definitions = Object.entries(files).reduce((result, [name, defaultValue]) => {
    result[name] = {
      defaultValue,
      filePath: path.join(dataDir, `${name}.json`),
    };
    return result;
  }, {});

  async function ensure() {
    await fs.mkdir(dataDir, { recursive: true });

    for (const { filePath, defaultValue } of Object.values(definitions)) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        if (!content.trim()) {
          await fs.writeFile(filePath, JSON.stringify(cloneValue(defaultValue), null, 2), 'utf8');
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        await fs.writeFile(filePath, JSON.stringify(cloneValue(defaultValue), null, 2), 'utf8');
      }
    }
  }

  async function read(name) {
    const definition = definitions[name];
    if (!definition) {
      throw new Error(`Unknown store: ${name}`);
    }

    await ensure();
    const content = await fs.readFile(definition.filePath, 'utf8');
    return JSON.parse(content);
  }

  async function write(name, value) {
    const definition = definitions[name];
    if (!definition) {
      throw new Error(`Unknown store: ${name}`);
    }

    await ensure();
    await fs.writeFile(definition.filePath, JSON.stringify(value, null, 2), 'utf8');
    return value;
  }

  return {
    ensure,
    read,
    write,
  };
}

module.exports = {
  createFileStore,
};
