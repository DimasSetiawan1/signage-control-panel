import React, { useState, useEffect, useCallback } from 'react';
import { ToastProvider, useToast } from './components/Toast';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Modal from './components/Modal';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import DevicesPage from './pages/DevicesPage';
import ContentsPage from './pages/ContentsPage';
import PlaylistsPage from './pages/PlaylistsPage';
import { api } from './lib/api';
import { wsClient } from './lib/ws';
import { Send, Loader2 } from 'lucide-react';

function DashboardApp() {
  const toast = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(api.isAuthenticated());
  const [user, setUser] = useState({ email: 'admin@example.com', role: 'admin' });
  const [activeTab, setActiveTab] = useState('overview');
  const [wsState, setWsState] = useState('disconnected');

  // Core Data
  const [devices, setDevices] = useState([]);
  const [contents, setContents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [contentsLoading, setContentsLoading] = useState(false);

  // Filters
  const [deviceSearch, setDeviceSearch] = useState('');
  const [deviceStatusFilter, setDeviceStatusFilter] = useState('all');
  const [contentSearch, setContentSearch] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState('all');

  // Selected device for playlist
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  // Push modal state
  const [pushTargetDevice, setPushTargetDevice] = useState(null);
  const [selectedPushContentId, setSelectedPushContentId] = useState('');
  const [pushing, setPushing] = useState(false);

  // Fetch functions
  const fetchDevices = useCallback(async () => {
    try {
      setDevicesLoading(true);
      const data = await api.getDevices({ status: deviceStatusFilter, q: deviceSearch });
      setDevices(data || []);
      if (!selectedDeviceId && data && data.length > 0) {
        setSelectedDeviceId(data[0].id);
      }
    } catch (err) {
      toast.error('Gagal memuat data device');
    } finally {
      setDevicesLoading(false);
    }
  }, [deviceStatusFilter, deviceSearch, selectedDeviceId, toast]);

  const fetchContents = useCallback(async () => {
    try {
      setContentsLoading(true);
      const data = await api.getContents({ type: contentTypeFilter, q: contentSearch });
      setContents(data || []);
    } catch (err) {
      toast.error('Gagal memuat data content');
    } finally {
      setContentsLoading(false);
    }
  }, [contentTypeFilter, contentSearch, toast]);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await api.getSummary();
      setSummary(data);
    } catch (err) {
      // silent
    }
  }, []);

  // WebSocket Live Updates Integration
  useEffect(() => {
    if (!isAuthenticated) return;

    wsClient.connect();

    const unsubConn = wsClient.on('connectionState', (state) => {
      setWsState(state);
    });

    const unsubSnapshot = wsClient.on('snapshot', (payload) => {
      if (payload?.devices) {
        setDevices((prev) => {
          if (!prev || prev.length === 0) {
            return payload.devices;
          }
          const map = new Map(payload.devices.map((d) => [String(d.id).toLowerCase(), d]));
          return prev.map((item) => {
            const key = String(item.id).toLowerCase();
            if (map.has(key)) {
              const live = map.get(key);
              return { ...item, status: live.status, last_seen: live.last_seen };
            }
            return item;
          });
        });
      }
    });

    // Real-time presence change without refresh!
    const unsubStatus = wsClient.on('deviceStatus', (payload) => {
      if (payload?.id) {
        const targetId = String(payload.id).toLowerCase();
        setDevices((prev) => {
          if (!prev.some((d) => String(d.id).toLowerCase() === targetId)) {
            fetchDevices();
            return prev;
          }
          return prev.map((d) => {
            if (String(d.id).toLowerCase() === targetId) {
              return { ...d, status: payload.status, last_seen: payload.last_seen };
            }
            return d;
          });
        });
      }
    });

    const handleAuthExpired = () => {
      setIsAuthenticated(false);
      wsClient.disconnect();
      toast.error('Sesi login telah berakhir. Silakan login kembali.');
    };

    window.addEventListener('auth:expired', handleAuthExpired);

    return () => {
      unsubConn();
      unsubSnapshot();
      unsubStatus();
      window.removeEventListener('auth:expired', handleAuthExpired);
    };
  }, [isAuthenticated, toast]);

  // Initial Data Load
  useEffect(() => {
    if (isAuthenticated) {
      fetchDevices();
      fetchContents();
      fetchSummary();
    }
  }, [isAuthenticated, fetchDevices, fetchContents, fetchSummary]);

  // Periodic safety sync (10 seconds) to ensure presence never desyncs
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      fetchDevices();
    }, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchDevices]);

  // Handlers
  function handleLoginSuccess(userData) {
    setUser(userData);
    setIsAuthenticated(true);
  }

  function handleLogout() {
    api.logout();
    wsClient.disconnect();
    setIsAuthenticated(false);
    toast.info('Anda telah keluar.');
  }

  async function handleCreateDevice(data) {
    const created = await api.createDevice(data);
    setDevices((prev) => [created, ...prev]);
  }

  async function handleUpdateDevice(id, data) {
    const updated = await api.updateDevice(id, data);
    setDevices((prev) => prev.map((d) => (d.id === id ? { ...d, ...updated } : d)));
  }

  async function handleDeleteDevice(id) {
    await api.deleteDevice(id);
    setDevices((prev) => prev.filter((d) => d.id !== id));
  }

  async function handleCreateContent(formDataOrJson) {
    const created = await api.createContent(formDataOrJson);
    setContents((prev) => [created, ...prev]);
  }

  async function handleUpdateContent(id, formDataOrJson) {
    const updated = await api.updateContent(id, formDataOrJson);
    setContents((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
  }

  async function handleDeleteContent(id) {
    await api.deleteContent(id);
    setContents((prev) => prev.filter((c) => c.id !== id));
  }

  function handleSelectDeviceForPlaylist(deviceId) {
    setSelectedDeviceId(deviceId);
    setActiveTab('playlists');
  }

  function handleOpenPushModal(device) {
    setPushTargetDevice(device);
    if (contents.length > 0) {
      setSelectedPushContentId(contents[0].id);
    }
  }

  async function handleExecutePush(e) {
    e.preventDefault();
    if (!pushTargetDevice || !selectedPushContentId) return;

    setPushing(true);
    try {
      await api.pushContent(pushTargetDevice.id, selectedPushContentId);
      toast.success(`Content langsung disiarkan ke ${pushTargetDevice.name}!`);
      setPushTargetDevice(null);
    } catch (err) {
      if (err.status === 409 || err.code === 'DEVICE_OFFLINE') {
        toast.error(`Device "${pushTargetDevice.name}" sedang Offline. Tidak dapat mengirim command.`);
      } else {
        toast.error(err.message || 'Gagal mengirim push content');
      }
    } finally {
      setPushing(false);
    }
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar wsState={wsState} user={user} onLogout={handleLogout} />

        <main className="p-6 md:p-8 flex-1 overflow-y-auto max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewPage
              devices={devices}
              contents={contents}
              summary={summary}
              setActiveTab={setActiveTab}
              onOpenAddDevice={() => setActiveTab('devices')}
              onOpenAddContent={() => setActiveTab('contents')}
            />
          )}

          {activeTab === 'devices' && (
            <DevicesPage
              devices={devices}
              loading={devicesLoading}
              searchQuery={deviceSearch}
              setSearchQuery={setDeviceSearch}
              statusFilter={deviceStatusFilter}
              setStatusFilter={setDeviceStatusFilter}
              onCreateDevice={handleCreateDevice}
              onUpdateDevice={handleUpdateDevice}
              onDeleteDevice={handleDeleteDevice}
              onSelectDeviceForPlaylist={handleSelectDeviceForPlaylist}
              onOpenPushModal={handleOpenPushModal}
            />
          )}

          {activeTab === 'contents' && (
            <ContentsPage
              contents={contents}
              loading={contentsLoading}
              searchQuery={contentSearch}
              setSearchQuery={setContentSearch}
              typeFilter={contentTypeFilter}
              setTypeFilter={setContentTypeFilter}
              onCreateContent={handleCreateContent}
              onUpdateContent={handleUpdateContent}
              onDeleteContent={handleDeleteContent}
            />
          )}

          {activeTab === 'playlists' && (
            <PlaylistsPage
              devices={devices}
              contents={contents}
              selectedDeviceId={selectedDeviceId}
              setSelectedDeviceId={setSelectedDeviceId}
              onOpenPushModal={handleOpenPushModal}
            />
          )}
        </main>
      </div>

      {/* Generic Modal: Push Content to Specific Device */}
      <Modal
        isOpen={Boolean(pushTargetDevice)}
        onClose={() => setPushTargetDevice(null)}
        title={`Siaran Langsung ke "${pushTargetDevice?.name || 'Layar'}"`}
      >
        <form onSubmit={handleExecutePush} className="space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            Perintah ini akan langsung menayangkan konten pilihan ke layar{' '}
            <strong className="text-slate-200 font-semibold">{pushTargetDevice?.name}</strong> secara instan
            mengabaikan urutan playlist normal.
          </p>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Pilih Konten Siaran
            </label>
            <select
              value={selectedPushContentId}
              onChange={(e) => setSelectedPushContentId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {contents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.type})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPushTargetDevice(null)}
              className="px-3.5 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={pushing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
            >
              {pushing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Kirim Sekarang</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <DashboardApp />
    </ToastProvider>
  );
}

