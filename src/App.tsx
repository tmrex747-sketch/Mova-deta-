import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { NavDrawer } from './components/NavDrawer';
import { UploadView } from './views/UploadView';
import { SettingsView } from './views/SettingsView';
import { ShortenerView } from './views/ShortenerView';
import { ChannelView } from './views/ChannelView';
import { PromotionView } from './views/PromotionView';
import { ScheduledView } from './views/ScheduledView';
import { HistoryView } from './views/HistoryView';
import { PinLockModal } from './components/PinLockModal';
import { BanglaManualModal } from './components/BanglaManualModal';
import { InfinityFreeModal } from './components/InfinityFreeModal';
import { api } from './services/api';
import {
  AppSettings,
  GenreChannel,
  HubChannel,
  Promotion,
  ScheduledPostItem,
  Shortener,
  UploadHistoryItem
} from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('upload');
  const [settings, setSettings] = useState<AppSettings>({
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
  });

  const [genreChannels, setGenreChannels] = useState<GenreChannel[]>([]);
  const [hubChannels, setHubChannels] = useState<HubChannel[]>([]);
  const [shorteners, setShorteners] = useState<Shortener[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPostItem[]>([]);
  const [history, setHistory] = useState<UploadHistoryItem[]>([]);

  // Telegram bot connection status
  const [botStatus, setBotStatus] = useState<{
    connected: boolean;
    username?: string;
    isDemo: boolean;
  }>({
    connected: false,
    username: undefined,
    isDemo: true
  });

  // Modal dialog states
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isInfinityFreeOpen, setIsInfinityFreeOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Load all initial server data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [
        sData,
        gcData,
        hcData,
        shData,
        prData,
        scData,
        hiData
      ] = await Promise.all([
        api.getSettings(),
        api.getChannels('genre'),
        api.getChannels('hub'),
        api.getShorteners(),
        api.getPromotions(),
        api.getScheduledPosts(),
        api.getHistory()
      ]);

      setSettings(sData);
      setGenreChannels(gcData);
      setHubChannels(hcData);
      setShorteners(shData);
      setPromotions(prData);
      setScheduledPosts(scData);
      setHistory(hiData);

      if (sData.pinLockEnabled && sData.pinCode) {
        setIsLocked(true);
      }

      // Check telegram status
      checkBot(sData.telegramBotToken);
    } catch (e) {
      console.error('Initial data load error:', e);
    }
  };

  const checkBot = async (token?: string) => {
    try {
      const res = await api.testTelegramConnection(token);
      if (res.success && res.bot) {
        setBotStatus({
          connected: true,
          username: `@${res.bot.username}`,
          isDemo: false
        });
      } else {
        setBotStatus({
          connected: false,
          username: undefined,
          isDemo: res.isDemo ?? true
        });
      }
    } catch (e) {
      setBotStatus({ connected: false, isDemo: true });
    }
  };

  // Refresh functions
  const refreshScheduled = async () => {
    const data = await api.getScheduledPosts();
    setScheduledPosts(data);
  };

  const refreshHistory = async () => {
    const data = await api.getHistory();
    setHistory(data);
  };

  const refreshChannels = async () => {
    const [gc, hc] = await Promise.all([
      api.getChannels('genre'),
      api.getChannels('hub')
    ]);
    setGenreChannels(gc);
    setHubChannels(hc);
  };

  const refreshShorteners = async () => {
    const data = await api.getShorteners();
    setShorteners(data);
  };

  const refreshPromotions = async () => {
    const data = await api.getPromotions();
    setPromotions(data);
  };

  const handleSaveSettings = async (updated: Partial<AppSettings>) => {
    const res = await api.saveSettings(updated);
    if (res.success && res.data) {
      setSettings(res.data);
      checkBot(res.data.telegramBotToken);
    }
  };

  return (
    <div className="min-h-screen bg-[#080a0f] text-slate-100 flex flex-col selection:bg-amber-500/30">
      {/* PIN Lock Protection */}
      <PinLockModal
        isOpen={isLocked}
        pinCode={settings.pinCode}
        onSuccessUnlock={() => setIsLocked(false)}
      />

      {/* Global Header */}
      <Header
        settings={settings}
        botStatus={botStatus}
        pendingScheduledCount={scheduledPosts.length}
        onQuickUpload={() => setCurrentTab('upload')}
        onOpenManual={() => setIsManualOpen(true)}
        onOpenInfinityFree={() => setIsInfinityFreeOpen(true)}
        onLockApp={settings.pinLockEnabled ? () => setIsLocked(true) : undefined}
        onToggleDrawer={() => setIsDrawerOpen(true)}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar Navigation */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          pendingScheduledCount={scheduledPosts.length}
          onOpenManual={() => setIsManualOpen(true)}
        />

        {/* View Content Area */}
        <main className="flex-1 p-3 sm:p-5 lg:p-8 min-w-0 overflow-x-hidden pb-10">
          {currentTab === 'upload' && (
            <UploadView
              settings={settings}
              genreChannels={genreChannels}
              hubChannels={hubChannels}
              shorteners={shorteners}
              promotions={promotions}
              onRefreshScheduled={refreshScheduled}
              onRefreshHistory={refreshHistory}
            />
          )}

          {currentTab === 'shortener' && (
            <ShortenerView
              shorteners={shorteners}
              onRefreshShorteners={refreshShorteners}
            />
          )}

          {currentTab === 'genre' && (
            <ChannelView
              initialType="genre"
              genreChannels={genreChannels}
              hubChannels={hubChannels}
              onRefreshChannels={refreshChannels}
            />
          )}

          {currentTab === 'hub' && (
            <ChannelView
              initialType="hub"
              genreChannels={genreChannels}
              hubChannels={hubChannels}
              onRefreshChannels={refreshChannels}
            />
          )}

          {currentTab === 'promotion' && (
            <PromotionView
              promotions={promotions}
              onRefreshPromotions={refreshPromotions}
            />
          )}

          {currentTab === 'scheduled' && (
            <ScheduledView
              scheduledPosts={scheduledPosts}
              onRefreshScheduled={refreshScheduled}
              onRefreshHistory={refreshHistory}
            />
          )}

          {currentTab === 'history' && (
            <HistoryView
              history={history}
              onRefreshHistory={refreshHistory}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              settings={settings}
              onSaveSettings={handleSaveSettings}
              onTestTelegram={checkBot}
            />
          )}
        </main>
      </div>

      {/* Slide-out Navigation Drawer */}
      <NavDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        pendingScheduledCount={scheduledPosts.length}
        onOpenManual={() => setIsManualOpen(true)}
        onOpenInfinityFree={() => setIsInfinityFreeOpen(true)}
        onLockApp={settings.pinLockEnabled ? () => setIsLocked(true) : undefined}
        settings={settings}
        botStatus={botStatus}
      />

      {/* Help & Documentation Modals */}
      <BanglaManualModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
      />

      <InfinityFreeModal
        isOpen={isInfinityFreeOpen}
        onClose={() => setIsInfinityFreeOpen(false)}
      />
    </div>
  );
}
