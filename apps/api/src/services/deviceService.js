const deviceRepository = require('../repositories/deviceRepository');

const deviceService = {
  async getAllDevices(filters) {
    return deviceRepository.findAll(filters);
  },

  async getDeviceById(id) {
    const device = await deviceRepository.findById(id);
    if (!device) {
      const err = new Error('Device tidak ditemukan');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    return device;
  },

  async createDevice(data) {
    return deviceRepository.create(data);
  },

  async updateDevice(id, data) {
    await this.getDeviceById(id);
    return deviceRepository.update(id, data);
  },

  async deleteDevice(id) {
    await this.getDeviceById(id);
    return deviceRepository.delete(id);
  },

  async getSummary() {
    return deviceRepository.getSummary();
  },
};

module.exports = deviceService;

