import React, { useEffect } from 'react';
import {
  Upload,
  Settings,
  Link2,
  Tv,
  Megaphone,
  Radio,
  History,
  Calendar,
  X,
  BookOpen,
  Server,
  Lock,
  Bot,
  Sparkles,
  ChevronRight,
  Film
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { AppSettings } from '../types';

interface NavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingScheduledCount: number;
  onOpenManual: () => void;
  onOpenInfinityFree: () => void;
  onLockApp?: () => void;
  settings: AppSettings;
  botStatus: { connected: boolean; username?: string; isDemo: boolean };
}

export const NavDrawer: React.FC<NavDrawerProps> = ({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
  pendingScheduledCount,
  onOpenManual,
  onOpenInfinityFree,
  onLockApp,
  settings,
  botStatus
}) => {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const navItems = [
    { id: 'upload' as NavTab, label: 'Upload & Post', icon: Upload, desc: 'TMDB metadata & channel publisher', badge: null },
    { id: 'genre' as NavTab, label: 'Genre Channels', icon: Tv, desc: 'Target movie genre channels', badge: null },
    { id: 'hub' as NavTab, label: 'Hub Channels', icon: Radio, desc: 'Main redirect & network channels', badge: null },
    { id: 'shortener' as NavTab, label: 'URL Shortener', icon: Link2, desc: 'GPLinks, Droplink API routing', badge: null },
    { id: 'promotion' as NavTab, label: 'Promotion Links', icon: Megaphone, desc: 'Post footer promo banners', badge: null },
    {
      id: 'scheduled' as NavTab,
      label: 'Scheduled Posts',
      icon: Calendar,
      desc: 'Server automated publication queue',
      badge: pendingScheduledCount > 0 ? pendingScheduledCount : null
    },
    { id: 'history' as NavTab, label: 'Upload History', icon: History, desc: 'Past publication audit logs', badge: null },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings, desc: 'Bot token, TMDB key & preferences', badge: null },
  ];

  const handleItemClick = (tab: NavTab) => {
    onSelectTab(tab);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Dark backdrop overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* Slide-over Drawer Panel */}
      <div
        className="relative w-full max-w-sm sm:max-w-md bg-[#0b0e17] border-l border-white/10 shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-right duration-250 overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0e121e]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/25 to-amber-600/30 border border-amber-500/30 text-amber-400 shadow-md shadow-amber-500/10">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-cinzel text-base font-bold tracking-wider text-slate-100 uppercase">
                  Mova Deta
                </span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Menu
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Personal Telegram Publisher</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close menu drawer"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/10 border border-transparent hover:border-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bot Status Banner */}
        <div className="px-5 py-3 border-b border-white/5 bg-[#090b12] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-amber-400" />
            <span className="text-slate-300 font-medium">Telegram Bot:</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
              botStatus.connected
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : botStatus.isDemo
                ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}
          >
            {botStatus.connected
              ? botStatus.username || 'Connected'
              : botStatus.isDemo
              ? 'Demo Simulation'
              : 'Disconnected'}
          </span>
        </div>

        {/* Navigation List (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Navigation Modules
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent hover:border-white/5'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                      isActive
                        ? 'bg-amber-500/25 text-amber-400'
                        : 'bg-slate-800/80 text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate flex items-center gap-2">
                      <span>{item.label}</span>
                      {item.badge !== null && (
                        <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-indigo-500/25 text-indigo-300 border border-indigo-500/40">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {item.desc}
                    </div>
                  </div>
                </div>
                <ChevronRight
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    isActive ? 'text-amber-400 translate-x-0.5' : 'text-slate-400'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Drawer Footer Actions & Help */}
        <div className="p-4 border-t border-white/10 bg-[#0e121e] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onOpenManual();
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>বাংলা ম্যানুয়াল</span>
            </button>

            <button
              onClick={() => {
                onOpenInfinityFree();
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 text-xs font-medium transition"
            >
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              <span>Hosting Guide</span>
            </button>
          </div>

          {settings.pinLockEnabled && onLockApp && (
            <button
              onClick={() => {
                onLockApp();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-950/70 border border-rose-500/30 text-rose-300 text-xs font-semibold transition"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock App With PIN</span>
            </button>
          )}

          <div className="pt-2 text-center text-[10px] text-slate-400">
            Mova Deta Publisher • InfinityFree PHP + JSON Storage
          </div>
        </div>
      </div>
    </div>
  );
};
