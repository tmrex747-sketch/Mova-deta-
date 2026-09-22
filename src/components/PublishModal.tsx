import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  RefreshCw,
  X,
  ExternalLink,
  Tv,
  Radio,
  Sparkles
} from 'lucide-react';

export interface PublishStep {
  id: string;
  label: string;
  status: 'waiting' | 'in_progress' | 'done' | 'error';
}

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPublishing: boolean;
  currentStepIndex: number;
  steps: PublishStep[];
  resultStatus: 'completed' | 'partial' | 'failed' | null;
  successfulChannels: string[];
  failedChannels: string[];
  isDemoMode: boolean;
  onRetryFailed: () => void;
}

export const PublishModal: React.FC<PublishModalProps> = ({
  isOpen,
  onClose,
  isPublishing,
  currentStepIndex,
  steps,
  resultStatus,
  successfulChannels,
  failedChannels,
  isDemoMode,
  onRetryFailed
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0e1320] border border-white/10 shadow-2xl shadow-black/80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              {isPublishing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : resultStatus === 'completed' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : resultStatus === 'partial' ? (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-400" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>{isPublishing ? 'Publishing Movie...' : 'Publish Status'}</span>
                {isDemoMode && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                    DEMO SIMULATION
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {isPublishing
                  ? 'Multi-channel asynchronous publishing in progress'
                  : resultStatus === 'completed'
                  ? 'All channels successfully published!'
                  : resultStatus === 'partial'
                  ? 'Partially published to channels'
                  : 'Publishing encountered errors'}
              </p>
            </div>
          </div>
          {!isPublishing && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress Steps */}
        <div className="p-5 space-y-3.5">
          {steps.map((step, idx) => {
            const isCurrent = idx === currentStepIndex && isPublishing;
            const isDone = step.status === 'done';
            const isError = step.status === 'error';

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : isDone
                    ? 'bg-slate-900/60 border-emerald-500/20 text-slate-200'
                    : isError
                    ? 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                    : 'bg-slate-950/40 border-white/5 text-slate-500'
                }`}
              >
                <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                  {isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  ) : isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isError ? (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-600" />
                  )}
                </div>
                <span className="text-xs font-semibold">{step.label}</span>
              </div>
            );
          })}

          {/* Results Details */}
          {!isPublishing && resultStatus && (
            <div className="mt-4 pt-3 border-t border-white/10 space-y-3">
              {/* Successful channels */}
              {successfulChannels.length > 0 && (
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
                  <div className="text-xs font-bold text-emerald-400 mb-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Successful Channels ({successfulChannels.length}):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {successfulChannels.map((c, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-[11px] rounded-md bg-emerald-900/40 text-emerald-200 border border-emerald-500/30"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed channels */}
              {failedChannels.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/20">
                  <div className="text-xs font-bold text-rose-400 mb-1.5 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Failed Channels ({failedChannels.length}):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {failedChannels.map((c, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-[11px] rounded-md bg-rose-900/40 text-rose-200 border border-rose-500/30"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={onRetryFailed}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-200 text-xs font-semibold transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Failed Channels</span>
                  </button>
                </div>
              )}

              {isDemoMode && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Demo Mode Confirmation</span>
                  </div>
                  <p className="text-[11px] text-amber-200/80 mt-1">
                    Demo mode simulates Telegram upload and channels without sending real Telegram API requests. Add a valid Bot Token in Settings to publish live!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-white/10 bg-slate-900/80 flex items-center justify-end gap-2">
          {!isPublishing && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
