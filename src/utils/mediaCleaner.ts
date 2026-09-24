/**
 * Cleans user queries for TMDB Magic Search.
 * Supports:
 * - Movie & TV Show names (Mirzapur, Panchayat, Jawan, Avatar)
 * - Season & Episode tags (S01, Season 3, Complete)
 * - Torrent & release group tags (1080p, Bluray, WEB-DL, x265, AAC, Dual Audio)
 * - File extensions (.mkv, .mp4)
 * - TMDB & IMDb URLs (movie and tv URLs)
 */
export function cleanMediaSearchQuery(raw: string): string {
  let cleaned = (raw || '').trim();
  if (!cleaned) return '';

  // 1. TMDB URLs (Movie or TV)
  if (cleaned.includes('themoviedb.org/movie/') || cleaned.includes('themoviedb.org/tv/')) {
    const m = cleaned.match(/(?:movie|tv)\/(\d+)(?:-([^/?#]+))?/i);
    if (m && m[2]) {
      return decodeURIComponent(m[2]).replace(/[-_+]/g, ' ').trim();
    }
    if (m && m[1]) return m[1].trim();
  }

  // 2. IMDb URLs
  if (cleaned.includes('imdb.com/title/')) {
    const m = cleaned.match(/title\/(tt\d+)/i);
    if (m && m[1]) return m[1];
  }

  // 3. Remove file extensions (.mkv, .mp4, etc.)
  cleaned = cleaned.replace(/\.(mkv|mp4|avi|mov|wmv|flv|webm|zip|rar|tar|iso)$/i, '');

  // 4. Remove release tags in brackets e.g. [YTS.MX], [Pahe.in], [Dual-Audio]
  cleaned = cleaned.replace(/\[[^\]]*\]/g, ' ').replace(/\((?!19\d\d|20\d\d)[^)]*\)/g, ' ');

  // 5. Remove Season & Episode markers (e.g. S01, S01E02, Season 3, Complete Season, Ep 05)
  cleaned = cleaned.replace(/\b(complete\s*(?:season|series)?|all\s*episodes?|season\s*\d+|s\d{1,2}(?:\s*[-–e]\s*\d{1,2})?|episode\s*\d+|ep\s*\d+|part\s*\d+)\b/gi, '');

  // 6. Remove Quality, Codec & Audio tags
  cleaned = cleaned.replace(/\b(2160p|1080p|720p|480p|360p|4k|2k|uhd|bluray|blu-ray|bdrip|brrip|webrip|web-dl|webdl|hdrip|dvdrip|hdtv|remux|proper|repack|unrated|extended|directors?\s*cut)\b/gi, '');
  cleaned = cleaned.replace(/\b(x264|x265|hevc|h264|h265|h\.264|h\.265|10bit|8bit|6ch|ddp5\.1|dts|ac3|aac|atmos)\b/gi, '');

  // 7. Remove OTT Platforms & Subtitle tags
  cleaned = cleaned.replace(/\b(amzn|amazon|netflix|nf|dsnp|disney|hotstar|zee5|sonyliv|jiocinema|hoichoi|chorki|esub|multisub|subs?)\b/gi, '');

  // 8. Remove common audio language descriptors from torrent title
  cleaned = cleaned.replace(/\b(dual\s*audio|multi\s*audio|clean\s*audio)\b/gi, '');

  // 9. Remove audio language if title has enough words
  const withoutLang = cleaned.replace(/\b(hindi|bengali|bangla|english|tamil|telugu|malayalam|kannada)\b/gi, '').trim();
  if (withoutLang.replace(/[^a-zA-Z0-9]/g, '').length >= 3) {
    cleaned = withoutLang;
  }

  // 10. Replace separators and condense spaces
  cleaned = cleaned
    .replace(/[._\-+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If over-cleaned to nothing, fallback to raw
  if (!cleaned) {
    cleaned = raw.replace(/\.(mkv|mp4|avi)$/i, '').trim();
  }

  return cleaned;
}
