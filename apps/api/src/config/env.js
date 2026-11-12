const path = require('path');
const dotenv = require('dotenv');

// Load .env from root or local
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config(); // fallback local

const env = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  WS_PORT: parseInt(process.env.WS_PORT || '4001'),
  JWT_SECRET: process.env.JWT_SECRET || 'signage-jwt-secret-key-32bytes-secure-random',
  INTERNAL_SECRET: process.env.INTERNAL_SECRET || 'signage-internal-dispatch-secret-999',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@example.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
};

module.exports = env;

