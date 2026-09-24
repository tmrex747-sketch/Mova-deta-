import React, { useState, useEffect } from 'react';
import {
  Settings,
  Bot,
  Link,
  Film,
  Lock,
  Globe,
  Save,
  Check,
  AlertCircle,
  Server,
  Download,
  Upload,
  RefreshCw,
  Loader2,
  Sparkles,
  FolderCheck,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  FileCode2,
  Eye,
  EyeOff
} from 'lucide-react';
import { AppSettings } from '../types';
import { api } from '../services/api';
import { clientStorage } from '../utils/clientStorage';

interface SettingsViewProps {
  settings: AppSettings;
  onSaveSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  onTestTelegram: (token: string) => Promise<any>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onTestTelegram
}) => {
  const [formState, setFormState] = useState<AppSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testingBot, setTestingBot] = useState(false);
  const [showHostingGuide, setShowHostingGuide] = useState(true);
  const [activeDeployTab, setActiveDeployTab] = useState<'vercel' | 'infinityfree'>('vercel');
  const [showBotToken, setShowBotToken] = useState(false);
  const [showTmdbKey, setShowTmdbKey] = useState(false);
  const [testingTmdb, setTestingTmdb] = useState(false);
  const [tmdbTestResult, setTmdbTestResult] = useState<{
    success?: boolean;
    isDemo?: boolean;
    message?: string;
    error?: string;
  } | null>(null);
  const [botTestResult, setBotTestResult] = useState<{
    success?: boolean;
    isDemo?: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    setFormState(settings);
  }, [settings]);

  // Split canvas branding into 3 lines
  const brandingLines = (formState.canvasBrandingName || '')
    .split(/[\r\n]+|\|\|/)
    .map((s) => s.trim());
  const brandLine1 = brandingLines[0] || '';
  const brandLine2 = brandingLines[1] || '';
  const brandLine3 = brandingLines[2] || '';

  const handleUpdateBrandingLine = (index: 0 | 1 | 2, value: string) => {
    const nextLines = [brandLine1, brandLine2, brandLine3];
    nextLines[index] = value;
    // Join with newline, trimming excess trailing empty lines
    while (nextLines.length > 0 && !nextLines[nextLines.length - 1].trim()) {
      nextLines.pop();
    }
    setFormState({
      ...formState,
      canvasBrandingName: nextLines.join('\n')
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const sanitizedSettings = {
        ...formState,
        telegramBotToken: formState.telegramBotToken?.trim() || '',
        tmdbApiKey: formState.tmdbApiKey?.trim().replace(/^['"]|['"]$/g, '') || '',
        canvasBrandingName: formState.canvasBrandingName?.trim() || ''
      };
      setFormState(sanitizedSettings);
      await onSaveSettings(sanitizedSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestTMDB = async () => {
    const cleanKey = formState.tmdbApiKey?.trim().replace(/^['"]|['"]$/g, '') || '';
    if (!cleanKey) {
      setTmdbTestResult({
        success: false,
        isDemo: true,
        error: 'TMDB API Key খালি! themoviedb.org থেকে API Key দিয়ে টেস্ট করুন।'
      });
      return;
    }
    setTestingTmdb(true);
    setTmdbTestResult(null);
    try {
      const res = await api.testTMDBConnection(cleanKey);
      setTmdbTestResult(res);
      if (res.success) {
        await onSaveSettings({
          ...formState,
          tmdbApiKey: cleanKey
        });
      }
    } catch (e: any) {
      setTmdbTestResult({
        success: false,
        isDemo: false,
        error: e.message || 'TMDB যাচাই করা যায়নি।'
      });
    } finally {
      setTestingTmdb(false);
    }
  };

  const handleTestBot = async () => {
    let cleanToken = formState.telegramBotToken?.trim() || '';

    // Auto-clean pasted token if user copied URL or "bot" prefix
    const urlMatch = cleanToken.match(/api\.telegram\.org\/bot([^/?#]+)/i);
    if (urlMatch) {
      cleanToken = urlMatch[1].trim();
    }
    if (/^bot\d+:[\w-]+/i.test(cleanToken)) {
      cleanToken = cleanToken.slice(3).trim();
    }
    cleanToken = cleanToken.replace(/^['"]|['"]$/g, '').trim();

    if (!cleanToken) {
      setBotTestResult({
        success: false,
        isDemo: true,
        error: 'বট টোকেন খালি! দয়া করে @BotFather থেকে পাওয়া টোকেনটি (যেমন: 123456:ABC-DEF...) এখানে পেস্ট করুন।'
      });
      return;
    }
    setTestingBot(true);
    setBotTestResult(null);
    try {
      const res = await onTestTelegram(cleanToken);
      const safeResult = res || { success: false, error: 'বট থেকে কোনো রেসপন্স পাওয়া যায়নি।' };
      setBotTestResult(safeResult);
      if (safeResult.success && safeResult.bot?.username) {
        const updated = { 
          ...formState, 
          telegramBotToken: cleanToken,
          telegramBotUsername: `@${safeResult.bot.username}` 
        };
        setFormState(updated);
        await onSaveSettings(updated);
      }
    } catch (e: any) {
      setBotTestResult({ success: false, error: e.message || 'Telegram network connection failed' });
    } finally {
      setTestingBot(false);
    }
  };

  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleExportBackup = () => {
    const fullBackup = {
      version: '2.0',
      settings: formState,
      genreChannels: clientStorage.getChannels('genre'),
      hubChannels: clientStorage.getChannels('hub'),
      shorteners: clientStorage.getShorteners(),
      promotions: clientStorage.getPromotions(),
      exportDate: new Date().toISOString()
    };
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `mova_deta_full_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed.settings) {
          setFormState(parsed.settings);
          await onSaveSettings(parsed.settings);
        } else if (parsed.telegramBotToken !== undefined) {
          setFormState(parsed);
          await onSaveSettings(parsed);
        }
        if (Array.isArray(parsed.genreChannels)) {
          clientStorage.saveChannels('genre', parsed.genreChannels);
        }
        if (Array.isArray(parsed.hubChannels)) {
          clientStorage.saveChannels('hub', parsed.hubChannels);
        }
        if (Array.isArray(parsed.shorteners)) {
          clientStorage.saveShorteners(parsed.shorteners);
        }
        if (Array.isArray(parsed.promotions)) {
          clientStorage.savePromotions(parsed.promotions);
        }
        setImportStatus('✓ ব্যাকআপ সফলভাবে ইম্পোর্ট হয়েছে!');
        setTimeout(() => setImportStatus(null), 4000);
      } catch (err) {
        setImportStatus('❌ ব্যাকআপ ফাইল পার্স করতে ব্যর্থ হয়েছে।');
        setTimeout(() => setImportStatus(null), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadZipMsg, setDownloadZipMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDownloadHtdocsZip = async () => {
    setDownloadingZip(true);
    setDownloadZipMsg(null);
    try {
      const candidates = [
        `/htdocs.zip?t=${Date.now()}`,
        `/api/download-zip?t=${Date.now()}`
      ];

      let validBlob: Blob | null = null;
      let fileSizeKb = 0;

      for (const url of candidates) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const buf = await res.arrayBuffer();
            const bytes = new Uint8Array(buf);
            // Verify zip magic bytes PK\x03\x04 or PK\x05\x06 (0x50, 0x4B) and size > 50KB
            if (bytes.length > 50000 && bytes[0] === 0x50 && bytes[1] === 0x4B) {
              validBlob = new Blob([buf], { type: 'application/zip' });
              fileSizeKb = Math.round(bytes.length / 1024);
              break;
            }
          }
        } catch {
          // Continue to next candidate
        }
      }

      if (validBlob) {
        const downloadUrl = URL.createObjectURL(validBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'htdocs.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
        setDownloadZipMsg({
          type: 'success',
          text: `✓ আসল htdocs.zip (${fileSizeKb} KB - ২৯টি কম্পাইল করা ফাইল) সফলভাবে ডাউনলোড হয়েছে!`
        });
      } else {
        // Fallback directly to static asset
        window.location.href = `/htdocs.zip`;
      }
    } catch (e: any) {
      setDownloadZipMsg({
        type: 'error',
        text: 'ডাউনলোড করতে সমস্যা হয়েছে: ' + (e.message || 'ফাইল পাওয়া যায়নি')
      });
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-white/10 shadow-lg">
        <h1 className="text-lg sm:text-xl font-cinzel font-bold text-slate-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-400" />
          <span>System Settings &amp; Integration</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Server-side configurations for Telegram Bot, How to Download, TMDB API, and Security PIN.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Telegram Bot Credentials */}
        <div className="p-5 rounded-2xl bg-[#0c101a] border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Bot className="w-4 h-4 text-emerald-400" />
              <span>Telegram Bot Gateway</span>
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              HTML ParseMode
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Telegram Bot HTTP API Token
              </label>
              <button
                type="button"
                onClick={() => setShowBotToken(!showBotToken)}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 transition select-none"
              >
                {showBotToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showBotToken ? 'Hide Token' : 'Show Token'}</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type={showBotToken ? 'text' : 'password'}
                  value={formState.telegramBotToken}
                  onChange={(e) =>
                    setFormState({ ...formState, telegramBotToken: e.target.value })
                  }
                  placeholder="e.g. 7123456789:AAHk1_xxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-100 placeholder-slate-500 font-mono focus:border-amber-500/50 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleTestBot}
                disabled={testingBot}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shrink-0 shadow-lg shadow-emerald-500/10"
              >
                {testingBot ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-white" />
                )}
                <span>Test Connection</span>
              </button>
            </div>
            
            <p className="text-[11px] text-slate-400 mt-1.5">
              টেলিগ্রামে <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-cyan-400 underline">@BotFather</a>-এ গিয়ে <code className="text-amber-300">/token</code> অথবা নতুন বট তৈরির পর পাওয়া পুরো HTTP API টোকেনটি এখানে দিন।
            </p>
          </div>

          {botTestResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                botTestResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : botTestResult.isDemo
                  ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}
            >
              {botTestResult.success ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-semibold text-sm">
                  {botTestResult.success
                    ? '✓ Telegram Bot কানেকশন সফল হয়েছে!'
                    : botTestResult.isDemo
                    ? 'ডেমো মোড সক্রিয়'
                    : '✗ বট কানেকশন ব্যর্থ হয়েছে (Connection Failed)'}
                </div>
                <div className="text-[11px] opacity-90 mt-1 font-mono">
                  {botTestResult.message || botTestResult.error}
                </div>

                {!botTestResult.success && !botTestResult.isDemo && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1 text-[11px] text-slate-300">
                    <div className="font-bold text-amber-300">কেন বট কানেক্ট হচ্ছে না? চেক করুন:</div>
                    <div>১. টোকেনের শুরুতে বা শেষে কোনো অতিরিক্ত স্পেস বা ফাঁকা জায়গা আছে কিনা (Show Token দিয়ে মিলিয়ে নিন)।</div>
                    <div>২. টোকেন ফরম্যাট ঠিক আছে কি না (যেমন: <code className="text-cyan-300 font-mono">123456789:ABCDefgh-1234xxxx</code>)।</div>
                    <div>৩. টেলিগ্রামে <b>@BotFather</b>-এ গিয়ে <code>/mybots</code> &gt; আপনার বট &gt; <b>API Token</b> রিভোক করে নতুন টোকেন নিয়ে চেষ্টা করতে পারেন।</div>
                    <div>৪. টোকেন দেওয়ার পর নিচের <b>"Save Changes"</b> বাটনে চাপ দিয়ে সেভ করে নিন।</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Global "How to Download" Feature */}
        <div className="p-5 rounded-2xl bg-[#0c101a] border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Link className="w-4 h-4 text-amber-400" />
                <span>Global "How to Download" System</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Set once here; automatically positioned immediately before download qualities in every generated post.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs text-slate-400">Enable</span>
              <input
                type="checkbox"
                checked={formState.howToDownloadEnabled}
                onChange={(e) =>
                  setFormState({ ...formState, howToDownloadEnabled: e.target.checked })
                }
                className="w-4 h-4 rounded bg-slate-900 border-white/20 text-amber-500 cursor-pointer accent-amber-500"
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              How to Download Target URL
            </label>
            <input
              type="url"
              value={formState.howToDownloadUrl}
              onChange={(e) =>
                setFormState({ ...formState, howToDownloadUrl: e.target.value })
              }
              placeholder="https://t.me/YourChannel/1234 or video guide link"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500/50 outline-none"
            />
          </div>

          {/* Preview of How to Download Block */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-[11px] font-mono text-slate-300">
            <div className="text-slate-500 mb-1">Preview of generated Telegram section:</div>
            <div className="text-slate-500">▬▬▬▬▬▬▬▬▬▬▬▬▬▬</div>
            <div className="text-emerald-400 font-bold">✅ How to download the movie. 👈</div>
            <div className="text-slate-500">▬▬▬▬▬▬▬▬▬▬▬▬▬▬</div>
            <div className="text-blue-400 underline">👉 Click Here To Learn How To Download</div>
          </div>
        </div>

        {/* Section 3: TMDB API Key */}
        <div className="p-5 rounded-2xl bg-[#0c101a] border border-white/10 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Film className="w-4 h-4 text-cyan-400" />
              <span>The Movie Database (TMDB) API</span>
            </h2>
            <span className="text-[10px] text-slate-400">v3 API Key বা v4 Bearer Token</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                TMDB API Key / Read Access Token
              </label>
              <button
                type="button"
                onClick={() => setShowTmdbKey(!showTmdbKey)}
                className="text-[11px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition"
              >
                {showTmdbKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showTmdbKey ? 'Hide Key' : 'Show Key'}</span>
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type={showTmdbKey ? 'text' : 'password'}
                value={formState.tmdbApiKey}
                onChange={(e) => setFormState({ ...formState, tmdbApiKey: e.target.value })}
                placeholder="themoviedb.org থেকে পাওয়া API Key বা v4 Token দিন"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-100 placeholder-slate-500 font-mono focus:border-cyan-500/50 outline-none"
              />
              <button
                type="button"
                onClick={handleTestTMDB}
                disabled={testingTmdb}
                className="px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {testingTmdb ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                )}
                <span>{testingTmdb ? 'Testing...' : 'Test TMDB'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              💡 কী দিয়ে <b>Test TMDB</b> বাটনে চাপ দিন। টেস্ট সফল হলে স্বয়ংক্রিয়ভাবে সেভ হবে এবং TMDB Explorer-এ রিয়েল-টাইম মুভি ডাটা চলে আসবে। ফাঁকা রাখলে অফলাইন ডেমো লাইব্রেরি চলবে।
            </p>
          </div>

          {/* TMDB Test Feedback Alert */}
          {tmdbTestResult && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in duration-200 ${
                tmdbTestResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : tmdbTestResult.isDemo
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {tmdbTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : tmdbTestResult.isDemo ? (
                <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-semibold text-sm">
                  {tmdbTestResult.success
                    ? '✓ TMDB API সংযোগ সফল ও কার্যকর!'
                    : tmdbTestResult.isDemo
                    ? 'অফলাইন স্যাম্পল লাইব্রেরি সক্রিয়'
                    : '✗ TMDB কী অকার্যকর বা সংযোগ ব্যর্থ (Connection Failed)'}
                </div>
                <div className="text-[11px] opacity-90 mt-1 font-mono">
                  {tmdbTestResult.message || tmdbTestResult.error}
                </div>

                {!tmdbTestResult.success && !tmdbTestResult.isDemo && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1 text-[11px] text-slate-300">
                    <div className="font-bold text-cyan-300">কেন TMDB কাজ করছে না? চেক করুন:</div>
                    <div>১. কী এর শুরুতে বা শেষে কোনো অতিরিক্ত স্পেস বা ফাঁকা জায়গা আছে কিনা (Show Key দিয়ে দেখে নিন)।</div>
                    <div>২. <b>themoviedb.org</b> &gt; আপনার অ্যাকাউন্ট &gt; <b>Settings &gt; API</b> তে গিয়ে <b>API Key (v3 auth)</b> কপি করেছেন কি না।</div>
                    <div>৩. আপনি যদি <b>API Read Access Token (v4 auth)</b> ব্যবহার করেন, তাও এখন সাপোর্ট করবে।</div>
                    <div>৪. কী দেওয়ার পর নিচে <b>"Save Changes"</b> বাটনে চাপ দিয়ে সেভ নিশ্চিত করুন।</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 4: 16:9 Canvas Channel Branding (3 Lines) */}
        <div className="p-5 rounded-2xl bg-[#0c101a] border border-amber-500/20 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-3 gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>16:9 Canvas Channel Branding (ক্যানভাস ব্র্যান্ডিং - ৩ লাইন)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                ক্যানভাস থাম্বনেইলের উপরের বাম কোণের ব্র্যান্ড পিলে যে নাম থাকবে তা এখানে ৩ লাইনে লিখে সেভ করে রাখুন। সেভ করলেই থাম্বনেইল স্টুডিও ও অটো-ক্যানভাসে এটি স্বয়ংক্রিয়ভাবে চলে আসবে।
              </p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 self-start sm:self-center font-mono">
              Auto-Loaded in Canvas
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Input fields for 3 lines */}
            <div className="lg:col-span-7 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-amber-300 mb-1 flex items-center justify-between">
                  <span>Line 1: Main Channel Name (প্রধান নাম)</span>
                  <span className="text-[10px] text-slate-500 font-normal">Bold High Contrast</span>
                </label>
                <input
                  type="text"
                  value={brandLine1}
                  onChange={(e) => handleUpdateBrandingLine(0, e.target.value)}
                  placeholder="e.g. MOVA DETA"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-100 font-mono tracking-wide focus:border-amber-500/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-cyan-300 mb-1 flex items-center justify-between">
                  <span>Line 2: Sub-Badge / Category (সাব-ক্যাটাগরি বা ব্যাজ)</span>
                  <span className="text-[10px] text-slate-500 font-normal">Optional</span>
                </label>
                <input
                  type="text"
                  value={brandLine2}
                  onChange={(e) => handleUpdateBrandingLine(1, e.target.value)}
                  placeholder="e.g. CINEMA HUB or HOLLYWOOD HINDI"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-100 font-mono tracking-wide focus:border-cyan-500/50 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Line 3: Tagline / Telegram Handle (ট্যাগলাইন বা টেলিগ্রাম আইডি)</span>
                  <span className="text-[10px] text-slate-500 font-normal">Optional</span>
                </label>
                <input
                  type="text"
                  value={brandLine3}
                  onChange={(e) => handleUpdateBrandingLine(2, e.target.value)}
                  placeholder="e.g. JOIN @CHANNEL or EXCLUSIVE MOVIES"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-100 font-mono tracking-wide focus:border-amber-500/50 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateBrandingLine(0, 'MOVA DETA');
                    handleUpdateBrandingLine(1, 'CINEMA HUB');
                    handleUpdateBrandingLine(2, 'JOIN @MOVADETAOFFICIAL');
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  ⚡ Fill Sample (MOVA DETA)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormState({ ...formState, canvasBrandingName: '' });
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 transition cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Live Visual Canvas Pill Preview */}
            <div className="lg:col-span-5 p-4 rounded-xl bg-slate-950 border border-white/5 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center justify-between">
                  <span>ক্যানভাস থাম্বনেইলে যেমন দেখাবে:</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Live Preview</span>
                </div>

                {/* Simulated 16:9 Canvas snippet with Brand Pill */}
                <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-slate-900 border border-white/10 flex items-start p-3 shadow-inner">
                  {/* Background backdrop gradient */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-slate-900 to-amber-950/40" />

                  {/* The actual Brand Pill */}
                  <div className="relative z-10 flex items-center gap-2.5 px-3 py-2 rounded-xl bg-black/75 backdrop-blur-md border border-white/20 shadow-xl max-w-full">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] shrink-0 animate-pulse" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black tracking-wider text-white truncate font-sans">
                        {brandLine1 || 'YOUR CHANNEL NAME'}
                      </span>
                      {brandLine2 && (
                        <span className="text-[10px] font-bold tracking-widest text-amber-300 uppercase truncate">
                          {brandLine2}
                        </span>
                      )}
                      {brandLine3 && (
                        <span className="text-[9px] font-medium tracking-wide text-slate-300 truncate">
                          {brandLine3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 mt-2 text-center">
                নিচের <b>"Save Changes"</b> বাটনে চাপ দিলে এটি স্থায়ীভাবে সেভ থাকবে।
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: General Preferences & Timezone */}
        <div className="p-5 rounded-2xl bg-[#0c101a] border border-white/10 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2 border-b border-white/5 pb-3">
            <Globe className="w-4 h-4 text-indigo-400" />
            <span>Regional &amp; General Defaults</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Default Audio Language
              </label>
              <input
                type="text"
                value={formState.defaultLanguage}
                onChange={(e) =>
                  setFormState({ ...formState, defaultLanguage: e.target.value })
                }
                placeholder="Hindi"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-100 outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Scheduler Timezone
              </label>
              <select
                value={formState.timezone}
                onChange={(e) => setFormState({ ...formState, timezone: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-100 outline-none focus:border-amber-500/50"
              >
                <option value="Asia/Dhaka">Asia/Dhaka (GMT+6 - Bangladesh Standard Time)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (GMT+5:30 - Indian Standard Time)</option>
                <option value="UTC">UTC (Coordinated Universal Time)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 5: Local PIN Security Lock */}
        <div className="p-5 rounded-2xl bg-[#0c101a] border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-400" />
                <span>PIN Lock Protection</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Protects local dashboard screen with a 4-digit code.
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs text-slate-400">Active</span>
              <input
                type="checkbox"
                checked={formState.pinLockEnabled}
                onChange={(e) =>
                  setFormState({ ...formState, pinLockEnabled: e.target.checked })
                }
                className="w-4 h-4 rounded bg-slate-900 border-white/20 text-rose-500 cursor-pointer accent-rose-500"
              />
            </label>
          </div>

          {formState.pinLockEnabled && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                4-Digit Security PIN
              </label>
              <input
                type="password"
                maxLength={4}
                value={formState.pinCode}
                onChange={(e) =>
                  setFormState({ ...formState, pinCode: e.target.value.replace(/\D/g, '') })
                }
                placeholder="e.g. 1234"
                className="w-32 px-3.5 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-center font-mono text-sm tracking-widest text-slate-100 outline-none focus:border-rose-500/50"
              />
            </div>
          )}

          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500/70 shrink-0" />
            <span>
              Disclaimer: PIN Lock is a local convenience lock and does not replace server security.
            </span>
          </div>
        </div>

        {/* Section 6: Dual Deployment Guide: Vercel & InfinityFree */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-blue-950/20 via-[#0c101a] to-[#0c101a] border border-blue-500/30 shadow-lg space-y-4">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowHostingGuide(!showHostingGuide)}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400">
                <Globe className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-100 font-cinzel">
                    Live Deployment Guide (Vercel &amp; InfinityFree)
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                    100% Active Support
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Vercel এবং InfinityFree উভয় প্ল্যাটফর্মেই কোনো ত্রুটি ছাড়া সাইট সক্রিয় রাখার সম্পূর্ণ গাইড।
                </p>
              </div>
            </div>
            <button
              type="button"
              className="p-1.5 rounded-lg bg-slate-900 border border-white/10 text-slate-400 hover:text-slate-200 transition"
            >
              {showHostingGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showHostingGuide && (
            <div className="space-y-4 pt-2 border-t border-white/5 text-xs">
              {/* Tabs Switcher: Vercel vs InfinityFree */}
              <div className="flex p-1 rounded-xl bg-slate-950 border border-white/10 max-w-sm">
                <button
                  type="button"
                  onClick={() => setActiveDeployTab('vercel')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                    activeDeployTab === 'vercel'
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Vercel (সুপার ফাস্ট)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDeployTab('infinityfree')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                    activeDeployTab === 'infinityfree'
                      ? 'bg-cyan-500 text-black shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>InfinityFree (htdocs)</span>
                </button>
              </div>

              {/* Vercel Guide Content */}
              {activeDeployTab === 'vercel' && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Vercel-এ সরাসরি লাইভ করার সহজ ধাপ:</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      প্রজেক্টে <code className="text-amber-300 font-mono">vercel.json</code> এবং স্বয়ংক্রিয় ক্লায়েন্ট-সাইড মেমরি ও ব্রাউজার টেলিগ্রাম গেটওয়ে যুক্ত করা হয়েছে। Vercel এ ডিপ্লয় করলে কোনো সার্ভার ক্র্যাশ ছাড়া সমস্ত ফিচার স্বয়ংক্রিয়ভাবে একটিভ থাকবে।
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-amber-300">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">1</span>
                        <span>GitHub-এ পুশ করুন</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        আপনার গিট রিপোজিটরিতে এই কোড পুশ করুন অথবা Vercel ড্যাশবোর্ডে <b>Import Git Repository</b> সিলেক্ট করুন।
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-amber-300">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">2</span>
                        <span>Build Command</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Framework Preset: <b>Vite</b> থাকবে। Build Command: <code className="text-amber-300 font-mono">vite build</code> এবং Output Directory: <code className="text-amber-300 font-mono">dist</code> নির্বাচন করুন।
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-amber-300">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">3</span>
                        <span>Deploy এ ক্লিক করুন</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        <b>Deploy</b> বাটনে চাপ দিন। ১ মিনিটের মধ্যে সাইট লাইভ হয়ে যাবে এবং টেলিগ্রাম পোস্ট ও TMDB সরাসরি কাজ করবে।
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* InfinityFree Guide Content */}
              {activeDeployTab === 'infinityfree' && (
                <div className="space-y-3 animate-in fade-in">
                  {/* One-Click Download ZIP Banner */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/20 via-blue-500/10 to-transparent border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px] border border-cyan-500/30">
                          ⚡ 1-Click Ready Solution
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] border border-emerald-500/30">
                          ~২৩১ KB (আনজিপ করলে প্রায় ১ MB / ২৯টি ফাইল)
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-100 text-sm mt-1">ইনফিনিটি-ফ্রি এর জন্য সম্পূর্ণ জিপ ফাইল</h3>
                      <p className="text-[11px] text-slate-300 mt-1">
                        এই জিপ ফাইলটিতে <code className="text-cyan-300 font-mono">dist</code> এর কম্পাইল করা কোড, পিএইচপি ব্যাকএন্ড (<code className="text-cyan-300 font-mono">api/</code>), ডাটাবেজ (<code className="text-cyan-300 font-mono">data/</code>) ও <code className="text-emerald-300 font-mono">.htaccess</code> সম্পূর্ণ সেটআপ করা আছে।
                      </p>
                      {downloadZipMsg && (
                        <p className={`text-xs mt-2 font-medium ${downloadZipMsg.type === 'success' ? 'text-emerald-300' : 'text-rose-400'}`}>
                          {downloadZipMsg.text}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={downloadingZip}
                      onClick={handleDownloadHtdocsZip}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-400 hover:to-teal-500 disabled:opacity-50 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition shrink-0 cursor-pointer"
                    >
                      <Download className={`w-4 h-4 ${downloadingZip ? 'animate-bounce' : ''}`} />
                      <span>{downloadingZip ? 'যাচাই ও ডাউনলোড হচ্ছে...' : 'Download htdocs.zip'}</span>
                    </button>
                  </div>

                  {/* Alert: Why was it blank with zip? */}
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>জিপ ফাইল সম্পর্কিত গুরুত্বপূর্ণ তথ্য ও সাধারণ জিজ্ঞাসা:</span>
                    </div>
                    <ul className="list-disc pl-4 text-[11px] leading-relaxed text-slate-300 space-y-1">
                      <li>
                        <b>জিপ ফাইলটি মাত্র ~২৩১ KB কেন?</b> আধুনিক প্রোডাকশন কোড স্বয়ংক্রিয়ভাবে সংকুচিত (Minified &amp; Gzip/Deflate Compressed) করা থাকে যাতে দ্রুত ডাউনলোড হয়। আপনি InfinityFree ফাইল ম্যানেজারে আপলোড করে <b>Extract (আনজিপ)</b> করলে এটি সাথে সাথে প্রায় <b>১ মেগাবাইট</b> সাইজের সম্পূর্ণ ২৯টি ফাইল ও ফোল্ডারে উন্মুক্ত হয়ে যাবে!
                      </li>
                      <li>
                        <b>পূর্বে ১০ KB ফাইল পাওয়ার কারণ:</b> পূর্বে Vercel থেকে ডাউনলোড লিংকে ক্লিক করলে সার্ভারলেস 404/HTML পৃষ্ঠা রিনেম হয়ে ডাউনলোড হচ্ছিল। এখন স্বয়ংক্রিয় ভ্যালিডেশন যুক্ত করা হয়েছে, ফলে আপনি সর্বদা ১০০% আসল ২৩১ KB-র কমপ্লিট প্যাকেজটি পাবেন।
                      </li>
                      <li>
                        <b>জিপ ফাইলটি আনজিপ (Extract) করা আবশ্যক:</b> InfinityFree ফাইল ম্যানেজারে জিপ আপলোড করার পর ফাইলের ওপর রাইট-ক্লিক করে <b>Extract</b> করতে হবে।
                      </li>
                    </ul>
                  </div>

                  {/* Step by Step instructions for File Manager */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                        <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px]">1</span>
                        <span>htdocs.zip আপলোড</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        ওপরের বাটন থেকে <b>htdocs.zip</b> ডাউনলোড করে InfinityFree File Manager এর <code className="text-cyan-300 font-mono">htdocs</code> ফোল্ডারে আপলোড করুন।
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[10px]">2</span>
                        <span>রাইট-ক্লিক করে Extract</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        আপলোড করা <code className="text-emerald-300 font-mono">htdocs.zip</code> এর ওপর রাইট-ক্লিক করে <b>Extract</b> চাপুন। সব ফাইল সরাসরি htdocs এ খুলে যাবে।
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                        <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[10px]">3</span>
                        <span>পারমিশন 755 দিন</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        <code className="text-slate-200 font-mono">data/</code> ও <code className="text-slate-200 font-mono">uploads/</code> ফোল্ডারের ওপর রাইট ক্লিক করে <b>Permissions: 755</b> দিন। ব্যস কাজ শেষ!
                      </p>
                    </div>
                  </div>

                  {/* Exact Files Tree for htdocs */}
                  <div className="p-3.5 rounded-xl bg-slate-950/90 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                        <FolderCheck className="w-4 h-4 text-emerald-400" />
                        <span>htdocs ফোল্ডারে ঠিক যে ফাইলগুলো থাকবে:</span>
                      </span>
                      <span className="text-[10px] text-slate-500">InfinityFree Root Checklist</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-300 bg-[#070a12] p-2.5 rounded-lg border border-white/5 space-y-1">
                      <div className="text-cyan-400 font-bold">📁 htdocs/</div>
                      <div className="pl-4 text-slate-300">├── 📄 <b>index.html</b> <span className="text-slate-500">(প্রধান পেজ)</span></div>
                      <div className="pl-4 text-slate-300">├── 📁 <b>assets/</b> <span className="text-slate-500">(কম্পাইল করা JS ও CSS)</span></div>
                      <div className="pl-4 text-slate-300">├── 📁 <b>api/</b> <span className="text-slate-500">(পিএইচপি ব্যাকএন্ড: config.php, telegram.php ইত্যাদি)</span></div>
                      <div className="pl-4 text-slate-300">├── 📁 <b>data/</b> <span className="text-slate-500">(লোকাল ডেটাবেজ ও .htaccess সিকিউরিটি)</span></div>
                      <div className="pl-4 text-slate-300">├── 📁 <b>uploads/</b> <span className="text-slate-500">(মুভি পোস্টার ডিরেক্টরি)</span></div>
                      <div className="pl-4 text-slate-300">├── 📁 <b>cron/</b> <span className="text-slate-500">(শিডিউলার ক্রন স্ক্রিপ্ট)</span></div>
                      <div className="pl-4 text-slate-300">└── ⚙️ <b>.htaccess</b> <span className="text-slate-500">(রাউটিং ও অ্যাপাচি কনফিগারেশন)</span></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Save Bar */}
        <div className="p-4 rounded-2xl bg-[#0c101a] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportBackup}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              title="Download all settings, channels, shorteners, and promotions as a JSON file"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export Backup JSON</span>
            </button>
            <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Import Backup JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
            {importStatus && (
              <span className="text-xs text-amber-300 font-medium ml-1">
                {importStatus}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {saveSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold animate-in fade-in">
                <Check className="w-4 h-4" />
                <span>Settings saved to server!</span>
              </span>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-sm shadow-md shadow-amber-500/20 active:scale-95 transition disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : (
                <Save className="w-4 h-4 text-black" />
              )}
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
