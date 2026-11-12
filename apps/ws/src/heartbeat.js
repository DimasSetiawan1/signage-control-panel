const { handleDeviceHeartbeat } = require('./handlers/deviceHandler');

const PING_INTERVAL_MS = 5000; // 5 seconds
const HEARTBEAT_TIMEOUT_MS = 12000; // 12 seconds

function setupHeartbeat(wss) {
  const interval = setInterval(() => {
    const now = Date.now();

    wss.clients.forEach((ws) => {
      // Check if client has been silent longer than 30s
      if (ws.isAlive === false) {
        if (now - (ws.lastPingSent || 0) >= HEARTBEAT_TIMEOUT_MS) {
          console.warn(`[WS Heartbeat] Terminating inactive connection (${ws.clientType || 'unknown'} - ${ws.deviceId || 'no-id'})`);
          return ws.terminate();
        }
      }

      ws.isAlive = false;
      ws.lastPingSent = now;
      try {
        ws.ping();
      } catch (err) {
        ws.terminate();
      }
    });
  }, PING_INTERVAL_MS);

  wss.on('close', () => {
    clearInterval(interval);
  });
}

function handlePong(ws) {
  ws.isAlive = true;
  if (ws.isDevice) {
    handleDeviceHeartbeat(ws);
  }
}

module.exports = {
  setupHeartbeat,
  handlePong,
};

