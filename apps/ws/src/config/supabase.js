const WebSocket = require('ws');
if (!global.WebSocket) {
  global.WebSocket = WebSocket;
}

const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

const isLiveSupabase = Boolean(
  env.SUPABASE_URL &&
  env.SUPABASE_SERVICE_ROLE_KEY &&
  env.SUPABASE_URL.startsWith('http') &&
  !env.SUPABASE_URL.includes('your-project')
);

let supabase = null;

if (isLiveSupabase) {
  try {
    supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log('[WS] Connected to Supabase Live Postgres at:', env.SUPABASE_URL);
  } catch (err) {
    console.warn('[WS] Failed to initialize Supabase client:', err.message);
  }
} else {
  console.log('[WS] Info: Running with local DB fallback. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env for live Supabase.');
}

module.exports = {
  supabase,
  isLiveSupabase,
};
