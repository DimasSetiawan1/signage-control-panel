const deviceService = require('../services/deviceService');
const contentService = require('../services/contentService');

const summaryController = {
  async getSummary(req, res, next) {
    try {
      const deviceSummary = await deviceService.getSummary();
      const totalContents = await contentService.getTotalCount();

      res.status(200).json({
        data: {
          total_devices: deviceSummary.total,
          online_devices: deviceSummary.online,
          offline_devices: deviceSummary.offline,
          total_contents: totalContents,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = summaryController;

