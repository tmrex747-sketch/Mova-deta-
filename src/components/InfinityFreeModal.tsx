import React, { useState } from 'react';
import { Server, X, Copy, Check, Terminal, FolderTree, AlertCircle, Sparkles } from 'lucide-react';
import { copyToClipboardSafe } from '../utils/clipboard';

interface InfinityFreeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfinityFreeModal: React.FC<InfinityFreeModalProps> = ({
  isOpen,
  onClose
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyText = async (text: string, id: string) => {
    await copyToClipboardSafe(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const projectTree = `Mova-Deta/
│
├── index.html                   (Built frontend entry)
├── api/
│   ├── config.php               (Settings API)
│   ├── channels.php             (Genre & Hub channels API)
│   ├── shortener.php            (URL Shorteners API)
│   ├── promotions.php           (Promotions API)
│   ├── tmdb.php                 (TMDB movie search proxy)
│   ├── telegram.php             (Bot API gateway - HTML mode)
│   ├── uploads.php              (Posters upload & History API)
│   └── scheduler.php            (Background tasks API)
│
├── data/
│   ├── settings.json            (Server config)
│   ├── genre-channels.json      (Genre channels list)
│   ├── hub-channels.json        (Hub channels list)
│   ├── shorteners.json          (Shorteners config)
│   ├── promotions.json          (Promotions config)
│   ├── upload-history.json      (Lightweight history)
│   └── scheduled-posts.json     (Temporary scheduled queue)
│
├── uploads/
│   └── posters/                 (Uploaded 16:9 movie posters)
│
└── cron/
    └── scheduler.php            (Cron runner for background queue)`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0d111c] border border-white/10 shadow-2xl shadow-black/80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>InfinityFree Deployment Guide</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                  PHP + JSON Storage
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                100% Free Hosting Ready. No MySQL, No Firebase, Zero External Database Fees.
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-300">
          {/* Overview */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Why InfinityFree is 100% Supported:</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Mova Deta is engineered specifically to run natively on standard cPanel/Apache shared hosting like InfinityFree. All data operations utilize atomic file locks (<code>flock</code>) over server-side JSON files located in <code>data/</code>. No Node.js runtime is needed on the remote hosting.
            </p>
          </div>

          {/* Directory Tree */}
          <div>
            <div className="font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
              <FolderTree className="w-4 h-4 text-cyan-400" />
              <span>Hosting Folder Structure (Inside htdocs/):</span>
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-950 font-mono text-[11px] text-cyan-300 border border-white/10 overflow-x-auto leading-relaxed">
              {projectTree}
            </pre>
          </div>

          {/* Cron Job Setup */}
          <div className="space-y-2">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span>Cron Job Command for Scheduled Posts:</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Run every minute:</span>
                <button
                  onClick={() =>
                    copyText(
                      '* * * * * php -q /home/volX_X/htdocs/cron/scheduler.php',
                      'cron-cmd'
                    )
                  }
                  className="flex items-center gap-1 text-[11px] text-amber-400 hover:underline"
                >
                  {copiedId === 'cron-cmd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedId === 'cron-cmd' ? 'Copied' : 'Copy Command'}</span>
                </button>
              </div>
              <code className="block p-2 rounded bg-slate-900 text-amber-300 font-mono text-xs">
                * * * * * php -q /home/volX_X/htdocs/cron/scheduler.php
              </code>
              <p className="text-[11px] text-slate-400">
                In InfinityFree cPanel, go to <b>Cron Jobs</b> &gt; Set schedule to <b>* * * * *</b> and paste the command above. Replace <code>/home/volX_X/htdocs</code> with your actual home directory path from the cPanel sidebar.
              </p>
            </div>
          </div>

          {/* Permissions note */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Directory Permissions:</div>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                Ensure the <code>data/</code> and <code>uploads/</code> directories have <code>755</code> (or <code>777</code>) write permissions in the File Manager so the PHP scripts can write settings and posters.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-white/10 bg-slate-900/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
