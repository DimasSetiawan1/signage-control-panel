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

const playlistRepository = {
  async getByDeviceId(deviceId) {
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
          if (!handleSupabaseError(error, 'getPlaylist')) throw error;
        } else {
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
        if (!handleSupabaseError(err, 'getPlaylist')) throw err;
      }
    }

    const db = readDb();
    const items = db.playlist_items
      .filter((p) => p.device_id === deviceId)
      .sort((a, b) => a.position - b.position);

    return items.map((item) => {
      const content = db.contents.find((c) => c.id === item.content_id) || null;
      return {
        ...item,
        content,
      };
    });
  },

  async replacePlaylist(deviceId, items) {
    if (isLiveSupabase) {
      try {
        const { error: delError } = await supabase
          .from('playlist_items')
          .delete()
          .eq('device_id', deviceId);

        if (delError) {
          if (!handleSupabaseError(delError, 'replacePlaylist-del')) throw delError;
        } else {
          if (!items || items.length === 0) {
            return [];
          }

          const rows = items.map((item, index) => ({
            id: crypto.randomUUID(),
            device_id: deviceId,
            content_id: item.content_id,
            position: index,
            duration_sec: item.duration_sec || 10,
          }));

          const { data, error: insertError } = await supabase
            .from('playlist_items')
            .insert(rows)
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
            .order('position', { ascending: true });

          if (insertError) {
            if (!handleSupabaseError(insertError, 'replacePlaylist-ins')) throw insertError;
          } else {
            return (data || []).map((item) => ({
              id: item.id,
              device_id: item.device_id,
              content_id: item.content_id,
              position: item.position,
              duration_sec: item.duration_sec,
              content: item.contents,
            }));
          }
        }
      } catch (err) {
        if (!handleSupabaseError(err, 'replacePlaylist')) throw err;
      }
    }

    const db = readDb();
    db.playlist_items = db.playlist_items.filter((p) => p.device_id !== deviceId);

    const newRows = items.map((item, index) => ({
      id: crypto.randomUUID(),
      device_id: deviceId,
      content_id: item.content_id,
      position: index,
      duration_sec: item.duration_sec || 10,
    }));

    db.playlist_items.push(...newRows);
    writeDb(db);

    return this.getByDeviceId(deviceId);
  },
};

module.exports = playlistRepository;
