import React from 'react';
import { Monitor, Film, CheckCircle2, XCircle, Plus, ArrowUpRight, MapPin, Clock } from 'lucide-react';
import { formatRelativeTime } from '../lib/formatTime';

export default function OverviewPage({ devices, contents, summary, setActiveTab, onOpenAddDevice, onOpenAddContent }) {
  const onlineCount  = devices.filter(d => d.status === 'online').length;
  const offlineCount = devices.filter(d => d.status === 'offline').length;
  const totalDevices = devices.length;
  const totalContent = contents.length;

  const stats = [
    {
      label: 'Total Layar',
      value: totalDevices,
      sub: 'Perangkat terdaftar',
      icon: Monitor,
      color: 'text-slate-400',
      bg: 'bg-slate-800/60',
      border: 'border-slate-700/50',
    },
    {
      label: 'Online',
      value: onlineCount,
      sub: 'Tersambung & aktif',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/8',
      border: 'border-emerald-500/20',
      pulse: true,
    },
    {
      label: 'Offline',
      value: offlineCount,
      sub: 'Tidak terhubung',
      icon: XCircle,
      color: 'text-slate-500',
      bg: 'bg-slate-800/60',
      border: 'border-slate-700/50',
    },
    {
      label: 'Total Konten',
      value: totalContent,
      sub: 'Gambar · Video · Teks',
      icon: Film,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/8',
      border: 'border-indigo-500/20',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Overview</h2>
          <p className="text-sm text-slate-500 mt-0.5">Pemantauan real-time seluruh layar digital signage</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddContent}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700/70 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Upload Konten
          </button>
          <button
            onClick={onOpenAddDevice}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Layar
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, sub, icon: Icon, color, bg, border, pulse }) => (
          <div key={label} className={`p-4 rounded-2xl border ${bg} ${border} relative overflow-hidden`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${color}`}>
                {pulse && <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />}
                {label}
              </span>
              <Icon className={`w-4 h-4 ${color} opacity-70`} />
            </div>
            <div className={`text-3xl font-bold ${color === 'text-emerald-400' ? 'text-emerald-300' : color === 'text-indigo-400' ? 'text-indigo-300' : 'text-slate-200'}`}>
              {value}
            </div>
            <div className="text-[10px] text-slate-600 mt-1 font-medium">{sub}</div>
          </div>
        ))}
      </div>

      {/* Device list */}
      <div className="bg-slate-900/60 border border-slate-800/70 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800/70 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">Status Perangkat</h3>
          <button
            onClick={() => setActiveTab('devices')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
          >
            Lihat semua <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {devices.length === 0 ? (
          <div className="py-16 text-center">
            <Monitor className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-400 mb-1">Belum ada perangkat</p>
            <p className="text-xs text-slate-600 mb-4">Tambahkan layar signage pertama Anda</p>
            <button
              onClick={onOpenAddDevice}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
            >
              Tambah Perangkat
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {devices.slice(0, 6).map(device => {
              const online = device.status === 'online';
              return (
                <div key={device.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-800/20 transition group">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      online ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-slate-800 border border-slate-700/50'
                    }`}>
                      <Monitor className={`w-4 h-4 ${online ? 'text-emerald-400' : 'text-slate-500'}`} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-200 leading-none">{device.name}</div>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-600">
                        <MapPin className="w-3 h-3" />
                        {device.location || 'Lokasi belum disetel'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-600">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(device.last_seen)}
                    </div>
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      online
                        ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800/80 border-slate-700/50 text-slate-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                      {online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
