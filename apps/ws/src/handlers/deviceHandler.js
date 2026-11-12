const db = require('../db');
const connectionManager = require('../connections/connectionManager');
const { WS_EVENTS, WS_CLOSE_CODES } = require('shared');

const THROTTLE_MS = 30000; // max once every 30s to DB

async function handleDeviceHello(ws, payload) {
  const { device_token } = payload || {};
  if (!device_token) {
    ws.close(WS_CLOSE_CODES.DEVICE_AUTH_FAILED, 'device_token wajib disertakan');
    return;
  }

  try {
    const device = await db.getDeviceByToken(device_token);
    if (!device) {
      console.warn(`[WS Device] Device token not found: ${device_token}`);
      ws.close(WS_CLOSE_CODES.DEVICE_AUTH_FAILED, 'device_token tidak dikenali');
      return;
    }

    ws.isDevice = true;
    ws.clientType = 'device';
    ws.deviceId = device.id;
    ws.device = device;

    // Register active device connection
    connectionManager.addDevice(device.id, device, ws);

    const now = new Date().toISOString();
    connectionManager.lastSeenThrottles.set(device.id, Date.now());

    // 1. BROADCAST LIVE STATUS IMMEDIATELY TO ALL DASHBOARDS (Zero latency)
    connectionManager.broadcastToDashboards(WS_EVENTS.DEVICE_STATUS, {
      id: device.id,
      status: 'online',
      last_seen: now,
    });

    // 2. Persist status to DB
    db.updateDeviceStatus(device.id, 'online', now).catch((err) => {
      console.warn('[WS Device] Non-fatal DB update error on hello:', err.message);
    });

    // Get current playlist for this device
    const playlist = await db.getDevicePlaylist(device.id);

    // Send welcome payload to device
    ws.send(
      JSON.stringify({
        type: WS_EVENTS.WELCOME,
        payload: {
          device: {
            id: device.id,
            name: device.name,
            location: device.location,
          },
          playlist,
        },
      })
    );
  } catch (err) {
    console.error('[WS Device] Error during hello handshake:', err);
    ws.close(1011, 'Internal server error');
  }
}

async function handleDeviceHeartbeat(ws) {
  if (!ws.isDevice || !ws.deviceId) return;

  const now = Date.now();
  const lastRecorded = connectionManager.lastSeenThrottles.get(ws.deviceId) || 0;

  if (now - lastRecorded >= THROTTLE_MS) {
    connectionManager.lastSeenThrottles.set(ws.deviceId, now);
    const isoString = new Date(now).toISOString();

    connectionManager.broadcastToDashboards(WS_EVENTS.DEVICE_STATUS, {
      id: ws.deviceId,
      status: 'online',
      last_seen: isoString,
    });

    db.updateDeviceStatus(ws.deviceId, 'online', isoString).catch((err) => {
      console.warn('[WS Device] Non-fatal DB update error on heartbeat:', err.message);
    });
  }
}

async function handleDeviceDisconnect(ws) {
  if (!ws.isDevice || !ws.deviceId) return;

  const deviceId = ws.deviceId;

  // Guard: if socket was already superseded by a new connection, do not mark offline!
  const currentSocket = connectionManager.getDeviceSocket(deviceId);
  if (currentSocket && currentSocket !== ws) {
    console.log(`[WS Device] Ignoring disconnect for superseded socket of device: ${deviceId}`);
    return;
  }

  connectionManager.removeDevice(deviceId);

  const now = new Date().toISOString();

  // 1. BROADCAST OFFLINE STATUS IMMEDIATELY TO ALL DASHBOARDS (Zero latency)
  connectionManager.broadcastToDashboards(WS_EVENTS.DEVICE_STATUS, {
    id: deviceId,
    status: 'offline',
    last_seen: now,
  });

  // 2. Persist offline status to DB
  try {
    await db.updateDeviceStatus(deviceId, 'offline', now);
  } catch (err) {
    console.warn('[WS Device] Non-fatal DB update error on disconnect:', err.message);
  }
}

module.exports = {
  handleDeviceHello,
  handleDeviceHeartbeat,
  handleDeviceDisconnect,
};

