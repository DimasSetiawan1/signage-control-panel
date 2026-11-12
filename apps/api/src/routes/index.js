const express = require('express');
const authRoutes = require('./authRoutes');
const deviceRoutes = require('./deviceRoutes');
const contentRoutes = require('./contentRoutes');
const summaryRoutes = require('./summaryRoutes');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Public routes
router.use('/auth', authRoutes);

// Protected routes (JWT required)
router.use('/devices', authMiddleware, deviceRoutes);
router.use('/contents', authMiddleware, contentRoutes);
router.use('/summary', authMiddleware, summaryRoutes);

module.exports = router;

