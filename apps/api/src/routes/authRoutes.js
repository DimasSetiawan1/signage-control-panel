const express = require('express');
const authController = require('../controllers/authController');
const { validateBody } = require('../middlewares/validateMiddleware');
const { loginSchema } = require('shared');

const router = express.Router();

router.post('/login', validateBody(loginSchema), authController.login);

module.exports = router;

