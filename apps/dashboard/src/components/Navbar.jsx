import React from 'react';
import { LogOut, Wifi, WifiOff, Loader2, User } from 'lucide-react';

export default function Navbar({ wsState, user, onLogout }) {
  const isConnected  = wsState === 'connected';
  const isConnecting = wsState === 'connecting';

  return (
    <header className="h-14 px-6 flex items-center justify-between border-b border-slate-800/70 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
      {/* WS status */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
        isConnected
          ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400'
          : isConnecting
          ? 'bg-amber-500/8 border-amber-500/20 text-amber-400'
          : 'bg-rose-500/8 border-rose-500/20 text-rose-400'
      }`}>
        {isConnecting ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : isConnected ? (
          <Wifi className="w-3 h-3" />
        ) : (
          <WifiOff className="w-3 h-3" />
        )}
        <span>
          {isConnected ? 'Live' : isConnecting ? 'Menyambung...' : 'Terputus'}
        </span>
        {isConnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
      </div>

      {/* User + logout */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-900 rounded-xl border border-slate-800">
          <div className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-xs">
            <div className="font-semibold text-slate-200 leading-none">{user?.email || 'admin@example.com'}</div>
            <div className="text-[10px] text-slate-500 mt-0.5 capitalize">{user?.role || 'Admin'}</div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-400 hover:bg-rose-500/8 rounded-lg border border-transparent hover:border-rose-500/15 transition-all"
          title="Keluar"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
