import React, { useState, useRef } from 'react';
import {
  Film,
  Image as ImageIcon,
  Video,
  FileText,
  Plus,
  Search,
  UploadCloud,
  Edit2,
  Trash2,
  Loader2,
  X,
  ExternalLink,
} from 'lucide-react';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

export default function ContentsPage({
  contents,
  loading,
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
  onCreateContent,
  onUpdateContent,
  onDeleteContent,
}) {
  const toast = useToast();

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState(null);

  // Add form tabs: 'upload' | 'url' | 'text'
  const [addMode, setAddMode] = useState('upload');
  const [title, setTitle] = useState('');
  const [urlPayload, setUrlPayload] = useState('');
  const [textContent, setTextContent] = useState('');
  const [contentType, setContentType] = useState('image');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  function resetAddForm() {
    setTitle('');
    setUrlPayload('');
    setTextContent('');
    setContentType('image');
    setSelectedFile(null);
    setFilePreview(null);
    setAddMode('upload');
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Ukuran file melebihi batas 20 MB');
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isMp4 = file.type === 'video/mp4' || file.name.endsWith('.mp4');

    if (!isImage && !isMp4) {
      toast.error('Gunakan gambar (JPG/PNG) atau video MP4');
      return;
    }

    setSelectedFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    if (isImage) {
      setContentType('image');
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setContentType('video');
      setFilePreview(URL.createObjectURL(file));
    }
  }

  async function handleAddSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (addMode === 'upload') {
        if (!selectedFile) {
          throw new Error('Pilih file gambar atau video terlebih dahulu.');
        }
        const formData = new FormData();
        formData.append('title', title);
        formData.append('type', contentType);
        formData.append('file', selectedFile);
        await onCreateContent(formData);
      } else if (addMode === 'url') {
        if (!urlPayload) throw new Error('URL wajib diisi');
        await onCreateContent({
          title,
          type: contentType,
          payload: urlPayload,
        });
      } else {
        if (!textContent) throw new Error('Isi teks tayangan wajib diisi');
        await onCreateContent({
          title,
          type: 'text',
          payload: textContent,
        });
      }

      setIsAddOpen(false);
      resetAddForm();
      toast.success('Konten baru berhasil ditambahkan');
    } catch (err) {
      toast.error(err.message || 'Gagal menambahkan konten');
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenEdit(content) {
    setSelectedContent(content);
    setTitle(content.title);
    setContentType(content.type);
    setUrlPayload(content.payload);
    setIsEditOpen(true);
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!selectedContent) return;
    setSubmitting(true);

    try {
      await onUpdateContent(selectedContent.id, {
        title,
        type: contentType,
        payload: urlPayload,
      });
      setIsEditOpen(false);
      toast.success('Konten berhasil diperbarui');
    } catch (err) {
      toast.error(err.message || 'Gagal memperbarui konten');
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenDelete(content) {
    setSelectedContent(content);
    setIsDeleteOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!selectedContent) return;
    setSubmitting(true);
    try {
      await onDeleteContent(selectedContent.id);
      setIsDeleteOpen(false);
      toast.success('Konten berhasil dihapus');
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus konten');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Koleksi Konten Media</h2>
          <p className="text-sm text-slate-500 mt-0.5">Kelola media gambar, video, dan poster teks digital</p>
        </div>
        <button
          onClick={() => {
            resetAddForm();
            setIsAddOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Upload Konten</span>
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
            placeholder="Cari konten berdasarkan judul..."
            className="w-full pl-9 pr-3.5 py-1.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'image', label: 'Gambar' },
            { id: 'video', label: 'Video' },
            { id: 'text', label: 'Teks' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTypeFilter(id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                typeFilter === id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800/60'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-56 bg-slate-900/40 border border-slate-800/60 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : contents.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/40 border border-slate-800/60 rounded-2xl">
          <Film className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-300 mb-1">Belum ada konten</h4>
          <p className="text-xs text-slate-500 mb-4">Mulai dengan mengunggah gambar, video MP4, atau teks poster</p>
          <button
            onClick={() => {
              resetAddForm();
              setIsAddOpen(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
          >
            Upload Konten Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contents.map((content) => (
            <div
              key={content.id}
              className="bg-slate-900/60 border border-slate-800/70 hover:border-slate-700 rounded-2xl overflow-hidden flex flex-col group transition"
            >
              {/* Media Preview Box */}
              <div className="h-44 bg-slate-950 relative overflow-hidden flex items-center justify-center border-b border-slate-800/60">
                {content.type === 'image' && (
                  <img
                    src={content.payload}
                    alt={content.title}
                    className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
                  />
                )}
                {content.type === 'video' && (
                  <video
                    src={content.payload}
                    muted
                    loop
                    className="w-full h-full object-cover"
                  />
                )}
                {content.type === 'text' && (
                  <div className="p-5 text-center flex flex-col items-center justify-center h-full w-full bg-radial from-indigo-950/40 to-slate-950">
                    <FileText className="w-6 h-6 text-indigo-400 mb-2 opacity-70" />
                    <p className="text-xs text-slate-300 font-medium line-clamp-3 leading-relaxed">
                      "{content.payload.replace(/<br\s*\/?>/gi, ' ')}"
                    </p>
                  </div>
                )}

                {/* Type Badge */}
                <div className="absolute top-2.5 left-2.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-slate-300 flex items-center gap-1">
                    {content.type === 'image' && <ImageIcon className="w-3 h-3 text-indigo-400" />}
                    {content.type === 'video' && <Video className="w-3 h-3 text-amber-400" />}
                    {content.type === 'text' && <FileText className="w-3 h-3 text-emerald-400" />}
                    {content.type}
                  </span>
                </div>
              </div>

              {/* Info & Actions */}
              <div className="p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-slate-200 truncate">{content.title}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate font-mono">
                    {content.type === 'text' ? 'Teks Poster' : content.payload}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(content)}
                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenDelete(content)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add Content */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Upload & Tambah Konten"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            {[
              { id: 'upload', label: 'File Upload (Supabase)' },
              { id: 'url', label: 'Direct Media URL' },
              { id: 'text', label: 'Teks Poster' },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setAddMode(id)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                  addMode === id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Judul Konten *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Banner Promo Akhir Tahun"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Upload Mode */}
          {addMode === 'upload' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                File Media (Gambar atau Video MP4, max 20MB) *
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950/60 rounded-2xl p-6 text-center cursor-pointer transition"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,video/mp4"
                  className="hidden"
                />
                {filePreview ? (
                  <div className="space-y-3">
                    <div className="h-32 max-w-xs mx-auto rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
                      {contentType === 'image' ? (
                        <img src={filePreview} alt="Preview" className="w-full h-full object-contain" />
                      ) : (
                        <video src={filePreview} muted className="w-full h-full object-contain" />
                      )}
                    </div>
                    <div className="text-xs text-indigo-400 font-semibold">{selectedFile?.name}</div>
                    <p className="text-[10px] text-slate-500">Klik untuk mengganti file</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <UploadCloud className="w-8 h-8 text-slate-500 mx-auto" />
                    <div className="text-xs text-slate-300 font-semibold">Pilih file dari komputer</div>
                    <p className="text-[10px] text-slate-500">Mendukung JPG, PNG, GIF, MP4 (Maksimal 20 MB)</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* URL Mode */}
          {addMode === 'url' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Tipe Media *
                </label>
                <div className="flex gap-2">
                  {['image', 'video'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setContentType(t)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl border capitalize transition ${
                        contentType === t
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Media Direct URL *
                </label>
                <input
                  type="url"
                  required
                  value={urlPayload}
                  onChange={(e) => setUrlPayload(e.target.value)}
                  placeholder="https://example.com/banner.jpg"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Text Mode */}
          {addMode === 'text' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Isi Teks Poster (Mendukung enter &amp; baris baru) *
              </label>
              <textarea
                required
                rows={4}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Contoh: Selamat Datang di PT MJ Solution Indonesia!&#10;Inovasi Solusi Digital Signage Terpercaya."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Teks akan ditampilkan dengan tipografi responsif dan latar belakang gradien otomatis pada layar.
              </p>
            </div>
          )}

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
              <span>Simpan Konten</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Content */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Ubah Konten">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Judul Konten *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Payload (URL Media / Isi Teks) *
            </label>
            {contentType === 'text' ? (
              <textarea
                rows={4}
                required
                value={urlPayload}
                onChange={(e) => setUrlPayload(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            ) : (
              <input
                type="text"
                required
                value={urlPayload}
                onChange={(e) => setUrlPayload(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            )}
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
              <span>Perbarui Konten</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Delete Content */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Hapus Konten">
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Hapus konten <span className="font-bold text-white">"{selectedContent?.title}"</span> dari sistem?
            Item ini juga akan dihapus dari seluruh urutan playlist layar yang menggunakannya.
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
