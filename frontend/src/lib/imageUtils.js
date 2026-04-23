// Image processing utilities for Garuda

export const DEFAULT_ADJUST = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  blur: 0,
  sepia: 0,
  grayscale: 0,
  invert: 0,
};

export const FILTER_PRESETS = {
  none: { ...DEFAULT_ADJUST },
  vivid: { ...DEFAULT_ADJUST, saturation: 150, contrast: 115 },
  vintage: { ...DEFAULT_ADJUST, sepia: 40, saturation: 80, contrast: 95 },
  noir: { ...DEFAULT_ADJUST, grayscale: 100, contrast: 120 },
  grayscale: { ...DEFAULT_ADJUST, grayscale: 100 },
  sepia: { ...DEFAULT_ADJUST, sepia: 100 },
  invert: { ...DEFAULT_ADJUST, invert: 100 },
  cool: { ...DEFAULT_ADJUST, hue: 180, saturation: 110 },
  warm: { ...DEFAULT_ADJUST, hue: 15, saturation: 120, brightness: 105 },
};

export function buildFilterString(a, smoothness = 0) {
  // Map 0-100 blur% to 0-20px CSS blur; smoothness adds extra softening
  const blurPx = ((a.blur || 0) * 0.2) + ((smoothness || 0) * 0.05);
  return [
    `brightness(${a.brightness}%)`,
    `contrast(${a.contrast}%)`,
    `saturate(${a.saturation}%)`,
    `hue-rotate(${a.hue}deg)`,
    `blur(${blurPx.toFixed(2)}px)`,
    `sepia(${a.sepia}%)`,
    `grayscale(${a.grayscale}%)`,
    `invert(${a.invert}%)`,
  ].join(" ");
}

export function buildTransformString(t) {
  return `rotate(${t.rotate}deg) scaleX(${t.flipH ? -1 : 1}) scaleY(${t.flipV ? -1 : 1})`;
}

// Loads an image from URL/data URL and returns HTMLImageElement
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Renders final image to canvas with all adjustments+transforms+image-layers+text-layers applied
export async function renderToCanvas(imageSrc, adjustments, transform, textOverlays = [], smoothness = 0, imageLayers = []) {
  const img = await loadImage(imageSrc);
  const { rotate = 0, flipH = false, flipV = false } = transform || {};

  const rad = (rotate * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const w = img.width;
  const h = img.height;
  const outW = Math.round(w * cos + h * sin);
  const outH = Math.round(w * sin + h * cos);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";

  ctx.filter = buildFilterString(adjustments, smoothness);
  ctx.translate(outW / 2, outH / 2);
  ctx.rotate(rad);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);

  // Reset transforms for overlays
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = "none";

  // Draw image layers (below text)
  for (const layer of imageLayers) {
    if (layer.hidden) continue;
    try {
      const lImg = await loadImage(layer.src);
      const x = (layer.xPct / 100) * outW;
      const y = (layer.yPct / 100) * outH;
      const lw = (layer.wPct / 100) * outW;
      const lh = (layer.hPct / 100) * outH;
      ctx.globalAlpha = layer.opacity ?? 1;
      ctx.drawImage(lImg, x, y, lw, lh);
      ctx.globalAlpha = 1;
    } catch (e) { /* skip broken image */ }
  }

  // Draw text overlays on top
  for (const t of textOverlays) {
    if (t.hidden) continue;
    const size = t.size || 48;
    ctx.font = `${t.bold ? "bold " : ""}${size}px ${t.font ? `"${t.font}"` : '"IBM Plex Sans"'}, sans-serif`;
    ctx.textBaseline = "top";
    const x = (t.xPct / 100) * outW;
    const y = (t.yPct / 100) * outH;
    if (t.shadow) {
      ctx.shadowColor = t.shadowColor || "rgba(0,0,0,0.6)";
      ctx.shadowOffsetX = t.shadowX || 2;
      ctx.shadowOffsetY = t.shadowY || 4;
      ctx.shadowBlur = t.shadowBlur || 8;
    }
    ctx.fillStyle = t.color || "#ffffff";
    ctx.fillText(t.text, x, y);
    ctx.shadowColor = "transparent";
    if (t.stroke) {
      ctx.lineWidth = (t.strokeWidth || 1) * 2;
      ctx.strokeStyle = t.strokeColor || "#000";
      ctx.strokeText(t.text, x, y);
    }
  }

  return canvas;
}

