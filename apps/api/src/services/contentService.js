const contentRepository = require('../repositories/contentRepository');
const storageService = require('./storageService');
const wsDispatcher = require('./wsDispatcher');
const { CONTENT_TYPES } = require('shared');

const contentService = {
  async getAllContents(filters) {
    return contentRepository.findAll(filters);
  },

  async getContentById(id) {
    const content = await contentRepository.findById(id);
    if (!content) {
      const err = new Error('Content tidak ditemukan');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    return content;
  },

  async createContent({ title, type, payload, file }) {
    let finalPayload = payload;
    let finalType = type;

    if (file) {
      finalPayload = await storageService.uploadFile(file);
      if (file.mimetype.startsWith('video/')) {
        finalType = CONTENT_TYPES.VIDEO;
      } else {
        finalType = CONTENT_TYPES.IMAGE;
      }
    }

    if (!title) {
      const err = new Error('Judul wajib diisi');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (!finalPayload) {
      const err = new Error('Payload atau file wajib disertakan');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    return contentRepository.create({
      title,
      type: finalType,
      payload: finalPayload,
    });
  },

  async updateContent(id, { title, type, payload, file }) {
    const existing = await this.getContentById(id);
    let finalPayload = payload;
    let finalType = type;

    if (file) {
      // Delete old file if present
      await storageService.deleteFileByUrl(existing.payload);
      finalPayload = await storageService.uploadFile(file);
      if (file.mimetype.startsWith('video/')) {
        finalType = CONTENT_TYPES.VIDEO;
      } else {
        finalType = CONTENT_TYPES.IMAGE;
      }
    }

    const updated = await contentRepository.update(id, {
      title,
      type: finalType,
      payload: finalPayload,
    });

    // Notify connected devices in real time
    await wsDispatcher.dispatch({
      device_id: 'all',
      type: 'content:update',
      payload: {
        content: updated,
      },
    });

    return updated;
  },

  async deleteContent(id) {
    const existing = await this.getContentById(id);
    await storageService.deleteFileByUrl(existing.payload);
    return contentRepository.delete(id);
  },

  async getTotalCount() {
    return contentRepository.count();
  },
};

module.exports = contentService;

