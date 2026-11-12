const crypto = require('crypto');
const { supabase, isLiveSupabase } = require('../config/supabase');
const { readDb, writeDb } = require('shared/localStore');

function handleSupabaseError(error, context) {
  if (error && (error.code === 'PGRST205' || error.message?.includes('schema cache'))) {
    console.warn(`[Supabase Notice] Table not yet found in Supabase (${error.message}). Using local store fallback.`);
    return true;
  }
  return false;
}

const contentRepository = {
  async findAll({ type, q } = {}) {
    if (isLiveSupabase) {
      try {
        let query = supabase.from('contents').select('*').order('created_at', { ascending: false });
        if (type && type !== 'all') {
          query = query.eq('type', type);
        }
        if (q) {
          query = query.ilike('title', `%${q}%`);
        }
        const { data, error } = await query;
        if (error) {
          if (!handleSupabaseError(error, 'findAllContents')) throw error;
        } else {
          return data || [];
        }
      } catch (err) {
        if (!handleSupabaseError(err, 'findAllContents')) throw err;
      }
    }

    const db = readDb();
    let list = [...db.contents];
    if (type && type !== 'all') {
      list = list.filter((c) => c.type === type);
    }
    if (q) {
      const qLower = q.toLowerCase();
      list = list.filter((c) => c.title.toLowerCase().includes(qLower));
    }
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return list;
  },

  async findById(id) {
    if (isLiveSupabase) {
      try {
        const { data, error } = await supabase.from('contents').select('*').eq('id', id).maybeSingle();
        if (error) {
          if (!handleSupabaseError(error, 'findContentById')) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!handleSupabaseError(err, 'findContentById')) throw err;
      }
    }

    const db = readDb();
    return db.contents.find((c) => c.id === id) || null;
  },

  async create({ title, type, payload }) {
    const newContent = {
      id: crypto.randomUUID(),
      title,
      type,
      payload,
      created_at: new Date().toISOString(),
    };

    if (isLiveSupabase) {
      try {
        const { data, error } = await supabase.from('contents').insert([newContent]).select().single();
        if (error) {
          if (!handleSupabaseError(error, 'createContent')) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!handleSupabaseError(err, 'createContent')) throw err;
      }
    }

    const db = readDb();
    db.contents.unshift(newContent);
    writeDb(db);
    return newContent;
  },

  async update(id, { title, type, payload }) {
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (type !== undefined) updateData.type = type;
    if (payload !== undefined) updateData.payload = payload;

    if (isLiveSupabase) {
      try {
        const { data, error } = await supabase.from('contents').update(updateData).eq('id', id).select().single();
        if (error) {
          if (!handleSupabaseError(error, 'updateContent')) throw error;
        } else {
          return data;
        }
      } catch (err) {
        if (!handleSupabaseError(err, 'updateContent')) throw err;
      }
    }

    const db = readDb();
    const index = db.contents.findIndex((c) => c.id === id);
    if (index === -1) return null;

    db.contents[index] = { ...db.contents[index], ...updateData };
    writeDb(db);
    return db.contents[index];
  },

  async delete(id) {
    if (isLiveSupabase) {
      try {
        const { error } = await supabase.from('contents').delete().eq('id', id);
        if (error) {
          if (!handleSupabaseError(error, 'deleteContent')) throw error;
        } else {
          return true;
        }
      } catch (err) {
        if (!handleSupabaseError(err, 'deleteContent')) throw err;
      }
    }

    const db = readDb();
    db.contents = db.contents.filter((c) => c.id !== id);
    db.playlist_items = db.playlist_items.filter((p) => p.content_id !== id);
    writeDb(db);
    return true;
  },

  async count() {
    if (isLiveSupabase) {
      try {
        const { count, error } = await supabase.from('contents').select('*', { count: 'exact', head: true });
        if (error) {
          if (!handleSupabaseError(error, 'countContents')) throw error;
        } else if (count !== null && count !== undefined) {
          return count;
        }
      } catch (err) {
        if (!handleSupabaseError(err, 'countContents')) throw err;
      }
    }

    const all = await this.findAll();
    return all.length;
  },
};

module.exports = contentRepository;
