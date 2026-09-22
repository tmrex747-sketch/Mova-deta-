import React, { useState } from 'react';
import {
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Tv,
  Radio,
  Eye,
  FileCode,
  ListTree,
  Send,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { toHyperBold, htmlToPlainText, EmojifyStyle } from '../utils/telegramFormatter';
import { copyToClipboardSafe } from '../utils/clipboard';

interface TelegramPreviewProps {
  genreCaption: string;
  hubCaption: string;
  posterUrl: string;
  movieTitle: string;
  year: string;
  qualities: { name: string; url: string; size?: string }[];
  howToDownloadUrl?: string;
  howToDownloadEnabled?: boolean;
  promotionUrl?: string;
  promotionText?: string;
  genreChannelNames: string[];
  hubChannelNames: string[];
  onRegenerate?: () => void;
  emojifyStyle?: EmojifyStyle;
  onChangeEmojifyStyle?: (style: EmojifyStyle) => void;
}

export const TelegramPreview: React.FC<TelegramPreviewProps> = ({
  genreCaption,
  hubCaption,
  posterUrl,
  movieTitle,
  year,
  qualities,
  howToDownloadUrl,
  howToDownloadEnabled,
  promotionUrl,
  promotionText,
  genreChannelNames,
  hubChannelNames,
  onRegenerate,
  emojifyStyle = 'ultra',
  onChangeEmojifyStyle
}) => {
  const [activeChannelType, setActiveChannelType] = useState<'genre' | 'hub'>('genre');
  const [activeTab, setActiveTab] = useState<'visual' | 'caption' | 'links'>('visual');
  const [copied, setCopied] = useState(false);

  const currentCaption = activeChannelType === 'genre' ? genreCaption : hubCaption;
  const channelDisplay =
    activeChannelType === 'genre'
      ? genreChannelNames[0] || 'Hollywood Hindi Movies'
      : hubChannelNames[0] || 'Mova Deta Main Network Hub';

  const handleCopy = async () => {
    await copyToClipboardSafe(currentCaption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const validQualities = qualities.filter((q) => q.url && q.url.trim().length > 0);

  return (
    <div className="rounded-2xl bg-[#0c101a] border border-white/10 overflow-hidden shadow-2xl">
      {/* Top Bar: Channel Mode Switcher + Tabs */}
      <div className="p-3 sm:p-4 border-b border-white/10 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
        {/* Genre vs Hub Toggle */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-white/10">
          <button
            onClick={() => setActiveChannelType('genre')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeChannelType === 'genre'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Genre Post</span>
          </button>
          <button
            onClick={() => setActiveChannelType('hub')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeChannelType === 'hub'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Hub Post</span>
          </button>
        </div>

        {/* View Mode Tabs (Visual, Caption, Links) */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-white/10 text-xs">
          <button
            onClick={() => setActiveTab('visual')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'visual'
                ? 'bg-slate-800 text-amber-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Visual</span>
          </button>
          <button
            onClick={() => setActiveTab('caption')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'caption'
                ? 'bg-slate-800 text-amber-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Raw Caption</span>
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition ${
              activeTab === 'links'
                ? 'bg-slate-800 text-amber-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListTree className="w-3.5 h-3.5" />
            <span>Links ({validQualities.length})</span>
          </button>
        </div>

        {/* Action Buttons (Copy, Regenerate) */}
        <div className="flex items-center gap-2">
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Regenerate Caption"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-white/10 transition active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Caption'}</span>
          </button>
        </div>
      </div>

      {/* Emojify Output Controls Sub-bar */}
      <div className="px-3.5 py-2 bg-[#090d16] border-b border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="font-bold text-[11px] text-amber-300 tracking-wide">
            Emojify Output:
          </span>
          <span className="text-[10px] text-slate-400 hidden sm:inline">
            (ইমোজি সমৃদ্ধ টেলিগ্রাম ক্যাপশন ফরম্যাট)
          </span>
        </div>

        <div className="flex items-center gap-1 bg-slate-950/90 p-0.5 rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => onChangeEmojifyStyle?.('ultra')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
              emojifyStyle === 'ultra'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Ultra Emojify: Max icons & resolution badges"
          >
            <span>🔥 Ultra</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeEmojifyStyle?.('standard')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
              emojifyStyle === 'standard'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Standard Emojify: Clean movie channel icons"
          >
            <span>✨ Smart</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeEmojifyStyle?.('minimal')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition ${
              emojifyStyle === 'minimal'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Minimal: Plain text without heavy emojis"
          >
            <span>⚡ Classic</span>
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="p-4 sm:p-6 bg-[#0a0d16]">
        {activeTab === 'visual' && (
          <div className="max-w-lg mx-auto">
            {/* Telegram Channel Post Mockup */}
            <div className="rounded-2xl bg-[#1e2638] border border-[#2d3748] shadow-2xl overflow-hidden">
              {/* Telegram Channel Header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#171d2b] border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {channelDisplay.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <span>{channelDisplay}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {activeChannelType === 'genre' ? 'Genre Channel' : 'Main Hub Channel'}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">19:42</span>
              </div>

              {/* 16:9 Movie Backdrop / Poster */}
              <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                {posterUrl ? (
                  <img
                    src={posterUrl}
                    alt={movieTitle}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1280&q=80';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900/80">
                    <Tv className="w-10 h-10 mb-2 opacity-40" />
                    <span className="text-xs">No 16:9 Poster Uploaded</span>
                  </div>
                )}
                <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[11px] font-bold text-amber-300 border border-amber-500/20">
                  {year || '2024'}
                </div>
              </div>

              {/* Post Caption Body with Telegram Look */}
              <div className="p-4 text-xs text-slate-100 font-sans leading-relaxed whitespace-pre-wrap selection:bg-blue-500/30">
                <div
                  className="telegram-caption-rendered leading-relaxed space-y-2"
                  dangerouslySetInnerHTML={{
                    __html: currentCaption
                      .replace(
                        /<a\s+href="([^"]+)">([\s\S]*?)<\/a>/g,
                        '<a href="$1" target="_blank" rel="noreferrer" class="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2 break-all">$2</a>'
                      )
                      .replace(/<b>(.*?)<\/b>/g, '<strong class="font-extrabold text-white">$1</strong>')
                      .replace(/<i>(.*?)<\/i>/g, '<em class="italic text-amber-200">$1</em>')
                      .replace(/\n/g, '<br/>')
                  }}
                />
              </div>

              {/* Telegram Post Footer (Views & Time) */}
              <div className="px-4 py-2 bg-[#171d2b]/60 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <div className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  <span>1.4K views</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>Mova Deta Telegram Bot</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                    HTML Mode
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'caption' && (
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                Telegram HTML Formatted Caption:
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            </div>
            <textarea
              readOnly
              value={currentCaption}
              rows={16}
              className="w-full p-4 rounded-xl bg-slate-950 font-mono text-xs text-amber-200/90 border border-white/10 outline-none resize-none selection:bg-amber-500/30"
            />
          </div>
        )}

        {activeTab === 'links' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="text-xs text-slate-400 font-medium">
              Extracted Link Structure (All links rendered as clickable text, NO buttons):
            </div>

            {/* How to download link */}
            {howToDownloadEnabled && howToDownloadUrl && (
              <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30">
                <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                  <span>📖 How to Download Link:</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300">
                    Always Before Qualities
                  </span>
                </div>
                <a
                  href={howToDownloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-400 hover:underline break-all font-mono"
                >
                  {howToDownloadUrl}
                </a>
              </div>
            )}

            {/* Download Qualities */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300">
                Enabled Quality Download URLs ({validQualities.length}):
              </div>
              {validQualities.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 text-xs text-slate-400 text-center">
                  No download URLs added yet. Click "Edit Qualities" to add links.
                </div>
              ) : (
                validQualities.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-bold text-amber-300 flex items-center gap-2">
                        <span>{q.name}</span>
                        {q.size && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            {q.size}
                          </span>
                        )}
                      </div>
                      <a
                        href={q.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-400 hover:underline break-all font-mono mt-0.5 inline-block"
                      >
                        {q.url}
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Promotion Link */}
            {promotionUrl && (
              <div className="p-3 rounded-xl bg-slate-900 border border-rose-500/30">
                <div className="text-xs font-bold text-rose-400 mb-1">
                  📍 Promotion Text &amp; URL (Bottom of post):
                </div>
                <div className="text-xs text-slate-200 mb-1 font-semibold">{promotionText}</div>
                <a
                  href={promotionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-400 hover:underline break-all font-mono"
                >
                  {promotionUrl}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
