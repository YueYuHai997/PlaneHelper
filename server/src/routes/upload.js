const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');

function createUploadRouter({ uploadMiddleware, imageCompressionService, uploadDir }) {
  const router = express.Router();

  router.post('/', uploadMiddleware.single('image'), async (request, response, next) => {
    if (!request.file) {
      response.status(400).json({ message: 'Image file is required' });
      return;
    }

    try {
      const compressed = await imageCompressionService.compressImage({
        originalName: request.file.originalname,
        buffer: request.file.buffer,
      });
      const filePath = path.join(uploadDir, compressed.filename);

      await fs.writeFile(filePath, compressed.buffer);

      response.status(201).json({
        path: `/uploads/${compressed.filename}`,
        originalName: request.file.originalname,
      });
    } catch (error) {
      if (error.message === 'Invalid image file') {
        response.status(400).json({ message: error.message });
        return;
      }

      next(error);
    }
  });

  return router;
}

module.exports = {
  createUploadRouter,
};
