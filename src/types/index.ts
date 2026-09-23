export interface AppSettings {
  telegramBotToken: string;
  telegramBotUsername: string;
  howToDownloadUrl: string;
  howToDownloadEnabled: boolean;
  tmdbApiKey: string;
  defaultLanguage: string;
  defaultGenres: string[];
  autoPreview: boolean;
  autoClearForm: boolean;
  pinLockEnabled: boolean;
  pinCode: string;
  timezone: string;
  isDemoMode?: boolean;
  canvasBrandingName?: string;
}

export interface Shortener {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  baseUrl: string;
  status: 'connected' | 'ready' | 'error';
  enabled: boolean;
  isActive: boolean;
}

export interface GenreChannel {
  id: string;
  name: string;
  username: string;
  chatId: string;
  inviteLink?: string;
  genreLabel?: string;
  isPrivate: boolean;
  active: boolean;
}

export interface HubChannel {
  id: string;
  name: string;
  username: string;
  chatId: string;
  inviteLink?: string;
  isPrivate: boolean;
  active: boolean;
}

export interface Promotion {
  id: string;
  title: string;
  text: string;
  url: string;
  active: boolean;
}

export interface QualityItem {
  id: string;
  name: string;
  url: string;
  size?: string;
  enabled: boolean;
}

export type EmojifyStyle = 'ultra' | 'standard' | 'minimal';

export interface MovieFormData {
  title: string;
  year: string;
  imdbRating: string;
  genres: string[];
  language: string;
  posterUrl: string;
  qualities: QualityItem[];
  selectedPromotionId?: string;
  selectedShortenerId?: string;
  selectedGenreChannelIds: string[];
  selectedHubChannelIds: string[];
  emojifyStyle?: EmojifyStyle;
}

export interface UploadHistoryItem {
  id: string;
  title: string;
  year?: string;
  timestamp: number;
  dateStr: string;
  genreChannelNames: string[];
  hubChannelNames: string[];
  status: 'completed' | 'partial' | 'failed';
  successfulChannels: string[];
  failedChannels: string[];
  isDemo?: boolean;
}

export interface ScheduledPostItem {
  id: string;
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
  status: 'scheduled' | 'processing' | 'failed' | 'completed';
  createdAt: string;
  lastError?: string;
}

export interface TMDBMovie {
  id: number;
  title: string;
  year: string;
  release_date: string;
  backdrop_path: string;
  poster_path: string;
  imdb_rating: string;
  genres: string[];
  category?: string;
  logo_path?: string;
  tagline?: string;
  backdrops?: string[]; // Multiple 16:9 images for browsing with < > buttons
}
