const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../db');
const connectionManager = require('../connections/connectionManager');
const { WS_EVENTS, WS_CLOSE_CODES } = require('shared');

async function handleDashboardAuth(ws, payload) {
  const { token } = payload || {};
  if (!token) {
    ws.close(WS_CLOSE_CODES.AUTH_FAILED, 'Token autentikasi wajib disertakan');
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    ws.isAuthenticated = true;
    ws.clientType = 'dashboard';
    ws.user = decoded;

    // Register with manager
    connectionManager.addDashboard(ws);

    // Send snapshot
    const devices = await db.getAllDevicesForSnapshot();
    ws.send(
      JSON.stringify({
        type: WS_EVENTS.SNAPSHOT,
        payload: { devices },
      })
    );
  } catch (err) {
    console.warn('[WS Auth] Dashboard JWT verification failed:', err.message);
    ws.close(WS_CLOSE_CODES.AUTH_FAILED, 'Token JWT tidak valid atau telah kedaluwarsa');
  }
}

module.exports = {
  handleDashboardAuth,
};