export async function exportImage(imageSrc, adjustments, transform, textOverlays, format = "png", quality = 0.92, smoothness = 0, imageLayers = []) {
  const canvas = await renderToCanvas(imageSrc, adjustments, transform, textOverlays, smoothness, imageLayers);
  const mime = format === "jpg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
  return canvas.toDataURL(mime, quality);
}

export function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Save image using File System Access API (shows native save-as dialog with folder picker)
// Falls back to normal download if API not supported.
export async function saveImageAs(dataUrl, defaultName = "Garuda MX", format = "png") {
  const mime = format === "jpg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
  const ext = format === "jpg" ? "jpg" : format;

  // Convert data URL to Blob
  const blob = await (await fetch(dataUrl)).blob();

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: `${defaultName}.${ext}`,
        types: [{
          description: `${format.toUpperCase()} image`,
          accept: { [mime]: [`.${ext}`] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { ok: true, cancelled: false };
    } catch (e) {
      if (e.name === "AbortError") return { ok: false, cancelled: true };
      // fallback
    }
  }

  // Fallback: prompt for filename, then regular download
  const name = window.prompt("Save image as (filename):", `${defaultName}.${ext}`);
  if (!name) return { ok: false, cancelled: true };
  downloadDataUrl(dataUrl, name.endsWith(`.${ext}`) ? name : `${name}.${ext}`);
  return { ok: true, cancelled: false };
}

// Create thumbnail (max 300px) from data URL
export async function makeThumbnail(dataUrl, maxSize = 300) {
  const img = await loadImage(dataUrl);
  const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  return c.toDataURL("image/jpeg", 0.7);
}

// Crop image at given percentage-based rect { xPct, yPct, wPct, hPct } (0-100)
// format: "png" | "jpg" | "webp"; quality: 0..1
export async function cropImage(src, rectPct, format = "png", quality = 0.95) {
  const img = await loadImage(src);
  const sx = Math.max(0, Math.round((rectPct.xPct / 100) * img.width));
  const sy = Math.max(0, Math.round((rectPct.yPct / 100) * img.height));
  const sw = Math.min(img.width - sx, Math.round((rectPct.wPct / 100) * img.width));
  const sh = Math.min(img.height - sy, Math.round((rectPct.hPct / 100) * img.height));
  const c = document.createElement("canvas");
  c.width = sw;
  c.height = sh;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  const mime = format === "jpg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
  return c.toDataURL(mime, quality);
}

/**
 * Apply blur only where the mask is painted. Mask is a PNG data URL where
 * painted pixels are non-transparent (any color). Returns new image dataURL.
 */
export async function applyMaskedBlur(imageSrc, maskDataUrl, blurRadius = 12, outputFormat = "png", quality = 0.95) {
  const [img, mask] = await Promise.all([loadImage(imageSrc), loadImage(maskDataUrl)]);
  const w = img.width, h = img.height;

  // 1. Full blurred copy using canvas filter
  const blurred = document.createElement("canvas");
  blurred.width = w; blurred.height = h;
  const bCtx = blurred.getContext("2d");
  bCtx.filter = `blur(${blurRadius}px)`;
  bCtx.drawImage(img, 0, 0, w, h);

  // 2. Build a grayscale mask at native size
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = w; maskCanvas.height = h;
  const mCtx = maskCanvas.getContext("2d");
  mCtx.drawImage(mask, 0, 0, w, h);

  // 3. Composite: draw original, then on top draw blurred masked by painted area
  const out = document.createElement("canvas");
  out.width = w; out.height = h;
  const oCtx = out.getContext("2d");
  oCtx.drawImage(img, 0, 0);

  // Put blurred image into temp; use mask as alpha
  const tmp = document.createElement("canvas");
  tmp.width = w; tmp.height = h;
  const tCtx = tmp.getContext("2d");
  tCtx.drawImage(blurred, 0, 0);
  tCtx.globalCompositeOperation = "destination-in";
  tCtx.drawImage(maskCanvas, 0, 0);

  // draw masked-blurred onto original
  oCtx.drawImage(tmp, 0, 0);

  const mime = outputFormat === "jpg" ? "image/jpeg" : outputFormat === "webp" ? "image/webp" : "image/png";
  return out.toDataURL(mime, quality);
}

// Aspect ratio presets
export const CROP_RATIOS = [
  { id: "free", label: "Free", ratio: null },
  { id: "1:1", label: "1:1 Square", ratio: 1 },
  { id: "4:5", label: "4:5 Portrait", ratio: 4 / 5 },
  { id: "9:16", label: "9:16 Story", ratio: 9 / 16 },
  { id: "16:9", label: "16:9 Wide", ratio: 16 / 9 },
  { id: "3:2", label: "3:2 Photo", ratio: 3 / 2 },
  { id: "4:3", label: "4:3 Classic", ratio: 4 / 3 },
  { id: "yt", label: "YouTube 1280×720", ratio: 1280 / 720 },
];

/**
 * Magic Enhance — instant client-side one-click enhancement.
 * Applies:
 *   1. Auto-levels (histogram stretch per channel, 1-99% percentile)
 *   2. Contrast boost (S-curve)
 *   3. Saturation boost (+15%)
 *   4. Unsharp mask (sharpen via subtract blurred copy)
 * Works great on dull / old / low-contrast / faded photos.
 * Returns PNG dataURL.
 */
export async function magicEnhance(imageSrc) {
  const img = await loadImage(imageSrc);
  const w = img.width, h = img.height;

  // Main canvas
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  const n = d.length / 4;

  // --- 1. Build histogram per channel and find 1%/99% percentiles ---
  const histR = new Uint32Array(256);
  const histG = new Uint32Array(256);
  const histB = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) {
    histR[d[i]]++; histG[d[i + 1]]++; histB[d[i + 2]]++;
  }
  const percentile = (hist, target) => {
    let cum = 0;
    for (let v = 0; v < 256; v++) {
      cum += hist[v];
      if (cum >= target) return v;
    }
    return 255;
  };
  const lowTarget = Math.floor(n * 0.005);
  const highTarget = Math.floor(n * 0.995);
  const rLo = percentile(histR, lowTarget), rHi = percentile(histR, highTarget);
  const gLo = percentile(histG, lowTarget), gHi = percentile(histG, highTarget);
  const bLo = percentile(histB, lowTarget), bHi = percentile(histB, highTarget);

  const stretch = (v, lo, hi) => {
    if (hi <= lo) return v;
    const t = (v - lo) / (hi - lo);
    return Math.max(0, Math.min(255, Math.round(t * 255)));
  };

  // S-curve for contrast: y = 0.5 + (x-0.5) * (1 + strength * (1 - 4*(x-0.5)^2))
  const contrastStrength = 0.25;
  const sCurve = (v) => {
    const x = v / 255;
    const y = 0.5 + (x - 0.5) * (1 + contrastStrength * (1 - 4 * (x - 0.5) * (x - 0.5)));
    return Math.max(0, Math.min(255, Math.round(y * 255)));
  };

  // Saturation boost using HSL-like: mix toward luminance inverse
  const satBoost = 0.18;

  // --- 2. Apply per-pixel: auto-level → contrast → saturation ---
  for (let i = 0; i < d.length; i += 4) {
    let r = stretch(d[i], rLo, rHi);
    let g = stretch(d[i + 1], gLo, gHi);
    let b = stretch(d[i + 2], bLo, bHi);
    r = sCurve(r); g = sCurve(g); b = sCurve(b);
    // saturation: luminance
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = Math.max(0, Math.min(255, Math.round(r + (r - L) * satBoost)));
    g = Math.max(0, Math.min(255, Math.round(g + (g - L) * satBoost)));
    b = Math.max(0, Math.min(255, Math.round(b + (b - L) * satBoost)));
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  ctx.putImageData(imgData, 0, 0);

  // --- 3. Unsharp mask: blurred copy, then original*amount - blurred*(amount-1) ---
  return _unsharpMask(c, 2, 0.6);
}

// ===========================================================================
// Client-side Enhance Suite — runs entirely in the browser, no API key needed
// ===========================================================================

function _clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }

