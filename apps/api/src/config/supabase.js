const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

if (typeof global.WebSocket === 'undefined') {
  try {
    global.WebSocket = require('ws');
  } catch (e) {}
}

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
    console.log('[API] Connected to Supabase Live Postgres & Storage at:', env.SUPABASE_URL);
  } catch (err) {
    console.warn('[API] Failed to initialize Supabase client:', err.message);
  }
} else {
  console.log('[API] Info: Running with local in-memory fallback. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env for live Supabase.');
}

module.exports = {
  supabase,
  isLiveSupabase,
};
