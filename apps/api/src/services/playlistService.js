const playlistRepository = require('../repositories/playlistRepository');
const deviceRepository = require('../repositories/deviceRepository');
const wsDispatcher = require('./wsDispatcher');
const { WS_EVENTS } = require('shared');

const playlistService = {
  async getPlaylist(deviceId) {
    const device = await deviceRepository.findById(deviceId);
    if (!device) {
      const err = new Error('Device tidak ditemukan');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    return playlistRepository.getByDeviceId(deviceId);
  },

  async updatePlaylist(deviceId, items) {
    const device = await deviceRepository.findById(deviceId);
    if (!device) {
      const err = new Error('Device tidak ditemukan');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const updated = await playlistRepository.replacePlaylist(deviceId, items);

    // Notify WS process to forward update to the connected device
    await wsDispatcher.dispatch({
      device_id: deviceId,
      type: WS_EVENTS.PLAYLIST_UPDATE,
      payload: { items: updated },
    });

    return updated;
  },
};

module.exports = playlistService;