function _canvasFromImage(img, scaleW = null, scaleH = null) {
  const w = scaleW || img.width;
  const h = scaleH || img.height;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, w, h);
  return { c, ctx };
}

function _applyPixelOp(ctx, w, h, fn) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const out = fn(d[i], d[i + 1], d[i + 2]);
    d[i] = out[0]; d[i + 1] = out[1]; d[i + 2] = out[2];
  }
  ctx.putImageData(imgData, 0, 0);
}

// Unsharp mask on an existing canvas — returns PNG dataURL and mutates canvas
function _unsharpMask(c, radius = 2, amount = 0.6) {
  const w = c.width, h = c.height;
  const blur = document.createElement("canvas");
  blur.width = w; blur.height = h;
  const bCtx = blur.getContext("2d");
  bCtx.filter = `blur(${radius}px)`;
  bCtx.drawImage(c, 0, 0);
  const ctx = c.getContext("2d");
  const src = ctx.getImageData(0, 0, w, h);
  const blr = bCtx.getImageData(0, 0, w, h).data;
  const d = src.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = _clamp(d[i]     + (d[i]     - blr[i])     * amount);
    d[i + 1] = _clamp(d[i + 1] + (d[i + 1] - blr[i + 1]) * amount);
    d[i + 2] = _clamp(d[i + 2] + (d[i + 2] - blr[i + 2]) * amount);
  }
  ctx.putImageData(src, 0, 0);
  return c.toDataURL("image/png");
}

