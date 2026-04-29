const path = require('node:path');

const rootDir = path.resolve(__dirname, '..', '..');

function resolveDefaultPaths() {
  return {
    rootDir,
    dataDir: path.join(rootDir, 'storage', 'data'),
    uploadDir: path.join(rootDir, 'storage', 'uploads'),
  };
}

function resolveAiConfig(env = process.env) {
  return {
    baseUrl: (env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, ''),
    apiKey: env.ARK_API_KEY || '',
    model: env.ARK_MODEL || 'doubao-1-5-vision-lite-250315',
    visionModel: env.ARK_VISION_MODEL || env.ARK_MODEL || 'doubao-1-5-vision-lite-250315',
  };
}

module.exports = {
  resolveDefaultPaths,
  resolveAiConfig,
};
