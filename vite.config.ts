import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import JSZip from 'jszip';
import {defineConfig, Plugin} from 'vite';

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
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Error writing JSON file:', filePath, e);
    return false;
  }
}

function apiServerPlugin(): Plugin {
  return {
    name: 'mova-deta-api-server',
    configureServer(server) {
      const dataDir = path.resolve(process.cwd(), 'data');
      const uploadDir = path.resolve(process.cwd(), 'uploads', 'posters');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, {recursive: true});

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
          console.error('Scheduler error:', e);
        }
      }, 30000);

      server.middlewares.use(async (req, res, next) => {
        const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const pathname = urlObj.pathname;

        // Static files for /uploads/posters/
        if (pathname.startsWith('/uploads/posters/')) {
          const filename = path.basename(pathname);
          const fullPath = path.join(uploadDir, filename);
          if (fs.existsSync(fullPath)) {
            const ext = path.extname(filename).toLowerCase();
            const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
            res.setHeader('Content-Type', mime);
            return fs.createReadStream(fullPath).pipe(res);
          }
        }

        // Only handle /api/ routes
        if (!pathname.startsWith('/api/')) {
          return next();
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          return res.end();
        }

        const parseBody = (): Promise<any> => {
          return new Promise((resolve) => {
            let data = '';
            req.on('data', (chunk) => (data += chunk));
            req.on('end', () => {
              try {
                resolve(data ? JSON.parse(data) : {});
              } catch (e) {
                resolve({});
              }
            });
          });
        };

        const cleanPath = pathname.replace('/api/', '').replace(/\.php$/, '');

        // 1. CONFIG & SETTINGS
        if (cleanPath === 'config') {
          const file = path.join(dataDir, 'settings.json');
          if (req.method === 'GET') {
            const data = readJsonFile(file, {});
            return res.end(JSON.stringify({success: true, data}));
          }
          if (req.method === 'POST') {
            const body = await parseBody();
            const current = readJsonFile(file, {});
            const updated = {...current, ...body};
            writeJsonFile(file, updated);
            return res.end(JSON.stringify({success: true, message: 'Settings saved', data: updated}));
          }
        }

        // 2. CHANNELS (Genre & Hub)
        if (cleanPath === 'channels') {
          const type = urlObj.searchParams.get('type') || 'genre';
          const file = path.join(dataDir, type === 'hub' ? 'hub-channels.json' : 'genre-channels.json');
          if (req.method === 'GET') {
            const data = readJsonFile(file, []);
            return res.end(JSON.stringify({success: true, data}));
          }
          if (req.method === 'POST') {
            const body = await parseBody();
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
            return res.end(JSON.stringify({success: true, data: channels}));
          }
          if (req.method === 'DELETE') {
            const id = urlObj.searchParams.get('id');
            let channels = readJsonFile(file, []);
            channels = channels.filter((c: any) => c.id !== id);
            writeJsonFile(file, channels);
            return res.end(JSON.stringify({success: true, data: channels}));
          }
        }

        // 3. SHORTENERS
        if (cleanPath === 'shortener') {
          const file = path.join(dataDir, 'shorteners.json');
          const action = urlObj.searchParams.get('action');

          if (action === 'shorten' && req.method === 'POST') {
            const body = await parseBody();
            const url = (body.url || '').trim();
            const shorteners = readJsonFile(file, []);
            let selected = shorteners.find((s: any) => s.id === body.shortenerId && s.enabled);
            if (!selected) selected = shorteners.find((s: any) => s.isActive && s.enabled) || shorteners[0];

            let shortUrl = '';
            if (selected && selected.apiUrl && selected.apiKey) {
              try {
                const ep = `${selected.apiUrl}?api=${encodeURIComponent(selected.apiKey)}&url=${encodeURIComponent(url)}`;
                const r = await fetch(ep);
                const json = await r.json();
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

            return res.end(JSON.stringify({
              success: true,
              originalUrl: url,
              shortUrl,
              shortenerName: selected?.name || 'Mova Shortener',
              shortened: true
            }));
          }

          if (req.method === 'GET') {
            const data = readJsonFile(file, []);
            return res.end(JSON.stringify({success: true, data}));
          }
          if (req.method === 'POST') {
            const body = await parseBody();
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
            return res.end(JSON.stringify({success: true, data: shorteners}));
          }
          if (req.method === 'DELETE') {
            const id = urlObj.searchParams.get('id');
            let shorteners = readJsonFile(file, []);
            shorteners = shorteners.filter((s: any) => s.id !== id);
            writeJsonFile(file, shorteners);
            return res.end(JSON.stringify({success: true, data: shorteners}));
          }
        }

        // 4. PROMOTIONS
        if (cleanPath === 'promotions') {
          const file = path.join(dataDir, 'promotions.json');
          if (req.method === 'GET') {
            const data = readJsonFile(file, []);
            return res.end(JSON.stringify({success: true, data}));
          }
          if (req.method === 'POST') {
            const body = await parseBody();
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
            return res.end(JSON.stringify({success: true, data: promos}));
          }
          if (req.method === 'DELETE') {
            const id = urlObj.searchParams.get('id');
            let promos = readJsonFile(file, []);
            promos = promos.filter((p: any) => p.id !== id);
            writeJsonFile(file, promos);
            return res.end(JSON.stringify({success: true, data: promos}));
          }
        }

        // 5. TMDB MOVIE MAGIC SEARCH
        if (cleanPath === 'tmdb') {
          let rawQuery = (urlObj.searchParams.get('query') || '').trim();
          const category = urlObj.searchParams.get('category') || '';
          const settings = readJsonFile(path.join(dataDir, 'settings.json'), {});
          const apiKey = settings.tmdbApiKey;

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
            // Strip common torrent/scene release tags
            cleanedQuery = cleanedQuery
              .replace(/\b(1080p|720p|480p|2160p|4k|2k|uhd|bluray|bdrip|webrip|web-dl|hdrip|dvdrip|x264|x265|hevc|aac|dts|h264|esub|multi|dual\s*audio|hindi|bengali|english)\b/gi, '')
              .replace(/[._\-+]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
          }

          const sampleMovies = [
            // Trending & Hollywood
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
              id: 945961,
              title: 'Alien: Romulus',
              year: '2024',
              release_date: '2024-08-16',
              backdrop_path: 'https://image.tmdb.org/t/p/w1280/9SSEUrSqhljBMzRe4aBTh17rUaC.jpg',
              poster_path: 'https://image.tmdb.org/t/p/w780/b33nnKl12vfwh49HGqB0x8ORGFm.jpg',
              imdb_rating: '7.4',
              category: 'hollywood',
              genres: ['#Horror', '#SciFi', '#Thriller']
            },
            {
              id: 1022789,
              title: 'Inside Out 2',
              year: '2024',
              release_date: '2024-06-14',
              backdrop_path: 'https://image.tmdb.org/t/p/w1280/stKGOmPAgpnw4Lpn5gX7L1qHq7t.jpg',
              poster_path: 'https://image.tmdb.org/t/p/w780/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
              imdb_rating: '7.7',
              category: 'trending',
              genres: ['#Animation', '#Family', '#Comedy']
            },
            {
              id: 573435,
              title: 'Bad Boys: Ride or Die',
              year: '2024',
              release_date: '2024-06-07',
              backdrop_path: 'https://image.tmdb.org/t/p/w1280/ga4OLm4qLx1VTY0jU6UMgXFvE1E.jpg',
              poster_path: 'https://image.tmdb.org/t/p/w780/nP6RliHjxsz4irTKsxe8FRhKZYl.jpg',
              imdb_rating: '6.9',
              category: 'hollywood',
              genres: ['#Action', '#Comedy', '#Crime']
            },
            {
              id: 157336,
              title: 'Interstellar',
              year: '2014',
              release_date: '2014-11-07',
              backdrop_path: 'https://image.tmdb.org/t/p/w1280/rAiYTsqJiO8W0900wcl1E4z7v7W.jpg',
              poster_path: 'https://image.tmdb.org/t/p/w780/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
              imdb_rating: '8.7',
              category: 'top_rated',
              genres: ['#SciFi', '#Adventure', '#Drama']
            },
            {
              id: 603692,
              title: 'John Wick: Chapter 4',
              year: '2023',
              release_date: '2023-03-24',
              backdrop_path: 'https://image.tmdb.org/t/p/w1280/7I6VUdPj6tQECNHdviJkUHD2f89.jpg',
              poster_path: 'https://image.tmdb.org/t/p/w780/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg',
              imdb_rating: '7.8',
              category: 'hollywood',
              genres: ['#Action', '#Thriller', '#Crime']
            },
            {
              id: 414906,
              title: 'The Batman',
              year: '2022',
              release_date: '2022-03-04',
              backdrop_path: 'https://image.tmdb.org/t/p/w1280/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg',
              poster_path: 'https://image.tmdb.org/t/p/w780/74xTEgt7R36Fpooo50r9T25onhq.jpg',
              imdb_rating: '7.8',
              category: 'hollywood',
              genres: ['#Action', '#Crime', '#Drama']
            },
            // Bollywood / Hindi
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
              id: 866398,
              title: 'Pathaan',
              year: '2023',
              release_date: '2023-01-25',
              backdrop_path: 'https://image.tmdb.org/t/p/w1280/a4BfxRK8GohvWpTcl4aGgqF37YJ.jpg',
              poster_path: 'https://image.tmdb.org/t/p/w780/m1b9ToB5ugyEeeE98zg99MZv9z.jpg',
              imdb_rating: '6.4',
              category: 'bollywood',
              genres: ['#Action', '#Thriller', '#Adventure']
            },
            {
              id: 1114513,
              title: 'Stree 2',
              year: '2024',
              release_date: '2024-08-15',
              backdrop_path: 'https://image.tmdb.org/t/p/w1280/7k2a6uW5k6p1h2b0V5Z4F0wQG7.jpg',
              poster_path: 'https://image.tmdb.org/t/p/w780/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
              imdb_rating: '7.6',
              category: 'bollywood',
              genres: ['#Comedy', '#Horror']
            },
            // South Indian & Pan-India
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
            },
            {
              id: 792307,
              title: 'Salaar: Part 1 - Ceasefire',
              year: '2023',
              release_date: '2023-12-22',
              backdrop_path: 'https://image.tmdb.org/t/p/w1280/b9bH8a4L6K8wP5H3rX9W9F0wQG7.jpg',
              poster_path: 'https://image.tmdb.org/t/p/w780/a4BfxRK8GohvWpTcl4aGgqF37YJ.jpg',
              imdb_rating: '6.7',
              category: 'south',
              genres: ['#Action', '#Crime', '#Thriller']
            },
            {
              id: 974950,
              title: 'Pushpa 2: The Rule',
              year: '2024',
              release_date: '2024-12-05',
              backdrop_path: 'https://image.tmdb.org/t/p/w1280/yDHYTjA3R0neEjMMBE4p3v1GhaT.jpg',
              poster_path: 'https://image.tmdb.org/t/p/w780/kdPFm5OcvgJ5wB2E2Fq9xJ4tL6.jpg',
              imdb_rating: '8.2',
              category: 'south',
              genres: ['#Action', '#Drama', '#Crime']
            }
          ];

          if (apiKey && cleanedQuery) {
            try {
              const url = `https://api.themoviedb.org/3/search/movie?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(cleanedQuery)}&include_adult=false`;
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
                const results = data.results.map((m: any) => ({
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
                return res.end(JSON.stringify({success: true, results, source: 'tmdb_live', cleanedQuery}));
              }
            } catch (e) {
              console.error('TMDB live error:', e);
            }
          }

          let pool = sampleMovies;
          if (category && category !== 'all') {
            pool = sampleMovies.filter(m => m.category === category || category === 'trending');
            if (pool.length === 0) pool = sampleMovies;
          }

          if (!cleanedQuery) {
            return res.end(JSON.stringify({success: true, results: pool, source: 'magic_library'}));
          }

          const qLower = cleanedQuery.toLowerCase();
          const filtered = sampleMovies.filter((m) =>
            m.title.toLowerCase().includes(qLower) ||
            (m.genres && m.genres.some(g => g.toLowerCase().includes(qLower)))
          );

          if (filtered.length === 0) {
            const formattedTitle = cleanedQuery.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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
          return res.end(JSON.stringify({success: true, results: filtered, source: 'magic_library', cleanedQuery}));
        }

        // 6. TELEGRAM GATEWAY
        if (cleanPath === 'telegram') {
          const action = urlObj.searchParams.get('action');
          const settings = readJsonFile(path.join(dataDir, 'settings.json'), {});
          const token = (settings.telegramBotToken || '').trim();

          if (action === 'test' || action === 'validate') {
            let testToken = token;
            if (req.method === 'POST') {
              const body = await parseBody();
              if (body.botToken) testToken = body.botToken.trim();
            }
            if (!testToken) {
              return res.end(JSON.stringify({
                success: false,
                isDemo: true,
                message: 'No Telegram Bot Token configured. Operating in DEMO MODE.'
              }));
            }
            try {
              const r = await fetch(`https://api.telegram.org/bot${testToken}/getMe`);
              const d = await r.json();
              if (d.ok) {
                return res.end(JSON.stringify({
                  success: true,
                  isDemo: false,
                  bot: d.result,
                  message: `Connected to @${d.result.username}`
                }));
              } else {
                return res.end(JSON.stringify({
                  success: false,
                  isDemo: false,
                  error: d.description || 'Invalid Telegram Bot Token'
                }));
              }
            } catch (e: any) {
              return res.end(JSON.stringify({
                success: false,
                isDemo: false,
                error: e.message || 'Telegram network request failed'
              }));
            }
          }

          if (action === 'publish' && req.method === 'POST') {
            const body = await parseBody();
            const {
              movieTitle = 'Untitled Movie',
              year = '',
              photoUrl = '',
              genreCaption = '',
              hubCaption = '',
              genreChannels = [],
              hubChannels = [],
              demoMode = false
            } = body;

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
                results.push({type: 'genre', channel: channelName, chatId, success: true, simulated: true});
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
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify(payload)
                });
                const d = await r.json();
                if (d.ok) {
                  successful.push(channelName);
                  results.push({type: 'genre', channel: channelName, chatId, success: true, messageId: d.result.message_id});
                } else {
                  failed.push(channelName);
                  results.push({type: 'genre', channel: channelName, chatId, success: false, error: d.description});
                }
              } catch (e: any) {
                failed.push(channelName);
                results.push({type: 'genre', channel: channelName, chatId, success: false, error: e.message});
              }
            }

            // Publish to Hub Channels
            for (const hub of hubChannels) {
              const chatId = hub.chatId || hub.username || '';
              const hubName = hub.name || chatId;

              if (isDemo) {
                successful.push(hubName);
                results.push({type: 'hub', channel: hubName, chatId, success: true, simulated: true});
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
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify(payload)
                });
                const d = await r.json();
                if (d.ok) {
                  successful.push(hubName);
                  results.push({type: 'hub', channel: hubName, chatId, success: true, messageId: d.result.message_id});
                } else {
                  failed.push(hubName);
                  results.push({type: 'hub', channel: hubName, chatId, success: false, error: d.description});
                }
              } catch (e: any) {
                failed.push(hubName);
                results.push({type: 'hub', channel: hubName, chatId, success: false, error: e.message});
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

            return res.end(JSON.stringify({
              success: status !== 'failed',
              status,
              isDemo,
              successful,
              failed,
              results,
              historyRecord
            }));
          }
        }

        // 7. SCHEDULER
        if (cleanPath === 'scheduler') {
          const action = urlObj.searchParams.get('action');
          const file = path.join(dataDir, 'scheduled-posts.json');

          if (req.method === 'GET') {
            const data = readJsonFile(file, []);
            return res.end(JSON.stringify({success: true, data}));
          }

          if (action === 'run_now' || action === 'publish_single') {
            const posts = readJsonFile(file, []);
            const published: string[] = [];
            const remaining: any[] = [];
            const singleId = urlObj.searchParams.get('id');

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
            return res.end(JSON.stringify({
              success: true,
              message: 'Scheduler executed',
              publishedCount: published.length,
              published,
              remainingCount: remaining.length
            }));
          }

          if (req.method === 'POST') {
            const body = await parseBody();
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
            return res.end(JSON.stringify({success: true, item: newPost, data: posts}));
          }

          if (req.method === 'DELETE') {
            const id = urlObj.searchParams.get('id');
            let posts = readJsonFile(file, []);
            posts = posts.filter((p: any) => p.id !== id);
            writeJsonFile(file, posts);
            return res.end(JSON.stringify({success: true, data: posts}));
          }
        }

        // 8. UPLOADS & HISTORY
        if (cleanPath === 'uploads') {
          const action = urlObj.searchParams.get('action');

          if (action === 'poster' && req.method === 'POST') {
            const body = await parseBody();
            if (body.base64) {
              const matches = body.base64.match(/^data:image\/(\w+);base64,(.+)$/);
              if (matches) {
                const ext = matches[1] === 'png' ? 'png' : matches[1] === 'webp' ? 'webp' : 'jpg';
                const filename = `mova_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
                const fullPath = path.join(uploadDir, filename);
                fs.writeFileSync(fullPath, Buffer.from(matches[2], 'base64'));
                const url = `/uploads/posters/${filename}`;
                return res.end(JSON.stringify({success: true, url, filename}));
              }
            }
            return res.end(JSON.stringify({success: false, error: 'Invalid image format'}));
          }

          if (action === 'history' || !action) {
            const historyFile = path.join(dataDir, 'upload-history.json');
            if (req.method === 'GET') {
              const data = readJsonFile(historyFile, []);
              const filter = urlObj.searchParams.get('filter');
              const search = (urlObj.searchParams.get('search') || '').toLowerCase();
              let result = data;
              if (filter) result = result.filter((h: any) => h.status === filter);
              if (search) result = result.filter((h: any) => (h.title || '').toLowerCase().includes(search));
              return res.end(JSON.stringify({success: true, data: result}));
            }
            if (req.method === 'DELETE') {
              const id = urlObj.searchParams.get('id');
              if (id === 'all') {
                writeJsonFile(historyFile, []);
                return res.end(JSON.stringify({success: true, data: []}));
              }
              let data = readJsonFile(historyFile, []);
              data = data.filter((h: any) => h.id !== id);
              writeJsonFile(historyFile, data);
              return res.end(JSON.stringify({success: true, data}));
            }
          }

          if (pathname === '/api/download-zip') {
            const zipPath = path.resolve(process.cwd(), 'public', 'htdocs.zip');
            if (fs.existsSync(zipPath)) {
              const fileData = fs.readFileSync(zipPath);
              res.setHeader('Content-Type', 'application/zip');
              res.setHeader('Content-Disposition', 'attachment; filename="htdocs.zip"');
              return res.end(fileData);
            }
          }
        }

        res.statusCode = 404;
        return res.end(JSON.stringify({success: false, error: 'Endpoint not found'}));
      });
    }
  };
}

function infinityFreeBundlePlugin(): Plugin {
  return {
    name: 'infinityfree-bundle-packager',
    async closeBundle() {
      const rootDir = process.cwd();
      const distDir = path.resolve(rootDir, 'dist');
      if (!fs.existsSync(distDir)) return;

      const copyDirs = ['api', 'data', 'uploads', 'cron'];
      for (const dirName of copyDirs) {
        const src = path.resolve(rootDir, dirName);
        const dest = path.resolve(distDir, dirName);
        if (fs.existsSync(src)) {
          fs.cpSync(src, dest, { recursive: true, force: true });
        }
      }

      // Also copy compiled assets to root /assets/ so the root workspace index.html and exported zip work directly in htdocs!
      const rootAssetsDir = path.resolve(rootDir, 'assets');
      const distAssetsDir = path.resolve(distDir, 'assets');
      if (fs.existsSync(distAssetsDir)) {
        if (!fs.existsSync(rootAssetsDir)) fs.mkdirSync(rootAssetsDir, { recursive: true });
        fs.cpSync(distAssetsDir, rootAssetsDir, { recursive: true, force: true });
      }

      // Ensure .htaccess in dist and dist/data
      const publicHtaccess = path.resolve(rootDir, 'public', '.htaccess');
      const distHtaccess = path.resolve(distDir, '.htaccess');
      if (fs.existsSync(publicHtaccess)) {
        fs.copyFileSync(publicHtaccess, distHtaccess);
      }

      const dataHtaccess = path.resolve(rootDir, 'data', '.htaccess');
      const distDataHtaccess = path.resolve(distDir, 'data', '.htaccess');
      if (fs.existsSync(dataHtaccess)) {
        fs.copyFileSync(dataHtaccess, distDataHtaccess);
      }

      try {
        const zip = new JSZip();
        function addFolderRecursively(dirPath: string, zipFolder: JSZip) {
          const entries = fs.readdirSync(dirPath);
          for (const entry of entries) {
            if (entry === 'htdocs.zip' || entry === '.DS_Store') continue;
            const fullPath = path.join(dirPath, entry);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
              const subZip = zipFolder.folder(entry);
              if (subZip) addFolderRecursively(fullPath, subZip);
            } else {
              const fileBuffer = fs.readFileSync(fullPath);
              zipFolder.file(entry, fileBuffer);
            }
          }
        }

        addFolderRecursively(distDir, zip);
        const zipData = await zip.generateAsync({
          type: 'nodebuffer',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });

        fs.writeFileSync(path.join(distDir, 'htdocs.zip'), zipData);
        const publicDir = path.resolve(rootDir, 'public');
        if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
        fs.writeFileSync(path.join(publicDir, 'htdocs.zip'), zipData);

        console.log('✅ InfinityFree bundle packaged: api/, data/, uploads/, cron/, .htaccess, and htdocs.zip ready!');
      } catch (err) {
        console.error('Error generating htdocs.zip:', err);
      }
    }
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss(), apiServerPlugin(), infinityFreeBundlePlugin()],
    build: {
      rollupOptions: {
        output: {
          entryFileNames: 'assets/app.js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && assetInfo.name.endsWith('.css')) {
              return 'assets/style.css';
            }
            return 'assets/[name].[ext]';
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
    },
  };
});

