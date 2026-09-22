/**
 * Telegram Post Formatting Utilities for Mova Deta
 */

// Convert text to Unicode Hyper Bold (Mathematical Sans-Serif Bold)
export function toHyperBold(text: string): string {
  const charMap: Record<string, string> = {
    A: '𝗔', B: '𝗕', C: '𝗖', D: '𝗗', E: '𝗘', F: '𝗙', G: '𝗚', H: '𝗛', I: '𝗜', J: '𝗝',
    K: '𝗞', L: '𝗟', M: '𝗠', N: '𝗡', O: '𝗢', P: '𝗣', Q: '𝗤', R: '𝗥', S: '𝗦', T: '𝗧',
    U: '𝗨', V: '𝗩', W: '𝗪', X: '𝗫', Y: '𝗬', Z: '𝗭',
    a: '𝗮', b: '𝗯', c: '𝗰', d: '𝗱', e: '𝗲', f: '𝗳', g: '𝗴', h: '𝗵', i: '𝗶', j: '𝗷',
    k: '𝗸', l: '𝗹', m: '𝗺', n: '𝗻', o: '𝗼', p: '𝗽', q: '𝗾', r: '𝗿', s: '𝘀', t: '𝘁',
    u: '𝘂', v: '𝘃', w: '𝘄', x: '𝘅', y: '𝘆', z: '𝘇',
    '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
  };

  return text
    .split('')
    .map((char) => charMap[char] || char)
    .join('');
}

export type EmojifyStyle = 'ultra' | 'standard' | 'minimal';

// Get appropriate emoji for video resolutions
export function getQualityEmoji(qualityName: string): string {
  const lower = qualityName.toLowerCase();
  if (lower.includes('4k') || lower.includes('2160') || lower.includes('uhd')) return '👑';
  if (lower.includes('1080p hq') || lower.includes('remux') || lower.includes('bluray') || lower.includes('bdrip')) return '💎';
  if (lower.includes('1080')) return '🎬';
  if (lower.includes('720p hevc') || lower.includes('x265') || lower.includes('hevc')) return '⚡';
  if (lower.includes('720')) return '🚀';
  if (lower.includes('480') || lower.includes('360') || lower.includes('dvdrip')) return '📱';
  if (lower.includes('zip') || lower.includes('pack') || lower.includes('season') || lower.includes('batch')) return '📦';
  return '📥';
}

// Get enhanced language tag with flags and audio symbols
export function getLanguageWithEmoji(language: string): string {
  if (!language) return '';
  const lower = language.toLowerCase();
  if (lower.includes('bengali') || lower.includes('bangla')) return `🇧🇩 ${language}`;
  if (lower.includes('hindi')) return `🇮🇳 ${language}`;
  if (lower.includes('dual') || lower.includes('multi')) return `🎧 ${language} 🌐`;
  if (lower.includes('english')) return `🇬🇧 ${language}`;
  if (lower.includes('tamil') || lower.includes('telugu') || lower.includes('malayalam') || lower.includes('kannada') || lower.includes('south')) {
    return `🇮🇳 ${language}`;
  }
  return `🌐 ${language}`;
}

export function getDivider(style: EmojifyStyle = 'ultra'): string {
  if (style === 'ultra') return '✨━━━━━━━━━━━━━━━━━━━━━✨';
  if (style === 'standard') return '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';
  return '───────────────────';
}

interface PostFormatParams {
  title: string;
  year: string;
  genres: string[];
  language: string;
  imdbRating?: string;
  qualities: { name: string; url: string; size?: string }[];
  howToDownloadUrl?: string;
  howToDownloadEnabled?: boolean;
  promotionText?: string;
  promotionUrl?: string;
  mainChannelLink?: string;
  emojifyStyle?: EmojifyStyle;
}

/**
 * Generate Genre Channel Telegram Caption
 * Format:
 * 🎬 Title: MOVIE NAME (YEAR)
 * 🎭 Genres: #Thriller, #Action
 * Language: Hindi
 * IMDb: 8.5/10
 * 📺 Quality: 480p, 720p HEVC, 1080p
 * ▬▬▬▬▬▬▬▬▬▬▬▬▬▬
 * ✅ How to download the movie. 👈
 * ▬▬▬▬▬▬▬▬▬▬▬▬▬▬
 * 👉 Click Here To Learn How To Download
 * [qualities + clickable links]
 * ▬▬▬▬▬▬▬▬▬▬▬▬▬▬
 * Note: If you want to search for any movie, please search for the movie name in English.
 * ▬▬▬▬▬▬▬▬▬▬▬▬▬▬
 * 📍𝐖𝐀𝐂𝐓𝐇  𝐇𝐎𝐋𝐋𝐘𝐖𝐎𝐎𝐃  𝐌𝐎𝐕𝐈𝐄'ˢ👈
 */
