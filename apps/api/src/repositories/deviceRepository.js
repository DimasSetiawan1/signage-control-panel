const crypto = require('crypto');
const { supabase, isLiveSupabase } = require('../config/supabase');
const { readDb, writeDb } = require('shared/localStore');

function handleSupabaseError(error, context) {
  if (error && (error.code === 'PGRST205' || error.message?.includes('schema cache'))) {
    console.warn(`[Supabase Notice] Table not yet found in Supabase (${error.message}). Using local store fallback. Execute supabase/migrations/01_schema.sql in Supabase SQL Editor.`);
    return true; // indicates should fallback
  }
  return false;
}

const deviceRepository = {
  async findAll({ status, q } = {}) {
    if (isLiveSupabase) {
      try {
        let query = supabase.from('devices').select('*').order('created_at', { ascending: false });
        if (status && status !== 'all') {
          query = query.eq('status', status);
        }
        if (q) {
          query = query.ilike('name', `%${q}%`);
        }
        const { data, error } = await query;
        if (error) {
          if (!handleSupabaseError(error, 'findAll')) throw error;
        } else {
          return data || [];
        }
      } catch (err) {
        if (!handleSupabaseError(err, 'findAll')) throw err;
      }
    }

    const db = readDb();
    let list = [...db.devices];
    if (status && status !== 'all') {
      list = list.filter((d) => d.status === status);
    }
    if (q) {
      const qLower = q.toLowerCase();
      list = list.filter((d) => d.name.toLowerCase().includes(qLower));
    }
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return list;
  },

  async findById(id) {
    if (isLiveSupabase) {
      try {
        const { data, error } = await supabase.from('devices').select('*').eq('id', id).maybeSingle();
        if (error) {
          if (!handleSupabaseError(error, 'findById')) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!handleSupabaseError(err, 'findById')) throw err;
      }
    }

    const db = readDb();
    return db.devices.find((d) => d.id === id) || null;
  },

  async findByToken(token) {
    if (isLiveSupabase) {
      try {
        const { data, error } = await supabase.from('devices').select('*').eq('device_token', token).maybeSingle();
        if (error) {
          if (!handleSupabaseError(error, 'findByToken')) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!handleSupabaseError(err, 'findByToken')) throw err;
      }
    }

    const db = readDb();
    return db.devices.find((d) => d.device_token === token) || null;
  },

  async create({ name, location }) {
    const token = crypto.randomBytes(24).toString('hex');
    const newDevice = {
      id: crypto.randomUUID(),
      name,
      location: location || null,
      status: 'offline',
      last_seen: null,
      device_token: token,
      created_at: new Date().toISOString(),
    };

    if (isLiveSupabase) {
      try {
        const { data, error } = await supabase.from('devices').insert([newDevice]).select().single();
        if (error) {
          if (!handleSupabaseError(error, 'create')) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!handleSupabaseError(err, 'create')) throw err;
      }
    }

    const db = readDb();
    db.devices.unshift(newDevice);
    writeDb(db);
    return newDevice;
  },

  async update(id, { name, location }) {
    const payload = {};
    if (name !== undefined) payload.name = name;
    if (location !== undefined) payload.location = location;

    if (isLiveSupabase) {
      try {
        const { data, error } = await supabase.from('devices').update(payload).eq('id', id).select().single();
        if (error) {
          if (!handleSupabaseError(error, 'update')) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!handleSupabaseError(err, 'update')) throw err;
      }
    }

    const db = readDb();
    const index = db.devices.findIndex((d) => d.id === id);
    if (index === -1) return null;

    db.devices[index] = { ...db.devices[index], ...payload };
    writeDb(db);
    return db.devices[index];
  },

  async delete(id) {
    if (isLiveSupabase) {
      try {
        const { error } = await supabase.from('devices').delete().eq('id', id);
        if (error) {
          if (!handleSupabaseError(error, 'delete')) throw error;
        } else {
          return true;
        }
      } catch (err) {
        if (!handleSupabaseError(err, 'delete')) throw err;
      }
    }

    const db = readDb();
    db.devices = db.devices.filter((d) => d.id !== id);
    db.playlist_items = db.playlist_items.filter((p) => p.device_id !== id);
    writeDb(db);
    return true;
  },

  async updateStatus(id, status, lastSeen = new Date().toISOString()) {
    const payload = { status };
    if (lastSeen) payload.last_seen = lastSeen;

    if (isLiveSupabase) {
      try {
        const { data, error } = await supabase.from('devices').update(payload).eq('id', id).select().single();
        if (error) {
          if (!handleSupabaseError(error, 'updateStatus')) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!handleSupabaseError(err, 'updateStatus')) throw err;
      }
    }

    const db = readDb();
    const index = db.devices.findIndex((d) => d.id === id);
    if (index === -1) return null;

    db.devices[index] = { ...db.devices[index], ...payload };
    writeDb(db);
    return db.devices[index];
  },

  async resetAllToOffline() {
    if (isLiveSupabase) {
      try {
        const { error } = await supabase.from('devices').update({ status: 'offline' }).neq('status', 'offline');
        if (error) {
          handleSupabaseError(error, 'resetAllToOffline');
        } else {
          return true;
        }
      } catch (err) {
        handleSupabaseError(err, 'resetAllToOffline');
      }
    }

    const db = readDb();
    db.devices = db.devices.map((d) => ({ ...d, status: 'offline' }));
    writeDb(db);
    return true;
  },

  async getSummary() {
    const all = await this.findAll();
    const total = all.length;
    const online = all.filter((d) => d.status === 'online').length;
    const offline = total - online;
    return { total, online, offline };
  },
};

module.exports = deviceRepository;
