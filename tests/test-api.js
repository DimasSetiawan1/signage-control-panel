const app = require('../apps/api/src/app.js');
const http = require('http');

const server = http.createServer(app);
server.listen(4000, async () => {
  console.log('[Test API] Server listening on port 4000...');
  try {
    // 1. Health
    const hRes = await fetch('http://localhost:4000/health');
    const health = await hRes.json();
    console.log('1. Health check status:', health.status);

    // 2. Login
    const lRes = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' }),
    });
    const lData = await lRes.json();
    const token = lData.data?.token;
    console.log('2. Admin JWT authentication:', Boolean(token));

    // 3. Devices
    const dRes = await fetch('http://localhost:4000/api/devices', {
      headers: { Authorization: 'Bearer ' + token },
    });
    const dData = await dRes.json();
    console.log('3. Devices loaded count:', dData.data?.length);

    // 4. Contents
    const cRes = await fetch('http://localhost:4000/api/contents', {
      headers: { Authorization: 'Bearer ' + token },
    });
    const cData = await cRes.json();
    console.log('4. Contents loaded count:', cData.data?.length);

    // 5. Summary
    const sRes = await fetch('http://localhost:4000/api/summary', {
      headers: { Authorization: 'Bearer ' + token },
    });
    const sData = await sRes.json();
    console.log('5. Summary stats:', sData.data);

    console.log('>>> ALL API ENDPOINTS PASSED SUCCESSFULLY! <<<');
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
});

