import React, { useState } from 'react';
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
  FileCode2
} from 'lucide-react';
import { AppSettings } from '../types';
import { api } from '../services/api';

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
  const [botTestResult, setBotTestResult] = useState<{
    success?: boolean;
    isDemo?: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSaveSettings(formState);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestBot = async () => {
    setTestingBot(true);
    setBotTestResult(null);
    try {
      const res = await onTestTelegram(formState.telegramBotToken);
      setBotTestResult(res);
      if (res.bot?.username) {
        setFormState((prev) => ({ ...prev, telegramBotUsername: `@${res.bot.username}` }));
      }
    } catch (e: any) {
      setBotTestResult({ success: false, error: e.message });
    } finally {
      setTestingBot(false);
    }
  };

  const handleExportBackup = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(formState, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `mova_deta_settings_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
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
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Telegram Bot HTTP API Token
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={formState.telegramBotToken}
                onChange={(e) =>
                  setFormState({ ...formState, telegramBotToken: e.target.value })
                }
                placeholder="e.g. 7123456789:AAHk1_xxxxxxxxxxxxxxxxxxx"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-100 placeholder-slate-500 font-mono focus:border-amber-500/50 outline-none"
              />
              <button
                type="button"
                onClick={handleTestBot}
                disabled={testingBot}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition shrink-0"
              >
                {testingBot ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-amber-400" />
                )}
                <span>Test Connection</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Obtain from <code>@BotFather</code> on Telegram. Keep private. The token is saved in server-side <code>data/settings.json</code>.
            </p>
          </div>

          {botTestResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
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
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-semibold">
                  {botTestResult.success
                    ? 'Connection Succeeded!'
                    : botTestResult.isDemo
                    ? 'Operating in Demo Mode'
                    : 'Connection Failed'}
                </div>
                <div className="text-[11px] opacity-90 mt-0.5">
                  {botTestResult.message || botTestResult.error}
                </div>
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
            <span className="text-[10px] text-slate-400">Optional (Sample library active if empty)</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              TMDB v3 API Key
            </label>
            <input
              type="password"
              value={formState.tmdbApiKey}
              onChange={(e) => setFormState({ ...formState, tmdbApiKey: e.target.value })}
              placeholder="Enter TMDB v3 API key from themoviedb.org"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-100 placeholder-slate-500 font-mono focus:border-amber-500/50 outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              If left blank, Mova Deta automatically uses its built-in sample movie library for instant searching.
            </p>
          </div>
        </div>

        {/* Section 4: General Preferences & Timezone */}
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
                        <h3 className="font-bold text-slate-100 text-sm">ইনফিনিটি-ফ্রি এর জন্য তৈরি জিপ ফাইল</h3>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1">
                        এই জিপ ফাইলটিতে <code className="text-cyan-300 font-mono">dist</code> এর কম্পাইল করা কোড, পিএইচপি ব্যাকএন্ড ও <code className="text-emerald-300 font-mono">.htaccess</code> সম্পূর্ণ সেটআপ করা আছে।
                      </p>
                    </div>
                    <a
                      href="/htdocs.zip"
                      download="htdocs.zip"
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-400 hover:to-teal-500 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download htdocs.zip</span>
                    </a>
                  </div>

                  {/* Alert: Why was it blank with zip? */}
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>জিপ ফাইল আপলোড করার পর ব্ল্যাঙ্ক হওয়ার ২টি কারণ:</span>
                    </div>
                    <ul className="list-disc pl-4 text-[11px] leading-relaxed text-slate-300 space-y-1">
                      <li>
                        <b>জিপ ফাইলটি আনজিপ (Extract) না করা:</b> InfinityFree ফাইল ম্যানেজারে জিপ আপলোড করলে স্বয়ংক্রিয়ভাবে খুলে যায় না। আপনাকে ফাইলের ওপর রাইট-ক্লিক করে <b>Extract</b> করতে হয়।
                      </li>
                      <li>
                        <b>সোর্স কোডের জিপ আপলোড করা:</b> AI Studio থেকে যে জিপটি এক্সপোর্ট করা হয় তাতে র সোর্স ফাইল (<code className="text-amber-300 font-mono">src</code>, <code className="text-amber-300 font-mono">package.json</code>) থাকে, যা ব্রাউজার সরাসরি চালাতে পারে না। ওপরের বাটনে ক্লিক করে তৈরি করা <b>htdocs.zip</b> ব্যবহার করুন।
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportBackup}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export Backup JSON</span>
            </button>
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
