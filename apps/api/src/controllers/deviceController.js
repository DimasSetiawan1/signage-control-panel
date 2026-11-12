const deviceService = require('../services/deviceService');

const deviceController = {
  async getAll(req, res, next) {
    try {
      const { status, q } = req.query;
      const devices = await deviceService.getAllDevices({ status, q });
      res.status(200).json({ data: devices });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const device = await deviceService.getDeviceById(id);
      res.status(200).json({ data: device });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const { name, location } = req.body;
      const newDevice = await deviceService.createDevice({ name, location });
      res.status(201).json({ data: newDevice });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await deviceService.updateDevice(id, req.body);
      res.status(200).json({ data: updated });
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await deviceService.deleteDevice(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};

module.exports = deviceController;

