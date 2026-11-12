import React, { useState, useEffect } from 'react';
import {
  ListMusic,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Send,
  Save,
  Clock,
  Monitor,
  Loader2,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import { api } from '../lib/api';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

export default function PlaylistsPage({
  devices,
  contents,
  selectedDeviceId,
  setSelectedDeviceId,
  onOpenPushModal,
}) {
  const toast = useToast();
  const [playlistItems, setPlaylistItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isAddPickerOpen, setIsAddPickerOpen] = useState(false);
  const [pushingItemId, setPushingItemId] = useState(null);

  const activeDevice = devices.find((d) => d.id === selectedDeviceId) || devices[0];

  useEffect(() => {
    if (activeDevice?.id) {
      loadPlaylist(activeDevice.id);
    }
  }, [activeDevice?.id]);

  async function loadPlaylist(deviceId) {
    setLoading(true);
    try {
      const data = await api.getPlaylist(deviceId);
      setPlaylistItems(data || []);
    } catch (err) {
      toast.error(err.message || 'Gagal memuat playlist');
    } finally {
      setLoading(false);
    }
  }

  function handleMove(index, direction) {
    const newItems = [...playlistItems];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    setPlaylistItems(newItems);
  }

  function handleDurationChange(index, newDuration) {
    const dur = parseInt(newDuration, 10);
    const newItems = [...playlistItems];
    newItems[index].duration_sec = isNaN(dur) || dur < 1 ? 1 : dur;
    setPlaylistItems(newItems);
  }

  function handleRemoveItem(index) {
    const newItems = playlistItems.filter((_, i) => i !== index);
    setPlaylistItems(newItems);
  }

  function handleAddContentToPlaylist(content) {
    const newItem = {
      id: `temp-${Date.now()}-${Math.random()}`,
      device_id: activeDevice.id,
      content_id: content.id,
      position: playlistItems.length,
      duration_sec: 10,
      content,
    };
    setPlaylistItems([...playlistItems, newItem]);
    setIsAddPickerOpen(false);
    toast.info(`"${content.title}" ditambahkan ke playlist`);
  }

  async function handleSavePlaylist() {
    if (!activeDevice) return;
    setSaving(true);

    try {
      const payloadItems = playlistItems.map((item, idx) => ({
        content_id: item.content_id,
        duration_sec: item.duration_sec,
        position: idx,
      }));

      const updated = await api.updatePlaylist(activeDevice.id, payloadItems);
      setPlaylistItems(updated);
      toast.success('Playlist berhasil disimpan & disiarkan ke layar');
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan playlist');
    } finally {
      setSaving(false);
    }
  }

  async function handlePushNow(contentId, itemId) {
    if (!activeDevice) return;
    setPushingItemId(itemId);

    try {
      await api.pushContent(activeDevice.id, contentId);
      toast.success(`Siaran langsung terkirim ke "${activeDevice.name}"!`);
    } catch (err) {
      if (err.status === 409 || err.code === 'DEVICE_OFFLINE') {
        toast.error(`Layar "${activeDevice.name}" sedang Offline. Nyalakan client terlebih dahulu.`);
      } else {
        toast.error(err.message || 'Gagal mengirim push command');
      }
    } finally {
      setPushingItemId(null);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Atur Playlist Layar</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Susun urutan konten dan durasi penayangan per slide untuk setiap layar
          </p>
        </div>

        {/* Device selector dropdown */}
        <div className="flex items-center gap-2.5">
          <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Pilih Layar:</label>
          <select
            value={activeDevice?.id || ''}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="px-3.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs font-semibold text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.status === 'online' ? 'Online' : 'Offline'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeDevice ? (
        <div className="bg-slate-900/60 border border-slate-800/70 rounded-2xl overflow-hidden">
          {/* Active Device Info Bar */}
          <div className="px-5 py-3.5 bg-slate-950/60 border-b border-slate-800/70 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  activeDevice.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                }`}
              />
              <span className="font-semibold text-slate-200 text-xs">{activeDevice.name}</span>
              <span className="text-[11px] text-slate-500">
                ({activeDevice.location || 'Tanpa lokasi disetel'})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddPickerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Item</span>
              </button>

              <button
                onClick={handleSavePlaylist}
                disabled={saving}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                <span>Simpan Playlist</span>
              </button>
            </div>
          </div>

          {/* Playlist items list */}
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-800/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : playlistItems.length === 0 ? (
            <div className="py-16 text-center">
              <ListMusic className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-slate-300 mb-1">Playlist masih kosong</h4>
              <p className="text-xs text-slate-500 mb-4">
                Pilih konten dari koleksi library untuk ditampilkan bergantian pada layar ini
              </p>
              <button
                onClick={() => setIsAddPickerOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
              >
                Pilih Konten Library
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/50">
              {playlistItems.map((item, index) => {
                const c = item.content;
                const isPushing = pushingItemId === item.id;

                return (
                  <div
                    key={item.id}
                    className="p-3.5 px-5 flex items-center justify-between gap-4 hover:bg-slate-800/20 transition group"
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Position Badge */}
                      <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 font-bold text-[11px] flex items-center justify-center border border-slate-700/60">
                        {index + 1}
                      </span>

                      {/* Content Thumbnail */}
                      <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                        {c?.type === 'image' && (
                          <img src={c.payload} alt="" className="w-full h-full object-cover" />
                        )}
                        {c?.type === 'video' && (
                          <video src={c.payload} className="w-full h-full object-cover" muted />
                        )}
                        {c?.type === 'text' && (
                          <div className="text-[9px] text-slate-400 p-1 line-clamp-2 text-center font-mono leading-tight">
                            {c.payload}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="font-semibold text-slate-200 text-xs leading-none">{c?.title || 'Konten'}</div>
                        <div className="text-[10px] text-slate-500 capitalize mt-1">{c?.type}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Duration Input */}
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-[11px] text-slate-500 hidden sm:inline">Durasi:</span>
                        <input
                          type="number"
                          min="1"
                          max="3600"
                          value={item.duration_sec}
                          onChange={(e) => handleDurationChange(index, e.target.value)}
                          className="w-14 px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-center text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                        <span className="text-[11px] text-slate-500">detik</span>
                      </div>

                      {/* Move Up / Down Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMove(index, -1)}
                          disabled={index === 0}
                          className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-20 rounded-md transition"
                          title="Geser urutan ke atas"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMove(index, 1)}
                          disabled={index === playlistItems.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-20 rounded-md transition"
                          title="Geser urutan ke bawah"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Push Now Button - THE CRITICAL FUNCTIONALITY */}
                      <button
                        onClick={() => handlePushNow(item.content_id, item.id)}
                        disabled={isPushing}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition shadow-sm"
                        title="Langsung siarkan konten ini ke layar sekarang juga"
                      >
                        {isPushing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">Kirim Sekarang</span>
                      </button>

                      {/* Remove from playlist */}
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition"
                        title="Hapus dari playlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="py-16 text-center bg-slate-900/60 border border-slate-800/70 rounded-2xl">
          <Monitor className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-300 mb-1">Belum ada layar dipilih</h4>
          <p className="text-xs text-slate-500">Pilih atau daftarkan layar terlebih dahulu</p>
        </div>
      )}

      {/* Modal Picker for adding content */}
      <Modal
        isOpen={isAddPickerOpen}
        onClose={() => setIsAddPickerOpen(false)}
        title="Pilih Konten dari Library"
        maxWidth="max-w-xl"
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Klik konten yang ingin ditambahkan ke playlist layar aktif:
          </p>

          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {contents.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">Belum ada konten di library</div>
            ) : (
              contents.map((content) => (
                <div
                  key={content.id}
                  onClick={() => handleAddContentToPlaylist(content)}
                  className="p-2.5 bg-slate-950/80 hover:bg-indigo-600/10 border border-slate-800 hover:border-indigo-500/40 rounded-xl flex items-center justify-between cursor-pointer transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-900 overflow-hidden flex items-center justify-center shrink-0 border border-slate-800">
                      {content.type === 'image' && (
                        <img src={content.payload} alt="" className="w-full h-full object-cover" />
                      )}
                      {content.type === 'video' && (
                        <video src={content.payload} className="w-full h-full object-cover" muted />
                      )}
                      {content.type === 'text' && (
                        <div className="text-[8px] text-slate-400 p-1 text-center font-mono">TEKS</div>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200 text-xs leading-none">{content.title}</div>
                      <div className="text-[10px] text-slate-500 capitalize mt-1">{content.type}</div>
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold text-indigo-400 px-2.5 py-1 bg-indigo-500/10 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition">
                    + Pilih
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
