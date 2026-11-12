const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const env = require('./config/env');
const db = require('./db');
const internalRouter = require('./internal');
const connectionManager = require('./connections/connectionManager');
const { handleDashboardAuth } = require('./handlers/authHandler');
const { handleDeviceHello, handleDeviceDisconnect } = require('./handlers/deviceHandler');
const { setupHeartbeat, handlePong } = require('./heartbeat');
const { WS_EVENTS, WS_CLOSE_CODES } = require('shared');

async function bootstrap() {
  console.log('[WS Process] Booting WebSocket service...');

  // 1. Reset all devices to offline upon boot (PRD requirement)
  try {
    await db.resetAllDevicesToOffline();
    console.log('[WS Process] All devices successfully reset to offline.');
  } catch (err) {
    console.warn('[WS Process] Warning: Could not reset devices to offline at boot:', err.message);
  }

  // 2. Setup Express for Internal HTTP Dispatch & Health
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'ws',
      active_dashboards: connectionManager.dashboardSockets.size,
      active_devices: connectionManager.deviceSockets.size,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/debug/devices', (req, res) => {
    const list = [];
    for (const [id, socket] of connectionManager.deviceSockets.entries()) {
      list.push({
        id,
        readyState: socket.readyState, // 0: CONNECTING, 1: OPEN, 2: CLOSING, 3: CLOSED
        isAlive: socket.isAlive,
        isDevice: socket.isDevice,
      });
    }
    res.status(200).json(list);
  });

  app.use('/', internalRouter);

  // 3. Create HTTP Server
  const server = http.createServer(app);

  // 4. Create WebSocket Server
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.isAuthenticated = false;
    ws.isDevice = false;

    ws.on('pong', () => handlePong(ws));

    // 5-second handshake timeout
    const handshakeTimeout = setTimeout(() => {
      if (!ws.isAuthenticated && !ws.isDevice) {
        console.warn('[WS Connection] Handshake timed out after 5s. Closing socket.');
        ws.close(WS_CLOSE_CODES.AUTH_FAILED, 'Handshake authentication timed out');
      }
    }, 5000);

    ws.on('message', async (raw) => {
      try {
        const message = JSON.parse(raw.toString());
        const { type, payload } = message;

        // Dashboard Authentication Handshake
        if (type === WS_EVENTS.AUTH) {
          clearTimeout(handshakeTimeout);
          await handleDashboardAuth(ws, payload);
          return;
        }

        // Device Pairing / Hello Handshake
        if (type === WS_EVENTS.HELLO) {
          clearTimeout(handshakeTimeout);
          await handleDeviceHello(ws, payload);
          return;
        }

        // Optional Acknowledgement from Device
        if (type === WS_EVENTS.ACK) {
          console.log(`[WS] Received ACK from device ${ws.deviceId}:`, payload);
          return;
        }
      } catch (err) {
        console.error('[WS Message Error] Failed parsing client message:', err.message);
      }
    });

    ws.on('close', (code, reason) => {
      clearTimeout(handshakeTimeout);
      if (ws.clientType === 'dashboard') {
        connectionManager.removeDashboard(ws);
      } else if (ws.isDevice) {
        handleDeviceDisconnect(ws);
      }
    });

    ws.on('error', (err) => {
      console.error('[WS Socket Error]:', err.message);
    });
  });

  // Setup 10s ping / 30s timeout heartbeat
  setupHeartbeat(wss);

  server.listen(env.WS_PORT, () => {
    console.log(`[WS Server] Real-time service & Internal Dispatch running on port ${env.WS_PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[WS Process] Fatal bootstrap error:', err);
  process.exit(1);
});