export function generateGenreCaption(params: PostFormatParams): string {
  const {
    title,
    year,
    genres,
    language,
    imdbRating,
    qualities,
    howToDownloadUrl,
    howToDownloadEnabled,
    promotionText,
    promotionUrl,
    emojifyStyle = 'ultra'
  } = params;

  const validQualities = qualities.filter((q) => q.url && q.url.trim().length > 0);
  const boldTitleYear = toHyperBold(`${title.toUpperCase()} (${year})`);
  const divider = getDivider(emojifyStyle);

  const titlePrefix = '🎬 <b>Title:';
  const titleSuffix = emojifyStyle === 'ultra' ? '</b> 🍿\n\n' : '</b>\n\n';
  let caption = `${titlePrefix} ${boldTitleYear}${titleSuffix}`;

  // Genres
  const formattedGenres = genres.length > 0
    ? genres.map((g) => (g.startsWith('#') ? g : `#${g.replace(/\s+/g, '')}`)).join(', ')
    : '#Movie';
  caption += `🎭 <b>Genres:</b> ${formattedGenres}\n`;

  // Language
  if (language) {
    if (emojifyStyle === 'ultra' || emojifyStyle === 'standard') {
      caption += `🗣️ <b>Audio:</b> ${getLanguageWithEmoji(language)} 🔊\n`;
    } else {
      caption += `<b>Language:</b> ${language}\n`;
    }
  }

  // IMDb
  if (imdbRating) {
    if (emojifyStyle === 'ultra' || emojifyStyle === 'standard') {
      caption += `⭐ <b>IMDb:</b> <i>${imdbRating}/10</i> 🌟\n`;
    } else {
      caption += `<i>⭐ IMDb: ${imdbRating}/10</i>\n`;
    }
  }

  // Quality line
  if (validQualities.length > 0) {
    const qualityNames = validQualities.map((q) => q.name).join(', ');
    if (emojifyStyle === 'ultra') {
      caption += `📺 <b>Quality:</b> ${qualityNames} 💿\n`;
    } else {
      caption += `📺 <b>Quality:</b> ${qualityNames}\n`;
    }
  }

  // How to Download Section
  if (howToDownloadEnabled && howToDownloadUrl && howToDownloadUrl.trim().length > 0) {
    caption += `\n${divider}\n`;
    caption += `<a href="${howToDownloadUrl.trim()}">✅ <b>How to download the movie? 👈</b></a>\n`;
    caption += `${divider}\n`;
    caption += `👉 <b>Click The Fast Download Links Below 👇</b>\n`;
  }

  // Download Links (clickable URLs, no buttons!)
  if (validQualities.length > 0) {
    caption += `\n`;
    for (const q of validQualities) {
      const sizeTag = q.size ? ` [${q.size}]` : '';
      if (emojifyStyle === 'ultra' || emojifyStyle === 'standard') {
        const qEmoji = getQualityEmoji(q.name);
        caption += `<b>${qEmoji} ${q.name}${sizeTag}</b> ⚡\n${q.url.trim()}\n\n`;
      } else {
        caption += `<b>${q.name}${sizeTag}</b>\n${q.url.trim()}\n\n`;
      }
    }
  }

  // Note section
  caption += `${divider}\n`;
  if (emojifyStyle === 'ultra') {
    caption += `💡 <b>Note:</b> <i>If you want to search for any movie, please search for the movie name in English.</i> 🔍\n`;
    caption += `🍿 <i>Enjoy Watching & Share With Friends!</i> 🚀\n`;
  } else {
    caption += `<i>Note: If you want to search for any movie, please search for the movie name in English.</i>\n`;
  }
  caption += `${divider}\n`;

  // Promotion Section (at very bottom)
  if (promotionUrl && promotionText) {
    caption += `📍 <a href="${promotionUrl.trim()}"><b>${promotionText}</b></a> 👈`;
  }

  return caption.trim();
}

/**
 * Generate Hub Channel Telegram Caption
 */
