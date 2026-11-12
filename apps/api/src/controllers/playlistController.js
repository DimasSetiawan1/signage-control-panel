const playlistService = require('../services/playlistService');

const playlistController = {
  async getPlaylist(req, res, next) {
    try {
      const { id } = req.params;
      const playlist = await playlistService.getPlaylist(id);
      res.status(200).json({ data: playlist });
    } catch (err) {
      next(err);
    }
  },

  async updatePlaylist(req, res, next) {
    try {
      const { id } = req.params;
      const { items } = req.body;
      const updated = await playlistService.updatePlaylist(id, items || []);
      res.status(200).json({ data: updated });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = playlistController;

