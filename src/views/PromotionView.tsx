import React, { useState } from 'react';
import {
  Megaphone,
  Plus,
  Trash2,
  ExternalLink,
  Sparkles,
  Check,
  AlertCircle
} from 'lucide-react';
import { Promotion } from '../types';
import { api } from '../services/api';

interface PromotionViewProps {
  promotions: Promotion[];
  onRefreshPromotions: () => void;
}

export const PromotionView: React.FC<PromotionViewProps> = ({
  promotions,
  onRefreshPromotions
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');

  const handleAddPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !text.trim() || !url.trim()) return;

    await api.savePromotion({
      id: 'promo-' + Date.now(),
      title: title.trim(),
      text: text.trim(),
      url: url.trim(),
      active: true
    });

    setTitle('');
    setText('');
    setUrl('');
    setIsAdding(false);
    onRefreshPromotions();
  };

  const handleToggleActive = async (promo: Promotion) => {
    await api.savePromotion({ ...promo, active: !promo.active });
    onRefreshPromotions();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this promotion?')) {
      await api.deletePromotion(id);
      onRefreshPromotions();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-500/10 via-slate-900 to-slate-900 border border-white/10 shadow-lg">
        <div>
          <h1 className="text-lg sm:text-xl font-cinzel font-bold text-slate-100 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-rose-400" />
            <span>Promotion Links</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Bottom promotional links attached at the footer of Genre Channel posts.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Promotion</span>
        </button>
      </div>

      {/* Add Promotion Form */}
      {isAdding && (
        <form
          onSubmit={handleAddPromotion}
          className="p-5 rounded-2xl bg-[#0c101a] border border-amber-500/30 space-y-4 shadow-xl animate-in fade-in duration-200"
        >
          <h2 className="text-sm font-bold text-amber-300 flex items-center gap-2 border-b border-white/5 pb-2">
            <Plus className="w-4 h-4" />
            <span>Add New Promotion</span>
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Internal Label / Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Main Channel Promo Link"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-100 outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Visible Clickable Text (Supports Unicode Bold &amp; Emojis)
              </label>
              <input
                type="text"
                required
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. 📍𝐖𝐀𝐂𝐓𝐇  𝐇𝐎𝐋𝐋𝐘𝐖𝐎𝐎𝐃  𝐌𝐎𝐕𝐈𝐄'ˢ👈"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-100 outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Target Channel / Promo URL
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://t.me/YourChannelName"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-100 outline-none focus:border-amber-500/50 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition shadow-md shadow-amber-500/20"
            >
              Save Promotion
            </button>
          </div>
        </form>
      )}

      {/* Promotions List */}
      <div className="space-y-3">
        {promotions.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#0c101a] border border-dashed border-white/10 text-center text-xs text-slate-400">
            No promotions created yet. Click "Add Promotion" to create one.
          </div>
        ) : (
          promotions.map((p) => (
            <div
              key={p.id}
              className={`p-4 rounded-2xl border transition-all ${
                p.active
                  ? 'bg-[#0c101a] border-white/10'
                  : 'bg-slate-950/40 border-white/5 opacity-60'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-100">{p.title}</h3>
                      {p.active && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                          Active
                        </span>
                      )}
                    </div>

                    {/* Preview rendered text */}
                    <div className="mt-1 text-xs font-semibold text-rose-300">
                      {p.text}
                    </div>

                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-blue-400 hover:underline font-mono inline-block mt-0.5"
                    >
                      {p.url}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      p.active
                        ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                        : 'bg-slate-900 border-white/10 text-slate-400'
                    }`}
                  >
                    {p.active ? 'Active' : 'Disabled'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