function _sCurve(v, strength = 0.25) {
  const x = v / 255;
  const y = 0.5 + (x - 0.5) * (1 + strength * (1 - 4 * (x - 0.5) * (x - 0.5)));
  return _clamp(y * 255);
}

function _autoLevelsOnCanvas(c, cutoff = 0.005) {
  const ctx = c.getContext("2d");
  const w = c.width, h = c.height;
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;
  const n = d.length / 4;
  const histR = new Uint32Array(256);
  const histG = new Uint32Array(256);
  const histB = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) { histR[d[i]]++; histG[d[i+1]]++; histB[d[i+2]]++; }
  const pct = (hist, t) => { let s = 0; for (let v = 0; v < 256; v++) { s += hist[v]; if (s >= t) return v; } return 255; };
  const lo = Math.floor(n * cutoff), hi = Math.floor(n * (1 - cutoff));
  const rLo = pct(histR, lo), rHi = pct(histR, hi);
  const gLo = pct(histG, lo), gHi = pct(histG, hi);
  const bLo = pct(histB, lo), bHi = pct(histB, hi);
  const str = (v, l, H) => H <= l ? v : _clamp((v - l) / (H - l) * 255);
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = str(d[i], rLo, rHi);
    d[i + 1] = str(d[i + 1], gLo, gHi);
    d[i + 2] = str(d[i + 2], bLo, bHi);
  }
  ctx.putImageData(data, 0, 0);
}

// 1. HDR — shadow-lift + highlight-compress + local contrast + saturation
async function _hdrEnhance(img) {
  const { c, ctx } = _canvasFromImage(img);
  const w = c.width, h = c.height;
  _applyPixelOp(ctx, w, h, (r, g, b) => {
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (L < 1) return [r, g, b];
    // Reinhard-style tone mapping: compresses highlights, lifts shadows
    const Ln = L / 255;
    const Lm = (Ln * (1 + Ln / 0.7)) / (1 + Ln);
    const gain = (Lm * 255) / L;
    let nr = r * gain, ng = g * gain, nb = b * gain;
    // Saturation boost 22%
    const nL = 0.2126 * nr + 0.7152 * ng + 0.0722 * nb;
    nr += (nr - nL) * 0.22;
    ng += (ng - nL) * 0.22;
    nb += (nb - nL) * 0.22;
    return [_clamp(nr), _clamp(ng), _clamp(nb)];
  });
  // Local contrast via unsharp mask with large radius
  return _unsharpMask(c, 6, 0.55);
}

// 2. Sharpen — strong unsharp mask
async function _sharpenEnhance(img) {
  const { c } = _canvasFromImage(img);
  return _unsharpMask(c, 1.2, 1.3);
}

