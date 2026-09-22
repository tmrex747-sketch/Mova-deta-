import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Search,
  X,
  Star,
  Film,
  Check,
  TrendingUp,
  Flame,
  Globe,
  Clapperboard,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { TMDBMovie } from '../types';
import { api } from '../services/api';

interface TMDBMagicSearchProps {
  onSelectMovie: (movie: {
    title: string;
    year: string;
    imdbRating: string;
    genres: string[];
    backdropUrl: string;
    language?: string;
    id?: number;
    backdrops?: string[];
  }) => void;
  onOpenFullModal?: () => void;
}

export const TMDBMagicSearch: React.FC<TMDBMagicSearchProps> = ({
  onSelectMovie,
  onOpenFullModal
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('trending');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TMDBMovie[]>([]);
  const [cleanedQuery, setCleanedQuery] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [magicFeedback, setMagicFeedback] = useState<string | null>(null);
  const searchTimeoutRef = useRef<any>(null);

  // Load movies whenever query or category changes
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchMovies(query, selectedCategory);
    }, 250);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query, selectedCategory]);

  const fetchMovies = async (q: string, cat: string) => {
    setLoading(true);
    try {
      const res = await api.searchTMDB(q, cat);
      setResults(res.results || []);
      setCleanedQuery(res.cleanedQuery && res.cleanedQuery !== q ? res.cleanedQuery : null);
    } catch (e) {
      console.error('Magic Search error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (movie: TMDBMovie) => {
    const backdrop = movie.backdrop_path || movie.poster_path;
    const cleanYear = movie.year || (movie.release_date ? movie.release_date.slice(0, 4) : '2024');

    // Guess language based on genres or movie title origin
    let detectedLang = 'Dual Audio';
    if (movie.category === 'bollywood') detectedLang = 'Hindi';
    else if (movie.category === 'south') detectedLang = 'Hindi + Multi';
    else if (movie.category === 'hollywood') detectedLang = 'Dual Audio (Eng-Hin)';

    onSelectMovie({
      title: movie.title.toUpperCase(),
      year: cleanYear,
      imdbRating: movie.imdb_rating || '7.5',
      genres: movie.genres && movie.genres.length > 0 ? movie.genres : ['#Action', '#Drama'],
      backdropUrl: backdrop,
      language: detectedLang,
      id: movie.id,
      backdrops: movie.backdrops
    });

    setMagicFeedback(`✨ "${movie.title}" সফলভাবে লোড হয়েছে!`);
    setTimeout(() => {
      setMagicFeedback(null);
    }, 3500);
  };

  const categories = [
    { id: 'trending', label: '🔥 Trending', icon: Flame },
    { id: 'bollywood', label: '🎬 Bollywood', icon: Clapperboard },
    { id: 'hollywood', label: '🍿 Hollywood', icon: Film },
    { id: 'south', label: '⚔️ South Indian', icon: Globe },
    { id: 'top_rated', label: '⭐ Top Rated', icon: TrendingUp }
  ];

  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-[#121626] via-[#0d111d] to-[#0a0d16] border-2 border-amber-500/30 p-4 sm:p-5 shadow-2xl shadow-amber-500/5 space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-black shadow-md shadow-amber-500/30">
            <Sparkles className="w-4 h-4 text-black animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-amber-300 tracking-wide uppercase">
                TMDB Magic Search
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                AI Auto-Detect
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              মুভির নাম, TMDB / IMDb লিংক বা টরেন্ট টাইটেল লিখলেই স্বয়ংক্রিয় ১৬:৯ পোস্ট ও ডাটা প্রস্তুত হবে।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenFullModal && (
            <button
              type="button"
              onClick={onOpenFullModal}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition border border-white/10"
            >
              <span>Full Library</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Success Magic Alert */}
      {magicFeedback && (
        <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{magicFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setMagicFeedback(null)}
            className="text-emerald-400 hover:text-emerald-100 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isExpanded && (
        <>
          {/* Magic Search Input */}
          <div className="space-y-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                {loading ? (
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ম্যাজিক সার্চ: সিনেমার নাম, TMDB / IMDb লিংক বা টাইটেল পেস্ট করুন (যেমন: Avatar, Jawan, Dune)..."
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#090c14] border border-amber-500/40 text-slate-100 placeholder:text-slate-500 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition shadow-inner"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Cleaned Query Notice */}
            {cleanedQuery && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-300/90 pl-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>ম্যাজিক ক্লিনড টাইটেল: <b>"{cleanedQuery}"</b></span>
              </div>
            )}
          </div>

          {/* Quick Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id && !query;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    if (query) setQuery('');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 font-bold'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/10 hover:border-white/20'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-amber-400'}`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Results Grid / Horizontal Scroller */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>
                {query ? `ফলাফল: "${query}"` : `জনপ্রিয় সিনেমা (${results.length})`}
              </span>
              <span className="text-[10px] text-amber-400 font-mono">
                ⚡ ক্লিক করলেই ফর্ম অটো-ফিল হবে
              </span>
            </div>

            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                <span className="text-xs">TMDB থেকে ম্যাজিক ডাটা অনুসন্ধান করা হচ্ছে...</span>
              </div>
            ) : results.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 border border-dashed border-white/10 rounded-xl">
                কোনো সিনেমা পাওয়া যায়নি। অন্য কোনো নাম দিয়ে সার্চ করুন।
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                {results.map((m) => {
                  const img = m.backdrop_path || m.poster_path;
                  return (
                    <div
                      key={m.id}
                      className="group flex flex-col p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-white/10 hover:border-amber-500/50 transition duration-200 shadow-md"
                    >
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-black/60 border border-white/5 mb-2">
                        <img
                          src={img}
                          alt={m.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          loading="lazy"
                        />
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                          16:9
                        </div>
                        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{m.imdb_rating || '7.5'}</span>
                        </div>
                        <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-slate-200 font-mono">
                          {m.year || '2024'}
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-100 line-clamp-1 group-hover:text-amber-300 transition">
                            {m.title}
                          </h4>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(m.genres || []).slice(0, 2).map((g, idx) => (
                              <span
                                key={idx}
                                className="text-[9px] px-1 py-0.2 rounded bg-white/5 text-slate-400"
                              >
                                {g}
                              </span>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelect(m)}
                          className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-amber-500/15 group-hover:bg-amber-500 text-amber-300 group-hover:text-black text-xs font-bold transition border border-amber-500/30 active:scale-95 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Magic Auto-Fill</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
