import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Trash2,
  Send,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Loader2,
  Tv,
  Radio,
  Sparkles
} from 'lucide-react';
import { ScheduledPostItem } from '../types';
import { api } from '../services/api';

interface ScheduledViewProps {
  scheduledPosts: ScheduledPostItem[];
  onRefreshScheduled: () => void;
  onRefreshHistory: () => void;
}

export const ScheduledView: React.FC<ScheduledViewProps> = ({
  scheduledPosts,
  onRefreshScheduled,
  onRefreshHistory
}) => {
  const [isRunningCron, setIsRunningCron] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  const handleRunAllNow = async () => {
    setIsRunningCron(true);
    try {
      const res = await api.runSchedulerNow();
      alert(`Scheduler triggered! Published ${res.publishedCount} post(s).`);
      onRefreshScheduled();
      onRefreshHistory();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunningCron(false);
    }
  };

  const handleCancelPost = async (id: string) => {
    if (confirm('Cancel and remove this scheduled post?')) {
      await api.cancelScheduledPost(id);
      onRefreshScheduled();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-slate-900 to-slate-900 border border-white/10 shadow-lg">
        <div>
          <h1 className="text-lg sm:text-xl font-cinzel font-bold text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <span>Scheduled Publication Queue</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Server-side temporary storage. Items auto-delete from server upon publication.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefreshScheduled}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Refresh queue"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleRunAllNow}
            disabled={isRunningCron || scheduledPosts.length === 0}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-500/20 active:scale-95 transition"
          >
            {isRunningCron ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>Run Scheduler Now</span>
          </button>
        </div>
      </div>

      {/* Info notice */}
      <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex items-start gap-2.5 text-xs text-indigo-200">
        <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Automated Background Execution:</span> On InfinityFree, your cron job runs <code>cron/scheduler.php</code> every minute. You can also click "Run Scheduler Now" to publish due posts immediately.
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {scheduledPosts.length === 0 ? (
          <div className="p-12 rounded-2xl bg-[#0c101a] border border-dashed border-white/10 text-center text-xs text-slate-400">
            <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
            <p>No scheduled posts in the queue.</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Use the "Schedule Post" button in the Upload tab to set future releases.
            </p>
          </div>
        ) : (
          scheduledPosts.map((post) => (
            <div
              key={post.id}
              className="p-4 sm:p-5 rounded-2xl bg-[#0c101a] border border-white/10 shadow-lg space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    {post.movieTitle} {post.year ? `(${post.year})` : ''}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-indigo-300 mt-0.5 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {new Date(post.scheduledDateTime).toLocaleString()} ({post.timezone})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                    Scheduled
                  </span>

                  <button
                    onClick={() => handleCancelPost(post.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Cancel & Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Target channels */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5 text-xs text-slate-400">
                {(post.genreChannels || []).map((c, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-white/5"
                  >
                    <Tv className="w-3 h-3" />
                    <span>{c.name || c.chatId}</span>
                  </span>
                ))}
                {(post.hubChannels || []).map((h, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 text-cyan-300 border border-white/5"
                  >
                    <Radio className="w-3 h-3" />
                    <span>{h.name || h.chatId}</span>
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
