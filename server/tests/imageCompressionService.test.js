const sharp = require('sharp');

const { createImageCompressionService } = require('../src/services/imageCompressionService');

async function createPngBuffer(width, height) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 12, g: 180, b: 90 },
    },
  })
    .png()
    .toBuffer();
}

describe('createImageCompressionService', () => {
  it('compresses an uploaded image into a jpg file with bounded dimensions', async () => {
    const service = createImageCompressionService();
    const source = await createPngBuffer(2400, 1800);

    const result = await service.compressImage({
      originalName: 'leaf.png',
      buffer: source,
    });

    expect(result.filename).toMatch(/\.jpg$/);
    expect(result.mimeType).toBe('image/jpeg');

    const metadata = await sharp(result.buffer).metadata();
    expect(Math.max(metadata.width, metadata.height)).toBeLessThanOrEqual(1600);
  });

  it('throws a clear error when the uploaded content is not a valid image', async () => {
    const service = createImageCompressionService();

    await expect(
      service.compressImage({
        originalName: 'bad.txt',
        buffer: Buffer.from('not-an-image'),
      }),
    ).rejects.toThrow('Invalid image file');
  });
});
