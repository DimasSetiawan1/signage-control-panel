const env = require('../config/env');
const { INTERNAL_API } = require('shared');

const wsDispatcher = {
  async dispatch({ device_id, type, payload }) {
    const wsUrl = `http://localhost:${env.WS_PORT}${INTERNAL_API.DISPATCH_PATH}`;

    try {
      const response = await fetch(wsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [INTERNAL_API.HEADER_SECRET]: env.INTERNAL_SECRET,
        },
        body: JSON.stringify({ device_id, type, payload }),
      });

      if (!response.ok) {
        console.warn(`[WS Dispatcher] HTTP ${response.status} from WS process`);
        return { delivered: false };
      }

      const result = await response.json();
      return result; // e.g. { delivered: true | false }
    } catch (err) {
      console.warn('[WS Dispatcher] Failed to connect to WS process:', err.message);
      return { delivered: false, error: err.message };
    }
  },
};

module.exports = wsDispatcher;

