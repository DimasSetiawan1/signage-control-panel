const app = require('./app');
const env = require('./config/env');

const server = app.listen(env.PORT, () => {
  console.log(`[API Server] Running on http://localhost:${env.PORT}`);
  console.log(`[API Server] Environment: ${process.env.NODE_ENV || 'development'}`);
});

process.on('SIGTERM', () => {
  console.log('[API Server] SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('[API Server] HTTP server closed');
  });
});

