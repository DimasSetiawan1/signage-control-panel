const deviceRepository = require('../repositories/deviceRepository');
const contentRepository = require('../repositories/contentRepository');
const wsDispatcher = require('./wsDispatcher');
const { WS_EVENTS } = require('shared');

const pushService = {
  async pushContentToDevice(deviceId, contentId) {
    const device = await deviceRepository.findById(deviceId);
    if (!device) {
      const err = new Error('Device tidak ditemukan');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const content = await contentRepository.findById(contentId);
    if (!content) {
      const err = new Error('Content tidak ditemukan');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const result = await wsDispatcher.dispatch({
      device_id: deviceId,
      type: WS_EVENTS.COMMAND_SHOW,
      payload: { content },
    });

    if (!result.delivered) {
      const err = new Error('Device sedang offline atau tidak terhubung ke WebSocket. Command ditolak.');
      err.statusCode = 409;
      err.code = 'DEVICE_OFFLINE';
      throw err;
    }

    return {
      message: 'Command berhasil dikirim ke device',
      device_id: deviceId,
      content,
    };
  },
};

module.exports = pushService;

