const authService = require('../services/authService');

const authController = {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = authController;

