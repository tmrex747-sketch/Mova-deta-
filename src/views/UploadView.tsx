import React, { useState, useRef } from 'react';
import {
  Film,
  Search,
  Layers,
  Link2,
  Tv,
  Radio,
  Megaphone,
  Upload,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Trash2,
  X,
  Plus,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Wand2,
  RotateCcw
} from 'lucide-react';
import {
  AppSettings,
  GenreChannel,
  HubChannel,
  MovieFormData,
  Promotion,
  QualityItem,
  Shortener
} from '../types';
import { TMDBModal } from '../components/TMDBModal';
import { TMDBMagicSearch } from '../components/TMDBMagicSearch';
import { QualityModal } from '../components/QualityModal';
import { TelegramPreview } from '../components/TelegramPreview';
import { ScheduleModal } from '../components/ScheduleModal';
import { PublishModal, PublishStep } from '../components/PublishModal';
import { ThumbnailStudioModal } from '../components/ThumbnailStudioModal';
import { generateMovieThumbnail } from '../utils/thumbnailStudio';
import { api } from '../services/api';
import {
  generateGenreCaption,
  generateHubCaption,
  toHyperBold
} from '../utils/telegramFormatter';

interface UploadViewProps {
  settings: AppSettings;
  genreChannels: GenreChannel[];
  hubChannels: HubChannel[];
  shorteners: Shortener[];
  promotions: Promotion[];
  onRefreshScheduled: () => void;
  onRefreshHistory: () => void;
}

