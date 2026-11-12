const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

const env = {
  WS_PORT: parseInt(process.env.WS_PORT || '4001', 10),
  JWT_SECRET: process.env.JWT_SECRET || 'signage-jwt-secret-key-32bytes-secure-random',
  INTERNAL_SECRET: process.env.INTERNAL_SECRET || 'signage-internal-dispatch-secret-999',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
};

module.exports = env;

