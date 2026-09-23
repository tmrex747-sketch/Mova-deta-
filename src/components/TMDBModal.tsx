import React, { useState, useEffect } from 'react';
import { Search, X, Film, Star, Check, Sparkles, Loader2 } from 'lucide-react';
import { TMDBMovie } from '../types';
import { api } from '../services/api';
import { toHyperBold } from '../utils/telegramFormatter';

interface TMDBModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMovie: (movie: {
    title: string;
    year: string;
    imdbRating: string;
    genres: string[];
    backdropUrl: string;
    id?: number;
    backdrops?: string[];
  }) => void;
}

export const TMDBModal: React.FC<TMDBModalProps> = ({
  isOpen,
  onClose,
  onSelectMovie
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('trending');
  const [loading, setLoading] = useState(false);
  const [movies, setMovies] = useState<TMDBMovie[]>([]);
  const [source, setSource] = useState<string>('tmdb_live');
  const [cleanedNotice, setCleanedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadMovies(query, selectedCategory);
    }
  }, [isOpen, selectedCategory]);

  const loadMovies = async (q: string, cat?: string) => {
    setLoading(true);
    try {
      const res = await api.searchTMDB(q, cat || selectedCategory);
      setMovies(res.results || []);
      setSource(res.source || 'magic_library');
      if (res.cleanedQuery && res.cleanedQuery !== q) {
        setCleanedNotice(res.cleanedQuery);
      } else {
        setCleanedNotice(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadMovies(query.trim(), selectedCategory);
  };

  if (!isOpen) return null;

  const categories = [
    { id: 'trending', label: '🔥 Trending' },
    { id: 'bollywood', label: '🎬 Bollywood' },
    { id: 'hollywood', label: '🍿 Hollywood' },
    { id: 'south', label: '⚔️ South Indian' },
    { id: 'top_rated', label: '⭐ Top Rated' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0e1320] border border-white/10 shadow-2xl shadow-black/80 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100">
                  TMDB Magic Search Explorer
                </h2>
                {source === 'tmdb_live' ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live TMDB Active
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Demo/Offline Library
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                মুভির নাম বা লিংক লিখে সার্চ করুন — স্বয়ংক্রিয় ১৬:৯ থাম্বনেইল, টাইটেল ও তথ্য ফর্মটিতে ইমপোর্ট হবে।
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

        {/* Search Bar & Category Chips */}
        <div className="p-4 border-b border-white/5 bg-slate-900/30 space-y-2.5">
          <form onSubmit={handleSearch}>
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="মুভির নাম, TMDB/IMDb লিংক বা রিলিজ ফাইলনেম লিখুন..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 text-sm text-slate-100 placeholder-slate-500 outline-none transition"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Magic Search</span>
              </button>
            </div>
          </form>

          {cleanedNotice && (
            <div className="text-[11px] text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>স্মার্ট ক্লিনড কিওয়ার্ড: <b>"{cleanedNotice}"</b></span>
            </div>
          )}

          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(c.id);
                  loadMovies(query, c.id);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === c.id
                    ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-300 border border-white/10 hover:border-white/20'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Movies List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <span className="text-sm">Searching TMDB library...</span>
            </div>
          ) : movies.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm">No movies found. Try another search keyword.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {movies.map((movie) => {
                const img = movie.backdrop_path || movie.poster_path;
                return (
                  <div
                    key={movie.id}
                    className="group relative flex flex-col rounded-xl bg-slate-900/70 border border-white/10 hover:border-amber-500/40 p-3 transition-all hover:bg-slate-800/60 shadow-lg"
                  >
                    {/* 16:9 Backdrop Image Preview */}
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-slate-950 border border-white/5 mb-2.5">
                      {img ? (
                        <img
                          src={img}
                          alt={movie.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1280&q=80';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Film className="w-8 h-8" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-semibold text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{movie.imdb_rating || '7.5'}</span>
                      </div>
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-semibold text-slate-200">
                        {movie.year || '2024'}
                      </div>
                    </div>

                    {/* Movie Information */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-100 line-clamp-1 group-hover:text-amber-300 transition">
                          {toHyperBold(movie.title.toUpperCase())}
                        </h3>
                        <div className="flex flex-wrap gap-1 mt-1.5 mb-3">
                          {movie.genres.slice(0, 3).map((g, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 text-[10px] rounded bg-slate-800 text-slate-300 border border-white/5"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onSelectMovie({
                            title: movie.title,
                            year: movie.year || new Date().getFullYear().toString(),
                            imdbRating: movie.imdb_rating || '7.5',
                            genres: movie.genres || ['#Action', '#Thriller'],
                            backdropUrl: img,
                            id: movie.id,
                            backdrops: movie.backdrops
                          });
                          onClose();
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-black font-semibold text-xs border border-amber-500/30 transition active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Import to Form</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <span>Click "Import" to load movie info instantly</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
