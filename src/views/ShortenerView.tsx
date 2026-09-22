import React, { useState } from 'react';
import {
  Link2,
  Plus,
  Trash2,
  CheckCircle,
  ExternalLink,
  Zap,
  Globe,
  Key,
  Radio,
  Loader2,
  Check,
  Sparkles
} from 'lucide-react';
import { Shortener } from '../types';
import { api } from '../services/api';

interface ShortenerViewProps {
  shorteners: Shortener[];
  onRefreshShorteners: () => void;
}

export const ShortenerView: React.FC<ShortenerViewProps> = ({
  shorteners,
  onRefreshShorteners
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://mova.link');

  // Test URL Shorten State
  const [testUrl, setTestUrl] = useState('https://drive.google.com/file/d/12345/view');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ shortUrl: string; name?: string } | null>(null);

  const handleAddShortener = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await api.saveShortener({
      id: 'shortener-' + Date.now(),
      name: name.trim(),
      apiUrl: apiUrl.trim(),
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim(),
      status: 'ready',
      enabled: true,
      isActive: shorteners.length === 0
    });

    setName('');
    setApiUrl('');
    setApiKey('');
    setIsAdding(false);
    onRefreshShorteners();
  };

  const handleSetActive = async (id: string) => {
    const target = shorteners.find((s) => s.id === id);
    if (!target) return;
    await api.saveShortener({ ...target, isActive: true });
    onRefreshShorteners();
  };

  const handleToggleEnabled = async (id: string) => {
    const target = shorteners.find((s) => s.id === id);
    if (!target) return;
    await api.saveShortener({ ...target, enabled: !target.enabled });
    onRefreshShorteners();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this shortener?')) {
      await api.deleteShortener(id);
      onRefreshShorteners();
    }
  };

  const handleTestShorten = async (shortenerId: string) => {
    setTestingId(shortenerId);
    setTestResult(null);
    try {
      const res = await api.shortenUrl(testUrl, shortenerId);
      setTestResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-slate-900 to-slate-900 border border-white/10 shadow-lg">
        <div>
          <h1 className="text-lg sm:text-xl font-cinzel font-bold text-slate-100 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-cyan-400" />
            <span>Shortener Integration</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure Adlinkfly, Shareus, Gplinks, or custom shortener APIs for auto link shortening.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Shortener</span>
        </button>
      </div>

      {/* Add New Shortener Form Modal/Collapse */}
      {isAdding && (
        <form
          onSubmit={handleAddShortener}
          className="p-5 rounded-2xl bg-[#0c101a] border border-amber-500/30 space-y-4 shadow-xl animate-in fade-in duration-200"
        >
          <h2 className="text-sm font-bold text-amber-300 flex items-center gap-2 border-b border-white/5 pb-2">
            <Plus className="w-4 h-4" />
            <span>Add New URL Shortener</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Shortener Service Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Shareus / Gplinks / Adlinkfly"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-100 outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                API Endpoint URL
              </label>
              <input
                type="url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="e.g. https://shareus.io/api"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-100 outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                API Secret Token / Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Your shortener API key"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-100 outline-none focus:border-amber-500/50 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Base Domain (Fallback)
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://mova.link"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-100 outline-none focus:border-amber-500/50 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition shadow-md shadow-amber-500/20"
            >
              Save Shortener
            </button>
          </div>
        </form>
      )}

      {/* Shorteners List */}
      <div className="space-y-3">
        {shorteners.map((s) => (
          <div
            key={s.id}
            className={`p-4 rounded-2xl border transition-all ${
              s.isActive
                ? 'bg-[#0f1424] border-cyan-500/40 shadow-lg shadow-cyan-500/5'
                : 'bg-[#0c101a] border-white/10'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => handleSetActive(s.id)}
                  className={`mt-1 w-4 h-4 rounded-full border flex items-center justify-center transition ${
                    s.isActive
                      ? 'border-cyan-400 bg-cyan-500/30'
                      : 'border-slate-600 hover:border-slate-400'
                  }`}
                  title="Make Default Active"
                >
                  {s.isActive && <div className="w-2 h-2 rounded-full bg-cyan-400" />}
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-100">{s.name}</h3>
                    {s.isActive && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                        Default Active
                      </span>
                    )}
                    {!s.enabled && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        Disabled
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-1 font-mono">
                    <span className="truncate max-w-[240px]">
                      Endpoint: {s.apiUrl || 'Local Simulated Hash'}
                    </span>
                    <span>•</span>
                    <span>Domain: {s.baseUrl}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => handleTestShorten(s.id)}
                  disabled={testingId === s.id}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {testingId === s.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                  <span>Test Link</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleEnabled(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    s.enabled
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                      : 'bg-slate-900 border-white/10 text-slate-400'
                  }`}
                >
                  {s.enabled ? 'Enabled' : 'Disabled'}
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(s.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Test Result Display if this shortener was tested */}
            {testResult && testingId === null && (
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs bg-slate-950/60 p-2.5 rounded-xl">
                <div className="truncate">
                  <span className="text-slate-400">Shortened URL: </span>
                  <a
                    href={testResult.shortUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 font-mono underline font-semibold break-all"
                  >
                    {testResult.shortUrl}
                  </a>
                </div>
                <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px] shrink-0">
                  <Check className="w-3.5 h-3.5" />
                  <span>Success</span>
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
