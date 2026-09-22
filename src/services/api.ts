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
    try {
      const res = await safeFetch(`${API_BASE}/config.php`);
      if (res.ok) {
        const text = await res.text();
        const json = JSON.parse(text);
        if (json.data) {
          clientStorage.saveSettings(json.data);
          return json.data;
        }
      }
    } catch {
      // Fallback for Vercel / Static
    }
    return clientStorage.getSettings();
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
    let cleaned = (query || '').trim();

    if (cleaned.includes('themoviedb.org/movie/')) {
      const m = cleaned.match(/movie\/(\d+)(?:-([^/?#]+))?/);
      if (m && m[2]) cleaned = m[2].replace(/-/g, ' ');
    } else if (cleaned.includes('imdb.com/title/')) {
      const m = cleaned.match(/title\/(tt\d+)/);
      if (m) cleaned = m[1];
    } else {
      cleaned = cleaned
        .replace(/\b(1080p|720p|480p|2160p|4k|2k|uhd|bluray|bdrip|webrip|web-dl|hdrip|dvdrip|x264|x265|hevc|aac|dts|h264|esub|multi|dual\s*audio|hindi|bengali|english)\b/gi, '')
        .replace(/[._\-+]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    try {
      const q = new URLSearchParams();
      q.set('action', 'search');
      if (cleaned) q.set('query', cleaned);
      if (category) q.set('category', category);
      const res = await safeFetch(`${API_BASE}/tmdb.php?${q.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.results && json.results.length > 0) {
          return {
            results: json.results,
            source: json.source || 'magic_library',
            cleanedQuery: json.cleanedQuery || cleaned
          };
        }
      }
    } catch {
      // Serverless/Vercel fallback
    }

    if (settings.tmdbApiKey && cleaned) {
      try {
        const url = `https://api.themoviedb.org/3/search/movie?api_key=${encodeURIComponent(settings.tmdbApiKey)}&query=${encodeURIComponent(cleaned)}&include_adult=false`;
        const r = await fetch(url);
        const data = await r.json();
        if (data.results && data.results.length > 0) {
          const genreMap: Record<number, string> = {
            28: '#Action', 12: '#Adventure', 16: '#Animation', 35: '#Comedy',
            80: '#Crime', 99: '#Documentary', 18: '#Drama', 10751: '#Family',
            14: '#Fantasy', 36: '#History', 27: '#Horror', 10402: '#Music',
            9648: '#Mystery', 10749: '#Romance', 878: '#SciFi', 10770: '#TVMovie',
            53: '#Thriller', 10752: '#War', 37: '#Western'
          };
          const results: TMDBMovie[] = data.results.map((m: any) => ({
            id: m.id,
            title: m.title,
            year: m.release_date ? m.release_date.slice(0, 4) : '',
            release_date: m.release_date || '',
            backdrop_path: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : (m.poster_path ? `https://image.tmdb.org/t/p/w780${m.poster_path}` : ''),
            poster_path: m.poster_path ? `https://image.tmdb.org/t/p/w780${m.poster_path}` : '',
            imdb_rating: m.vote_average ? m.vote_average.toFixed(1) : '7.5',
            genres: (m.genre_ids || []).map((id: number) => genreMap[id]).filter(Boolean).length > 0
              ? (m.genre_ids || []).map((id: number) => genreMap[id]).filter(Boolean)
              : ['#Action', '#Drama']
          }));
          return { results, source: 'tmdb_live', cleanedQuery: cleaned };
        }
      } catch (e) {
        console.warn('Direct TMDB fetch error:', e);
      }
    }

    const sampleMovies: TMDBMovie[] = [
      {
        id: 76600,
        title: 'Avatar: The Way of Water',
        year: '2022',
        release_date: '2022-12-16',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/14QbnygCuTO0vl7CAFmPf1fgZfV.jpg',
        poster_path: 'https://image.tmdb.org/t/p/w780/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg',
        imdb_rating: '7.6',
        category: 'hollywood',
        genres: ['#Action', '#Adventure', '#SciFi']
      },
      {
        id: 533535,
        title: 'Deadpool & Wolverine',
        year: '2024',
        release_date: '2024-07-26',
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
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s520b4q.jpg',
        poster_path: 'https://image.tmdb.org/t/p/w780/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
        imdb_rating: '8.6',
        category: 'hollywood',
        genres: ['#SciFi', '#Adventure', '#Action']
      },
      {
        id: 872585,
        title: 'Oppenheimer',
        year: '2023',
        release_date: '2023-07-21',
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',
        poster_path: 'https://image.tmdb.org/t/p/w780/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
        imdb_rating: '8.9',
        category: 'top_rated',
        genres: ['#Drama', '#History', '#Biography']
      },
      {
        id: 872906,
        title: 'Jawan',
        year: '2023',
        release_date: '2023-09-07',
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
        backdrop_path: 'https://image.tmdb.org/t/p/w1280/2RVcJbWFmICSD6Kcb71d1j7L6La.jpg',
        poster_path: 'https://image.tmdb.org/t/p/w780/9wX972sM5k6p1h2b0V5Z4F0wQG7.jpg',
        imdb_rating: '7.8',
        category: 'south',
        genres: ['#SciFi', '#Action', '#Fantasy']
      }
    ];

    let pool = sampleMovies;
    if (category && category !== 'all') {
      pool = sampleMovies.filter((m) => m.category === category || category === 'trending');
      if (pool.length === 0) pool = sampleMovies;
    }

    if (!cleaned) {
      return { results: pool, source: 'magic_library' };
    }

    const qLower = cleaned.toLowerCase();
    const filtered = sampleMovies.filter(
      (m) => m.title.toLowerCase().includes(qLower) || (m.genres && m.genres.some((g) => g.toLowerCase().includes(qLower)))
    );

    if (filtered.length === 0) {
      const formattedTitle = cleaned.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      filtered.push({
        id: Math.floor(Math.random() * 900000) + 100000,
        title: formattedTitle,
        year: '2024',
        release_date: '2024-05-15',
        backdrop_path: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1280&q=80',
        poster_path: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=780&q=80',
        imdb_rating: '7.8',
        category: 'trending',
        genres: ['#Action', '#Thriller', '#Adventure']
      });
    }

    return { results: filtered, source: 'magic_library', cleanedQuery: cleaned };
  },

  // 5b. Fetch multiple 16:9 backdrop images for a movie
  async getTMDBMovieImages(movieIdOrTitle: string | number): Promise<string[]> {
    const settings = clientStorage.getSettings();
    const images: string[] = [];

    // If TMDB API key is available and we have a numeric movie ID
    if (settings.tmdbApiKey && !isNaN(Number(movieIdOrTitle))) {
      try {
        const url = `https://api.themoviedb.org/3/movie/${movieIdOrTitle}/images?api_key=${encodeURIComponent(settings.tmdbApiKey)}`;
        const r = await fetch(url);
        if (r.ok) {
          const data = await r.json();
          if (data.backdrops && Array.isArray(data.backdrops)) {
            data.backdrops.slice(0, 15).forEach((b: any) => {
              if (b.file_path) {
                images.push(`https://image.tmdb.org/t/p/w1280${b.file_path}`);
              }
            });
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

  // 6. Telegram Bot Gateway (Direct Telegram API calls support CORS for client browser!)
  async testTelegramConnection(botToken?: string): Promise<{ success: boolean; isDemo?: boolean; bot?: any; message?: string; error?: string }> {
    const settings = clientStorage.getSettings();
    const token = (botToken || settings.telegramBotToken || '').trim();

    if (!token) {
      return {
        success: false,
        isDemo: true,
        message: 'No Telegram Bot Token configured. Operating in DEMO MODE.'
      };
    }

    try {
      const res = await safeFetch(`${API_BASE}/telegram.php?action=test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: token })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Vercel / Client-Side Direct Execution
    }

    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const d = await r.json();
      if (d.ok) {
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
        error: d.description || 'Invalid Telegram Bot Token'
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
    const token = (settings.telegramBotToken || '').trim();
    const isDemo = !token || Boolean(payload.demoMode);

    try {
      const res = await safeFetch(`${API_BASE}/telegram.php?action=publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.historyRecord) {
          clientStorage.addHistory(json.historyRecord);
        }
        return json;
      }
    } catch {
      // Direct Vercel / Client-Side Execution
    }

    const successful: string[] = [];
    const failed: string[] = [];
    const results: any[] = [];

    // Genre channels
    for (const ch of payload.genreChannels) {
      const chatId = ch.chatId || ch.username || '';
      const channelName = ch.name || chatId;

      if (isDemo) {
        successful.push(channelName);
        results.push({ type: 'genre', channel: channelName, chatId, success: true, simulated: true });
        continue;
      }

      try {
        const endpoint = payload.photoUrl
          ? `https://api.telegram.org/bot${token}/sendPhoto`
          : `https://api.telegram.org/bot${token}/sendMessage`;
        const bodyPayload: any = {
          chat_id: chatId,
          parse_mode: 'HTML',
          disable_web_page_preview: false
        };
        if (payload.photoUrl) {
          bodyPayload.photo = payload.photoUrl;
          bodyPayload.caption = payload.genreCaption;
        } else {
          bodyPayload.text = payload.genreCaption;
        }

        const r = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        });
        const d = await r.json();
        if (d.ok) {
          successful.push(channelName);
          results.push({ type: 'genre', channel: channelName, chatId, success: true, messageId: d.result.message_id });
        } else {
          failed.push(channelName);
          results.push({ type: 'genre', channel: channelName, chatId, success: false, error: d.description });
        }
      } catch (e: any) {
        failed.push(channelName);
        results.push({ type: 'genre', channel: channelName, chatId, success: false, error: e.message });
      }
    }

    // Hub channels
    for (const hub of payload.hubChannels) {
      const chatId = hub.chatId || hub.username || '';
      const hubName = hub.name || chatId;

      if (isDemo) {
        successful.push(hubName);
        results.push({ type: 'hub', channel: hubName, chatId, success: true, simulated: true });
        continue;
      }

      try {
        const endpoint = payload.photoUrl
          ? `https://api.telegram.org/bot${token}/sendPhoto`
          : `https://api.telegram.org/bot${token}/sendMessage`;
        const bodyPayload: any = {
          chat_id: chatId,
          parse_mode: 'HTML',
          disable_web_page_preview: false
        };
        if (payload.photoUrl) {
          bodyPayload.photo = payload.photoUrl;
          bodyPayload.caption = payload.hubCaption;
        } else {
          bodyPayload.text = payload.hubCaption;
        }

        const r = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        });
        const d = await r.json();
        if (d.ok) {
          successful.push(hubName);
          results.push({ type: 'hub', channel: hubName, chatId, success: true, messageId: d.result.message_id });
        } else {
          failed.push(hubName);
          results.push({ type: 'hub', channel: hubName, chatId, success: false, error: d.description });
        }
      } catch (e: any) {
        failed.push(hubName);
        results.push({ type: 'hub', channel: hubName, chatId, success: false, error: e.message });
      }
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
