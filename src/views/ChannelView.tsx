import React, { useState, useRef } from 'react';
import {
  Tv,
  Radio,
  Plus,
  Trash2,
  Pencil,
  Link as LinkIcon,
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { GenreChannel, HubChannel } from '../types';
import { api } from '../services/api';

interface ChannelViewProps {
  initialType?: 'genre' | 'hub';
  genreChannels: GenreChannel[];
  hubChannels: HubChannel[];
  onRefreshChannels: () => void;
}

export const ChannelView: React.FC<ChannelViewProps> = ({
  initialType = 'genre',
  genreChannels,
  hubChannels,
  onRefreshChannels
}) => {
  const [activeType, setActiveType] = useState<'genre' | 'hub'>(initialType);
  const [isAdding, setIsAdding] = useState(false);
  const [editingChannel, setEditingChannel] = useState<GenreChannel | HubChannel | null>(null);

  const [name, setName] = useState('');
  const [chatId, setChatId] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [genreLabel, setGenreLabel] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const formRef = useRef<HTMLDivElement>(null);

  // Testing Channel status
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; msg: string } | null>(null);

  const currentList = activeType === 'genre' ? genreChannels : hubChannels;

  const resetFormFields = () => {
    setName('');
    setChatId('');
    setInviteLink('');
    setGenreLabel('');
    setIsPrivate(false);
    setEditingChannel(null);
    setIsAdding(false);
  };

  const handleStartEdit = (channel: GenreChannel | HubChannel) => {
    setEditingChannel(channel);
    setName(channel.name || '');
    setChatId(channel.chatId || channel.username || '');
    setInviteLink(channel.inviteLink || '');
    setGenreLabel((channel as GenreChannel).genreLabel || '');
    setIsPrivate(Boolean(channel.isPrivate));
    setIsAdding(true);

    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !chatId.trim()) return;

    const channelPayload: any = {
      id: editingChannel ? editingChannel.id : `${activeType === 'hub' ? 'hub' : 'gc'}-${Date.now()}`,
      name: name.trim(),
      username: chatId.trim().startsWith('@') ? chatId.trim() : (editingChannel?.username || ''),
      chatId: chatId.trim(),
      inviteLink: inviteLink.trim() || undefined,
      genreLabel: activeType === 'genre' ? (genreLabel.trim() || undefined) : undefined,
      isPrivate,
      active: editingChannel ? editingChannel.active : true
    };

    await api.saveChannel(activeType, channelPayload);
    resetFormFields();
    onRefreshChannels();
  };

  const handleToggleActive = async (channel: any) => {
    await api.saveChannel(activeType, { ...channel, active: !channel.active });
    onRefreshChannels();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this channel?')) {
      if (editingChannel?.id === id) {
        resetFormFields();
      }
      await api.deleteChannel(activeType, id);
      onRefreshChannels();
    }
  };

  const handleSwitchTab = (type: 'genre' | 'hub') => {
    setActiveType(type);
    resetFormFields();
  };

  const handleTestChannel = async (channel: any) => {
    setTestingId(channel.id);
    setTestResult(null);
    try {
      // Simulate/perform test post
      const res = await api.publishToTelegram({
        movieTitle: 'Mova Deta Channel Connection Test',
        year: '2024',
        photoUrl: '',
        genreCaption: '<b>Mova Deta Publisher</b>\n\n✅ Channel Connection Verified Successfully.',
        hubCaption: '<b>Mova Deta Publisher</b>\n\n✅ Hub Channel Connection Verified.',
        genreChannels: activeType === 'genre' ? [channel] : [],
        hubChannels: activeType === 'hub' ? [channel] : []
      });

      if (res.successful && res.successful.length > 0) {
        setTestResult({
          id: channel.id,
          success: true,
          msg: res.isDemo
            ? 'Connection verified in Demo Mode (simulated)'
            : 'Test message delivered successfully to Telegram!'
        });
      } else {
        setTestResult({
          id: channel.id,
          success: false,
          msg: res.failed?.[0] || 'Bot could not post to this channel. Verify bot is Admin!'
        });
      }
    } catch (e: any) {
      setTestResult({ id: channel.id, success: false, msg: e.message || 'Network error' });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Top Banner & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-white/10 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-lg sm:text-xl font-cinzel font-bold text-slate-100">
              Telegram Channels
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-sans">
              {currentList.length} Connected
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Manage your destination Genre Channels (with full download posts) and Hub Channels.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex p-1 rounded-xl bg-slate-950/80 border border-white/10">
            <button
              onClick={() => handleSwitchTab('genre')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeType === 'genre'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Genre Channels ({genreChannels.length})</span>
            </button>
            <button
              onClick={() => handleSwitchTab('hub')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeType === 'hub'
                  ? 'bg-cyan-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Hub Channels ({hubChannels.length})</span>
            </button>
          </div>

          <button
            onClick={() => {
              if (editingChannel) {
                resetFormFields();
              } else {
                setIsAdding(!isAdding);
              }
            }}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Channel</span>
          </button>
        </div>
      </div>

      {/* Add / Edit Channel Form */}
      {isAdding && (
        <div ref={formRef}>
          <form
            onSubmit={handleSaveChannel}
            className={`p-5 rounded-2xl bg-[#0c101a] border space-y-4 shadow-xl animate-in fade-in duration-200 ${
              editingChannel ? 'border-amber-400/60 ring-1 ring-amber-400/30' : 'border-amber-500/30'
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h2 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                {editingChannel ? <Pencil className="w-4 h-4 text-amber-400" /> : <Plus className="w-4 h-4" />}
                <span>
                  {editingChannel
                    ? `Edit ${activeType === 'genre' ? 'Genre Channel' : 'Hub Channel'}: ${editingChannel.name}`
                    : `Add New ${activeType === 'genre' ? 'Genre Channel' : 'Hub Channel'}`}
                </span>
              </h2>
              {editingChannel && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                  Editing Mode
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Channel Title / Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Hollywood Hindi Movies"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-100 outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Username / Chat ID
                </label>
                <input
                  type="text"
                  required
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="e.g. @YourChannel or -1001234567890"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-100 outline-none focus:border-amber-500/50 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  বট পোস্ট করার জন্য সঠিক Chat ID (যেমন -100xxxxxxxxxx) অথবা পাবলিক ইউজারনেম (@channel) দিন।
                </p>
              </div>

              {/* Invite Link field - Essential for Hub -> Genre redirection */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-cyan-300 mb-1 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Invite Link / Join Link (হাব চ্যানেলের ডিরেক্টরি লিংক)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 font-normal border border-cyan-500/20">
                    Recommended
                  </span>
                </label>
                <input
                  type="text"
                  value={inviteLink}
                  onChange={(e) => setInviteLink(e.target.value)}
                  placeholder="e.g. https://t.me/+AbCdEfGh or https://t.me/your_channel"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-cyan-500/30 text-xs text-cyan-200 placeholder-slate-600 outline-none focus:border-cyan-400 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  💡 <b>কেন দরকার:</b> হাব চ্যানেলের পোস্টে এই লিংকটি যুক্ত হবে যাতে অডিয়েন্স ক্লিক করে সরাসরি এই চ্যানেলে জয়েন হয়ে মুভি ডাউনলোড করতে পারে।
                </p>
              </div>

              {activeType === 'genre' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Primary Category Tag
                  </label>
                  <input
                    type="text"
                    value={genreLabel}
                    onChange={(e) => setGenreLabel(e.target.value)}
                    placeholder="e.g. Hollywood / South / Bollywood"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-100 outline-none focus:border-amber-500/50"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 pt-4 sm:pt-6">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-900 border-white/20 text-amber-500 accent-amber-500"
                  />
                  <span>Private Channel (-100... Chat ID)</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={resetFormFields}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition shadow-md shadow-amber-500/20"
              >
                {editingChannel ? '✓ Update Channel' : 'Save Channel'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Channels List */}
      <div className="space-y-3">
        {currentList.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#0c101a] border border-dashed border-white/10 text-center text-xs text-slate-400">
            No {activeType} channels added yet. Click "Add Channel" to connect your first channel.
          </div>
        ) : (
          currentList.map((c) => {
            const isBeingEdited = editingChannel?.id === c.id;
            return (
              <div
                key={c.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isBeingEdited
                    ? 'bg-amber-950/20 border-amber-500/60 ring-1 ring-amber-500/40 shadow-lg'
                    : c.active
                    ? 'bg-[#0c101a] border-white/10'
                    : 'bg-slate-950/40 border-white/5 opacity-60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        activeType === 'genre'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                      }`}
                    >
                      {activeType === 'genre' ? (
                        <Tv className="w-4 h-4" />
                      ) : (
                        <Radio className="w-4 h-4" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-100">{c.name}</h3>
                        {c.isPrivate && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            Private
                          </span>
                        )}
                        {activeType === 'genre' && (c as GenreChannel).genreLabel && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/20">
                            {(c as GenreChannel).genreLabel}
                          </span>
                        )}
                        {isBeingEdited && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-black font-bold animate-pulse">
                            Editing
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 font-mono">
                        Chat ID: {c.chatId} {c.username && c.username !== c.chatId ? `(${c.username})` : ''}
                      </div>

                      {/* Show Invite Link if configured */}
                      {c.inviteLink ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 font-mono">
                          <LinkIcon className="w-3 h-3 shrink-0 text-cyan-400" />
                          <span className="text-slate-400">Invite:</span>
                          <a
                            href={c.inviteLink}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline text-cyan-300 truncate max-w-xs sm:max-w-md flex items-center gap-1"
                          >
                            <span>{c.inviteLink}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
                          </a>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-400/90 font-sans">
                          <span>⚠️ কোনো Invite Link দেওয়া নেই (হাব পোস্ট থেকে জয়েন করার জন্য Edit চাপুন)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(c)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center gap-1.5 transition"
                      title="Edit this channel"
                    >
                      <Pencil className="w-3.5 h-3.5 text-amber-400" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTestChannel(c)}
                      disabled={testingId === c.id}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      {testingId === c.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      ) : (
                        <Send className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span>Test Ping</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        c.active
                          ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                          : 'bg-slate-900 border-white/10 text-slate-400'
                      }`}
                    >
                      {c.active ? 'Active' : 'Disabled'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Ping Result Notification */}
                {testResult && testResult.id === c.id && (
                  <div
                    className={`mt-3 p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                      testResult.success
                        ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{testResult.msg}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