// 3. Denoise — gaussian blur + mild sharpen to keep edges
async function _denoiseEnhance(img) {
  const { c, ctx } = _canvasFromImage(img);
  const w = c.width, h = c.height;
  const blur = document.createElement("canvas");
  blur.width = w; blur.height = h;
  const bCtx = blur.getContext("2d");
  bCtx.filter = "blur(1.2px)";
  bCtx.drawImage(c, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(blur, 0, 0);
  return _unsharpMask(c, 1.5, 0.5);
}

// 4. Upscale — 2x high-quality resample + sharpen
async function _upscaleEnhance(img) {
  const MAX_DIM = 6000;
  let scale = 2;
  if (img.width * 2 > MAX_DIM || img.height * 2 > MAX_DIM) {
    scale = Math.min(MAX_DIM / img.width, MAX_DIM / img.height);
  }
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.imageSmoothingEnabled = true;
  // Two-pass resample for better quality
  const mid = document.createElement("canvas");
  mid.width = Math.round(img.width * Math.sqrt(scale));
  mid.height = Math.round(img.height * Math.sqrt(scale));
  const mCtx = mid.getContext("2d");
  mCtx.imageSmoothingQuality = "high";
  mCtx.drawImage(img, 0, 0, mid.width, mid.height);
  ctx.drawImage(mid, 0, 0, w, h);
  return _unsharpMask(c, 1.2, 0.85);
}

// 5. Color Pop — vibrance + saturation + S-curve + mild sharpen
async function _colorPopEnhance(img) {
  const { c, ctx } = _canvasFromImage(img);
  const w = c.width, h = c.height;
  _applyPixelOp(ctx, w, h, (r, g, b) => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max ? (max - min) / max : 0;
    // Vibrance: boost more on less-saturated pixels
    const vibBoost = 0.38 * (1 - sat);
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    let nr = r + (r - L) * (0.18 + vibBoost);
    let ng = g + (g - L) * (0.18 + vibBoost);
    let nb = b + (b - L) * (0.18 + vibBoost);
    // Cinematic S-curve contrast
    nr = _sCurve(nr, 0.3);
    ng = _sCurve(ng, 0.3);
    nb = _sCurve(nb, 0.3);
    // Slight warmth shift (add red, reduce blue) - cinematic teal-orange hint
    nr = _clamp(nr + 4);
    nb = _clamp(nb - 3);
    return [_clamp(nr), _clamp(ng), _clamp(nb)];
  });
  return _unsharpMask(c, 1, 0.4);
}

// 6. Lowlight fix — gamma brighten + shadow lift + auto-levels
async function _lowlightEnhance(img) {
  const { c, ctx } = _canvasFromImage(img);
  const w = c.width, h = c.height;
  // Build gamma LUT (gamma < 1 => brighter)
  const gamma = 0.55;
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) lut[i] = _clamp(255 * Math.pow(i / 255, gamma));
  _applyPixelOp(ctx, w, h, (r, g, b) => [lut[r], lut[g], lut[b]]);

  // Slight denoise (low-light adds noise)
  const blur = document.createElement("canvas");
  blur.width = w; blur.height = h;
  const bCtx = blur.getContext("2d");
  bCtx.filter = "blur(0.8px)";
  bCtx.drawImage(c, 0, 0);
  ctx.drawImage(blur, 0, 0);

  // Auto-levels to regain punch
  _autoLevelsOnCanvas(c, 0.003);

  // Saturation bump
  _applyPixelOp(c.getContext("2d"), w, h, (r, g, b) => {
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return [
      _clamp(r + (r - L) * 0.15),
      _clamp(g + (g - L) * 0.15),
      _clamp(b + (b - L) * 0.15),
    ];
  });
  return _unsharpMask(c, 1.5, 0.5);
}

/**
 * Unified client-side enhance dispatcher.
 * Modes: auto | hdr | sharpen | denoise | upscale | color_pop | lowlight
 * All run entirely on the canvas — no network, no API key, instant result.
 */
export async function clientEnhance(imageSrc, mode = "auto") {
  if (mode === "auto") return magicEnhance(imageSrc);
  const img = await loadImage(imageSrc);
  switch (mode) {
    case "hdr":       return _hdrEnhance(img);
    case "sharpen":   return _sharpenEnhance(img);
    case "denoise":   return _denoiseEnhance(img);
    case "upscale":   return _upscaleEnhance(img);
    case "color_pop": return _colorPopEnhance(img);
    case "lowlight":  return _lowlightEnhance(img);
    default:          return magicEnhance(imageSrc);
  }
}
