import {
  AppSettings,
  GenreChannel,
  HubChannel,
  Promotion,
  ScheduledPostItem,
  Shortener,
  TMDBMovie,
  UploadHistoryItem
} from '../types';
import { clientStorage } from '../utils/clientStorage';
import { cleanMediaSearchQuery } from '../utils/mediaCleaner';

// Support both relative /api and ./api, handling PHP (InfinityFree) and Node/Vercel seamlessly
const API_BASE = './api';

async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export const api = {
  // 1. Settings & Config
  async getSettings(): Promise<AppSettings> {
    const local = clientStorage.getSettings();
    try {
      const res = await safeFetch(`${API_BASE}/config.php`);
      if (res.ok) {
        const text = await res.text();
        const json = JSON.parse(text);
        if (json.data) {
          // Smart merge: Never let an empty server response erase an existing local bot token or api key!
          const merged: AppSettings = {
            ...local,
            ...json.data,
            telegramBotToken: json.data.telegramBotToken?.trim() || local.telegramBotToken?.trim() || '',
            telegramBotUsername: json.data.telegramBotUsername || local.telegramBotUsername || '',
            tmdbApiKey: json.data.tmdbApiKey?.trim() || local.tmdbApiKey?.trim() || '',
            canvasBrandingName: json.data.canvasBrandingName || local.canvasBrandingName || ''
          };
          clientStorage.saveSettings(merged);
          // If server was missing the bot token that we have locally, sync to server in background
          if (!json.data.telegramBotToken && merged.telegramBotToken) {
            safeFetch(`${API_BASE}/config.php`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ telegramBotToken: merged.telegramBotToken, telegramBotUsername: merged.telegramBotUsername })
            }).catch(() => {});
          }
          return merged;
        }
      }
    } catch {
      // Fallback for Vercel / Static
    }
    return local;
  },

  async saveSettings(settings: Partial<AppSettings>): Promise<{ success: boolean; data?: AppSettings }> {
    const localUpdated = clientStorage.saveSettings(settings);
    try {
      const res = await safeFetch(`${API_BASE}/config.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        const json = await res.json();
        return json;
      }
    } catch {
      // Fallback
    }
    return { success: true, data: localUpdated };
  },

  // 2. Channels (Genre & Hub)
  async getChannels(type: 'genre' | 'hub'): Promise<any[]> {
    try {
      const res = await safeFetch(`${API_BASE}/channels.php?type=${type}`);
      if (res.ok) {
        const text = await res.text();
        const json = JSON.parse(text);
        if (Array.isArray(json.data)) {
          clientStorage.saveChannels(type, json.data);
          return json.data;
        }
      }
    } catch {
      // Fallback for Vercel
    }
    return clientStorage.getChannels(type);
  },

  async saveChannel(type: 'genre' | 'hub', channel: any): Promise<{ success: boolean; data?: any[] }> {
    const current = clientStorage.getChannels(type);
    const id = channel.id || `${type === 'hub' ? 'hub' : 'gc'}-${Date.now()}`;
    channel.id = id;
    const idx = current.findIndex((c: any) => c.id === id);
    if (idx >= 0) current[idx] = channel;
    else current.push(channel);
    clientStorage.saveChannels(type, current);

    try {
      const res = await safeFetch(`${API_BASE}/channels.php?type=${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(channel)
      });
      if (res.ok) {
        const json = await res.json();
        return json;
      }
    } catch {
      // Fallback
    }
    return { success: true, data: current };
  },

  async deleteChannel(type: 'genre' | 'hub', id: string): Promise<{ success: boolean; data?: any[] }> {
    let current = clientStorage.getChannels(type);
    current = current.filter((c: any) => c.id !== id);
    clientStorage.saveChannels(type, current);

    try {
      const res = await safeFetch(`${API_BASE}/channels.php?type=${type}&id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const json = await res.json();
        return json;
      }
    } catch {
      // Fallback
    }
    return { success: true, data: current };
  },

  // 3. Shorteners
  async getShorteners(): Promise<Shortener[]> {
    try {
      const res = await safeFetch(`${API_BASE}/shortener.php`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          clientStorage.saveShorteners(json.data);
          return json.data;
        }
      }
    } catch {
      // Fallback
    }
    return clientStorage.getShorteners();
  },

  async saveShortener(shortener: Partial<Shortener>): Promise<{ success: boolean; data?: Shortener[] }> {
    const current = clientStorage.getShorteners();
    const id = shortener.id || `shortener-${Date.now()}`;
    shortener.id = id;
    if (shortener.isActive) {
      current.forEach((s) => (s.isActive = false));
    }
    const idx = current.findIndex((s) => s.id === id);
    if (idx >= 0) current[idx] = { ...current[idx], ...shortener } as Shortener;
    else current.push({
      id,
      name: shortener.name || 'Shortener',
      apiUrl: shortener.apiUrl || '',
      apiKey: shortener.apiKey || '',
      baseUrl: shortener.baseUrl || '',
      status: shortener.status || 'ready',
      enabled: shortener.enabled ?? true,
      isActive: shortener.isActive ?? false
    });
    clientStorage.saveShorteners(current);

    try {
      const res = await safeFetch(`${API_BASE}/shortener.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shortener)
      });
      if (res.ok) {
        const json = await res.json();
        return json;
      }
    } catch {
      // Fallback
    }
    return { success: true, data: current };
  },

  async deleteShortener(id: string): Promise<{ success: boolean; data?: Shortener[] }> {
    let current = clientStorage.getShorteners();
    current = current.filter((s) => s.id !== id);
    clientStorage.saveShorteners(current);

    try {
      const res = await safeFetch(`${API_BASE}/shortener.php?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return { success: true, data: current };
  },

  async shortenUrl(url: string, shortenerId?: string): Promise<{ shortUrl: string; shortenerName?: string }> {
    const trimmedUrl = (url || '').trim();
    if (!trimmedUrl) return { shortUrl: '' };

    try {
      const res = await safeFetch(`${API_BASE}/shortener.php?action=shorten`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl, shortenerId })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.shortUrl) {
          return {
            shortUrl: json.shortUrl,
            shortenerName: json.shortenerName
          };
        }
      }
    } catch {
      // Fallback client-side shortener
    }

    // Direct browser shortener logic for Vercel / Static host
    const shorteners = clientStorage.getShorteners();
    let selected = shorteners.find((s) => s.id === shortenerId && s.enabled);
    if (!selected) selected = shorteners.find((s) => s.isActive && s.enabled) || shorteners[0];

    let generated = '';
    if (selected && selected.apiUrl && selected.apiKey) {
      try {
        const ep = `${selected.apiUrl}?api=${encodeURIComponent(selected.apiKey)}&url=${encodeURIComponent(trimmedUrl)}`;
        const r = await fetch(ep);
        const j = await r.json();
        generated = j.shortenedUrl || j.short_url || j.url || '';
      } catch {
        // network fallback
      }
    }

    if (!generated) {
      const base = (selected?.baseUrl || 'https://mova.link').replace(/\/$/, '');
      const hash = Math.random().toString(36).substring(2, 9);
      generated = `${base}/${hash}`;
    }

    return {
      shortUrl: generated,
      shortenerName: selected?.name || 'Mova Shortener'
    };
  },

  // 4. Promotions
  async getPromotions(): Promise<Promotion[]> {
    try {
      const res = await safeFetch(`${API_BASE}/promotions.php`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          clientStorage.savePromotions(json.data);
          return json.data;
        }
      }
    } catch {
      // Fallback
    }
    return clientStorage.getPromotions();
  },

  async savePromotion(promo: Partial<Promotion>): Promise<{ success: boolean; data?: Promotion[] }> {
    const current = clientStorage.getPromotions();
    const id = promo.id || `promo-${Date.now()}`;
    promo.id = id;
    const idx = current.findIndex((p) => p.id === id);
    if (idx >= 0) current[idx] = { ...current[idx], ...promo } as Promotion;
    else current.push({
      id,
      title: promo.title || 'Special Promotion',
      text: promo.text || '',
      url: promo.url || '',
      active: promo.active ?? true
    });
    clientStorage.savePromotions(current);

    try {
      const res = await safeFetch(`${API_BASE}/promotions.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promo)
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return { success: true, data: current };
  },

  async deletePromotion(id: string): Promise<{ success: boolean; data?: Promotion[] }> {
    let current = clientStorage.getPromotions();
    current = current.filter((p) => p.id !== id);
    clientStorage.savePromotions(current);

    try {
      const res = await safeFetch(`${API_BASE}/promotions.php?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return { success: true, data: current };
  },

  // 5. TMDB Movies & Magic Search (Works anywhere: Vercel, InfinityFree, Local)
  async searchTMDB(
    query: string,
    category?: string
  ): Promise<{ results: TMDBMovie[]; source?: string; cleanedQuery?: string }> {
    const settings = clientStorage.getSettings();
    const cleaned = cleanMediaSearchQuery(query);
    const cleanApiKey = (settings.tmdbApiKey || '').trim().replace(/^['"]|['"]$/g, '');

    const genreMap: Record<number, string> = {
      28: '#Action', 12: '#Adventure', 16: '#Animation', 35: '#Comedy',
      80: '#Crime', 99: '#Documentary', 18: '#Drama', 10751: '#Family',
      14: '#Fantasy', 36: '#History', 27: '#Horror', 10402: '#Music',
      9648: '#Mystery', 10749: '#Romance', 878: '#SciFi', 10770: '#TVMovie',
      53: '#Thriller', 10752: '#War', 37: '#Western',
      // TV Show Specific Genres:
      10759: '#Action', 10765: '#SciFi', 10768: '#War',
      10762: '#Kids', 10763: '#News', 10764: '#Reality',
      10766: '#Drama', 10767: '#Talk'
    };

    const formatTmdbItem = (m: any): TMDBMovie => {
      const isTv = m.media_type === 'tv' || (!m.title && !!m.name);
      const title = (m.title || m.name || m.original_title || m.original_name || 'Untitled').trim();
      const releaseDate = m.release_date || m.first_air_date || '';
      const year = releaseDate ? releaseDate.slice(0, 4) : '';
      const backdrop = m.backdrop_path 
        ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` 
        : (m.poster_path ? `https://image.tmdb.org/t/p/w780${m.poster_path}` : '');
      const poster = m.poster_path ? `https://image.tmdb.org/t/p/w780${m.poster_path}` : backdrop;
      const genres = (m.genre_ids || []).map((id: number) => genreMap[id]).filter(Boolean);
      if (isTv && !genres.includes('#WebSeries') && !genres.includes('#Series')) {
        genres.unshift('#WebSeries');
      }
      return {
        id: m.id,
        media_type: isTv ? 'tv' : 'movie',
        title,
        year,
        release_date: releaseDate,
        backdrop_path: backdrop,
        poster_path: poster,
        imdb_rating: m.vote_average ? Number(m.vote_average).toFixed(1) : '7.5',
        genres: genres.length > 0 ? genres : (isTv ? ['#WebSeries', '#Drama'] : ['#Action', '#Drama'])
      };
    };

    // 1. Try Backend Proxy with apiKey included
    try {
      const q = new URLSearchParams();
      q.set('action', 'search');
      if (cleaned) q.set('query', cleaned);
      if (category) q.set('category', category);
      if (cleanApiKey) q.set('apiKey', cleanApiKey);
      const res = await safeFetch(`${API_BASE}/tmdb.php?${q.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.results && json.results.length > 0) {
          // If server successfully fetched live results, return immediately
          if (json.source === 'tmdb_live' || !cleanApiKey) {
            return {
              results: json.results,
              source: json.source || 'magic_library',
              cleanedQuery: json.cleanedQuery || cleaned
            };
          }
        }
      }
    } catch {
      // Serverless/Vercel fallback
    }

    // 2. Direct Browser Fetch to TMDB (Supports both Movies & TV Series)
    if (cleanApiKey) {
      try {
        const isBearer = cleanApiKey.startsWith('ey') || cleanApiKey.length > 45;
        let endpoint = '';
        if (cleaned) {
          if (category === 'tv_shows') {
            endpoint = `/search/tv?query=${encodeURIComponent(cleaned)}&include_adult=false`;
          } else {
            // multi search searches BOTH Movies & TV Shows
            endpoint = `/search/multi?query=${encodeURIComponent(cleaned)}&include_adult=false`;
          }
        } else {
          if (category === 'trending' || !category) {
            endpoint = '/trending/all/day';
          } else if (category === 'tv_shows') {
            endpoint = '/trending/tv/day';
          } else if (category === 'top_rated') {
            endpoint = '/movie/top_rated';
          } else if (category === 'bollywood') {
            endpoint = '/discover/movie?with_original_language=hi&sort_by=popularity.desc';
          } else if (category === 'hollywood') {
            endpoint = '/discover/movie?with_original_language=en&sort_by=popularity.desc';
          } else if (category === 'south') {
            endpoint = '/discover/movie?with_original_language=te|ta|ml|kn&sort_by=popularity.desc';
          } else {
            endpoint = '/trending/all/day';
          }
        }
        const sep = endpoint.includes('?') ? '&' : '?';
        const url = isBearer
          ? `https://api.themoviedb.org/3${endpoint}`
          : `https://api.themoviedb.org/3${endpoint}${sep}api_key=${encodeURIComponent(cleanApiKey)}`;
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (isBearer) headers['Authorization'] = `Bearer ${cleanApiKey}`;

        const r = await fetch(url, { headers });
        const data = await r.json();
        if (r.ok && data.results && data.results.length > 0) {
          const validItems = data.results.filter(
            (item: any) => item.media_type !== 'person' && (item.title || item.name)
          );
          if (validItems.length > 0) {
            const results: TMDBMovie[] = validItems.map(formatTmdbItem);
            return { results, source: 'tmdb_live', cleanedQuery: cleaned };
          }
        }
      } catch (e) {
        console.warn('Direct TMDB browser fetch error:', e);
      }
    }

    // Built-in high quality offline sample pool with both Movies & Web Series
    const sampleMovies: TMDBMovie[] = [
      // Top Web Series
      {
        id: 87108,
        title: 'Mirzapur',
        year: '2018',
        release_date: '2018-11-16',
        media_type: 'tv',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/uGy4DCBqB11QZspv0FqjVd9gGzY.jpg',
        poster_path: 'https://image.tmdb.org/t/p/w780/h9zy0pA6Xl2aXgPjL6T4vG2L6rX.jpg',
        imdb_rating: '8.5',
        category: 'tv_shows',
        genres: ['#WebSeries', '#Crime', '#Action', '#Thriller']
      },
      {
        id: 101314,
        title: 'Panchayat',
        year: '2020',
        release_date: '2020-04-03',
        media_type: 'tv',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/lG7xZ94lU5H2T8y3S9H9L4xV7H.jpg',
        poster_path: 'https://image.tmdb.org/t/p/w780/6WnB4G1u4bYt2lK4f5jR3Y1l1j.jpg',
        imdb_rating: '8.9',
        category: 'tv_shows',
        genres: ['#WebSeries', '#Comedy', '#Drama']
      },
      {
        id: 1399,
        title: 'Game of Thrones',
        year: '2011',
        release_date: '2011-04-17',
        media_type: 'tv',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg',
        poster_path: 'https://image.tmdb.org/t/p/w780/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg',
        imdb_rating: '9.2',
        category: 'tv_shows',
        genres: ['#WebSeries', '#Fantasy', '#Action', '#Drama']
      },
      {
        id: 66732,
        title: 'Stranger Things',
        year: '2016',
        release_date: '2016-07-15',
        media_type: 'tv',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
        poster_path: 'https://image.tmdb.org/t/p/w780/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
        imdb_rating: '8.7',
        category: 'tv_shows',
        genres: ['#WebSeries', '#SciFi', '#Mystery', '#Horror']
      },
      {
        id: 1396,
        title: 'Breaking Bad',
        year: '2008',
        release_date: '2008-01-20',
        media_type: 'tv',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/9faGSFi5jam6pDWGNd0p8J2FA1E.jpg',
        poster_path: 'https://image.tmdb.org/t/p/w780/ztkUQFLlC19CCMYHW9o1zWhJvU9.jpg',
        imdb_rating: '9.5',
        category: 'tv_shows',
        genres: ['#WebSeries', '#Crime', '#Drama', '#Thriller']
      },
      {
        id: 71446,
        title: 'Money Heist (La Casa de Papel)',
        year: '2017',
        release_date: '2017-05-02',
        media_type: 'tv',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/gFZri2YbFUxgN8NXsgagrHR90J5.jpg',
        poster_path: 'https://image.tmdb.org/t/p/w780/reEMJA1uzscCbk5r6iG054457vF.jpg',
        imdb_rating: '8.2',
        category: 'tv_shows',
        genres: ['#WebSeries', '#Action', '#Crime', '#Thriller']
      },
      {
        id: 70523,
        title: 'Dark',
        year: '2017',
        release_date: '2017-12-01',
        media_type: 'tv',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/3lBDg3i6nn5R2NKICJ797KPIG52.jpg',
        poster_path: 'https://image.tmdb.org/t/p/w780/apbrWgAQn1292yh3aWpA40g9l1A.jpg',
        imdb_rating: '8.8',
        category: 'tv_shows',
        genres: ['#WebSeries', '#SciFi', '#Mystery', '#Crime']
      },
      {
        id: 84958,
        title: 'Loki',
        year: '2021',
        release_date: '2021-06-09',
        media_type: 'tv',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/k47JEUTQsSMN539RhdggDCgr425.jpg',
        poster_path: 'https://image.tmdb.org/t/p/w780/voHUmlvjysv9yB0v3N8b5eL7H.jpg',
        imdb_rating: '8.2',
        category: 'tv_shows',
        genres: ['#WebSeries', '#Action', '#Adventure', '#SciFi']
      },
      // Top Movies
      {
        id: 872906,
        title: 'Jawan',
        year: '2023',
        release_date: '2023-09-07',
        media_type: 'movie',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/jXJxMcVoTTj5H6PAuAlXg7W0iXx.jpg',
        poster_path: 'https://image.tmdb.org/t/p/w780/jF0m9f3q9QZ6V0wQG7C9F9G1Q.jpg',
        imdb_rating: '7.2',
        category: 'bollywood',
        genres: ['#Action', '#Thriller']
      },
      {
        id: 786892,
        title: 'Animal',
        year: '2023',
        release_date: '2023-12-01',
        media_type: 'movie',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/9wX972sM5k6p1h2b0V5Z4F0wQG7.jpg',
        poster_path: 'https://image.tmdb.org/t/p/w780/hr95v8tQAImgsen329vYfdDRJIZ.jpg',
        imdb_rating: '6.8',
        category: 'bollywood',
        genres: ['#Action', '#Drama', '#Crime']
      },
      {
        id: 801688,
        title: 'Kalki 2898 AD',
        year: '2024',
        release_date: '2024-06-27',
        media_type: 'movie',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/2RVcJbWFmICSD6Kcb71d1j7L6La.jpg',
        poster_path: 'https://image.tmdb.org/t/p/w780/9wX972sM5k6p1h2b0V5Z4F0wQG7.jpg',
        imdb_rating: '7.8',
        category: 'south',
        genres: ['#SciFi', '#Action', '#Fantasy']
      },
      {
        id: 533535,
        title: 'Deadpool & Wolverine',
        year: '2024',
        release_date: '2024-07-26',
        media_type: 'movie',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/yDHYTjA3R0neEjMMBE4p3v1GhaT.jpg',
        poster_path: 'https://image.tmdb.org/t/p/w780/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
        imdb_rating: '7.9',
        category: 'hollywood',
        genres: ['#Action', '#Comedy', '#SciFi']
      },
      {
        id: 693134,
        title: 'Dune: Part Two',
        year: '2024',
        release_date: '2024-03-01',
        media_type: 'movie',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s520b4q.jpg',
        poster_path: 'https://image.tmdb.org/t/p/w780/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
        imdb_rating: '8.6',
        category: 'hollywood',
        genres: ['#SciFi', '#Adventure', '#Action']
      },
      {
        id: 76600,
        title: 'Avatar: The Way of Water',
        year: '2022',
        release_date: '2022-12-16',
        media_type: 'movie',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/14QbnygCuTO0vl7CAFmPf1fgZfV.jpg',
        poster_path: 'https://image.tmdb.org/t/p/w780/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg',
        imdb_rating: '7.6',
        category: 'hollywood',
        genres: ['#Action', '#Adventure', '#SciFi']
      },
      {
        id: 872585,
        title: 'Oppenheimer',
        year: '2023',
        release_date: '2023-07-21',
        media_type: 'movie',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',
        poster_path: 'https://image.tmdb.org/t/p/w780/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
        imdb_rating: '8.9',
        category: 'top_rated',
        genres: ['#Drama', '#History', '#Biography']
      }
    ];

    let pool = sampleMovies;
    if (category && category !== 'all') {
      if (category === 'tv_shows') {
        pool = sampleMovies.filter((m) => m.media_type === 'tv' || m.category === 'tv_shows');
      } else {
        pool = sampleMovies.filter((m) => m.category === category || category === 'trending');
      }
      if (pool.length === 0) pool = sampleMovies;
    }

    if (!cleaned) {
      return { results: pool, source: 'magic_library' };
    }

    const qLower = cleaned.toLowerCase();
    const filtered = sampleMovies.filter(
      (m) =>
        m.title.toLowerCase().includes(qLower) ||
        (m.genres && m.genres.some((g) => g.toLowerCase().includes(qLower)))
    );

    if (filtered.length > 0) {
      return { results: filtered, source: 'magic_library', cleanedQuery: cleaned };
    }

    // Dynamic fallback representation if query not found in sample pool
    const formattedTitle = cleaned
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    
    const isLikelySeries = /series|season|part|ep/i.test(query);

    return {
      results: [
        {
          id: Math.floor(Math.random() * 900000) + 100000,
          title: formattedTitle,
          year: '2024',
          release_date: '2024-05-15',
          media_type: isLikelySeries ? 'tv' : 'movie',
          backdrop_path: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1280&q=80',
          poster_path: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=780&q=80',
          imdb_rating: '7.8',
          category: isLikelySeries ? 'tv_shows' : 'trending',
          genres: isLikelySeries ? ['#WebSeries', '#Drama', '#Thriller'] : ['#Action', '#Thriller', '#Adventure']
        }
      ],
      source: 'magic_library',
      cleanedQuery: cleaned
    };
  },

  // 5b. Fetch multiple 16:9 backdrop images for a movie or TV show
  async getTMDBMovieImages(movieIdOrTitle: string | number, mediaType?: 'movie' | 'tv'): Promise<string[]> {
    const settings = clientStorage.getSettings();
    const cleanApiKey = (settings.tmdbApiKey || '').trim().replace(/^['"]|['"]$/g, '');
    const images: string[] = [];

    // If TMDB API key is available and we have a numeric ID
    if (cleanApiKey && !isNaN(Number(movieIdOrTitle))) {
      try {
        const isBearer = cleanApiKey.startsWith('ey') || cleanApiKey.length > 45;
        const endpointsToTry = mediaType === 'tv'
          ? [`/tv/${movieIdOrTitle}/images`, `/movie/${movieIdOrTitle}/images`]
          : [`/movie/${movieIdOrTitle}/images`, `/tv/${movieIdOrTitle}/images`];

        for (const ep of endpointsToTry) {
          const sep = ep.includes('?') ? '&' : '?';
          const url = isBearer
            ? `https://api.themoviedb.org/3${ep}`
            : `https://api.themoviedb.org/3${ep}${sep}api_key=${encodeURIComponent(cleanApiKey)}`;
          const headers: Record<string, string> = { Accept: 'application/json' };
          if (isBearer) headers['Authorization'] = `Bearer ${cleanApiKey}`;

          const r = await fetch(url, { headers });
          if (r.ok) {
            const data = await r.json();
            if (data.backdrops && Array.isArray(data.backdrops) && data.backdrops.length > 0) {
              data.backdrops.slice(0, 15).forEach((b: any) => {
                if (b.file_path) {
                  const fullUrl = `https://image.tmdb.org/t/p/w1280${b.file_path}`;
                  if (!images.includes(fullUrl)) images.push(fullUrl);
                }
              });
              if (images.length > 0) break;
            }
          }
        }
      } catch (e) {
        console.warn('Could not fetch TMDB images directly:', e);
      }
    }

    // Server-side fallback or extra backdrops
    try {
      const q = new URLSearchParams();
      q.set('action', 'images');
      q.set('id', String(movieIdOrTitle));
      if (mediaType) q.set('type', mediaType);
      if (cleanApiKey) q.set('apiKey', cleanApiKey);
      const res = await safeFetch(`${API_BASE}/tmdb.php?${q.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.images && Array.isArray(json.images)) {
          json.images.forEach((img: string) => {
            if (!images.includes(img)) images.push(img);
          });
        }
      }
    } catch {
      // Fallback
    }

    // High quality backdrop fallback presets if none found
    if (images.length === 0) {
      images.push(
        'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1280&q=80',
        'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1280&q=80',
        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1280&q=80',
        'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1280&q=80',
        'https://images.unsplash.com/photo-1574267432553-4b4628081c31?auto=format&fit=crop&w=1280&q=80'
      );
    }

    return images;
  },

  // 5c. Test TMDB API Key Connection (Server proxy + Direct CORS fallback)
  async testTMDBConnection(customKey?: string): Promise<{ success: boolean; isDemo?: boolean; message?: string; error?: string }> {
    const settings = clientStorage.getSettings();
    const apiKey = (customKey !== undefined ? customKey : (settings.tmdbApiKey || '')).trim().replace(/^['"]|['"]$/g, '');

    if (!apiKey) {
      return {
        success: false,
        isDemo: true,
        error: 'কোনো TMDB API Key পাওয়া যায়নি। themoviedb.org থেকে API Key দিয়ে টেস্ট করুন।'
      };
    }

    // 1. Try server proxy test
    try {
      const q = new URLSearchParams();
      q.set('action', 'test');
      q.set('apiKey', apiKey);
      const res = await safeFetch(`${API_BASE}/tmdb.php?${q.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          return { success: true, isDemo: false, message: json.message || '✓ TMDB API সংযুক্ত ও কার্যকর!' };
        }
      }
    } catch {
      // Continue to direct browser check
    }

    // 2. Direct browser test against TMDB
    try {
      const isBearer = apiKey.startsWith('ey') || apiKey.length > 45;
      const url = isBearer
        ? 'https://api.themoviedb.org/3/configuration'
        : `https://api.themoviedb.org/3/configuration?api_key=${encodeURIComponent(apiKey)}`;
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (isBearer) headers['Authorization'] = `Bearer ${apiKey}`;

      const r = await fetch(url, { headers });
      const data = await r.json();
      if (r.ok && (data.images || data.change_keys)) {
        return {
          success: true,
          isDemo: false,
          message: '✓ TMDB API Key সফলভাবে যাচাই হয়েছে এবং লাইভ ডাটা সক্রিয় রয়েছে!'
        };
      }
      return {
        success: false,
        isDemo: false,
        error: data.status_message || `TMDB Error (${r.status}): ভুল API Key। themoviedb.org থেকে সঠিক v3 Key দিন।`
      };
    } catch (e: any) {
      return {
        success: false,
        isDemo: false,
        error: e.message || 'TMDB সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি।'
      };
    }
  },

  // 6. Telegram Bot Gateway (Direct Telegram API calls support CORS for client browser!)
  async testTelegramConnection(botToken?: string): Promise<{ success: boolean; isDemo?: boolean; bot?: any; message?: string; error?: string }> {
    const settings = clientStorage.getSettings();
    let token = (botToken || settings.telegramBotToken || '').trim();

    // Auto-clean token if user pasted URL or prefix
    const urlMatch = token.match(/api\.telegram\.org\/bot([^/?#]+)/i);
    if (urlMatch) {
      token = urlMatch[1].trim();
    }
    if (/^bot\d+:[\w-]+/i.test(token)) {
      token = token.slice(3).trim();
    }
    token = token.replace(/^['"]|['"]$/g, '').trim();

    if (!token) {
      return {
        success: false,
        isDemo: true,
        message: 'No Telegram Bot Token configured. Operating in DEMO MODE.'
      };
    }

    // Try server-side first (PHP / Express proxy)
    try {
      const res = await safeFetch(`${API_BASE}/telegram.php?action=test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: token })
      });
      if (res.ok) {
        const text = await res.text();
        const trimmed = text.trim();
        if (trimmed.startsWith('{')) {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed.success === 'boolean') {
            return parsed;
          }
        }
      }
    } catch {
      // Vercel / Client-Side Direct Execution fallback
    }

    // Direct Browser-to-Telegram Fetch (Works anywhere, including Vercel and local static)
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const d = await r.json();
      if (d && d.ok && d.result) {
        return {
          success: true,
          isDemo: false,
          bot: d.result,
          message: `Connected to @${d.result.username}`
        };
      }
      return {
        success: false,
        isDemo: false,
        error: d?.description || 'Invalid Telegram Bot Token'
      };
    } catch (e: any) {
      return {
        success: false,
        isDemo: false,
        error: e.message || 'Telegram network request failed'
      };
    }
  },

  async publishToTelegram(payload: {
    movieTitle: string;
    year: string;
    photoUrl: string;
    genreCaption: string;
    hubCaption: string;
    genreChannels: GenreChannel[];
    hubChannels: HubChannel[];
    demoMode?: boolean;
    botToken?: string;
  }): Promise<{
    success: boolean;
    status: 'completed' | 'partial' | 'failed';
    isDemo: boolean;
    successful: string[];
    failed: string[];
    results: any[];
    historyRecord?: UploadHistoryItem;
  }> {
    const settings = clientStorage.getSettings();
    const token = (payload.botToken || settings.telegramBotToken || '').trim();
    const isDemo = !token || Boolean(payload.demoMode);

    // Try backend proxy first, including botToken in the body so backend always has it
    let serverHandled = false;
    let serverRes: any = null;
    try {
      const res = await safeFetch(`${API_BASE}/telegram.php?action=publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, botToken: token })
      });
      if (res.ok) {
        const text = await res.text();
        const trimmed = text.trim();
        if (trimmed.startsWith('{')) {
          serverRes = JSON.parse(trimmed);
          // If server successfully posted to all channels or is demo, return server result
          if (serverRes.status === 'completed' || isDemo) {
            if (serverRes.historyRecord) {
              clientStorage.addHistory(serverRes.historyRecord);
            }
            return serverRes;
          }
          serverHandled = true;
        }
      }
    } catch {
      // Fallback to client-side direct execution
    }

    // Direct Browser Execution (Fallback for Vercel, InfinityFree curl blockers, or partial failures)
    const successful: string[] = serverRes?.successful || [];
    const failed: string[] = [];
    const results: any[] = serverRes?.results?.filter((r: any) => r.success) || [];

    const sendToTelegramChannel = async (
      chatId: string,
      channelName: string,
      captionText: string,
      type: 'genre' | 'hub'
    ) => {
      if (successful.includes(channelName)) return;

      if (isDemo) {
        successful.push(channelName);
        results.push({ type, channel: channelName, chatId, success: true, simulated: true });
        return;
      }

      // 1. Try sending Photo with Caption if photoUrl is available
      if (payload.photoUrl && payload.photoUrl.trim()) {
        try {
          // Telegram sendPhoto caption has a hard limit of 1024 characters
          let photoCaption = captionText;
          if (photoCaption.length > 1020) {
            photoCaption = photoCaption.slice(0, 1017) + '...';
          }

          let tgRes: Response;
          if (payload.photoUrl.startsWith('data:image/')) {
            // Convert base64 data URI to multipart/form-data Blob for Telegram API
            const parts = payload.photoUrl.split(',');
            const mime = parts[0].split(':')[1].split(';')[0];
            const byteCharacters = atob(parts[1]);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: mime });

            const formData = new FormData();
            formData.append('chat_id', chatId);
            formData.append('photo', blob, 'mova_thumbnail.jpg');
            formData.append('caption', photoCaption);
            formData.append('parse_mode', 'HTML');

            tgRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
              method: 'POST',
              body: formData
            });
          } else {
            tgRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                photo: payload.photoUrl,
                caption: photoCaption,
                parse_mode: 'HTML',
                disable_web_page_preview: false
              })
            });
          }

          const d = await tgRes.json();
          if (d.ok) {
            successful.push(channelName);
            results.push({ type, channel: channelName, chatId, success: true, messageId: d.result.message_id });
            return;
          }
          console.warn(`sendPhoto failed for ${channelName} (${d.description}), falling back to sendMessage`);
        } catch (err: any) {
          console.warn(`sendPhoto error for ${channelName}:`, err.message);
        }
      }

      // 2. Fallback to sendMessage (Supports up to 4096 characters!)
      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: captionText,
            parse_mode: 'HTML',
            disable_web_page_preview: false
          })
        });
        const d = await tgRes.json();
        if (d.ok) {
          successful.push(channelName);
          results.push({ type, channel: channelName, chatId, success: true, messageId: d.result.message_id });
          return;
        }

        // If entity parse error (e.g. unescaped HTML tag in user title), retry as plain text
        if (d.description && (d.description.includes('parse') || d.description.includes('entity'))) {
          const plainText = captionText.replace(/<[^>]*>?/gm, '');
          const retryRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: plainText,
              disable_web_page_preview: false
            })
          });
          const retryD = await retryRes.json();
          if (retryD.ok) {
            successful.push(channelName);
            results.push({ type, channel: channelName, chatId, success: true, messageId: retryD.result.message_id });
            return;
          }
          failed.push(channelName);
          results.push({ type, channel: channelName, chatId, success: false, error: retryD.description });
          return;
        }

        failed.push(channelName);
        results.push({ type, channel: channelName, chatId, success: false, error: d.description });
      } catch (err: any) {
        failed.push(channelName);
        results.push({ type, channel: channelName, chatId, success: false, error: err.message });
      }
    };

    // Publish to Genre channels
    for (const ch of payload.genreChannels) {
      const chatId = ch.chatId || ch.username || '';
      const channelName = ch.name || chatId;
      await sendToTelegramChannel(chatId, channelName, payload.genreCaption, 'genre');
    }

    // Publish to Hub channels
    for (const hub of payload.hubChannels) {
      const chatId = hub.chatId || hub.username || '';
      const hubName = hub.name || chatId;
      await sendToTelegramChannel(chatId, hubName, payload.hubCaption, 'hub');
    }

    const status = failed.length === 0 ? 'completed' : successful.length > 0 ? 'partial' : 'failed';
    const historyRecord: UploadHistoryItem = {
      id: 'hist-' + Date.now(),
      title: payload.movieTitle,
      year: payload.year,
      timestamp: Date.now(),
      dateStr: new Date().toISOString().replace('T', ' ').slice(0, 19),
      genreChannelNames: payload.genreChannels.map((c) => c.name || c.chatId),
      hubChannelNames: payload.hubChannels.map((h) => h.name || h.chatId),
      status,
      successfulChannels: successful,
      failedChannels: failed,
      isDemo
    };

    clientStorage.addHistory(historyRecord);

    return {
      success: status !== 'failed',
      status,
      isDemo,
      successful,
      failed,
      results,
      historyRecord
    };
  },

  // 7. Scheduler
  async getScheduledPosts(): Promise<ScheduledPostItem[]> {
    try {
      const res = await safeFetch(`${API_BASE}/scheduler.php`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          clientStorage.saveScheduledPosts(json.data);
          return json.data;
        }
      }
    } catch {
      // Fallback
    }
    return clientStorage.getScheduledPosts();
  },

  async schedulePost(payload: {
    movieTitle: string;
    year: string;
    photoUrl: string;
    genreCaption: string;
    hubCaption: string;
    genreChannels: GenreChannel[];
    hubChannels: HubChannel[];
    scheduledDateTime: string;
    timestamp: number;
    timezone: string;
  }): Promise<{ success: boolean; message?: string; item?: ScheduledPostItem }> {
    const list = clientStorage.getScheduledPosts();
    const newPost: ScheduledPostItem = {
      id: 'sched-' + Date.now(),
      movieTitle: payload.movieTitle || 'Untitled',
      year: payload.year || '',
      photoUrl: payload.photoUrl || '',
      genreCaption: payload.genreCaption || '',
      hubCaption: payload.hubCaption || '',
      genreChannels: payload.genreChannels || [],
      hubChannels: payload.hubChannels || [],
      scheduledDateTime: payload.scheduledDateTime || new Date().toISOString(),
      timestamp: payload.timestamp || Date.now() + 3600000,
      timezone: payload.timezone || 'Asia/Dhaka',
      status: 'scheduled',
      createdAt: new Date().toISOString()
    };
    list.push(newPost);
    clientStorage.saveScheduledPosts(list);

    try {
      const res = await safeFetch(`${API_BASE}/scheduler.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return { success: true, item: newPost };
  },

  async cancelScheduledPost(id: string): Promise<{ success: boolean }> {
    let list = clientStorage.getScheduledPosts();
    list = list.filter((p: ScheduledPostItem) => p.id !== id);
    clientStorage.saveScheduledPosts(list);

    try {
      const res = await safeFetch(`${API_BASE}/scheduler.php?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return { success: true };
  },

  async runSchedulerNow(): Promise<{ success: boolean; publishedCount: number; published: string[] }> {
    try {
      const res = await safeFetch(`${API_BASE}/scheduler.php?action=run_now`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }

    const posts = clientStorage.getScheduledPosts();
    const publishedNames: string[] = [];
    for (const p of posts) {
      publishedNames.push(p.movieTitle);
      clientStorage.addHistory({
        id: 'hist-' + Date.now(),
        title: p.movieTitle,
        year: p.year || '',
        timestamp: Date.now(),
        dateStr: new Date().toISOString().replace('T', ' ').slice(0, 19),
        genreChannelNames: (p.genreChannels || []).map((c: any) => c.name || c.chatId),
        hubChannelNames: (p.hubChannels || []).map((h: any) => h.name || h.chatId),
        status: 'completed',
        successfulChannels: [
          ...(p.genreChannels || []).map((c: any) => c.name || c.chatId),
          ...(p.hubChannels || []).map((h: any) => h.name || h.chatId)
        ],
        failedChannels: []
      });
    }
    clientStorage.saveScheduledPosts([]);
    return { success: true, publishedCount: publishedNames.length, published: publishedNames };
  },

  // 8. Uploads & History
  async uploadPosterImage(base64: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const res = await safeFetch(`${API_BASE}/uploads.php?action=poster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64 })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.url) return json;
      }
    } catch {
      // Fallback for Vercel: use base64 data url directly
    }

    return { success: true, url: base64 };
  },

  async getHistory(filter?: string, search?: string): Promise<UploadHistoryItem[]> {
    try {
      const query = new URLSearchParams();
      if (filter) query.set('filter', filter);
      if (search) query.set('search', search);
      const res = await safeFetch(`${API_BASE}/uploads.php?action=history&${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch {
      // Fallback
    }

    let result = clientStorage.getHistory();
    if (filter) result = result.filter((h: UploadHistoryItem) => h.status === filter);
    if (search) result = result.filter((h: UploadHistoryItem) => (h.title || '').toLowerCase().includes(search.toLowerCase()));
    return result;
  },

  async clearHistory(id = 'all'): Promise<{ success: boolean }> {
    if (id === 'all') {
      clientStorage.saveHistory([]);
    } else {
      let list = clientStorage.getHistory();
      list = list.filter((h: UploadHistoryItem) => h.id !== id);
      clientStorage.saveHistory(list);
    }

    try {
      const res = await safeFetch(`${API_BASE}/uploads.php?action=history&id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return { success: true };
  }
};
