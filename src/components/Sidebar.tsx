import React from 'react';
import {
  Upload,
  Settings,
  Link2,
  Tv,
  Megaphone,
  Radio,
  History,
  Calendar,
  Sparkles,
  HelpCircle
} from 'lucide-react';

export type NavTab =
  | 'upload'
  | 'settings'
  | 'shortener'
  | 'genre'
  | 'promotion'
  | 'hub'
  | 'history'
  | 'scheduled';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingScheduledCount: number;
  onOpenManual: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingScheduledCount,
  onOpenManual
}) => {
  const navItems = [
    { id: 'upload' as NavTab, label: 'Upload & Post', icon: Upload, badge: null },
    { id: 'shortener' as NavTab, label: 'Shortner', icon: Link2, badge: null },
    { id: 'genre' as NavTab, label: 'Genre Channel', icon: Tv, badge: null },
    { id: 'hub' as NavTab, label: 'Hub Channel', icon: Radio, badge: null },
    { id: 'promotion' as NavTab, label: 'Promotion', icon: Megaphone, badge: null },
    {
      id: 'scheduled' as NavTab,
      label: 'Scheduled Posts',
      icon: Calendar,
      badge: pendingScheduledCount > 0 ? pendingScheduledCount : null
    },
    { id: 'history' as NavTab, label: 'Upload History', icon: History, badge: null },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings, badge: null },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-white/10 bg-[#090c14]/90 backdrop-blur-xl min-h-[calc(100vh-61px)] p-4">
      {/* Navigation Group */}
      <div className="space-y-1.5 flex-1">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Management
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-amber-400' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge !== null && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info / Bangla Manual */}
      <div className="pt-4 border-t border-white/10 space-y-2">
        <button
          onClick={onOpenManual}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-amber-500/10 border border-white/5 hover:border-amber-500/20 text-slate-300 hover:text-amber-300 text-xs transition"
        >
          <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="text-left">
            <div className="font-medium text-amber-300">বাংলা ইউজার ম্যানুয়াল</div>
            <div className="text-[10px] text-slate-400">Step-by-step Setup Guide</div>
          </div>
        </button>

        <div className="px-3 py-2 rounded-lg bg-slate-900/40 border border-white/5 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Personal Publisher</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Personal use only for movies you own or have distribution permission.
          </p>
        </div>
      </div>
    </aside>
  );
};
