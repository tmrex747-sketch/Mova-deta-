import React, { useState, useEffect } from 'react';
import {
  Layers,
  X,
  Plus,
  Trash2,
  Check,
  Link,
  HardDrive,
  AlertCircle
} from 'lucide-react';
import { QualityItem } from '../types';

interface QualityModalProps {
  isOpen: boolean;
  onClose: () => void;
  qualities: QualityItem[];
  onSave: (qualities: QualityItem[]) => void;
}

export const QualityModal: React.FC<QualityModalProps> = ({
  isOpen,
  onClose,
  qualities,
  onSave
}) => {
  const [items, setItems] = useState<QualityItem[]>([]);
  const [newQualityName, setNewQualityName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setItems(JSON.parse(JSON.stringify(qualities)));
    }
  }, [isOpen, qualities]);

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const handleFieldChange = (id: string, field: 'url' | 'size' | 'name', value: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQualityName.trim()) return;
    const newItem: QualityItem = {
      id: 'qual-' + Date.now(),
      name: newQualityName.trim(),
      url: '',
      size: '',
      enabled: true
    };
    setItems((prev) => [...prev, newItem]);
    setNewQualityName('');
  };

  const handleSave = () => {
    onSave(items);
    onClose();
  };

  const enabledCountWithUrl = items.filter(
    (item) => item.enabled && item.url.trim().length > 0
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0e1320] border border-white/10 shadow-2xl shadow-black/80 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-900/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Download Quality System</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/30">
                  {enabledCountWithUrl} Active Links
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Only enabled qualities with valid URLs will appear in the generated post.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add Custom Quality Quick Form */}
        <form
          onSubmit={handleAddCustom}
          className="px-5 py-3 border-b border-white/5 bg-slate-900/40 flex items-center gap-2"
        >
          <input
            type="text"
            value={newQualityName}
            onChange={(e) => setNewQualityName(e.target.value)}
            placeholder="Add custom quality (e.g., 1080p 60FPS, 4K HDR)..."
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-amber-500/50"
          />
          <button
            type="submit"
            disabled={!newQualityName.trim()}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Add</span>
          </button>
        </form>

        {/* Quality Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border p-3.5 transition-all ${
                item.enabled
                  ? 'bg-slate-900/80 border-amber-500/30 shadow-md shadow-amber-500/5'
                  : 'bg-slate-950/40 border-white/5 opacity-75'
              }`}
            >
              {/* Row 1: Checkbox & Name & Delete */}
              <div className="flex items-center justify-between gap-3 mb-2.5">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={() => handleToggle(item.id)}
                    className="w-4 h-4 rounded border-white/20 bg-slate-950 text-amber-500 focus:ring-amber-500/40 focus:ring-offset-0 cursor-pointer accent-amber-500"
                  />
                  <span
                    className={`text-sm font-bold tracking-wide ${
                      item.enabled ? 'text-amber-300' : 'text-slate-400 line-through'
                    }`}
                  >
                    {item.name}
                  </span>
                </label>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Remove quality"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Row 2: Inputs for URL and Size (shown if enabled) */}
              {item.enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                  {/* Download URL Input */}
                  <div className="sm:col-span-8 relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="url"
                      value={item.url}
                      onChange={(e) => handleFieldChange(item.id, 'url', e.target.value)}
                      placeholder="Download URL (e.g., https://drive.google.com/...)"
                      className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950/90 border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500/50 outline-none"
                    />
                  </div>

                  {/* File Size Input */}
                  <div className="sm:col-span-4 relative">
                    <HardDrive className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={item.size || ''}
                      onChange={(e) => handleFieldChange(item.id, 'size', e.target.value)}
                      placeholder="Size (e.g. 2.4 GB)"
                      className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950/90 border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500/50 outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Notice Info */}
        <div className="px-5 py-2.5 bg-amber-500/10 border-t border-amber-500/20 flex items-center gap-2 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>URLs are displayed as clickable inline links. No Telegram inline buttons are used.</span>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-white/10 bg-slate-900/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Save Qualities</span>
          </button>
        </div>
      </div>
    </div>
  );
};
