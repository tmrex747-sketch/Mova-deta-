import React, { useState } from 'react';
import {
  History,
  Search,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Film,
  Calendar,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { UploadHistoryItem } from '../types';
import { api } from '../services/api';
import { ConfirmModal } from '../components/ConfirmModal';

interface HistoryViewProps {
  history: UploadHistoryItem[];
  onRefreshHistory: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onRefreshHistory
}) => {
  const [filter, setFilter] = useState<'all' | 'completed' | 'partial' | 'failed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const filtered = history.filter((item) => {
    const matchesStatus = filter === 'all' || item.status === filter;
    const matchesSearch =
      !searchTerm || (item.title || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleClearAll = async () => {
    await api.clearHistory('all');
    onRefreshHistory();
  };

  const handleDeleteItem = async (id: string) => {
    await api.clearHistory(id);
    onRefreshHistory();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-slate-900 to-slate-900 border border-white/10 shadow-lg">
        <div>
          <h1 className="text-lg sm:text-xl font-cinzel font-bold text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            <span>Upload &amp; Publishing History</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Lightweight operational logs. Movie files/post data are NOT permanently stored on the server.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefreshHistory}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Refresh history"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {history.length > 0 && (
            <button
              onClick={() => setIsConfirmOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/50 border border-white/5 hover:border-rose-500/30 text-slate-300 hover:text-rose-300 text-xs font-semibold transition"
            >
              Clear Logs
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search movie title..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto p-1 rounded-xl bg-slate-950 border border-white/10 text-xs">
          {(['all', 'completed', 'partial', 'failed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg capitalize font-semibold transition ${
                filter === f
                  ? 'bg-slate-800 text-amber-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* History Items List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 rounded-2xl bg-[#0c101a] border border-dashed border-white/10 text-center text-xs text-slate-400">
            <History className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
            <p>No publishing history records found.</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="p-4 sm:p-5 rounded-2xl bg-[#0c101a] border border-white/10 shadow-lg space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      item.status === 'completed'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : item.status === 'partial'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {item.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : item.status === 'partial' ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <span>{item.title}</span>
                      {item.year && (
                        <span className="text-slate-400 font-normal">({item.year})</span>
                      )}
                      {item.isDemo && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                          Demo Mode
                        </span>
                      )}
                    </h3>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {item.dateStr}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border ${
                      item.status === 'completed'
                        ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                        : item.status === 'partial'
                        ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                        : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {item.status.toUpperCase()}
                  </span>

                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Channels summary */}
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5 text-xs">
                {(item.successfulChannels || []).map((ch, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 text-[11px]"
                  >
                    ✓ {ch}
                  </span>
                ))}
                {(item.failedChannels || []).map((ch, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-rose-950/50 text-rose-300 border border-rose-500/30 text-[11px]"
                  >
                    ✕ {ch}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Clear History Logs"
        message="Are you sure you want to clear all upload and publishing history logs from the server? This action cannot be undone."
        confirmText="Clear All"
        isDestructive={true}
        onConfirm={handleClearAll}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
};
