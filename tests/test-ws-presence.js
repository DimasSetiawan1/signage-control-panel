const { fork } = require('child_process');
const WebSocket = require('../apps/ws/node_modules/ws');
const jwt = require('jsonwebtoken');

const wsProc = fork('./apps/ws/src/server.js', { silent: false });

setTimeout(async () => {
  try {
    console.log('Testing WebSocket presence...');
    const token = jwt.sign({ sub: 'admin-1', role: 'admin' }, 'super-secret-jwt-key-signage-panel-change-in-production');

    // 1. Dashboard Client
    const dashWs = new WebSocket('ws://localhost:4001');
    dashWs.on('open', () => {
      console.log('Dashboard connected, sending auth...');
      dashWs.send(JSON.stringify({ type: 'auth', payload: { token } }));
    });

    let deviceOnlineReceived = false;
    let deviceOfflineReceived = false;

    dashWs.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      console.log('[Dashboard Received]:', msg.type, msg.payload);
      if (msg.type === 'device:status') {
        if (msg.payload.status === 'online') deviceOnlineReceived = true;
        if (msg.payload.status === 'offline') deviceOfflineReceived = true;
      }
    });

    await new Promise((r) => setTimeout(r, 600));

    // 2. Device Client connects
    console.log('Connecting Device Client with token_lobby_utama_demo_12345...');
    const deviceWs = new WebSocket('ws://localhost:4001');
    deviceWs.on('open', () => {
      deviceWs.send(JSON.stringify({ type: 'hello', payload: { device_token: 'token_lobby_utama_demo_12345' } }));
    });

    deviceWs.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      console.log('[Device Received]:', msg.type, msg.payload?.device?.name);
    });

    await new Promise((r) => setTimeout(r, 2000));

    // 3. Disconnect Device Client
    console.log('Closing Device Client connection...');
    deviceWs.close();

    await new Promise((r) => setTimeout(r, 1500));

    console.log('--- TEST RESULTS ---');
    console.log('Online event received by dashboard:', deviceOnlineReceived);
    console.log('Offline event received by dashboard:', deviceOfflineReceived);

    if (deviceOnlineReceived && deviceOfflineReceived) {
      console.log('>>> ALL WEBSOCKET PRESENCE TESTS PASSED! <<<');
    }

    dashWs.close();
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    wsProc.kill();
    process.exit(0);
  }
}, 1500);
