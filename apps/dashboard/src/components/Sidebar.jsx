import React from 'react';
import { LayoutDashboard, Monitor, Film, ListMusic, Radio } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview',  label: 'Overview',  icon: LayoutDashboard },
  { id: 'devices',   label: 'Perangkat', icon: Monitor },
  { id: 'contents',  label: 'Konten',    icon: Film },
  { id: 'playlists', label: 'Playlist',  icon: ListMusic },
];

export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="w-60 shrink-0 flex flex-col bg-slate-950 border-r border-slate-800/70">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
          <Radio className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-bold text-slate-100 leading-none">Signage Panel</div>
          <div className="text-[10px] text-indigo-400 font-medium mt-0.5">MJ Solution Indonesia</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 flex-1 space-y-0.5">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-indigo-400' : 'text-slate-500'}`} />
              {label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer info */}
      <div className="px-4 py-4 border-t border-slate-800/60">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-slate-500 font-medium">Node REST · WebSocket · Electron</span>
        </div>
      </div>
    </aside>
  );
}
