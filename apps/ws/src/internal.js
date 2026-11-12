const express = require('express');
const env = require('./config/env');
const db = require('./db');
const connectionManager = require('./connections/connectionManager');
const { INTERNAL_API } = require('shared');

const router = express.Router();

router.post(INTERNAL_API.DISPATCH_PATH, async (req, res) => {
  const secret = req.headers[INTERNAL_API.HEADER_SECRET];
  if (!secret || secret !== env.INTERNAL_SECRET) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED_INTERNAL',
        message: 'Akses internal ditolak. Secret tidak valid.',
      },
    });
  }

  const { device_id, type, payload } = req.body || {};
  if (!device_id || !type) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'device_id dan type wajib disertakan dalam dispatch request.',
      },
    });
  }

  // Handle broadcast to all connected devices
  if (device_id === 'all') {
    const deviceIds = connectionManager.getConnectedDeviceIds();
    console.log(`[WS Internal] Broadcasting ${type} to all active devices (${deviceIds.length})`);
    for (const devId of deviceIds) {
      connectionManager.sendToDevice(devId, type, payload);
      if (type === 'content:update') {
        try {
          const freshPlaylist = await db.getDevicePlaylist(devId);
          connectionManager.sendToDevice(devId, 'playlist:update', { items: freshPlaylist });
        } catch (err) {
          console.error('[WS Internal] Error refreshing playlist for device:', devId, err.message);
        }
      }
    }
    return res.status(200).json({ delivered: true, count: deviceIds.length });
  }

  const delivered = connectionManager.sendToDevice(device_id, type, payload);
  console.log(`[WS Internal] Dispatch ${type} to device ${device_id}: delivered=${delivered}`);

  return res.status(200).json({ delivered });
});

module.exports = router;

