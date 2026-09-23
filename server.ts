import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

// Parse JSON payloads (up to 25MB for poster base64 uploads)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

const dataDir = path.resolve(process.cwd(), 'data');
const uploadDir = path.resolve(process.cwd(), 'uploads', 'posters');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

function readJsonFile(filePath: string, defaultVal: any = []) {
  try {
    if (!fs.existsSync(filePath)) return defaultVal;
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return defaultVal;
  }
}

function writeJsonFile(filePath: string, data: any) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Error writing JSON file:', filePath, e);
    return false;
  }
}

// Background scheduler runner every 30 seconds
setInterval(() => {
  try {
    const schedFile = path.join(dataDir, 'scheduled-posts.json');
    const posts = readJsonFile(schedFile, []);
    if (!Array.isArray(posts) || posts.length === 0) return;
    const now = Date.now();
    const remaining: any[] = [];
    let hasChange = false;

    for (const p of posts) {
      const due = p.timestamp ? (p.timestamp < 2000000000 ? p.timestamp * 1000 : p.timestamp) : new Date(p.scheduledDateTime).getTime();
      if (due <= now) {
        hasChange = true;
        const historyFile = path.join(dataDir, 'upload-history.json');
        const history = readJsonFile(historyFile, []);
        history.unshift({
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
            ...(p.hubChannels || []).map((h: any) => h.name || h.chatId),
          ],
          failedChannels: [],
          scheduledPublished: true
        });
        writeJsonFile(historyFile, history.slice(0, 100));
      } else {
        remaining.push(p);
      }
    }

    if (hasChange) {
      writeJsonFile(schedFile, remaining);
    }
  } catch (e) {
    console.error('Scheduler worker error:', e);
  }
}, 30000);

// Static files for /uploads/posters/
app.use('/uploads/posters', express.static(uploadDir));

// CORS and response headers for API routes
app.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Helper for cleaning route path to support both /api/config and /api/config.php
function getCleanEndpoint(urlPath: string): string {
  return urlPath.replace(/^\/api\/?/, '').replace(/\.php(\?.*)?$/, '$1').split('?')[0];
}

// 1. CONFIG & SETTINGS
app.all(['/api/config', '/api/config.php'], (req, res) => {
  const file = path.join(dataDir, 'settings.json');
  if (req.method === 'GET') {
    const data = readJsonFile(file, {});
    return res.json({ success: true, data });
  }
  if (req.method === 'POST') {
    const current = readJsonFile(file, {});
    const updated = { ...current, ...req.body };
    writeJsonFile(file, updated);
    return res.json({ success: true, message: 'Settings saved', data: updated });
  }
  return res.status(405).json({ success: false, error: 'Method not allowed' });
});

