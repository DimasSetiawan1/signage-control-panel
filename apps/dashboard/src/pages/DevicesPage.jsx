import React, { useState } from 'react';
import {
  Monitor,
  Search,
  Plus,
  MapPin,
  Copy,
  Check,
  Edit2,
  Trash2,
  ListMusic,
  Send,
  Loader2,
  Radio,
  ExternalLink,
} from 'lucide-react';
import Modal from '../components/Modal';
import { formatRelativeTime } from '../lib/formatTime';
import { useToast } from '../components/Toast';

export default function DevicesPage({
  devices,
  loading,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  onCreateDevice,
  onUpdateDevice,
  onDeleteDevice,
  onSelectDeviceForPlaylist,
  onOpenPushModal,
}) {
  const toast = useToast();
  const [copiedId, setCopiedId] = useState(null);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

  // Form states
  const [formData, setFormData] = useState({ name: '', location: '' });
  const [submitting, setSubmitting] = useState(false);

  function copyToken(token, id) {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedId(id);
    toast.success('Device token disalin!');
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleOpenAdd() {
    setFormData({ name: '', location: '' });
    setIsAddOpen(true);
  }

  function handleOpenEdit(device) {
    setSelectedDevice(device);
    setFormData({ name: device.name, location: device.location || '' });
    setIsEditOpen(true);
  }

  function handleOpenDelete(device) {
    setSelectedDevice(device);
    setIsDeleteOpen(true);
  }

  async function handleAddSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onCreateDevice(formData);
      setIsAddOpen(false);
      toast.success('Device baru berhasil didaftarkan');
    } catch (err) {
      toast.error(err.message || 'Gagal menambahkan device');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!selectedDevice) return;
    setSubmitting(true);
    try {
      await onUpdateDevice(selectedDevice.id, formData);
      setIsEditOpen(false);
      toast.success('Device berhasil diperbarui');
    } catch (err) {
      toast.error(err.message || 'Gagal memperbarui device');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!selectedDevice) return;
    setSubmitting(true);
    try {
      await onDeleteDevice(selectedDevice.id);
      setIsDeleteOpen(false);
      toast.success('Device berhasil dihapus');
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus device');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Manajemen Perangkat</h2>
          <p className="text-sm text-slate-500 mt-0.5">Daftar layar signage digital, status konektivitas, dan token pairing</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Layar</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-slate-900/60 border border-slate-800/70 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari layar berdasarkan nama..."
            className="w-full pl-9 pr-3.5 py-1.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto">
          {['all', 'online', 'offline'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800/60'
              }`}
            >
              {st === 'all' ? 'Semua Status' : st === 'online' ? '● Online' : '○ Offline'}
            </button>
          ))}
        </div>
      </div>

      {/* Device List Table */}
      <div className="bg-slate-900/60 border border-slate-800/70 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-slate-800/40 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : devices.length === 0 ? (
          <div className="py-16 text-center">
            <Monitor className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-slate-300 mb-1">Tidak ada perangkat ditemukan</h4>
            <p className="text-xs text-slate-500 mb-4">
              {searchQuery ? 'Coba ubah kata kunci pencarian' : 'Tambahkan layar signage baru sekarang'}
            </p>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
            >
              Tambah Layar Baru
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[10px] uppercase font-bold tracking-wider bg-slate-950/60 text-slate-500 border-b border-slate-800/80">
                <tr>
                  <th className="px-5 py-3">Nama Layar &amp; Lokasi</th>
                  <th className="px-5 py-3">Status Live</th>
                  <th className="px-5 py-3">Terakhir Aktif</th>
                  <th className="px-5 py-3">Pairing Token</th>
                  <th className="px-5 py-3 text-right">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {devices.map((device) => {
                  const isOnline = device.status === 'online';
                  return (
                    <tr key={device.id} className="hover:bg-slate-800/20 transition group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isOnline
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-800 text-slate-500 border border-slate-700/50'
                            }`}
                          >
                            <Monitor className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100 text-sm leading-none">{device.name}</div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                              <MapPin className="w-3 h-3 text-slate-600" />
                              <span>{device.location || 'Lokasi belum disetel'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            isOnline
                              ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400'
                              : 'bg-slate-800/80 border-slate-700/50 text-slate-500'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                            }`}
                          />
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-slate-400">
                        {formatRelativeTime(device.last_seen)}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="inline-flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                          <code className="text-[11px] text-indigo-300 font-mono">
                            {device.device_token ? `${device.device_token.slice(0, 14)}...` : '-'}
                          </code>
                          <button
                            onClick={() => copyToken(device.device_token, device.id)}
                            className="p-1 hover:bg-slate-800 text-slate-500 hover:text-slate-200 rounded transition"
                            title="Salin token pairing"
                          >
                            {copiedId === device.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onSelectDeviceForPlaylist(device.id)}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition"
                            title="Buka Playlist"
                          >
                            <ListMusic className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onOpenPushModal(device)}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition"
                            title="Kirim Siaran Instan"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(device)}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(device)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add Device */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Daftarkan Layar Baru">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Nama Layar / Device *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Layar Lobby Utama"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Lokasi Penempatan
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Contoh: Lantai 1, Lobby Resepsionis"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-3.5 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Simpan Layar</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Device */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Ubah Data Layar">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Nama Layar *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Lokasi Penempatan
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-3.5 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Perbarui</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Delete */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Hapus Layar">
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Apakah Anda yakin ingin menghapus layar <span className="font-bold text-white">"{selectedDevice?.name}"</span>?
            Playlist dan riwayat penayangan pada layar ini akan ikut dibersihkan.
          </p>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDeleteOpen(false)}
              className="px-3.5 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleDeleteConfirm}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-xs transition flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Ya, Hapus</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
