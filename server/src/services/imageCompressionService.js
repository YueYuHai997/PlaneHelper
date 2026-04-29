const sharp = require('sharp');

function buildFilename() {
  return `${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;
}

function createImageCompressionService(options = {}) {
  const maxDimension = options.maxDimension || 1600;
  const quality = options.quality || 78;

  async function compressImage({ buffer }) {
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
        filename: buildFilename(),
        mimeType: 'image/jpeg',
        buffer: outputBuffer,
      };
    } catch {
      throw new Error('Invalid image file');
    }
  }

  return {
    compressImage,
  };
}

module.exports = {
  createImageCompressionService,
};
