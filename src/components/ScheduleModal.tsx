import React, { useState } from 'react';
import { Calendar, Clock, X, Check, Globe, AlertCircle, Sparkles } from 'lucide-react';
import { GenreChannel, HubChannel } from '../types';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieTitle: string;
  year: string;
  genreChannels: GenreChannel[];
  hubChannels: HubChannel[];
  onConfirmSchedule: (datetime: string, timezone: string) => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  movieTitle,
  year,
  genreChannels,
  hubChannels,
  onConfirmSchedule
}) => {
  // Default to 1 hour from now formatted for datetime-local input
  const defaultDateTime = () => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const [dateTime, setDateTime] = useState(defaultDateTime());
  const [timezone, setTimezone] = useState('Asia/Dhaka');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateTime) return;
    onConfirmSchedule(dateTime, timezone);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#0e1320] border border-white/10 shadow-2xl shadow-black/80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Schedule Post</h3>
              <p className="text-xs text-slate-400">Set automatic future publication</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Target Movie & Channels Summary */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 space-y-2">
            <div className="text-xs text-slate-400">Movie to publish:</div>
            <div className="text-sm font-bold text-amber-300">
              {movieTitle} {year ? `(${year})` : ''}
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] text-slate-300">
              <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400">
                {genreChannels.length} Genre Channel(s)
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400">
                {hubChannels.length} Hub Channel(s)
              </span>
            </div>
          </div>

          {/* Date & Time Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Scheduled Date &amp; Time</span>
            </label>
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-slate-100 text-sm focus:border-amber-500/50 outline-none"
            />
          </div>

          {/* Timezone Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>Target Timezone</span>
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 text-xs focus:border-amber-500/50 outline-none"
            >
              <option value="Asia/Dhaka">Asia/Dhaka (GMT+6 - Bangladesh Standard Time)</option>
              <option value="Asia/Kolkata">Asia/Kolkata (GMT+5:30 - Indian Standard Time)</option>
              <option value="UTC">UTC (Coordinated Universal Time)</option>
            </select>
          </div>

          {/* Server-side Storage Rule Notice */}
          <div className="p-3 rounded-xl bg-slate-900/70 border border-white/5 text-[11px] text-slate-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Post data is temporarily held in server-side queue (<code className="text-amber-300">scheduled-posts.json</code>) until successfully published, then automatically deleted.
            </span>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 active:scale-95 transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Confirm Schedule</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
