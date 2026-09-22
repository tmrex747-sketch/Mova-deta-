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

const API_BASE = './api';

export const api = {
  // 1. Settings & Config
  async getSettings(): Promise<AppSettings> {
    try {
      const res = await fetch(`${API_BASE}/config.php`);
      const json = await res.json();
      return json.data || {};
    } catch (e) {
      console.error('getSettings error:', e);
      return {
        telegramBotToken: '',
        telegramBotUsername: '',
        howToDownloadUrl: 'https://t.me/MovaDetaHowToDownload',
        howToDownloadEnabled: true,
        tmdbApiKey: '',
        defaultLanguage: 'Hindi',
        defaultGenres: ['#Action', '#Thriller'],
        autoPreview: true,
        autoClearForm: false,
        pinLockEnabled: false,
        pinCode: '',
        timezone: 'Asia/Dhaka',
        isDemoMode: false
      };
    }
  },

  async saveSettings(settings: Partial<AppSettings>): Promise<{ success: boolean; data?: AppSettings }> {
    try {
      const res = await fetch(`${API_BASE}/config.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      return await res.json();
    } catch (e) {
      console.error('saveSettings error:', e);
      return { success: false };
    }
  },

  // 2. Channels (Genre & Hub)
  async getChannels(type: 'genre' | 'hub'): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/channels.php?type=${type}`);
      const json = await res.json();
      return json.data || [];
    } catch (e) {
      console.error(`getChannels ${type} error:`, e);
      return [];
    }
  },

  async saveChannel(type: 'genre' | 'hub', channel: any): Promise<{ success: boolean; data?: any[] }> {
    try {
      const res = await fetch(`${API_BASE}/channels.php?type=${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(channel)
      });
      return await res.json();
    } catch (e) {
      console.error(`saveChannel ${type} error:`, e);
      return { success: false };
    }
  },

  async deleteChannel(type: 'genre' | 'hub', id: string): Promise<{ success: boolean; data?: any[] }> {
    try {
      const res = await fetch(`${API_BASE}/channels.php?type=${type}&id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      return await res.json();
    } catch (e) {
      console.error(`deleteChannel ${type} error:`, e);
      return { success: false };
    }
  },

  // 3. Shorteners
  async getShorteners(): Promise<Shortener[]> {
    try {
      const res = await fetch(`${API_BASE}/shortener.php`);
      const json = await res.json();
      return json.data || [];
    } catch (e) {
      console.error('getShorteners error:', e);
      return [];
    }
  },

  async saveShortener(shortener: Partial<Shortener>): Promise<{ success: boolean; data?: Shortener[] }> {
    try {
      const res = await fetch(`${API_BASE}/shortener.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shortener)
      });
      return await res.json();
    } catch (e) {
      console.error('saveShortener error:', e);
      return { success: false };
    }
  },

  async deleteShortener(id: string): Promise<{ success: boolean; data?: Shortener[] }> {
    try {
      const res = await fetch(`${API_BASE}/shortener.php?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      return await res.json();
    } catch (e) {
      console.error('deleteShortener error:', e);
      return { success: false };
    }
  },

  async shortenUrl(url: string, shortenerId?: string): Promise<{ shortUrl: string; shortenerName?: string }> {
    try {
      const res = await fetch(`${API_BASE}/shortener.php?action=shorten`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, shortenerId })
      });
      const json = await res.json();
      return {
        shortUrl: json.shortUrl || url,
        shortenerName: json.shortenerName
      };
    } catch (e) {
      console.error('shortenUrl error:', e);
      return { shortUrl: url };
    }
  },

  // 4. Promotions
  async getPromotions(): Promise<Promotion[]> {
    try {
      const res = await fetch(`${API_BASE}/promotions.php`);
      const json = await res.json();
      return json.data || [];
    } catch (e) {
      console.error('getPromotions error:', e);
      return [];
    }
  },

  async savePromotion(promo: Partial<Promotion>): Promise<{ success: boolean; data?: Promotion[] }> {
    try {
      const res = await fetch(`${API_BASE}/promotions.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promo)
      });
      return await res.json();
    } catch (e) {
      console.error('savePromotion error:', e);
      return { success: false };
    }
  },

  async deletePromotion(id: string): Promise<{ success: boolean; data?: Promotion[] }> {
    try {
      const res = await fetch(`${API_BASE}/promotions.php?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      return await res.json();
    } catch (e) {
      console.error('deletePromotion error:', e);
      return { success: false };
    }
  },

  // 5. TMDB Movies & Magic Search
  async searchTMDB(
    query: string,
    category?: string
  ): Promise<{ results: TMDBMovie[]; source?: string; cleanedQuery?: string }> {
    try {
      const q = new URLSearchParams();
      q.set('action', 'search');
      if (query) q.set('query', query);
      if (category) q.set('category', category);
      const res = await fetch(`${API_BASE}/tmdb.php?${q.toString()}`);
      const json = await res.json();
      return {
        results: json.results || [],
        source: json.source || 'magic_library',
        cleanedQuery: json.cleanedQuery
      };
    } catch (e) {
      console.error('searchTMDB error:', e);
      return { results: [], source: 'error' };
    }
  },

  // 6. Telegram Bot
  async testTelegramConnection(botToken?: string): Promise<{ success: boolean; isDemo?: boolean; bot?: any; message?: string; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/telegram.php?action=test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error' };
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
    try {
      const res = await fetch(`${API_BASE}/telegram.php?action=publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (e: any) {
      return {
        success: false,
        status: 'failed',
        isDemo: true,
        successful: [],
        failed: ['Network error'],
        results: []
      };
    }
  },

  // 7. Scheduler
  async getScheduledPosts(): Promise<ScheduledPostItem[]> {
    try {
      const res = await fetch(`${API_BASE}/scheduler.php`);
      const json = await res.json();
      return json.data || [];
    } catch (e) {
      console.error('getScheduledPosts error:', e);
      return [];
    }
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
    try {
      const res = await fetch(`${API_BASE}/scheduler.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (e) {
      console.error('schedulePost error:', e);
      return { success: false };
    }
  },

  async cancelScheduledPost(id: string): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/scheduler.php?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      return await res.json();
    } catch (e) {
      console.error('cancelScheduledPost error:', e);
      return { success: false };
    }
  },

  async runSchedulerNow(): Promise<{ success: boolean; publishedCount: number; published: string[] }> {
    try {
      const res = await fetch(`${API_BASE}/scheduler.php?action=run_now`);
      return await res.json();
    } catch (e) {
      console.error('runSchedulerNow error:', e);
      return { success: false, publishedCount: 0, published: [] };
    }
  },

  // 8. Uploads & History
  async uploadPosterImage(base64: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/uploads.php?action=poster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64 })
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async getHistory(filter?: string, search?: string): Promise<UploadHistoryItem[]> {
    try {
      const query = new URLSearchParams();
      if (filter) query.set('filter', filter);
      if (search) query.set('search', search);
      const res = await fetch(`${API_BASE}/uploads.php?action=history&${query.toString()}`);
      const json = await res.json();
      return json.data || [];
    } catch (e) {
      console.error('getHistory error:', e);
      return [];
    }
  },

  async clearHistory(id = 'all'): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/uploads.php?action=history&id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      return await res.json();
    } catch (e) {
      console.error('clearHistory error:', e);
      return { success: false };
    }
  }
};
