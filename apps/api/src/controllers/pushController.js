const pushService = require('../services/pushService');

const pushController = {
  async push(req, res, next) {
    try {
      const { id } = req.params;
      const { content_id } = req.body;
      const result = await pushService.pushContentToDevice(id, content_id);
      res.status(202).json({ data: result });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = pushController;