export function generateHubCaption(params: PostFormatParams): string {
  const {
    title,
    year,
    genres,
    language,
    imdbRating,
    qualities,
    mainChannelLink = 'https://t.me/MovaDetaOfficial',
    emojifyStyle = 'ultra'
  } = params;

  const validQualities = qualities.filter((q) => q.url && q.url.trim().length > 0);
  const boldTitleYear = toHyperBold(`${title.toUpperCase()} (${year})`);
  const divider = getDivider(emojifyStyle);

  const titleSuffix = emojifyStyle === 'ultra' ? '</b> 🍿\n\n' : '</b>\n\n';
  let caption = `🎬 <b>Title: ${boldTitleYear}${titleSuffix}`;

  // Genres
  const formattedGenres = genres.length > 0
    ? genres.map((g) => (g.startsWith('#') ? g : `#${g.replace(/\s+/g, '')}`)).join(', ')
    : '#Movie';
  caption += `🎭 <b>Genres:</b> ${formattedGenres}\n`;

  // Language
  if (language) {
    if (emojifyStyle === 'ultra' || emojifyStyle === 'standard') {
      caption += `🗣️ <b>Audio:</b> ${getLanguageWithEmoji(language)} 🔊\n`;
    } else {
      caption += `<b>Language:</b> ${language}\n`;
    }
  }

  // IMDb
  if (imdbRating) {
    if (emojifyStyle === 'ultra' || emojifyStyle === 'standard') {
      caption += `⭐ <b>IMDb:</b> <i>${imdbRating}/10</i> 🌟\n`;
    } else {
      caption += `<i>⭐ IMDb: ${imdbRating}/10</i>\n`;
    }
  }

  // Quality line
  if (validQualities.length > 0) {
    const qualityNames = validQualities.map((q) => q.name).join(', ');
    if (emojifyStyle === 'ultra') {
      caption += `📺 <b>Quality:</b> ${qualityNames} 💿\n`;
    } else {
      caption += `\n📺 <b>Quality:</b> ${qualityNames}\n`;
    }
  }

  if (emojifyStyle === 'ultra') {
    caption += `\n🚀 <b>Uploaded Successfully! ✅</b>\n\n`;
  } else {
    caption += `\n<b>Uploaded ✅</b>\n\n`;
  }

  caption += `${divider}\n`;
  caption += `📥 <b>Get Download Links From Our Main Channel! 👇👇</b>\n\n`;
  caption += `<a href="${mainChannelLink.trim()}">👉 <b>Click Here to Join & Download</b> 💞</a>`;

  return caption.trim();
}

// Function to dynamically emojify any arbitrary caption text
export function emojifyCaption(rawText: string, style: EmojifyStyle = 'ultra'): string {
  if (!rawText) return '';
  let text = rawText;

  // Enhance common headers if missing emojis
  text = text.replace(/^(Title|TITLE)\s*:/gm, '🎬 <b>Title:</b>');
  text = text.replace(/^(Genres|Genre|GENRES)\s*:/gm, '🎭 <b>Genres:</b>');
  text = text.replace(/^(Language|Audio|LANGUAGE)\s*:/gm, '🗣️ <b>Audio / Language:</b>');
  text = text.replace(/^(IMDb|IMDB|Rating)\s*:/gm, '⭐ <b>IMDb:</b>');
  text = text.replace(/^(Quality|QUALITIES)\s*:/gm, '📺 <b>Quality:</b>');
  text = text.replace(/^(Note|NOTE)\s*:/gm, '💡 <b>Note:</b>');
  text = text.replace(/^(Uploaded|UPLOADED)\b/gm, '🚀 <b>Uploaded Successfully! ✅</b>');

  // Enhance resolution tags in quality blocks
  text = text.replace(/\b(4K|2160p|UHD)\b/gi, '👑 $1');
  text = text.replace(/\b(1080p\s*(?:HQ|Remux|BluRay)?)\b/gi, '🎬 $1');
  text = text.replace(/\b(720p\s*(?:HEVC|x265)?)\b/gi, '⚡ $1');
  text = text.replace(/\b(480p|360p)\b/gi, '📱 $1');

  // Replace default dividers with fancy dividers
  if (style === 'ultra') {
    text = text.replace(/[-=━_~]{10,}/g, '✨━━━━━━━━━━━━━━━━━━━━━✨');
  }

  return text;
}

// Convert HTML caption to readable Plain Text with visible URLs for raw preview
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<a\s+href="([^"]+)">([\s\S]*?)<\/a>/g, (_, href, text) => {
      const cleanText = text.replace(/<[^>]+>/g, '');
      return `${cleanText} (${href})`;
    })
    .replace(/<b>(.*?)<\/b>/g, '$1')
    .replace(/<i>(.*?)<\/i>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
