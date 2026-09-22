import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Download,
  Check,
  RefreshCw,
  Sliders,
  Type,
  Image as ImageIcon,
  ShieldAlert,
  Layers,
  Wand2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { generateMovieThumbnail } from '../utils/thumbnailStudio';

interface ThumbnailStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBackdrop: string;
  movieTitle: string;
  year: string;
  imdbRating?: string;
  language?: string;
  qualities?: string[];
  channelName?: string;
  availableBackdrops?: string[];
  onApplyThumbnail: (dataUrl: string) => void;
}

export const ThumbnailStudioModal: React.FC<ThumbnailStudioModalProps> = ({
  isOpen,
  onClose,
  initialBackdrop,
  movieTitle,
  year,
  imdbRating = '7.8',
  language = 'Hindi',
  qualities = ['480p', '720p HEVC', '1080p'],
  channelName = 'MOVA DETA CINEMA',
  availableBackdrops = [],
  onApplyThumbnail
}) => {
  const [backdrop, setBackdrop] = useState(initialBackdrop);
  const [backdropList, setBackdropList] = useState<string[]>([]);
  const [backdropIdx, setBackdropIdx] = useState(0);
  const [title, setTitle] = useState(movieTitle);
  const [customYear, setCustomYear] = useState(year);
  const [rating, setRating] = useState(imdbRating);
  const [audioLang, setAudioLang] = useState(language);
  const [channelBrand, setChannelBrand] = useState(channelName);
  const [logoUrl, setLogoUrl] = useState('');
  const [darknessLevel, setDarknessLevel] = useState<'light' | 'normal' | 'cinematic'>('normal');
  const [generatedThumb, setGeneratedThumb] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      const list = availableBackdrops && availableBackdrops.length > 0 
        ? availableBackdrops 
        : [initialBackdrop];
      setBackdropList(list);
      const initialIdx = list.indexOf(initialBackdrop);
      const currentIdx = initialIdx >= 0 ? initialIdx : 0;
      setBackdropIdx(currentIdx);

      setBackdrop(initialBackdrop);
      setTitle(movieTitle);
      setCustomYear(year);
      setRating(imdbRating);
      setAudioLang(language);
      setChannelBrand(channelName);
      handleGenerate(initialBackdrop, movieTitle, year, imdbRating, language, channelName, logoUrl, darknessLevel);
    }
  }, [isOpen, initialBackdrop, movieTitle, year, imdbRating, language, channelName, availableBackdrops]);

  const handlePrevBackdrop = () => {
    if (backdropList.length <= 1) return;
    const nextIdx = (backdropIdx - 1 + backdropList.length) % backdropList.length;
    const newUrl = backdropList[nextIdx];
    setBackdropIdx(nextIdx);
    setBackdrop(newUrl);
    handleGenerate(newUrl, title, customYear, rating, audioLang, channelBrand, logoUrl, darknessLevel);
  };

  const handleNextBackdrop = () => {
    if (backdropList.length <= 1) return;
    const nextIdx = (backdropIdx + 1) % backdropList.length;
    const newUrl = backdropList[nextIdx];
    setBackdropIdx(nextIdx);
    setBackdrop(newUrl);
    handleGenerate(newUrl, title, customYear, rating, audioLang, channelBrand, logoUrl, darknessLevel);
  };

  const handleGenerate = async (
    b = backdrop,
    t = title,
    y = customYear,
    r = rating,
    l = audioLang,
    c = channelBrand,
    logo = logoUrl,
    dark = darknessLevel
  ) => {
    setIsGenerating(true);
    setErrorMsg('');
    try {
      const result = await generateMovieThumbnail({
        backdropUrl: b,
        movieTitle: t,
        year: y,
        imdbRating: r,
        language: l,
        qualities,
        channelName: c,
        logoUrl: logo.trim() ? logo.trim() : undefined,
        darknessLevel: dark
      });
      setGeneratedThumb(result);
    } catch (e: any) {
      console.error('Error generating thumbnail:', e);
      setErrorMsg('Failed to render canvas thumbnail. Using original image.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-[#090d16] border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/10 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500/30 to-amber-600/10 border border-amber-500/40 text-amber-300">
              <Wand2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>16:9 Canvas Thumbnail Studio</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Movie Logo &amp; Badges
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                অটোমেটিক মুভি টাইটেল লোগো, আইএমডিবি রেটিং, অডিও ব্যাজ ও সিনেমাটিক ব্যাকড্রপ কম্পোজিশন।
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

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Main 16:9 Canvas Preview Display */}
          <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-white/15 shadow-2xl flex items-center justify-center group">
            {isGenerating && (
              <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-amber-400">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <span className="text-xs font-semibold text-slate-200">Rendering 16:9 Master Canvas...</span>
              </div>
            )}

            {generatedThumb ? (
              <img
                src={generatedThumb}
                alt="Generated 16:9 Movie Thumbnail"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-6 text-slate-500">
                <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40 text-amber-400" />
                <p className="text-xs">No thumbnail rendered yet.</p>
              </div>
            )}

            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-[11px] font-bold text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-md z-10">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>1280 × 720 Master Canvas</span>
            </div>

            {/* Carousel navigation buttons < > */}
            {backdropList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevBackdrop}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/80 hover:bg-amber-500 text-white hover:text-black border border-white/20 hover:border-amber-400 flex items-center justify-center shadow-2xl transition active:scale-95 cursor-pointer backdrop-blur-sm"
                  title="Previous Backdrop (<)"
                >
                  <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  onClick={handleNextBackdrop}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/80 hover:bg-amber-500 text-white hover:text-black border border-white/20 hover:border-amber-400 flex items-center justify-center shadow-2xl transition active:scale-95 cursor-pointer backdrop-blur-sm"
                  title="Next Backdrop (>)"
                >
                  <ChevronRight className="w-6 h-6 stroke-[2.5]" />
                </button>
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md text-[11px] font-mono text-amber-300 border border-amber-500/30 z-10">
                  Image {backdropIdx + 1} of {backdropList.length}
                </div>
              </>
            )}
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Customization Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {/* Title */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Type className="w-3.5 h-3.5 text-amber-400" />
                <span>Movie Title / Logo Text</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-100 focus:border-amber-500/50 outline-none"
              />
            </div>

            {/* Backdrop URL */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>16:9 Backdrop Image URL</span>
              </label>
              <input
                type="url"
                value={backdrop}
                onChange={(e) => setBackdrop(e.target.value)}
                placeholder="https://image.tmdb.org/t/p/w1280/..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-100 focus:border-amber-500/50 outline-none"
              />
            </div>

            {/* Transparent PNG Logo (Optional) */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Transparent Movie Logo PNG (Optional)</span>
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="Paste PNG logo URL or leave blank"
                className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-100 focus:border-cyan-500/50 outline-none"
              />
            </div>

            {/* Year & Rating */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Release Year &amp; Rating</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customYear}
                  onChange={(e) => setCustomYear(e.target.value)}
                  placeholder="2024"
                  className="w-1/2 px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-100 focus:border-amber-500/50 outline-none"
                />
                <input
                  type="text"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  placeholder="7.8"
                  className="w-1/2 px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-100 focus:border-amber-500/50 outline-none"
                />
              </div>
            </div>

            {/* Audio / Language */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Audio / Format</label>
              <input
                type="text"
                value={audioLang}
                onChange={(e) => setAudioLang(e.target.value)}
                placeholder="Dual Audio [Hindi + English]"
                className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-100 focus:border-amber-500/50 outline-none"
              />
            </div>

            {/* Channel Branding */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Channel / Brand Pill</label>
              <input
                type="text"
                value={channelBrand}
                onChange={(e) => setChannelBrand(e.target.value)}
                placeholder="MOVA DETA CINEMA"
                className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-100 focus:border-amber-500/50 outline-none"
              />
            </div>

            {/* Darkness / Contrast Level (Dark effect fix) */}
            <div className="space-y-1 sm:col-span-2 lg:col-span-3">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                <span>ছবির ব্রাইটনেস ও ডার্ক এফেক্ট (Contrast)</span>
                <span className="text-[10px] text-amber-400">
                  {darknessLevel === 'light' ? 'Light & Clear (উজ্জ্বল)' : darknessLevel === 'normal' ? 'Balanced (স্বাভাবিক)' : 'Deep Cinema'}
                </span>
              </label>
              <div className="flex gap-2">
                {[
                  { id: 'light', label: 'Light (বেশি উজ্জ্বল)', desc: 'ডার্ক এফেক্ট কম' },
                  { id: 'normal', label: 'Balanced (সুপার ক্লিয়ার)', desc: 'স্বাভাবিক সিনেমাটিক' },
                  { id: 'cinematic', label: 'Cinematic', desc: 'ফুল ভিনিয়েট' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      const newLevel = item.id as 'light' | 'normal' | 'cinematic';
                      setDarknessLevel(newLevel);
                      handleGenerate(backdrop, title, customYear, rating, audioLang, channelBrand, logoUrl, newLevel);
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-xl border text-left transition ${
                      darknessLevel === item.id
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                        : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-[11px]">{item.label}</div>
                    <div className="text-[9px] opacity-75">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3.5 border-t border-white/10 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => handleGenerate()}
            disabled={isGenerating}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>Re-render Canvas</span>
          </button>

          <div className="flex items-center gap-2">
            {generatedThumb && (
              <a
                href={generatedThumb}
                download={`${(title || 'movie').replace(/[^a-zA-Z0-9]/g, '_')}_16_9_thumbnail.jpg`}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save to Device</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                if (generatedThumb) {
                  onApplyThumbnail(generatedThumb);
                  onClose();
                }
              }}
              disabled={!generatedThumb || isGenerating}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Use as Post Thumbnail</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
