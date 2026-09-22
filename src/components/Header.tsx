import React from 'react';
import {
  Film,
  Bot,
  Wifi,
  Upload,
  Calendar,
  Lock,
  BookOpen,
  Server,
  Menu
} from 'lucide-react';
import { AppSettings } from '../types';

interface HeaderProps {
  settings: AppSettings;
  botStatus: { connected: boolean; username?: string; isDemo: boolean };
  pendingScheduledCount: number;
  onQuickUpload: () => void;
  onOpenManual: () => void;
  onOpenInfinityFree: () => void;
  onLockApp?: () => void;
  onToggleDrawer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  botStatus,
  pendingScheduledCount,
  onQuickUpload,
  onOpenManual,
  onOpenInfinityFree,
  onLockApp,
  onToggleDrawer
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#090c14]/90 backdrop-blur-md px-2.5 sm:px-6 py-2.5 sm:py-3 overflow-hidden">
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 max-w-7xl mx-auto w-full">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2 sm:gap-3 shrink min-w-0">
          <div className="relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500/20 via-rose-500/10 to-amber-600/30 border border-amber-500/30 shadow-lg shadow-amber-500/10 shrink-0">
            <Film className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#090c14]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-cinzel text-sm sm:text-lg lg:text-xl font-bold tracking-wider text-slate-100 uppercase truncate">
                Mova Deta
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Publisher
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden md:block truncate">
              Telegram Content &amp; Channel Automation
            </p>
          </div>
        </div>

        {/* Center/Right: Status Badges & Quick Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Server Sync Status */}
          <div
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-white/5 text-xs text-slate-300"
            title="PHP JSON server storage active"
          >
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px]">Server Storage</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          {/* Telegram Status Badge - hidden on smallest mobile screens to give priority to 3-line menu */}
          <div
            className={`hidden xs:flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border transition-colors ${
              botStatus.connected
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : botStatus.isDemo
                ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
            }`}
          >
            <Bot className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[10px] sm:text-[11px] max-w-[80px] sm:max-w-[120px] truncate">
              {botStatus.connected
                ? botStatus.username || 'Bot Connected'
                : botStatus.isDemo
                ? 'DEMO'
                : 'No Bot'}
            </span>
          </div>

          {/* Scheduled Count Badge */}
          {pendingScheduledCount > 0 && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-950/50 border border-indigo-500/30 text-indigo-300 text-xs font-semibold"
              title={`${pendingScheduledCount} pending scheduled posts in queue`}
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-[11px]">{pendingScheduledCount}</span>
            </div>
          )}

          {/* InfinityFree Manual Button */}
          <button
            onClick={onOpenInfinityFree}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-300 text-xs transition"
            title="InfinityFree Hosting & PHP Deployment Guide"
          >
            <Server className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px]">Hosting Guide</span>
          </button>

          {/* Bangla Manual Button */}
          <button
            onClick={onOpenManual}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium transition"
            title="বাংলা ইউজার ম্যানুয়াল (Bangla User Manual)"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px]">ম্যানুয়াল</span>
          </button>

          {/* PIN Lock Trigger if enabled */}
          {settings.pinLockEnabled && onLockApp && (
            <button
              onClick={onLockApp}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/50 border border-white/10 text-slate-400 hover:text-rose-300 transition"
              title="Lock with PIN"
            >
              <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}

          {/* Quick Upload Button */}
          <button
            onClick={onQuickUpload}
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition"
          >
            <Upload className="w-3.5 h-3.5 text-black shrink-0" />
            <span className="hidden sm:inline">Upload</span>
          </button>

          {/* 3-line Menu Drawer Button (Prominent & Always Inside Screen) */}
          <button
            onClick={onToggleDrawer}
            aria-label="Toggle navigation menu"
            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-amber-500/30 hover:border-amber-500 text-amber-400 hover:text-amber-300 transition shadow-sm active:scale-95 shrink-0"
            title="Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
