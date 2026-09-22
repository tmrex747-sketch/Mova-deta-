import React from 'react';
import {
  Upload,
  Link2,
  Tv,
  Megaphone,
  Radio,
  Settings,
  Calendar,
  History
} from 'lucide-react';
import { NavTab } from './Sidebar';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingScheduledCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  pendingScheduledCount
}) => {
  const primaryTabs = [
    { id: 'upload' as NavTab, label: 'Upload', icon: Upload },
    { id: 'genre' as NavTab, label: 'Genre', icon: Tv },
    { id: 'hub' as NavTab, label: 'Hub', icon: Radio },
    { id: 'shortener' as NavTab, label: 'Shortner', icon: Link2 },
    { id: 'promotion' as NavTab, label: 'Promo', icon: Megaphone },
    {
      id: 'scheduled' as NavTab,
      label: 'Schedule',
      icon: Calendar,
      badge: pendingScheduledCount > 0 ? pendingScheduledCount : null
    },
    { id: 'history' as NavTab, label: 'History', icon: History },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090c14]/95 backdrop-blur-lg border-t border-white/10 px-1 py-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-around gap-0.5 max-w-lg mx-auto overflow-x-auto no-scrollbar">
        {primaryTabs.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex flex-col items-center justify-center min-w-[52px] h-[52px] px-1 py-1 rounded-xl transition-all ${
                isActive
                  ? 'text-amber-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg transition-transform ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 scale-105'
                    : 'text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] tracking-tight leading-tight mt-0.5 truncate max-w-[48px]">
                {item.label}
              </span>
              {item.badge && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-[#090c14]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