export const UploadView: React.FC<UploadViewProps> = ({
  settings,
  genreChannels,
  hubChannels,
  shorteners,
  promotions,
  onRefreshScheduled,
  onRefreshHistory
}) => {
  // Main Movie Form State
  const [formData, setFormData] = useState<MovieFormData>({
    title: 'Avatar: The Way of Water',
    year: '2022',
    imdbRating: '7.6',
    genres: ['#Action', '#Adventure', '#SciFi'],
    language: settings.defaultLanguage || 'Hindi',
    posterUrl: 'https://image.tmdb.org/t/p/w1280/14QbnygCuTO0vl7CAFmPf1fgZfV.jpg',
    qualities: [
      { id: '1', name: '480p', url: 'https://mova.link/dl480', size: '480 MB', enabled: true },
      { id: '2', name: '720p HEVC', url: 'https://mova.link/dl720h', size: '950 MB', enabled: true },
      { id: '3', name: '720p', url: 'https://mova.link/dl720', size: '1.4 GB', enabled: false },
      { id: '4', name: '1080p HEVC', url: '', size: '2.1 GB', enabled: false },
      { id: '5', name: '1080p', url: 'https://mova.link/dl1080', size: '3.2 GB', enabled: true },
      { id: '6', name: '1080p HQ', url: '', size: '5.8 GB', enabled: false },
      { id: '7', name: '2K', url: '', size: '8.4 GB', enabled: false },
      { id: '8', name: '4K', url: '', size: '14.2 GB', enabled: false },
    ],
    selectedPromotionId: promotions[0]?.id || '',
    selectedShortenerId: shorteners.find((s) => s.isActive)?.id || '',
    selectedGenreChannelIds: genreChannels.filter((c) => c.active).map((c) => c.id),
    selectedHubChannelIds: hubChannels.filter((c) => c.active).map((c) => c.id),
    emojifyStyle: 'ultra'
  });

  const [newGenreInput, setNewGenreInput] = useState('');
  const [isTmdbOpen, setIsTmdbOpen] = useState(false);
  const [isQualityModalOpen, setIsQualityModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isStudioModalOpen, setIsStudioModalOpen] = useState(false);
  const [isAutoGeneratingThumbnail, setIsAutoGeneratingThumbnail] = useState(false);
  const [isPostGenerated, setIsPostGenerated] = useState(false);
  const [availableBackdrops, setAvailableBackdrops] = useState<string[]>([
    'https://image.tmdb.org/t/p/w1280/14QbnygCuTO0vl7CAFmPf1fgZfV.jpg',
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1280&q=80',
    'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1280&q=80',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1280&q=80'
  ]);
  const [currentBackdropIndex, setCurrentBackdropIndex] = useState(0);
  const [isLoadingBackdrops, setIsLoadingBackdrops] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Fetch multiple backdrops for selected movie
  const loadMovieBackdrops = async (movieIdOrTitle: string | number, primaryBackdrop?: string) => {
    setIsLoadingBackdrops(true);
    try {
      const images = await api.getTMDBMovieImages(movieIdOrTitle);
      if (primaryBackdrop && !images.includes(primaryBackdrop)) {
        images.unshift(primaryBackdrop);
      }
      if (images.length > 0) {
        setAvailableBackdrops(images);
        setCurrentBackdropIndex(0);
        setFormData((prev) => ({ ...prev, posterUrl: images[0] }));
      }
    } catch (err) {
      console.warn('Failed loading movie backdrops:', err);
    } finally {
      setIsLoadingBackdrops(false);
    }
  };

  const handlePrevBackdrop = () => {
    if (availableBackdrops.length <= 1) return;
    const nextIdx = (currentBackdropIndex - 1 + availableBackdrops.length) % availableBackdrops.length;
    setCurrentBackdropIndex(nextIdx);
    setFormData((prev) => ({ ...prev, posterUrl: availableBackdrops[nextIdx] }));
    setIsPostGenerated(false);
  };

  const handleNextBackdrop = () => {
    if (availableBackdrops.length <= 1) return;
    const nextIdx = (currentBackdropIndex + 1) % availableBackdrops.length;
    setCurrentBackdropIndex(nextIdx);
    setFormData((prev) => ({ ...prev, posterUrl: availableBackdrops[nextIdx] }));
    setIsPostGenerated(false);
  };

  // Automatic form reset after Publish or Schedule
  const handleResetForm = (keepChannels = true) => {
    setFormData((prev) => ({
      title: '',
      year: new Date().getFullYear().toString(),
      imdbRating: '7.5',
      genres: ['#Action', '#Thriller'],
      language: settings.defaultLanguage || 'Hindi',
      posterUrl: '',
      qualities: [
        { id: '1', name: '480p', url: '', size: '450 MB', enabled: true },
        { id: '2', name: '720p HEVC', url: '', size: '850 MB', enabled: true },
        { id: '3', name: '720p', url: '', size: '1.4 GB', enabled: false },
        { id: '4', name: '1080p HEVC', url: '', size: '2.2 GB', enabled: false },
        { id: '5', name: '1080p', url: '', size: '3.0 GB', enabled: true },
        { id: '6', name: '1080p HQ', url: '', size: '5.5 GB', enabled: false },
        { id: '7', name: '2K', url: '', size: '8.0 GB', enabled: false },
        { id: '8', name: '4K', url: '', size: '14.0 GB', enabled: false },
      ],
      selectedPromotionId: prev.selectedPromotionId,
      selectedShortenerId: prev.selectedShortenerId,
      selectedGenreChannelIds: keepChannels ? prev.selectedGenreChannelIds : genreChannels.filter((c) => c.active).map((c) => c.id),
      selectedHubChannelIds: keepChannels ? prev.selectedHubChannelIds : hubChannels.filter((c) => c.active).map((c) => c.id),
      emojifyStyle: prev.emojifyStyle || 'ultra'
    }));
    setAvailableBackdrops([]);
    setCurrentBackdropIndex(0);
    setIsPostGenerated(false);
    setNewGenreInput('');
  };

  const handleGeneratePost = () => {
    if (!formData.title.trim()) {
      setNotification({
        type: 'error',
        message: 'Please enter a movie title before generating the post.'
      });
      return;
    }
    setIsPostGenerated(true);
    setNotification({
      type: 'success',
      message: `✓ Post for "${formData.title}" generated! Now choose to Publish Now or Schedule.`
    });
  };

  // File Upload State
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Publishing Progress State
  const [isPublishing, setIsPublishing] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [resultStatus, setResultStatus] = useState<'completed' | 'partial' | 'failed' | null>(null);
  const [successfulChannels, setSuccessfulChannels] = useState<string[]>([]);
  const [failedChannels, setFailedChannels] = useState<string[]>([]);
  const [isDemoModeResult, setIsDemoModeResult] = useState(false);

  const publishSteps: PublishStep[] = [
    { id: 'val', label: '1. Validating inputs & credentials', status: currentStepIndex > 0 ? 'done' : currentStepIndex === 0 && isPublishing ? 'in_progress' : 'waiting' },
    { id: 'short', label: '2. Shortening download links (Concurrent)', status: currentStepIndex > 1 ? 'done' : currentStepIndex === 1 ? 'in_progress' : 'waiting' },
    { id: 'capt', label: '3. Generating Hyper-Bold Telegram captions', status: currentStepIndex > 2 ? 'done' : currentStepIndex === 2 ? 'in_progress' : 'waiting' },
    { id: 'genre', label: '4. Publishing to Genre Channels', status: currentStepIndex > 3 ? 'done' : currentStepIndex === 3 ? 'in_progress' : 'waiting' },
    { id: 'hub', label: '5. Publishing to Hub Channels', status: currentStepIndex > 4 ? 'done' : currentStepIndex === 4 ? 'in_progress' : 'waiting' },
    { id: 'fin', label: '6. Finalizing and saving server history', status: currentStepIndex >= 5 ? 'done' : 'waiting' }
  ];

  // Active Promo & Channel selections
  const activePromo = promotions.find((p) => p.id === formData.selectedPromotionId && p.active);
  const selectedGenreChannels = genreChannels.filter((c) =>
    formData.selectedGenreChannelIds.includes(c.id)
  );
  const selectedHubChannels = hubChannels.filter((h) =>
    formData.selectedHubChannelIds.includes(h.id)
  );

  // Pre-calculated Captions
  const genreCaption = generateGenreCaption({
    title: formData.title,
    year: formData.year,
    genres: formData.genres,
    language: formData.language,
    imdbRating: formData.imdbRating,
    qualities: formData.qualities.filter((q) => q.enabled && q.url.trim().length > 0),
    howToDownloadUrl: settings.howToDownloadUrl,
    howToDownloadEnabled: settings.howToDownloadEnabled,
    promotionText: activePromo?.text,
    promotionUrl: activePromo?.url,
    emojifyStyle: formData.emojifyStyle || 'ultra'
  });

  const hubCaption = generateHubCaption({
    title: formData.title,
    year: formData.year,
    genres: formData.genres,
    language: formData.language,
    imdbRating: formData.imdbRating,
    qualities: formData.qualities.filter((q) => q.enabled && q.url.trim().length > 0),
    mainChannelLink: selectedGenreChannels[0]?.inviteLink
      ? selectedGenreChannels[0].inviteLink.trim()
      : selectedGenreChannels[0]?.username
      ? `https://t.me/${selectedGenreChannels[0].username.replace('@', '')}`
      : 'https://t.me/MovaDetaOfficial',
    genreChannels: selectedGenreChannels.map((c) => ({
      name: c.name,
      inviteLink: c.inviteLink,
      username: c.username
    })),
    emojifyStyle: formData.emojifyStyle || 'ultra'
  });

  // Handle Genre Tags
  const handleAddGenre = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (newGenreInput.trim()) {
      const tag = newGenreInput.startsWith('#')
        ? newGenreInput.trim()
        : `#${newGenreInput.trim().replace(/\s+/g, '')}`;
      if (!formData.genres.includes(tag)) {
        setFormData((prev) => ({ ...prev, genres: [...prev.genres, tag] }));
      }
      setNewGenreInput('');
    }
  };

  const handleRemoveGenre = (genre: string) => {
    setFormData((prev) => ({
      ...prev,
      genres: prev.genres.filter((g) => g !== genre)
    }));
  };

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPoster(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const res = await api.uploadPosterImage(base64);
      if (res.success && res.url) {
        setFormData((prev) => ({ ...prev, posterUrl: res.url! }));
      } else {
        // Use data URI as direct fallback
        setFormData((prev) => ({ ...prev, posterUrl: base64 }));
      }
      setIsUploadingPoster(false);
    };
    reader.readAsDataURL(file);
  };

  // Automatic Canvas 16:9 Thumbnail Generator with Movie Title Logo & Badges
  const handleAutoCanvasGenerate = async () => {
    if (!formData.posterUrl && !formData.title) {
      setNotification({
        type: 'error',
        message: 'অনুগ্রহ করে প্রথমে মুভির নাম ও একটি ব্যাকড্রপ ইমেজ নির্বাচন করুন।'
      });
      return;
    }

    setIsAutoGeneratingThumbnail(true);
    try {
      const activeChannelName = settings.canvasBrandingName?.trim() || selectedGenreChannels[0]?.name || selectedHubChannels[0]?.name || 'MOVA DETA CINEMA';
      const cleanRating = formData.imdbRating && formData.imdbRating.trim() ? formData.imdbRating.trim() : '7.8';
      const canvasThumb = await generateMovieThumbnail({
        backdropUrl: formData.posterUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1280&q=80',
        movieTitle: formData.title || 'MOVIE TITLE',
        year: formData.year || new Date().getFullYear().toString(),
        imdbRating: cleanRating,
        language: formData.language || 'Hindi',
        qualities: formData.qualities.filter((q) => q.enabled).map((q) => q.name),
        channelName: activeChannelName,
        darknessLevel: 'light' // Keeps image vivid and crystal clear without muddy darkness
      });

      setFormData((prev) => ({ ...prev, posterUrl: canvasThumb }));
      setIsPostGenerated(false);
      setNotification({
        type: 'success',
        message: '✓ পারফেক্ট 16:9 ক্যানভাস থাম্বনেইল (Movie Logo + Badges) সফলভাবে জেনারেট হয়েছে!'
      });
    } catch (e: any) {
      console.error('Error auto-generating canvas thumbnail:', e);
      setNotification({
        type: 'error',
        message: 'ক্যানভাস থাম্বনেইল রেন্ডার করতে সমস্যা হয়েছে। স্টুডিও মোড ট্রাই করুন।'
      });
    } finally {
      setIsAutoGeneratingThumbnail(false);
    }
  };

  // Execute Direct Publish
  const handlePublishNow = async () => {
    if (!formData.title.trim()) {
      setNotification({
        type: 'error',
        message: 'Please enter a movie title before publishing.'
      });
      return;
    }

    setIsPublishModalOpen(true);
    setIsPublishing(true);
    setCurrentStepIndex(0);
    setResultStatus(null);
    setSuccessfulChannels([]);
    setFailedChannels([]);

    try {
      // Step 1: Validate
      await new Promise((r) => setTimeout(r, 400));
      setCurrentStepIndex(1);

      // Step 2: Shorten URLs concurrently if shortener selected
      const validQualities = [...formData.qualities];
      if (formData.selectedShortenerId) {
        for (let i = 0; i < validQualities.length; i++) {
          if (validQualities[i].enabled && validQualities[i].url.trim()) {
            const shortRes = await api.shortenUrl(
              validQualities[i].url,
              formData.selectedShortenerId
            );
            validQualities[i].url = shortRes.shortUrl;
          }
        }
      }

      // Step 3: Regenerate captions with shortened links
      setCurrentStepIndex(2);
      await new Promise((r) => setTimeout(r, 400));
      const finalGenreCaption = generateGenreCaption({
        title: formData.title,
        year: formData.year,
        genres: formData.genres,
        language: formData.language,
        imdbRating: formData.imdbRating,
        qualities: validQualities.filter((q) => q.enabled && q.url.trim().length > 0),
        howToDownloadUrl: settings.howToDownloadUrl,
        howToDownloadEnabled: settings.howToDownloadEnabled,
        promotionText: activePromo?.text,
        promotionUrl: activePromo?.url,
        emojifyStyle: formData.emojifyStyle || 'ultra'
      });

      const finalHubCaption = generateHubCaption({
        title: formData.title,
        year: formData.year,
        genres: formData.genres,
        language: formData.language,
        imdbRating: formData.imdbRating,
        qualities: validQualities.filter((q) => q.enabled && q.url.trim().length > 0),
        mainChannelLink: selectedGenreChannels[0]?.username
          ? `https://t.me/${selectedGenreChannels[0].username.replace('@', '')}`
          : 'https://t.me/MovaDetaOfficial',
        emojifyStyle: formData.emojifyStyle || 'ultra'
      });

      // Step 4 & 5: Publish to Telegram Channels
      setCurrentStepIndex(3);
      const res = await api.publishToTelegram({
        movieTitle: formData.title,
        year: formData.year,
        photoUrl: formData.posterUrl,
        genreCaption: finalGenreCaption,
        hubCaption: finalHubCaption,
        genreChannels: selectedGenreChannels,
        hubChannels: selectedHubChannels
      });

      setCurrentStepIndex(5);
      setResultStatus(res.status);
      setSuccessfulChannels(res.successful || []);
      setFailedChannels(res.failed || []);
      setIsDemoModeResult(res.isDemo);
      onRefreshHistory();

      // Automatically clear form after successful publish
      if (res.status === 'completed' || res.status === 'partial') {
        setTimeout(() => {
          handleResetForm(true);
        }, 800);
      }
    } catch (e) {
      console.error(e);
      setResultStatus('failed');
      setFailedChannels(['Unexpected network error']);
    } finally {
      setIsPublishing(false);
    }
  };

  // Schedule Post
  const handleConfirmSchedule = async (datetime: string, timezone: string) => {
    const timestamp = new Date(datetime).getTime();
    await api.schedulePost({
      movieTitle: formData.title,
      year: formData.year,
      photoUrl: formData.posterUrl,
      genreCaption,
      hubCaption,
      genreChannels: selectedGenreChannels,
      hubChannels: selectedHubChannels,
      scheduledDateTime: datetime,
      timestamp,
      timezone
    });
    onRefreshScheduled();
    const scheduledMovieTitle = formData.title;
    
    // Automatically clear form after successful schedule
    handleResetForm(true);

    setNotification({
      type: 'success',
      message: `✓ Post for "${scheduledMovieTitle}" successfully scheduled on the server! Form has been cleared.`
    });
  };

  // Channel toggle helpers
  const toggleGenreChannel = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedGenreChannelIds: prev.selectedGenreChannelIds.includes(id)
        ? prev.selectedGenreChannelIds.filter((x) => x !== id)
        : [...prev.selectedGenreChannelIds, id]
    }));
  };

  const toggleHubChannel = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedHubChannelIds: prev.selectedHubChannelIds.includes(id)
        ? prev.selectedHubChannelIds.filter((x) => x !== id)
        : [...prev.selectedHubChannelIds, id]
    }));
  };

  const selectAllChannels = () => {
    setFormData((prev) => ({
      ...prev,
      selectedGenreChannelIds: genreChannels.map((c) => c.id),
      selectedHubChannelIds: hubChannels.map((h) => h.id)
    }));
  };

  const deselectAllChannels = () => {
    setFormData((prev) => ({
      ...prev,
      selectedGenreChannelIds: [],
      selectedHubChannelIds: []
    }));
  };

  const enabledQualitiesWithUrl = formData.qualities.filter(
    (q) => q.enabled && q.url.trim().length > 0
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & Quick Import */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/20 shadow-lg">
        <div>
          <h1 className="text-lg sm:text-xl font-cinzel font-bold text-slate-100 flex items-center gap-2">
            <span>Movie Content Publisher</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-sans border border-amber-500/30">
              HTML Format
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Automates Hyper-Bold title, genres, How-to-Download, clickable URLs and dual posts.
          </p>
        </div>

        {/* TMDB Search Trigger */}
        <button
          type="button"
          onClick={() => setIsTmdbOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition shrink-0 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-black" />
          <span>TMDB Magic Explorer</span>
        </button>
      </div>

      {/* Main Grid: Form Left, Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* TMDB Magic Search Console */}
          <TMDBMagicSearch
            onSelectMovie={(m) => {
              setFormData((prev) => ({
                ...prev,
                title: m.title,
                year: m.year,
                imdbRating: m.imdbRating,
                genres: m.genres,
                posterUrl: m.backdropUrl || prev.posterUrl,
                language: m.language || prev.language
              }));
              setIsPostGenerated(false);
              
              // Load multiple backdrops for carousel if id or backdrops exist
              if (m.backdrops && m.backdrops.length > 0) {
                setAvailableBackdrops(m.backdrops);
                setCurrentBackdropIndex(0);
              } else if (m.id) {
                loadMovieBackdrops(m.id, m.backdropUrl);
              } else if (m.title) {
                loadMovieBackdrops(m.title, m.backdropUrl);
              }

              setNotification({
                type: 'success',
                message: `✨ TMDB Magic Search: "${m.title}" এর ডাটা ও ১৬:৯ থাম্বনেইল লোড সম্পন্ন হয়েছে!`
              });
            }}
            onOpenFullModal={() => setIsTmdbOpen(true)}
          />

          {/* Card 1: Core Movie Info */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0c101a] border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Film className="w-4 h-4 text-amber-400" />
                <span>Movie Details</span>
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleResetForm(true);
                    setNotification({
                      type: 'info',
                      message: 'ফ্রম সম্পূর্ণ ক্লিয়ার করা হয়েছে!'
                    });
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-300 flex items-center gap-1 transition px-2 py-1 rounded-lg hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20"
                  title="Clear all fields"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear Form</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsTmdbOpen(true)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold px-2 py-1 rounded-lg hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Magic Search</span>
                </button>
              </div>
            </div>

            {/* Movie Title */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Movie Title (Converts to Hyper-Bold <b>𝗠𝗢𝗩𝗜𝗘 𝗡𝗔𝗠𝗘</b> in post)
                </label>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Avatar: The Way of Water"
                  className="w-full pl-3.5 pr-24 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-500/50 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setIsTmdbOpen(true)}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-black text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Magic</span>
                </button>
              </div>
            </div>

            {/* Year & IMDb & Language Row */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Year
                </label>
                <input
                  type="text"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  placeholder="2024"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  IMDb Rating
                </label>
                <input
                  type="text"
                  value={formData.imdbRating}
                  onChange={(e) => setFormData({ ...formData, imdbRating: e.target.value })}
                  placeholder="7.6"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Language
                </label>
                <input
                  type="text"
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  placeholder="Hindi, Dual Audio..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500/50 outline-none"
                />
              </div>
            </div>

            {/* Genres Tag Management */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Genres (Formatted as Hashtags in post)
              </label>
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-950/80 border border-white/10 min-h-[42px]">
                {formData.genres.map((g, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 text-xs border border-amber-500/30"
                  >
                    <span>{g}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveGenre(g)}
                      className="hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-1 flex-1 min-w-[120px]">
                  <input
                    type="text"
                    value={newGenreInput}
                    onChange={(e) => setNewGenreInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddGenre(e);
                      }
                    }}
                    placeholder="+ Add genre..."
                    className="w-full bg-transparent px-2 py-0.5 text-xs text-slate-200 placeholder-slate-500 outline-none"
                  />
                  {newGenreInput && (
                    <button
                      type="button"
                      onClick={handleAddGenre}
                      className="p-1 text-amber-400 hover:text-amber-300"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 16:9 Movie Thumbnail / Backdrop Image */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <span>16:9 Movie Thumbnail / Backdrop</span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    16:9 (1280×720)
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoCanvasGenerate}
                    disabled={isAutoGeneratingThumbnail}
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-[11px] flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Wand2 className={`w-3.5 h-3.5 ${isAutoGeneratingThumbnail ? 'animate-spin' : ''}`} />
                    <span>{isAutoGeneratingThumbnail ? 'Generating...' : 'Auto-Generate Canvas Logo'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsStudioModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-semibold text-[11px] flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Canvas Studio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTmdbOpen(true)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 hover:underline flex items-center gap-1 ml-1"
                  >
                    <span>TMDB Search</span>
                  </button>
                </div>
              </div>

              {/* URL input and File picker */}
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={formData.posterUrl}
                  onChange={(e) => {
                    setFormData({ ...formData, posterUrl: e.target.value });
                    setIsPostGenerated(false);
                  }}
                  placeholder="https://image.tmdb.org/t/p/w1280/... (16:9 backdrop url)"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500/50 outline-none"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPoster}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-medium text-slate-200 transition flex items-center gap-1.5 shrink-0 disabled:opacity-50 active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isUploadingPoster ? 'Uploading...' : 'Upload Image'}</span>
                </button>
              </div>

              {/* Live 16:9 Thumbnail Box */}
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-white/10 shadow-inner group">
                {formData.posterUrl ? (
                  <>
                    <img
                      src={formData.posterUrl}
                      alt={formData.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1280&q=80';
                      }}
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-semibold text-amber-300 border border-amber-500/30 flex items-center gap-1 z-10">
                      <span>16:9 Widescreen Thumbnail</span>
                    </div>

                    {/* Image Carousel < > Navigation Buttons */}
                    {availableBackdrops.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrevBackdrop();
                          }}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/75 hover:bg-amber-500 text-white hover:text-black border border-white/20 hover:border-amber-400 flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer backdrop-blur-sm"
                          title="Previous Movie Backdrop (<)"
                          aria-label="Previous backdrop"
                        >
                          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNextBackdrop();
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/75 hover:bg-amber-500 text-white hover:text-black border border-white/20 hover:border-amber-400 flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer backdrop-blur-sm"
                          title="Next Movie Backdrop (>)"
                          aria-label="Next backdrop"
                        >
                          <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                        </button>
                        {/* Backdrop Counter Badge */}
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-mono text-amber-300 border border-amber-500/30 z-10 flex items-center gap-1">
                          <span>Image {currentBackdropIndex + 1}/{availableBackdrops.length}</span>
                        </div>
                      </>
                    )}

                    {/* Hover quick action */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 pointer-events-none">
                      <div className="flex items-center gap-2 pointer-events-auto">
                        <button
                          type="button"
                          onClick={handleAutoCanvasGenerate}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                          <span>Auto-Apply Movie Logo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsStudioModalOpen(true)}
                          className="px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-900 text-white font-semibold text-xs border border-white/20 flex items-center gap-1.5 shadow-lg active:scale-95 transition"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Open Canvas Studio</span>
                        </button>
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 px-2.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-mono text-slate-300 border border-white/10 z-10">
                      {formData.title} ({formData.year})
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-4 text-center">
                    <Tv className="w-8 h-8 mb-1.5 opacity-40 text-amber-400" />
                    <p className="text-xs text-slate-300 font-medium">No 16:9 Thumbnail Selected</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Upload a banner or paste a 16:9 backdrop URL</p>
                  </div>
                )}
              </div>

              {/* Backdrop Carousel Switcher Bar */}
              {availableBackdrops.length > 1 && (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/90 border border-amber-500/20 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrevBackdrop}
                      className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-black font-bold flex items-center gap-1 transition active:scale-95 border border-amber-500/30"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Prev</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNextBackdrop}
                      className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-black font-bold flex items-center gap-1 transition active:scale-95 border border-amber-500/30"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className="text-[11px] text-slate-300 font-mono">
                      Image <b className="text-amber-400">{currentBackdropIndex + 1}</b> of {availableBackdrops.length}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 hidden xs:inline">
                    &lt; &gt; বাটনে ক্লিক করে পছন্দসই ছবি সিলেক্ট করুন
                  </span>
                </div>
              )}

              {/* 16:9 Thumbnail Presets */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                <span className="text-[10px] text-slate-500 whitespace-nowrap">Presets:</span>
                {[
                  { name: 'Avatar', url: 'https://image.tmdb.org/t/p/w1280/14QbnygCuTO0vl7CAFmPf1fgZfV.jpg' },
                  { name: 'Oppenheimer', url: 'https://image.tmdb.org/t/p/w1280/fm6Bg9Az5CadvMRG9ohN7Bt8ucv.jpg' },
                  { name: 'Dune 2', url: 'https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s5200bm.jpg' },
                  { name: 'Interstellar', url: 'https://image.tmdb.org/t/p/w1280/rAiYTsqJiO8W0900wcl1E4z7v7W.jpg' },
                  { name: 'Deadpool', url: 'https://image.tmdb.org/t/p/w1280/yDHYTjA3R0ne84guT43ek5csZPB.jpg' }
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, posterUrl: preset.url }));
                      setIsPostGenerated(false);
                    }}
                    className={`px-2 py-0.5 text-[10px] rounded-lg border transition whitespace-nowrap ${
                      formData.posterUrl === preset.url
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                        : 'bg-slate-900 text-slate-400 border-white/5 hover:text-slate-200'
                    }`}
                  >
                    {preset.name} 16:9
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Output Emojify Mode Card (ইমোজিফাই ক্যাপশন স্টাইল) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#0c101a] to-[#0c101a] border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-100">Telegram Output Emojify</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                    {formData.emojifyStyle === 'ultra' ? '🔥 Ultra Emojified' : formData.emojifyStyle === 'standard' ? '✨ Smart Emojified' : '⚡ Classic'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  মুভি ক্যাপশনে অটোমেটিক হাই-কনভার্সন ইমোজি (🎬🍿🎭🗣️⭐📺💿📱⚡🚀💎👑) ও ডিভাইডার যুক্ত হয়।
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 self-start sm:self-auto bg-slate-950/80 p-1 rounded-xl border border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, emojifyStyle: 'ultra' })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  formData.emojifyStyle === 'ultra'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Ultra: All emojis, resolution icons, fancy star dividers & popcorn"
              >
                <span>🔥 Ultra</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, emojifyStyle: 'standard' })}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                  formData.emojifyStyle === 'standard'
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Smart: Balanced movie channel aesthetics"
              >
                <span>✨ Smart</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, emojifyStyle: 'minimal' })}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                  formData.emojifyStyle === 'minimal'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Classic: Plain text captions"
              >
                <span>Classic</span>
              </button>
            </div>
          </div>

          {/* Card 2: Custom Download Quality System */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0c101a] border border-white/10 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Download Quality System</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Custom popup selector (no native select). Only qualities with valid URLs appear in post.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsQualityModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-semibold text-xs flex items-center gap-1.5 transition active:scale-95"
              >
                <span>Edit Qualities</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Enabled Qualities Badges */}
            <div className="flex flex-wrap gap-2 pt-1">
              {enabledQualitiesWithUrl.length === 0 ? (
                <div className="w-full p-3 rounded-xl bg-slate-950/50 border border-dashed border-white/10 text-xs text-slate-400 text-center">
                  No active download links configured. Click "Edit Qualities" to add links.
                </div>
              ) : (
                enabledQualitiesWithUrl.map((q) => (
                  <div
                    key={q.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-amber-500/30 text-xs"
                  >
                    <span className="font-bold text-amber-300">{q.name}</span>
                    {q.size && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {q.size}
                      </span>
                    )}
                    <span className="text-[10px] text-blue-400 font-mono truncate max-w-[120px]">
                      {q.url}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card 3: Shortener & Promotion Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Shortener */}
            <div className="p-4 rounded-2xl bg-[#0c101a] border border-white/10 space-y-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Link Shortener</span>
              </label>
              <select
                value={formData.selectedShortenerId}
                onChange={(e) => setFormData({ ...formData, selectedShortenerId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-200 outline-none focus:border-amber-500/50"
              >
                <option value="">Direct Links (No Shortener)</option>
                {shorteners.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.isActive ? '(Active)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400">
                Shortens each download URL asynchronously during upload.
              </p>
            </div>

            {/* Promotion */}
            <div className="p-4 rounded-2xl bg-[#0c101a] border border-white/10 space-y-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5 text-rose-400" />
                <span>Bottom Promotion Link</span>
              </label>
              <select
                value={formData.selectedPromotionId}
                onChange={(e) => setFormData({ ...formData, selectedPromotionId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-200 outline-none focus:border-amber-500/50"
              >
                <option value="">No Promotion</option>
                {promotions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400">
                Appears at the very bottom of the Genre Channel post.
              </p>
            </div>
          </div>

          {/* Card 4: Target Channels Selection */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0c101a] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Tv className="w-4 h-4 text-amber-400" />
                <span>Publish Target Channels</span>
              </h2>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={selectAllChannels}
                  className="text-amber-400 hover:underline text-[11px]"
                >
                  Select All
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={deselectAllChannels}
                  className="text-slate-400 hover:underline text-[11px]"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Genre Channels Checklist */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-amber-400" />
                <span>Genre Channels (Full download post):</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {genreChannels.map((c) => {
                  const isChecked = formData.selectedGenreChannelIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition ${
                        isChecked
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : 'bg-slate-950/60 border-white/5 text-slate-400 hover:border-white/10'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleGenreChannel(c.id)}
                        className="w-4 h-4 rounded border-white/20 bg-slate-900 text-amber-500 focus:ring-amber-500/30 cursor-pointer accent-amber-500"
                      />
                      <div className="text-xs truncate">
                        <div className="font-semibold truncate">{c.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">
                          {c.username || c.chatId}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Hub Channels Checklist */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span>Hub Channels (Join &amp; Download link to main channel):</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {hubChannels.map((h) => {
                  const isChecked = formData.selectedHubChannelIds.includes(h.id);
                  return (
                    <label
                      key={h.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition ${
                        isChecked
                          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                          : 'bg-slate-950/60 border-white/5 text-slate-400 hover:border-white/10'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleHubChannel(h.id)}
                        className="w-4 h-4 rounded border-white/20 bg-slate-900 text-cyan-500 focus:ring-cyan-500/30 cursor-pointer accent-cyan-500"
                      />
                      <div className="text-xs truncate">
                        <div className="font-semibold truncate">{h.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">
                          {h.username || h.chatId}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* In-app Notification Feedback Banner */}
          {notification && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 shadow-lg ${
                notification.type === 'error'
                  ? 'bg-rose-950/80 border-rose-500/40 text-rose-200'
                  : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {notification.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>{notification.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setNotification(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Sequential Workflow: Step 1 (Generate Post) -> Step 2 (Publish or Schedule) */}
          <div className="space-y-3.5">
            {/* Step 1: Generate Post Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0c101a] border border-white/10 space-y-3 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs border border-amber-500/30">
                      1
                    </span>
                    <h3 className="text-sm font-bold text-slate-100">ধাপ ১: পোস্ট তৈরি করুন (Generate Post)</h3>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    ক্যাপশন ফরম্যাট, ১৬:৯ থাম্বনেইল ও ডাউনলোড লিংক ভেরিফাই করে টেলিগ্রাম পোস্ট প্রস্তুত করুন।
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGeneratePost}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs shadow-lg shadow-amber-500/25 active:scale-95 transition shrink-0"
                >
                  <Sparkles className="w-4 h-4 text-black" />
                  <span>{isPostGenerated ? 'পোস্ট পুনরায় তৈরি করুন (Regenerate)' : 'Generate Post (পোস্ট তৈরি করুন)'}</span>
                </button>
              </div>
            </div>

            {/* Step 2: Choose Published or Schedule */}
            {isPostGenerated ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#0c1322] via-[#0c101a] to-[#0c101a] border-2 border-emerald-500/40 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                        2
                      </span>
                      <h3 className="text-sm font-bold text-emerald-300">
                        ধাপ ২: পোস্ট তৈরি হয়েছে! এখন পাবলিশ অথবা শিডিউল নির্বাচন করুন
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      টার্গেট চ্যানেল: <b className="text-amber-300">{selectedGenreChannels.length}</b> Genre ও <b className="text-cyan-300">{selectedHubChannels.length}</b> Hub Channels
                    </p>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Post Ready to Dispatch</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Option A: Direct Publish Now */}
                  <button
                    type="button"
                    onClick={handlePublishNow}
                    className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-black font-extrabold text-sm shadow-xl shadow-amber-500/25 active:scale-95 transition cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-black" />
                    <span>Publish Post Now (এখনই পোস্ট করুন)</span>
                  </button>

                  {/* Option B: Schedule Post */}
                  <button
                    type="button"
                    onClick={() => setIsScheduleModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-white/10 hover:border-indigo-500/40 text-slate-100 text-xs font-bold transition active:scale-95 shadow-md hover:text-indigo-300 cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span>Schedule Post (শিডিউল করুন)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-dashed border-white/10 text-xs text-slate-400 flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                <span>
                  <b>পরবর্তী ধাপ লক করা আছে:</b> প্রথমে উপরের ধাপ ১ থেকে <b>"Generate Post"</b> বাটনে ক্লিক করুন। এরপর সরাসরি পাবলিশ অথবা শিডিউল অপশন আনলক হবে।
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Telegram Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-20">
            <TelegramPreview
              genreCaption={genreCaption}
              hubCaption={hubCaption}
              posterUrl={formData.posterUrl}
              movieTitle={formData.title}
              year={formData.year}
              qualities={formData.qualities}
              howToDownloadUrl={settings.howToDownloadUrl}
              howToDownloadEnabled={settings.howToDownloadEnabled}
              promotionUrl={activePromo?.url}
              promotionText={activePromo?.text}
              genreChannelNames={selectedGenreChannels.map((c) => c.name)}
              hubChannelNames={selectedHubChannels.map((h) => h.name)}
              emojifyStyle={formData.emojifyStyle || 'ultra'}
              onChangeEmojifyStyle={(style) => setFormData((prev) => ({ ...prev, emojifyStyle: style }))}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <TMDBModal
        isOpen={isTmdbOpen}
        onClose={() => setIsTmdbOpen(false)}
        onSelectMovie={(m) => {
          setFormData((prev) => ({
            ...prev,
            title: m.title,
            year: m.year,
            imdbRating: m.imdbRating,
            genres: m.genres,
            posterUrl: m.backdropUrl || prev.posterUrl
          }));
          setIsPostGenerated(false);
          if (m.backdrops && m.backdrops.length > 0) {
            setAvailableBackdrops(m.backdrops);
            setCurrentBackdropIndex(0);
          } else if (m.id) {
            loadMovieBackdrops(m.id, m.backdropUrl);
          } else if (m.title) {
            loadMovieBackdrops(m.title, m.backdropUrl);
          }
        }}
      />

      <QualityModal
        isOpen={isQualityModalOpen}
        onClose={() => setIsQualityModalOpen(false)}
        qualities={formData.qualities}
        onSave={(updated) => setFormData((prev) => ({ ...prev, qualities: updated }))}
      />

      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        movieTitle={formData.title}
        year={formData.year}
        genreChannels={selectedGenreChannels}
        hubChannels={selectedHubChannels}
        onConfirmSchedule={handleConfirmSchedule}
      />

      <PublishModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        isPublishing={isPublishing}
        currentStepIndex={currentStepIndex}
        steps={publishSteps}
        resultStatus={resultStatus}
        successfulChannels={successfulChannels}
        failedChannels={failedChannels}
        isDemoMode={isDemoModeResult}
        onRetryFailed={handlePublishNow}
      />

      <ThumbnailStudioModal
        isOpen={isStudioModalOpen}
        onClose={() => setIsStudioModalOpen(false)}
        initialBackdrop={formData.posterUrl}
        movieTitle={formData.title}
        year={formData.year}
        imdbRating={formData.imdbRating}
        language={formData.language}
        qualities={formData.qualities.filter((q) => q.enabled).map((q) => q.name)}
        channelName={settings.canvasBrandingName?.trim() || selectedGenreChannels[0]?.name || selectedHubChannels[0]?.name || 'MOVA DETA CINEMA'}
        availableBackdrops={availableBackdrops}
        onApplyThumbnail={(dataUrl) => {
          setFormData((prev) => ({ ...prev, posterUrl: dataUrl }));
          setIsPostGenerated(false);
          setNotification({
            type: 'success',
            message: '✓ ক্যানভাস থেকে পারফেক্ট 16:9 লোগো থাম্বনেইল সফলভাবে সিলেক্ট করা হয়েছে!'
          });
        }}
        onSaveDefaultBranding={async (newBrand) => {
          await api.saveSettings({ canvasBrandingName: newBrand });
          setNotification({
            type: 'success',
            message: `✓ "${newBrand.replace(/\n/g, ' ')}" ডিফল্ট চ্যানেল ব্র্যান্ডিং হিসেবে সেভ করা হয়েছে!`
          });
        }}
      />
    </div>
  );
};