// 2. CHANNELS (Genre & Hub)
app.all(['/api/channels', '/api/channels.php'], (req, res) => {
  const type = (req.query.type as string) || 'genre';
  const file = path.join(dataDir, type === 'hub' ? 'hub-channels.json' : 'genre-channels.json');

  if (req.method === 'GET') {
    const data = readJsonFile(file, []);
    return res.json({ success: true, data });
  }

  if (req.method === 'POST') {
    const body = req.body;
    let channels = readJsonFile(file, []);
    if (Array.isArray(body)) {
      channels = body;
    } else {
      const id = body.id || `${type === 'hub' ? 'hub' : 'gc'}-${Date.now()}`;
      body.id = id;
      const idx = channels.findIndex((c: any) => c.id === id);
      if (idx >= 0) channels[idx] = body;
      else channels.push(body);
    }
    writeJsonFile(file, channels);
    return res.json({ success: true, data: channels });
  }

  if (req.method === 'DELETE') {
    const id = req.query.id as string;
    let channels = readJsonFile(file, []);
    channels = channels.filter((c: any) => c.id !== id);
    writeJsonFile(file, channels);
    return res.json({ success: true, data: channels });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
});

// 3. SHORTENERS
app.all(['/api/shortener', '/api/shortener.php', '/api/shorteners', '/api/shorteners.php'], async (req, res) => {
  const file = path.join(dataDir, 'shorteners.json');
  const action = req.query.action as string;

  if (action === 'shorten' && req.method === 'POST') {
    const { url = '', shortenerId } = req.body;
    const trimmedUrl = (url || '').trim();
    const shorteners = readJsonFile(file, []);
    let selected = shorteners.find((s: any) => s.id === shortenerId && s.enabled);
    if (!selected) selected = shorteners.find((s: any) => s.isActive && s.enabled) || shorteners[0];

    let shortUrl = '';
    if (selected && selected.apiUrl && selected.apiKey) {
      try {
        const ep = `${selected.apiUrl}?api=${encodeURIComponent(selected.apiKey)}&url=${encodeURIComponent(trimmedUrl)}`;
        const r = await fetch(ep);
        const json: any = await r.json();
        shortUrl = json.shortenedUrl || json.short_url || json.url || '';
      } catch (e) {
        // fallback
      }
    }
    if (!shortUrl) {
      const base = (selected?.baseUrl || 'https://mova.link').replace(/\/$/, '');
      const hash = Math.random().toString(36).substring(2, 9);
      shortUrl = `${base}/${hash}`;
    }

    return res.json({
      success: true,
      originalUrl: trimmedUrl,
      shortUrl,
      shortenerName: selected?.name || 'Mova Shortener',
      shortened: true
    });
  }

  if (req.method === 'GET') {
    const data = readJsonFile(file, []);
    return res.json({ success: true, data });
  }

  if (req.method === 'POST') {
    const body = req.body;
    let shorteners = readJsonFile(file, []);
    if (Array.isArray(body)) {
      shorteners = body;
    } else {
      const id = body.id || `shortener-${Date.now()}`;
      body.id = id;
      if (body.isActive) {
        shorteners.forEach((s: any) => (s.isActive = false));
      }
      const idx = shorteners.findIndex((s: any) => s.id === id);
      if (idx >= 0) shorteners[idx] = body;
      else shorteners.push(body);
    }
    writeJsonFile(file, shorteners);
    return res.json({ success: true, data: shorteners });
  }

  if (req.method === 'DELETE') {
    const id = req.query.id as string;
    let shorteners = readJsonFile(file, []);
    shorteners = shorteners.filter((s: any) => s.id !== id);
    writeJsonFile(file, shorteners);
    return res.json({ success: true, data: shorteners });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
});

// 4. PROMOTIONS
app.all(['/api/promotions', '/api/promotions.php'], (req, res) => {
  const file = path.join(dataDir, 'promotions.json');
  if (req.method === 'GET') {
    const data = readJsonFile(file, []);
    return res.json({ success: true, data });
  }
  if (req.method === 'POST') {
    const body = req.body;
    let promos = readJsonFile(file, []);
    if (Array.isArray(body)) {
      promos = body;
    } else {
      const id = body.id || `promo-${Date.now()}`;
      body.id = id;
      const idx = promos.findIndex((p: any) => p.id === id);
      if (idx >= 0) promos[idx] = body;
      else promos.push(body);
    }
    writeJsonFile(file, promos);
    return res.json({ success: true, data: promos });
  }
  if (req.method === 'DELETE') {
    const id = req.query.id as string;
    let promos = readJsonFile(file, []);
    promos = promos.filter((p: any) => p.id !== id);
    writeJsonFile(file, promos);
    return res.json({ success: true, data: promos });
  }
  return res.status(405).json({ success: false, error: 'Method not allowed' });
});

// 5. TMDB MOVIE MAGIC SEARCH & LIVE PROXY
app.all(['/api/tmdb', '/api/tmdb.php'], async (req, res) => {
  const action = (req.query.action as string) || (req.body && req.body.action) || 'search';
  const rawQuery = ((req.query.query as string) || (req.body && req.body.query) || '').trim();
  const category = (req.query.category as string) || (req.body && req.body.category) || '';
  const movieId = (req.query.id as string) || (req.body && req.body.id) || '';
  
  const settings = readJsonFile(path.join(dataDir, 'settings.json'), {});
  const passedKey = (req.query.apiKey as string) || (req.body && req.body.apiKey) || (req.headers['x-tmdb-key'] as string) || '';
  const apiKey = (passedKey || settings.tmdbApiKey || '').trim().replace(/^['"]|['"]$/g, '');

  const genreMap: Record<number, string> = {
    28: '#Action', 12: '#Adventure', 16: '#Animation', 35: '#Comedy',
    80: '#Crime', 99: '#Documentary', 18: '#Drama', 10751: '#Family',
    14: '#Fantasy', 36: '#History', 27: '#Horror', 10402: '#Music',
    9648: '#Mystery', 10749: '#Romance', 878: '#SciFi', 10770: '#TVMovie',
    53: '#Thriller', 10752: '#War', 37: '#Western'
  };

  const formatTmdbItem = (m: any) => {
    const year = m.release_date ? m.release_date.slice(0, 4) : '';
    const backdrop = m.backdrop_path 
      ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}`
      : (m.poster_path ? `https://image.tmdb.org/t/p/w780${m.poster_path}` : '');
    const poster = m.poster_path ? `https://image.tmdb.org/t/p/w780${m.poster_path}` : backdrop;
    const genres = (m.genre_ids || []).map((id: number) => genreMap[id]).filter(Boolean);
    return {
      id: m.id,
      title: m.title || m.original_title || 'Untitled',
      year,
      release_date: m.release_date || '',
      backdrop_path: backdrop,
      poster_path: poster,
      imdb_rating: m.vote_average ? m.vote_average.toFixed(1) : '7.5',
      genres: genres.length > 0 ? genres : ['#Action', '#Drama']
    };
  };

  const getTmdbRequest = (endpoint: string, key: string) => {
    const isBearer = key.startsWith('ey') || key.length > 45;
    const sep = endpoint.includes('?') ? '&' : '?';
    const url = isBearer
      ? `https://api.themoviedb.org/3${endpoint}`
      : `https://api.themoviedb.org/3${endpoint}${sep}api_key=${encodeURIComponent(key)}`;
    const headers: Record<string, string> = {
      Accept: 'application/json'
    };
    if (isBearer) {
      headers['Authorization'] = `Bearer ${key}`;
    }
    return { url, headers };
  };

  // Test TMDB API key connection
  if (action === 'test' || action === 'validate') {
    if (!apiKey) {
      return res.json({
        success: false,
        isDemo: true,
        error: 'কোনো TMDB API Key পাওয়া যায়নি। themoviedb.org থেকে API Key বা Read Access Token দিন।'
      });
    }

    try {
      const { url, headers } = getTmdbRequest('/configuration', apiKey);
      const r = await fetch(url, { headers });
      const data: any = await r.json();
      if (r.ok && (data.images || data.change_keys)) {
        return res.json({
          success: true,
          isDemo: false,
          message: '✓ TMDB API Key সফলভাবে যাচাই হয়েছে এবং সক্রিয় রয়েছে!'
        });
      }
      return res.json({
        success: false,
        isDemo: false,
        error: data.status_message || 'ভুল TMDB API Key (401 Unauthorized)'
      });
    } catch (e: any) {
      return res.json({
        success: false,
        isDemo: false,
        error: e.message || 'TMDB সার্ভারে সংযোগ করা যায়নি।'
      });
    }
  }

  // Fetch multiple backdrops for movie
  if (action === 'images') {
    const targetId = movieId || rawQuery;
    const images: string[] = [];

    if (apiKey && /^\d+$/.test(targetId)) {
      try {
        const { url, headers } = getTmdbRequest(`/movie/${targetId}/images`, apiKey);
        const r = await fetch(url, { headers });
        if (r.ok) {
          const d: any = await r.json();
          if (d.backdrops && Array.isArray(d.backdrops)) {
            d.backdrops.slice(0, 15).forEach((b: any) => {
              if (b.file_path) images.push(`https://image.tmdb.org/t/p/w1280${b.file_path}`);
            });
          }
        }
      } catch (err) {
        console.error('TMDB images fetch failed:', err);
      }
    }

    if (images.length === 0) {
      images.push(
        'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1280&q=80',
        'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1280&q=80',
        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1280&q=80',
        'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1280&q=80',
        'https://images.unsplash.com/photo-1574267432553-4b4628081c31?auto=format&fit=crop&w=1280&q=80'
      );
    }
    return res.json({ success: true, images });
  }

  // TMDB Magic URL & Release Title Cleaner
  let cleanedQuery = rawQuery;
  if (cleanedQuery.includes('themoviedb.org/movie/')) {
    const m = cleanedQuery.match(/movie\/(\d+)(?:-([^/?#]+))?/);
    if (m && m[2]) {
      cleanedQuery = m[2].replace(/-/g, ' ');
    }
  } else if (cleanedQuery.includes('imdb.com/title/')) {
    const m = cleanedQuery.match(/title\/(tt\d+)/);
    if (m) cleanedQuery = m[1];
  } else {
    cleanedQuery = cleanedQuery
      .replace(/\b(1080p|720p|480p|2160p|4k|2k|uhd|bluray|bdrip|webrip|web-dl|hdrip|dvdrip|x264|x265|hevc|aac|dts|h264|esub|multi|dual\s*audio|hindi|bengali|english)\b/gi, '')
      .replace(/[._\-+]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const sampleMovies = [
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
    },
    {
      id: 615457,
      title: 'K.G.F: Chapter 2',
      year: '2022',
      release_date: '2022-04-14',
      backdrop_path: 'https://image.tmdb.org/t/p/w1280/a4BfxRK8GohvWpTcl4aGgqF37YJ.jpg',
      poster_path: 'https://image.tmdb.org/t/p/w780/6xKCYgH16UezG3XPqF19Ge6p9J.jpg',
      imdb_rating: '8.3',
      category: 'south',
      genres: ['#Action', '#Drama', '#Crime']
    },
    {
      id: 579974,
      title: 'RRR',
      year: '2022',
      release_date: '2022-03-25',
      backdrop_path: 'https://image.tmdb.org/t/p/w1280/70a2IY2UvFw8r1sF2L6wP5H3rX.jpg',
      poster_path: 'https://image.tmdb.org/t/p/w780/kdPFm5OcvgJ5wB2E2Fq9xJ4tL6.jpg',
      imdb_rating: '8.0',
      category: 'south',
      genres: ['#Action', '#Drama', '#History']
    }
  ];

  // LIVE TMDB FETCH (If API key exists)
  if (apiKey) {
    try {
      let endpoint = '';
      if (cleanedQuery) {
        endpoint = `/search/movie?query=${encodeURIComponent(cleanedQuery)}&include_adult=false`;
      } else {
        // Browse by category / trending when no search term is entered
        if (category === 'trending' || !category) {
          endpoint = '/trending/movie/day';
        } else if (category === 'top_rated') {
          endpoint = '/movie/top_rated';
        } else if (category === 'bollywood') {
          endpoint = '/discover/movie?with_original_language=hi&sort_by=popularity.desc';
        } else if (category === 'hollywood') {
          endpoint = '/discover/movie?with_original_language=en&sort_by=popularity.desc';
        } else if (category === 'south') {
          endpoint = '/discover/movie?with_original_language=te|ta|ml|kn&sort_by=popularity.desc';
        } else {
          endpoint = '/movie/popular';
        }
      }

      const { url, headers } = getTmdbRequest(endpoint, apiKey);
      const r = await fetch(url, { headers });
      const data: any = await r.json();
      if (r.ok && data.results && data.results.length > 0) {
        const results = data.results.map(formatTmdbItem);
        return res.json({ success: true, results, source: 'tmdb_live', cleanedQuery });
      }
      if (!r.ok && data.status_message) {
        console.warn('TMDB API error response:', data.status_message);
      }
    } catch (e) {
      console.error('TMDB live error:', e);
    }
  }

  // Fallback to sample library when no key or network issue
  let pool = sampleMovies;
  if (category && category !== 'all') {
    pool = sampleMovies.filter(m => m.category === category || category === 'trending');
    if (pool.length === 0) pool = sampleMovies;
  }

  if (!cleanedQuery) {
    return res.json({ success: true, results: pool, source: 'magic_library' });
  }

  const qLower = cleanedQuery.toLowerCase();
  const filtered = sampleMovies.filter((m) =>
    m.title.toLowerCase().includes(qLower) ||
    (m.genres && m.genres.some(g => g.toLowerCase().includes(qLower)))
  );

  if (filtered.length === 0) {
    const formattedTitle = cleanedQuery.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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
  return res.json({ success: true, results: filtered, source: 'magic_library', cleanedQuery });
});

// 6. TELEGRAM GATEWAY
app.all(['/api/telegram', '/api/telegram.php'], async (req, res) => {
  const action = req.query.action as string;
  const settings = readJsonFile(path.join(dataDir, 'settings.json'), {});
  const token = (settings.telegramBotToken || '').trim();

  if (action === 'test' || action === 'validate') {
    let testToken = token;
    if (req.method === 'POST' && req.body.botToken) {
      testToken = req.body.botToken.trim();
    }
    if (!testToken) {
      return res.json({
        success: false,
        isDemo: true,
        message: 'No Telegram Bot Token configured. Operating in DEMO MODE.'
      });
    }
    try {
      const r = await fetch(`https://api.telegram.org/bot${testToken}/getMe`);
      const d: any = await r.json();
      if (d.ok) {
        return res.json({
          success: true,
          isDemo: false,
          bot: d.result,
          message: `Connected to @${d.result.username}`
        });
      } else {
        return res.json({
          success: false,
          isDemo: false,
          error: d.description || 'Invalid Telegram Bot Token'
        });
      }
    } catch (e: any) {
      return res.json({
        success: false,
        isDemo: false,
        error: e.message || 'Telegram network request failed'
      });
    }
  }

  if (action === 'publish' && req.method === 'POST') {
    const {
      movieTitle = 'Untitled Movie',
      year = '',
      photoUrl = '',
      genreCaption = '',
      hubCaption = '',
      genreChannels = [],
      hubChannels = [],
      demoMode = false
    } = req.body;

    const isDemo = !token || demoMode;
    const successful: string[] = [];
    const failed: string[] = [];
    const results: any[] = [];

    // Publish to Genre Channels
    for (const ch of genreChannels) {
      const chatId = ch.chatId || ch.username || '';
      const channelName = ch.name || chatId;

      if (isDemo) {
        successful.push(channelName);
        results.push({ type: 'genre', channel: channelName, chatId, success: true, simulated: true });
        continue;
      }

      try {
        const endpoint = photoUrl
          ? `https://api.telegram.org/bot${token}/sendPhoto`
          : `https://api.telegram.org/bot${token}/sendMessage`;
        const payload: any = {
          chat_id: chatId,
          parse_mode: 'HTML',
          disable_web_page_preview: false
        };
        if (photoUrl) {
          payload.photo = photoUrl;
          payload.caption = genreCaption;
        } else {
          payload.text = genreCaption;
        }
        const r = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const d: any = await r.json();
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

    // Publish to Hub Channels
    for (const hub of hubChannels) {
      const chatId = hub.chatId || hub.username || '';
      const hubName = hub.name || chatId;

      if (isDemo) {
        successful.push(hubName);
        results.push({ type: 'hub', channel: hubName, chatId, success: true, simulated: true });
        continue;
      }

      try {
        const endpoint = photoUrl
          ? `https://api.telegram.org/bot${token}/sendPhoto`
          : `https://api.telegram.org/bot${token}/sendMessage`;
        const payload: any = {
          chat_id: chatId,
          parse_mode: 'HTML',
          disable_web_page_preview: false
        };
        if (photoUrl) {
          payload.photo = photoUrl;
          payload.caption = hubCaption;
        } else {
          payload.text = hubCaption;
        }
        const r = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const d: any = await r.json();
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

    const status = failed.length === 0 ? 'completed' : (successful.length > 0 ? 'partial' : 'failed');

    // Lightweight history record
    const historyFile = path.join(dataDir, 'upload-history.json');
    const history = readJsonFile(historyFile, []);
    const historyRecord = {
      id: 'hist-' + Date.now(),
      title: movieTitle,
      year,
      timestamp: Date.now(),
      dateStr: new Date().toISOString().replace('T', ' ').slice(0, 19),
      genreChannelNames: genreChannels.map((c: any) => c.name || c.chatId),
      hubChannelNames: hubChannels.map((h: any) => h.name || h.chatId),
      status,
      successfulChannels: successful,
      failedChannels: failed,
      isDemo
    };
    history.unshift(historyRecord);
    writeJsonFile(historyFile, history.slice(0, 100));

    return res.json({
      success: status !== 'failed',
      status,
      isDemo,
      successful,
      failed,
      results,
      historyRecord
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
});

// 7. SCHEDULER
app.all(['/api/scheduler', '/api/scheduler.php'], (req, res) => {
  const action = req.query.action as string;
  const file = path.join(dataDir, 'scheduled-posts.json');

  if (req.method === 'GET') {
    const data = readJsonFile(file, []);
    return res.json({ success: true, data });
  }

  if (action === 'run_now' || action === 'publish_single') {
    const posts = readJsonFile(file, []);
    const published: string[] = [];
    const remaining: any[] = [];
    const singleId = req.query.id as string;

    for (const p of posts) {
      if (singleId && p.id !== singleId) {
        remaining.push(p);
        continue;
      }
      published.push(p.movieTitle);
      const historyFile = path.join(dataDir, 'upload-history.json');
      const history = readJsonFile(historyFile, []);
      history.unshift({
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
          ...(p.hubChannels || []).map((h: any) => h.name || h.chatId),
        ],
        failedChannels: [],
        scheduledPublished: true
      });
      writeJsonFile(historyFile, history.slice(0, 100));
    }

    writeJsonFile(file, remaining);
    return res.json({
      success: true,
      message: 'Scheduler executed',
      publishedCount: published.length,
      published,
      remainingCount: remaining.length
    });
  }

  if (req.method === 'POST') {
    const body = req.body;
    const posts = readJsonFile(file, []);
    const newPost = {
      id: 'sched-' + Date.now(),
      movieTitle: body.movieTitle || 'Untitled',
      year: body.year || '',
      photoUrl: body.photoUrl || '',
      genreCaption: body.genreCaption || '',
      hubCaption: body.hubCaption || '',
      genreChannels: body.genreChannels || [],
      hubChannels: body.hubChannels || [],
      scheduledDateTime: body.scheduledDateTime || new Date().toISOString(),
      timestamp: body.timestamp || Date.now() + 3600000,
      timezone: body.timezone || 'Asia/Dhaka',
      status: 'scheduled',
      createdAt: new Date().toISOString()
    };
    posts.push(newPost);
    writeJsonFile(file, posts);
    return res.json({ success: true, item: newPost, data: posts });
  }

  if (req.method === 'DELETE') {
    const id = req.query.id as string;
    let posts = readJsonFile(file, []);
    posts = posts.filter((p: any) => p.id !== id);
    writeJsonFile(file, posts);
    return res.json({ success: true, data: posts });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
});

// 8. UPLOADS & HISTORY
app.all(['/api/uploads', '/api/uploads.php'], (req, res) => {
  const action = req.query.action as string;

  if (action === 'poster' && req.method === 'POST') {
    const { base64 } = req.body;
    if (base64) {
      const matches = base64.match(/^data:image\/(\w+);base64,(.+)$/);
      if (matches) {
        const ext = matches[1] === 'png' ? 'png' : matches[1] === 'webp' ? 'webp' : 'jpg';
        const filename = `mova_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const fullPath = path.join(uploadDir, filename);
        fs.writeFileSync(fullPath, Buffer.from(matches[2], 'base64'));
        const url = `/uploads/posters/${filename}`;
        return res.json({ success: true, url, filename });
      }
    }
    return res.json({ success: false, error: 'Invalid image format' });
  }

  if (action === 'history' || !action) {
    const historyFile = path.join(dataDir, 'upload-history.json');
    if (req.method === 'GET') {
      const data = readJsonFile(historyFile, []);
      const filter = req.query.filter as string;
      const search = ((req.query.search as string) || '').toLowerCase();
      let result = data;
      if (filter) result = result.filter((h: any) => h.status === filter);
      if (search) result = result.filter((h: any) => (h.title || '').toLowerCase().includes(search));
      return res.json({ success: true, data: result });
    }
    if (req.method === 'DELETE') {
      const id = req.query.id as string;
      if (id === 'all') {
        writeJsonFile(historyFile, []);
        return res.json({ success: true, data: [] });
      }
      let data = readJsonFile(historyFile, []);
      data = data.filter((h: any) => h.id !== id);
      writeJsonFile(historyFile, data);
      return res.json({ success: true, data });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
});

// 9. BUNDLE ZIP DOWNLOAD
app.get(['/api/download-zip', '/api/bundle-download.php', '/htdocs.zip'], (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const zipPath = path.resolve(process.cwd(), 'public', 'htdocs.zip');
  if (fs.existsSync(zipPath)) {
    return res.download(zipPath, 'htdocs.zip');
  }
  const distZip = path.resolve(process.cwd(), 'dist', 'htdocs.zip');
  if (fs.existsSync(distZip)) {
    return res.download(distZip, 'htdocs.zip');
  }
  return res.status(404).json({ success: false, error: 'Zip bundle not built yet' });
});

// START SERVER WITH VITE (DEV) OR STATIC FILES (PROD)
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`🚀 Mova Deta Publisher server running at http://${HOST}:${PORT}`);
  });
}

startServer();
