/**
 * Canvas Thumbnail Studio Generator
 * Creates crisp, vibrant, professional 16:9 thumbnails with movie backdrop,
 * glowing title logo badge, accurate IMDb rating, audio format, and "Download Now" button.
 */

export interface ThumbnailOptions {
  backdropUrl: string;
  movieTitle: string;
  year: string;
  imdbRating?: string | number;
  language?: string;
  qualities?: string[];
  channelName?: string;
  logoUrl?: string; // Optional transparent PNG logo if available
  darknessLevel?: 'light' | 'normal' | 'cinematic'; // Controls vignette darkness
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    // If it's already a data URI or blob, load directly
    if (src.startsWith('data:') || src.startsWith('blob:')) {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Fallback via high-speed image proxy if TMDB or external site blocks CORS
      const cleanUrl = src.replace(/^https?:\/\//, '');
      const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&default=1`;
      const fallback = new Image();
      fallback.crossOrigin = 'anonymous';
      fallback.onload = () => resolve(fallback);
      fallback.onerror = (e) => reject(e);
      fallback.src = proxyUrl;
    };
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export async function generateMovieThumbnail(options: ThumbnailOptions): Promise<string> {
  const canvas = document.createElement('canvas');
  // High resolution 16:9 banner
  const WIDTH = 1280;
  const HEIGHT = 720;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not supported');
  }

  // 1. Clear & Base Cinema canvas
  ctx.fillStyle = '#0a0d14';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // 2. Draw 16:9 Backdrop Image clearly with vivid brightness
  if (options.backdropUrl) {
    try {
      const bgImg = await loadImage(options.backdropUrl);
      const imgRatio = bgImg.naturalWidth / bgImg.naturalHeight;
      const canvasRatio = WIDTH / HEIGHT;
      let drawW = WIDTH;
      let drawH = HEIGHT;
      let offsetX = 0;
      let offsetY = 0;

      if (imgRatio > canvasRatio) {
        drawW = HEIGHT * imgRatio;
        offsetX = -(drawW - WIDTH) / 2;
      } else {
        drawH = WIDTH / imgRatio;
        offsetY = -(drawH - HEIGHT) / 2;
      }

      ctx.drawImage(bgImg, offsetX, offsetY, drawW, drawH);
    } catch (e) {
      console.warn('Could not load backdrop image, using cinematic ambient background', e);
      const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(0.5, '#0f172a');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }

  // 3. Crisp, Balanced Contrast Gradient (Avoid muddy/heavy blackness)
  // Instead of turning the whole picture dark, keep the center & top-right crisp
  const darkness = options.darknessLevel || 'normal';

  // Bottom Gradient for readable Movie Title
  const bottomGradient = ctx.createLinearGradient(0, HEIGHT * 0.42, 0, HEIGHT);
  if (darkness === 'light') {
    bottomGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    bottomGradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.25)');
    bottomGradient.addColorStop(0.8, 'rgba(3, 7, 18, 0.65)');
    bottomGradient.addColorStop(1, 'rgba(3, 7, 18, 0.88)');
  } else {
    // Normal balanced: Keeps the backdrop vibrant while making texts razor-sharp
    bottomGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    bottomGradient.addColorStop(0.45, 'rgba(2, 6, 23, 0.35)');
    bottomGradient.addColorStop(0.75, 'rgba(2, 6, 23, 0.72)');
    bottomGradient.addColorStop(1, 'rgba(2, 6, 23, 0.92)');
  }
  ctx.fillStyle = bottomGradient;
  ctx.fillRect(0, HEIGHT * 0.42, WIDTH, HEIGHT * 0.58);

  // Soft left-side shadow for title logo
  const leftGradient = ctx.createLinearGradient(0, 0, WIDTH * 0.55, 0);
  leftGradient.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
  leftGradient.addColorStop(0.65, 'rgba(0, 0, 0, 0.15)');
  leftGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = leftGradient;
  ctx.fillRect(0, 0, WIDTH * 0.55, HEIGHT);

  // Very subtle top bar shadow so channel name & 4K badge stay legible
  const topGrad = ctx.createLinearGradient(0, 0, 0, 95);
  topGrad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, WIDTH, 95);

  // 4. Top Header Bar: Channel / Brand & Quality Pill
  const channelText = (options.channelName || 'MOVA DETA CINEMA').toUpperCase().trim();
  ctx.save();
  
  // Set font first to measure text accurately
  const brandFont = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.font = brandFont;
  const brandTextWidth = ctx.measureText(channelText).width;
  
  // Calculate dynamic pill width: Left padding (18) + dot diameter (10) + gap (10) + text width + right padding (18)
  const pillPaddingX = 18;
  const dotWidth = 10;
  const dotTextGap = 10;
  const brandPillWidth = Math.max(140, Math.round(pillPaddingX + dotWidth + dotTextGap + brandTextWidth + pillPaddingX));
  const brandPillHeight = 42;
  const brandPillX = 45;
  const brandPillY = 35;

  // Draw Dynamic Brand Pill Box
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  drawRoundedRect(ctx, brandPillX, brandPillY, brandPillWidth, brandPillHeight, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Amber glow dot (vertically centered)
  const dotCenterX = brandPillX + pillPaddingX + (dotWidth / 2);
  const dotCenterY = brandPillY + (brandPillHeight / 2);
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(dotCenterX, dotCenterY, 5, 0, Math.PI * 2);
  ctx.fill();

  // Brand text (vertically centered)
  ctx.fillStyle = '#ffffff';
  ctx.font = brandFont;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(channelText, brandPillX + pillPaddingX + dotWidth + dotTextGap, dotCenterY);
  ctx.restore();

  // Top Right: 4K ULTRA HD / Qualities badge
  const qualityText = options.qualities && options.qualities.length > 0 
    ? options.qualities.slice(0, 3).join(' • ') 
    : '4K ULTRA HD • DUAL AUDIO';

  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  const qWidth = 245;
  drawRoundedRect(ctx, WIDTH - 45 - qWidth, 35, qWidth, 42, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.font = '900 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(qualityText, WIDTH - 45 - (qWidth / 2), 61);
  ctx.restore();

  // 5. Draw Transparent PNG Logo or Render Stylized Title Logo Typography
  let logoDrawn = false;
  if (options.logoUrl) {
    try {
      const logoImg = await loadImage(options.logoUrl);
      const maxW = 560;
      const maxH = 170;
      let lw = logoImg.naturalWidth;
      let lh = logoImg.naturalHeight;
      const scale = Math.min(maxW / lw, maxH / lh, 1);
      lw = lw * scale;
      lh = lh * scale;

      const lx = 48;
      const ly = HEIGHT - 200 - lh;

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 6;
      ctx.drawImage(logoImg, lx, ly, lw, lh);
      ctx.restore();
      logoDrawn = true;
    } catch {
      logoDrawn = false;
    }
  }

  // 6. If no PNG logo, create High-Impact Movie Title Typography Logo Block
  if (!logoDrawn) {
    const rawTitle = (options.movieTitle || 'MOVIE TITLE').trim();
    const title = rawTitle.toUpperCase();

    ctx.save();
    // Glowing Title Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;

    // Responsive font size based on length
    let fontSize = 66;
    if (title.length > 20) fontSize = 48;
    if (title.length > 32) fontSize = 38;

    ctx.font = `900 ${fontSize}px "Cinzel", "Montserrat", "Impact", -apple-system, sans-serif`;

    // Title gradient: Ultra-bright clean platinum white with subtle gold/silver rim
    const titleGrad = ctx.createLinearGradient(48, HEIGHT - 210, 48, HEIGHT - 130);
    titleGrad.addColorStop(0, '#ffffff');
    titleGrad.addColorStop(0.7, '#f8fafc');
    titleGrad.addColorStop(1, '#e2e8f0');

    ctx.fillStyle = titleGrad;
    ctx.textAlign = 'left';

    // Word wrap
    const words = title.split(' ');
    let line = '';
    const lines: string[] = [];
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 780 && n > 0) {
        lines.push(line.trim());
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());

    const startY = HEIGHT - 165 - (lines.length - 1) * (fontSize + 6);
    lines.forEach((l, idx) => {
      // Dark bold stroke for ultra contrast against any image
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.lineWidth = 7;
      ctx.strokeText(l, 48, startY + idx * (fontSize + 6));

      // Fill with platinum gradient
      ctx.fillText(l, 48, startY + idx * (fontSize + 6));
    });
    ctx.restore();
  }

  // 7. Bottom Metadata Strip (Year, IMDb rating badge, Language & Audio)
  const metaY = HEIGHT - 75;

  // Year Badge
  ctx.save();
  ctx.fillStyle = '#f59e0b';
  drawRoundedRect(ctx, 48, metaY - 32, 85, 36, 8);
  ctx.fill();

  ctx.fillStyle = '#000000';
  ctx.font = '900 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(options.year || '2024', 48 + 42.5, metaY - 8);
  ctx.restore();

  // IMDb Rating Badge (Guaranteed display with fallback & clean rating extraction)
  let rawRating = options.imdbRating ? String(options.imdbRating).trim() : '';
  // Extract number if it has text like "IMDb 7.8"
  const match = rawRating.match(/\d+(\.\d+)?/);
  const ratingVal = match ? match[0] : (rawRating || '7.8');

  ctx.save();
  // Classic Iconic IMDb Gold Badge
  ctx.fillStyle = '#f5c518';
  drawRoundedRect(ctx, 145, metaY - 32, 130, 36, 8);
  ctx.fill();

  // IMDb Logo Block inside badge
  ctx.fillStyle = '#000000';
  ctx.font = '900 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('IMDb ★ ' + ratingVal, 145 + 65, metaY - 9);
  ctx.restore();

  // Language / Dual Audio Badge
  const langX = 288;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  const langText = `${options.language || 'Multi Audio'} • Web-DL`;
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const textWidth = ctx.measureText(langText).width;
  drawRoundedRect(ctx, langX, metaY - 32, textWidth + 24, 36, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.fillText(langText, langX + 12, metaY - 9);
  ctx.restore();

  // 8. Bottom-Right "Download Now" Cinema Action Button (Requested: Only 'Download Now')
  ctx.save();
  const playBoxW = 210;
  const playBoxH = 46;
  const playX = WIDTH - 45 - playBoxW;
  const playY = metaY - 37;

  // Outer glowing gradient
  const playGrad = ctx.createLinearGradient(playX, playY, playX + playBoxW, playY);
  playGrad.addColorStop(0, '#f59e0b');
  playGrad.addColorStop(1, '#ea580c');
  ctx.fillStyle = playGrad;
  drawRoundedRect(ctx, playX, playY, playBoxW, playBoxH, 12);
  ctx.fill();

  // Subtle button shadow
  ctx.shadowColor = 'rgba(245, 158, 11, 0.45)';
  ctx.shadowBlur = 16;

  // Download Down-Arrow Icon
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  const arrX = playX + 26;
  const arrY = playY + 16;
  // Arrow stem
  ctx.fillRect(arrX + 4, arrY, 4, 10);
  // Arrow head
  ctx.beginPath();
  ctx.moveTo(arrX, arrY + 9);
  ctx.lineTo(arrX + 12, arrY + 9);
  ctx.lineTo(arrX + 6, arrY + 16);
  ctx.closePath();
  ctx.fill();

  // Button text: "Download Now"
  ctx.fillStyle = '#000000';
  ctx.font = '900 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Download Now', playX + 46, playY + 29);
  ctx.restore();

  // Return base64 JPEG thumbnail (92% quality)
  return canvas.toDataURL('image/jpeg', 0.92);
}
