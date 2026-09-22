import {
  AppSettings,
  GenreChannel,
  HubChannel,
  Promotion,
  ScheduledPostItem,
  Shortener,
  UploadHistoryItem
} from '../types';

const STORAGE_KEYS = {
  SETTINGS: 'mova_settings',
  GENRE_CHANNELS: 'mova_genre_channels',
  HUB_CHANNELS: 'mova_hub_channels',
  SHORTENERS: 'mova_shorteners',
  PROMOTIONS: 'mova_promotions',
  SCHEDULED_POSTS: 'mova_scheduled_posts',
  HISTORY: 'mova_upload_history'
};

export const defaultSettings: AppSettings = {
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

export const defaultGenreChannels: GenreChannel[] = [
  { id: 'gc-1', name: 'Mova Deta Action', username: 'MovaAction', chatId: '@MovaAction', genreLabel: '#Action', isPrivate: false, active: true },
  { id: 'gc-2', name: 'Mova Deta Thriller', username: 'MovaThriller', chatId: '@MovaThriller', genreLabel: '#Thriller', isPrivate: false, active: true },
  { id: 'gc-3', name: 'Mova Deta Romance', username: 'MovaRomance', chatId: '@MovaRomance', genreLabel: '#Romance', isPrivate: false, active: true }
];

export const defaultHubChannels: HubChannel[] = [
  { id: 'hub-1', name: 'Mova Deta Main Hub', username: 'MovaHub', chatId: '@MovaHub', isPrivate: false, active: true }
];

export const defaultShorteners: Shortener[] = [
  { id: 'short-1', name: 'Direct Link (No Shortener)', apiUrl: '', apiKey: '', baseUrl: '', status: 'ready', enabled: true, isActive: true },
  { id: 'short-2', name: 'GPlinks', apiUrl: 'https://gplinks.in/api', apiKey: '', baseUrl: 'https://gplinks.co', status: 'ready', enabled: false, isActive: false },
  { id: 'short-3', name: 'Droplink', apiUrl: 'https://droplink.co/api', apiKey: '', baseUrl: 'https://droplink.co', status: 'ready', enabled: false, isActive: false }
];

export const defaultPromotions: Promotion[] = [
  { id: 'promo-1', title: 'VIP Discussion Group', text: '💬 Join our active movie discussion group for instant requests!', url: 'https://t.me/MovaDiscussion', active: true }
];

export const clientStorage = {
  get<T>(key: string, defaultVal: T): T {
    try {
      if (typeof window === 'undefined') return defaultVal;
      const val = localStorage.getItem(key);
      if (!val) return defaultVal;
      return JSON.parse(val);
    } catch {
      return defaultVal;
    }
  },

  set(key: string, val: any): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.warn('Storage set error:', e);
    }
  },

  getSettings(): AppSettings {
    return this.get<AppSettings>(STORAGE_KEYS.SETTINGS, defaultSettings);
  },

  saveSettings(patch: Partial<AppSettings>): AppSettings {
    const curr = this.getSettings();
    const updated = { ...curr, ...patch };
    this.set(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  },

  getChannels(type: 'genre' | 'hub'): any[] {
    if (type === 'hub') {
      return this.get<HubChannel[]>(STORAGE_KEYS.HUB_CHANNELS, defaultHubChannels);
    }
    return this.get<GenreChannel[]>(STORAGE_KEYS.GENRE_CHANNELS, defaultGenreChannels);
  },

  saveChannels(type: 'genre' | 'hub', channels: any[]): any[] {
    const key = type === 'hub' ? STORAGE_KEYS.HUB_CHANNELS : STORAGE_KEYS.GENRE_CHANNELS;
    this.set(key, channels);
    return channels;
  },

  getShorteners(): Shortener[] {
    return this.get<Shortener[]>(STORAGE_KEYS.SHORTENERS, defaultShorteners);
  },

  saveShorteners(list: Shortener[]): Shortener[] {
    this.set(STORAGE_KEYS.SHORTENERS, list);
    return list;
  },

  getPromotions(): Promotion[] {
    return this.get<Promotion[]>(STORAGE_KEYS.PROMOTIONS, defaultPromotions);
  },

  savePromotions(list: Promotion[]): Promotion[] {
    this.set(STORAGE_KEYS.PROMOTIONS, list);
    return list;
  },

  getScheduledPosts(): ScheduledPostItem[] {
    return this.get<ScheduledPostItem[]>(STORAGE_KEYS.SCHEDULED_POSTS, []);
  },

  saveScheduledPosts(list: ScheduledPostItem[]): ScheduledPostItem[] {
    this.set(STORAGE_KEYS.SCHEDULED_POSTS, list);
    return list;
  },

  getHistory(): UploadHistoryItem[] {
    return this.get<UploadHistoryItem[]>(STORAGE_KEYS.HISTORY, []);
  },

  saveHistory(list: UploadHistoryItem[]): UploadHistoryItem[] {
    this.set(STORAGE_KEYS.HISTORY, list);
    return list;
  },

  addHistory(item: UploadHistoryItem): UploadHistoryItem[] {
    const list = this.getHistory();
    list.unshift(item);
    this.saveHistory(list.slice(0, 100));
    return list;
  }
};
