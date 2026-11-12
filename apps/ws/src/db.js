const { supabase, isLiveSupabase } = require('./config/supabase');
const { readDb, writeDb } = require('shared/localStore');

function handleSupabaseError(error, context) {
  if (error && (error.code === 'PGRST205' || error.message?.includes('schema cache'))) {
    console.warn(`[Supabase Notice WS] Table not yet found in Supabase (${error.message}). Using local store fallback.`);
    return true;
  }
  return false;
}

const db = {
  async resetAllDevicesToOffline() {
    if (isLiveSupabase) {
      try {
        const { error } = await supabase.from('devices').update({ status: 'offline' }).neq('status', 'offline');
        if (error) {
          handleSupabaseError(error, 'resetAllDevicesToOffline');
        } else {
          return;
        }
      } catch (err) {
        handleSupabaseError(err, 'resetAllDevicesToOffline');
      }
    }

    const localData = readDb();
    localData.devices = localData.devices.map((d) => ({ ...d, status: 'offline' }));
    writeDb(localData);
  },

  async getDeviceByToken(token) {
    if (isLiveSupabase) {
      try {
        const { data, error } = await supabase.from('devices').select('*').eq('device_token', token).maybeSingle();
        if (error) {
          if (!handleSupabaseError(error, 'getDeviceByToken')) throw error;
        } else if (data) {
          return data;
        }
      } catch (err) {
        if (!handleSupabaseError(err, 'getDeviceByToken')) throw err;
      }
    }

    const localData = readDb();
    return localData.devices.find((d) => d.device_token === token) || null;
  },

  async updateDeviceStatus(id, status, lastSeen = new Date().toISOString()) {
    const payload = { status };
    if (lastSeen) payload.last_seen = lastSeen;

    if (isLiveSupabase) {
      try {
        const { data, error } = await supabase.from('devices').update(payload).eq('id', id).select().single();
        if (error) {
          handleSupabaseError(error, 'updateDeviceStatus');
        } else if (data) {
          return data;
        }
      } catch (err) {
        handleSupabaseError(err, 'updateDeviceStatus');
      }
    }

    const localData = readDb();
    const idx = localData.devices.findIndex((d) => d.id === id);
    if (idx !== -1) {
      localData.devices[idx] = { ...localData.devices[idx], ...payload };
      writeDb(localData);
      return localData.devices[idx];
    }
    return null;
  },

  async getAllDevicesForSnapshot() {
    if (isLiveSupabase) {
      try {
        const { data, error } = await supabase.from('devices').select('id, name, status, last_seen');
        if (error) {
          if (!handleSupabaseError(error, 'getAllDevicesForSnapshot')) throw error;
        } else if (data) {
          return data;
        }
      } catch (err) {
        if (!handleSupabaseError(err, 'getAllDevicesForSnapshot')) throw err;
      }
    }

    const localData = readDb();
    return localData.devices.map((d) => ({
      id: d.id,
      name: d.name,
      status: d.status,
      last_seen: d.last_seen,
    }));
  },

  async getDevicePlaylist(deviceId) {
    if (isLiveSupabase) {
      try {
        const { data, error } = await supabase
          .from('playlist_items')
          .select(`
            id,
            device_id,
            content_id,
            position,
            duration_sec,
            contents:content_id (
              id,
              title,
              type,
              payload
            )
          `)
          .eq('device_id', deviceId)
          .order('position', { ascending: true });

        if (error) {
          if (!handleSupabaseError(error, 'getDevicePlaylist')) throw error;
        } else if (data) {
          return (data || []).map((item) => ({
            id: item.id,
            device_id: item.device_id,
            content_id: item.content_id,
            position: item.position,
            duration_sec: item.duration_sec,
            content: item.contents,
          }));
        }
      } catch (err) {
        if (!handleSupabaseError(err, 'getDevicePlaylist')) throw err;
      }
    }

    const localData = readDb();
    const items = localData.playlist_items
      .filter((p) => p.device_id === deviceId)
      .sort((a, b) => a.position - b.position);

    return items.map((item) => {
      const content = localData.contents.find((c) => c.id === item.content_id) || null;
      return {
        ...item,
        content,
      };
    });
  },
};

module.exports = db;
