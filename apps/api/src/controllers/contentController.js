const contentService = require('../services/contentService');

const contentController = {
  async getAll(req, res, next) {
    try {
      const { type, q } = req.query;
      const contents = await contentService.getAllContents({ type, q });
      res.status(200).json({ data: contents });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const content = await contentService.getContentById(id);
      res.status(200).json({ data: content });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const { title, type, payload } = req.body;
      const content = await contentService.createContent({
        title,
        type,
        payload,
        file: req.file,
      });
      res.status(201).json({ data: content });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { title, type, payload } = req.body;
      const updated = await contentService.updateContent(id, {
        title,
        type,
        payload,
        file: req.file,
      });
      res.status(200).json({ data: updated });
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await contentService.deleteContent(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};

module.exports = contentController;

