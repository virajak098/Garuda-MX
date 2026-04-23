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
