import React, { useState } from 'react';
import { BookOpen, X, ChevronRight, CheckCircle, Copy, Check, Server, Shield, Sparkles } from 'lucide-react';
import { copyToClipboardSafe } from '../utils/clipboard';

interface BanglaManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BanglaManualModal: React.FC<BanglaManualModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeSection, setActiveSection] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = async (text: string, id: string) => {
    await copyToClipboardSafe(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0d111c] border border-white/10 shadow-2xl shadow-black/80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Mova Deta — বাংলা ইউজার ম্যানুয়াল</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/30">
                  A to Z Guide
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                টেলিগ্রাম বট, চ্যানেল, শর্টনার ও ইনফিনিটিফ্রি হোস্টিং সেটআপ গাইড
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-slate-200 text-sm leading-relaxed">
          {/* Welcome Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30">
            <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              স্বাগতম Mova Deta Publisher-এ!
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              এটি একটি ব্যক্তিগত টেলিগ্রাম মুভি ও কন্টেন্ট পাবলিশার ড্যাশবোর্ড। এই নির্দেশিকাটি অনুসরণ করে আপনি মাত্র কয়েক মিনিটে পুরো সিস্টেমটি চালু ও ব্যবহার করতে পারবেন।
            </p>
          </div>

          {/* Step 1: Telegram Bot Creation */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-2.5">
            <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs">১</span>
              টেলিগ্রাম বট তৈরি এবং Bot Token সংগ্রহ করা
            </h4>
            <ul className="list-disc list-inside text-xs text-slate-300 space-y-1.5 pl-1">
              <li>টেলিগ্রামে গিয়ে সার্চ করুন <code>@BotFather</code> এবং <code>/start</code> দিন।</li>
              <li>নতুন বট তৈরির জন্য কমান্ড লিখুন: <code>/newbot</code></li>
              <li>বটের একটি সুন্দর নাম দিন (যেমন: <i>Mova Deta Publisher</i>)।</li>
              <li>এরপর একটি ইউনিক ইউজারনেম দিন যার শেষে <code>bot</code> থাকবে (যেমন: <i>movadeta_bot</i>)।</li>
              <li>বট তৈরি সম্পন্ন হলে BotFather আপনাকে একটি <b>HTTP API Token</b> দেবে (যেমন: <code>7123456789:AAHk...</code>)।</li>
              <li>এই টোকেনটি কপি করে Mova Deta-এর <b>Settings</b> ট্যাবে গিয়ে <b>Telegram Bot Token</b> বক্সে পেস্ট করে <b>Save &amp; Test Connection</b> করুন।</li>
            </ul>
          </div>

          {/* Step 2: Channel Admin Setup */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-2.5">
            <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs">২</span>
              বটকে Genre Channel এবং Hub Channel-এ Admin বানানো
            </h4>
            <ul className="list-disc list-inside text-xs text-slate-300 space-y-1.5 pl-1">
              <li>আপনার প্রতিটি টেলিগ্রাম চ্যানেলের <b>Channel Info &gt; Administrators</b> অপশনে যান।</li>
              <li><b>Add Admin</b>-এ ক্লিক করে আপনার তৈরি করা বটের ইউজারনেম দিয়ে সার্চ করে অ্যাডমিন বানান।</li>
              <li>পারমিশনের মধ্যে অবশ্যই <b>Post Messages</b> এবং <b>Edit Messages</b> অন রাখুন।</li>
              <li>পাবলিক চ্যানেল হলে Chat ID হবে: <code>@YourChannelUsername</code></li>
              <li>প্রাইভেট চ্যানেল হলে Chat ID হবে: <code>-100xxxxxxxxxx</code> (টেলিগ্রামের <code>@username_to_id_bot</code> বা ওয়েব টেলিগ্রামের লিঙ্ক থেকে আইডি নেওয়া যায়)।</li>
            </ul>
          </div>

          {/* Step 3: TMDB Movie Import */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-2.5">
            <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs">৩</span>
              TMDB মুভি সার্চ ও ১-ক্লিকে ফর্ম পূরণ
            </h4>
            <ul className="list-disc list-inside text-xs text-slate-300 space-y-1.5 pl-1">
              <li>মুভি আপলোড ফর্মে থাকা <b>TMDB Search &amp; Import</b> বাটনে চাপ দিন।</li>
              <li>মুভির নাম লিখে সার্চ করলে সাথে সাথে 16:9 ব্যানার পোস্টার, টাইটেল, সাল, আইএমডিবি রেটিং ও জেনার চলে আসবে।</li>
              <li><b>Import to Form</b> বাটনে চাপ দিলে টাইটেল হাইপার-বোল্ড ফরম্যাটে এবং জেনারগুলো হ্যাশট্যাগ ফরম্যাটে ফর্মে চলে আসবে।</li>
              <li><b className="text-amber-300">গুরুত্বপূর্ণ:</b> এই প্রজেক্টে কোনো Story বা Synopsis ফিল্ড নেই। ইউজার কেবল ভাষা, ডাউনলোড কোয়ালিটি ও ডাউনলোড লিঙ্ক প্রদান করবেন।</li>
            </ul>
          </div>

          {/* Step 4: Quality System & How to Download */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-2.5">
            <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs">৪</span>
              Quality Selector এবং "How to Download" সিস্টেম
            </h4>
            <ul className="list-disc list-inside text-xs text-slate-300 space-y-1.5 pl-1">
              <li><b>Quality Selector:</b> কোনো সাধারণ ব্রাউজার ড্রপডাউন নয়, এটি একটি কাস্টম মডার্ন পপআপ। এতে 480p, 720p, 1080p ইত্যাদি সহজে অন/অফ এবং কাস্টম কোয়ালিটি যোগ করা যায়।</li>
              <li><b className="text-amber-300">মূল নিয়ম:</b> আপনি যে কোয়ালিটিগুলোতে বৈধ ডাউনলোড লিঙ্ক দেবেন, কেবল সেগুলোই টেলিগ্রাম পোস্টে দৃশ্যমান হবে। খালি কোয়ালিটি স্বয়ংক্রিয়ভাবে বাদ যাবে।</li>
              <li><b>How to Download:</b> সেটিংস-এ গিয়ে আপনার How to Download ভিডিও বা টেলিগ্রাম পোস্টের লিঙ্কটি একবার সেভ করে দিন। প্রতিটি মুভি পোস্টে ডাউনলোড কোয়ালিটির ঠিক উপরে এটি স্বয়ংক্রিয়ভাবে ইনলাইন ক্লিকেবল লিঙ্ক হিসেবে থাকবে।</li>
              <li>টেলিগ্রামে কোনো প্রকার ইনলাইন কিবোর্ড বাটন ব্যবহৃত হবে না—সব লিঙ্ক পরিষ্কার ক্লিকেবল টেক্সট হিসেবে প্রকাশিত হবে।</li>
            </ul>
          </div>

          {/* Step 5: Shortener Integration */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-2.5">
            <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs">৫</span>
              URL Shortener কানেক্ট করা
            </h4>
            <p className="text-xs text-slate-300">
              <b>Shortner</b> মেনুতে গিয়ে আপনি Adlinkfly, Shareus, Gplinks বা যেকোনো শর্টনারের API URL এবং API Key যুক্ত করতে পারবেন। মুভি পাবলিশ করার সময় সিস্টেম স্বয়ংক্রিয়ভাবে আসল লিঙ্কগুলোকে শর্ট লিঙ্কে রূপান্তরিত করে পোস্টে যুক্ত করবে।
            </p>
          </div>

          {/* Step 6: InfinityFree Hosting Setup */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-3">
            <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs">৬</span>
              InfinityFree Hosting-এ ডেপ্লয়মেন্ট ও Cron Job সেটআপ
            </h4>
            <p className="text-xs text-slate-300">
              Mova Deta সম্পূর্ণ পিএইচপি (PHP) ও সার্ভার-সাইড JSON ভিত্তিক আর্কিটেকচারে তৈরি, যার জন্য কোনো ডাটাবেস (MySQL/Firebase) প্রয়োজন নেই।
            </p>

            <div className="p-3 rounded-lg bg-slate-950 border border-white/10 space-y-2 text-xs">
              <div className="font-semibold text-slate-200">ফাইল আপলোড ধাপ:</div>
              <ol className="list-decimal list-inside text-slate-400 space-y-1">
                <li>ইনফিনিটিফ্রি সিপ্যানেল থেকে File Manager খুলুন এবং <code>htdocs/</code> ফোল্ডারে যান।</li>
                <li>Mova Deta-এর ফাইলগুলো (index.html, /api/, /data/, /uploads/, /cron/) সরাসরি <code>htdocs/</code>-এ আপলোড করুন।</li>
                <li><code>data/</code> এবং <code>uploads/</code> ফোল্ডারটির Permissions দিন <code>755</code> অথবা <code>777</code> যেন পিএইচপি ফাইল রাইট করতে পারে।</li>
              </ol>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">
                  Cron Job কমান্ড (শিডিউল পোস্ট অটো পাবলিশের জন্য):
                </span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      '* * * * * php -q /home/volX_X/htdocs/cron/scheduler.php',
                      'cron'
                    )
                  }
                  className="flex items-center gap-1 text-[11px] text-amber-400 hover:underline"
                >
                  {copiedCode === 'cron' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode === 'cron' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <code className="block p-2 rounded bg-slate-900 text-amber-300 font-mono text-[11px] overflow-x-auto">
                * * * * * php -q /home/volX_X/htdocs/cron/scheduler.php
              </code>
              <p className="text-[11px] text-slate-400">
                (দ্রষ্টব্য: <code>/home/volX_X/htdocs/</code> অংশটি আপনার সিপ্যানেলের একাউন্ট ইনফো অনুযায়ী পরিবর্তন হবে)।
              </p>
            </div>
          </div>

          {/* Security & Disclaimer */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 flex items-start gap-3">
            <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-1">
              <div className="font-bold text-slate-100">নিরাপত্তা ও নীতিমালা</div>
              <p className="text-slate-400 leading-normal">
                Mova Deta একটি ব্যক্তিগত টেলিগ্রাম পাবলিশার টুল। এটি কেবল আপনার নিজস্ব মালিকানাধীন অথবা বৈধ অনুমতিপ্রাপ্ত কন্টেন্ট পাবলিশের জন্য ডিজাইন করা হয়েছে। সেনসিটিভ বট টোকেনগুলো ক্লায়েন্ট ব্রাউজারে না রেখে সার্ভার-সাইড ফাইলে সুরক্ষিত থাকে।
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-white/10 bg-slate-900/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition"
          >
            বুঝেছি / Close
          </button>
        </div>
      </div>
    </div>
  );
};
