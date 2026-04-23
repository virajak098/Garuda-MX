# Garuda MX — Static Edition

Pure vanilla HTML/CSS/JS version of the Garuda MX image editor. No backend needed — everything runs in the browser.

## Files
```
index.html      ← single HTML entry
style.css       ← all styles
script.js       ← all logic (upload, adjust, crop, enhance, layers, export)
brand/
  logo.jpg      ← 1:1 phoenix
  banner.png    ← 16:9 hero
  text-logo.png ← GARUDA wordmark
```

## Features included
- **Upload** via button, drag-drop or file picker
- **Adjust** — brightness, contrast, saturation, hue, blur, sepia, grayscale
- **Filters** — Vivid, Vintage, Noir, Sepia, Cool, Warm + more
- **Crop** — 8 handles (4 corners + 4 sides) · aspect-ratio presets · PNG / JPG / WebP output · quality slider 10-100%
- **Transform** — rotate ±90°, arbitrary rotation, flip H/V
- **Text layers** — add, drag, edit text/size/color/font, bold, shadow
- **Image layers** — add extra images, reorder, resize, hide, delete
- **Enhance** (all client-side, instant, no API):
  - ⚡ Magic Enhance (one-click)
  - HDR · Sharpen · Denoise · Upscale 2× · Color Pop · Low-light Fix
- **Blur** — uniform (whole image) + manual brush (paint areas to blur)
- **Zoom** 10% – 400% with slider + buttons
- **Undo / Redo** with 30-step history
- **Export** — PNG / JPG / WebP · native Save-As (Chrome/Edge) with fallback prompt · default filename "Garuda MX"

## Features NOT included (require backend)
- AI Edit / Face Retouch / Magic Erase / AI background blur (need Gemini)
- Projects save/load (need MongoDB)
- Reviews + Admin panel (need API)

## Deploy to Netlify
### Option 1 — Drag & drop
1. Open https://app.netlify.com/drop
2. Drag the whole `static-version/` folder onto the page
3. Done — you get a live URL

### Option 2 — GitHub + Netlify
1. Push this folder to a GitHub repo
2. On Netlify, click **Add new site → Import an existing project → GitHub**
3. Select the repo, leave **Build command** empty, **Publish directory** = `/` (or the folder name if not root)
4. Click **Deploy**

### Option 3 — Local host
Open a terminal in this folder and run any of these:
```bash
# Python
python3 -m http.server 8000

# Node (if you have http-server)
npx http-server -p 8000

# Or just double-click index.html in your browser
```
Then open http://localhost:8000

## Tested on
Chrome 120+, Edge, Firefox, Safari 17+. Save-As dialog uses File System Access API on Chromium; falls back to a filename prompt + normal download on other browsers.

## Customise
- Replace any file in `brand/` with your own
- Edit `script.js` → `DEFAULT_ADJUST`, `FILTER_PRESETS`, `CROP_RATIOS` to tweak defaults
- Change brand colours in `style.css` → `:root { --gold: ... }`

— built with ♡ for creators who ship.
