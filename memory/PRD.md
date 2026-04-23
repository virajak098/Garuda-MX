# Garuda MX — Premium Image Editor

## Original problem statement
User had a working image editor app called "Garuda MX" and asked to fix:
1. Crop — needed resize from all 8 handles (4 corners + 4 sides), not just 4 corners
2. Viewport zoom — must span a wider range (0%–100% verbal, confirmed as 10%–400%)
3. Crop output quality — low→high options (format + quality slider)
4. Background blur — fix it properly; common modern feature
5. Professional brand header — Logo (1:1 JPG) + GARUDA text-logo parallel; Banner (16:9 PNG) in landing
6. Export — must prompt for save location & filename, default name "Garuda MX"

## User choices (verbatim-confirmed)
- Export: browser default + native Save-As prompt with custom filename
- Background blur: both manual-brush and AI auto-detect
- Crop quality: JPEG/PNG/WebP + quality slider 10%–100%
- Zoom: 10%–400% range
- Logo + text-logo parallel in header; banner in landing hero

## What's been implemented (Feb 2026)
- `CropOverlay.jsx` — 8 interactive handles (nw, n, ne, e, se, s, sw, w), aspect-ratio lock, improved visibility (gold squares + edge bars)
- `CropPanel.jsx` — format toggle (PNG lossless / JPG / WebP) + quality slider with Low/Medium/High/Max labels
- `imageUtils.js` — `cropImage(src, rectPct, format, quality)` + new `applyMaskedBlur(img, mask, radius)` for brush blur
- `BlurPanel.jsx` — 3 tabs: Uniform, Background (AI), Manual (brush)
- `Editor.jsx` — zoom slider 10-400%, manual-blur mask overlay, native Save-As export (File System Access API → falls back to filename prompt + download), default export name "Garuda MX"
- `Landing.jsx` — banner used as hero bg + showcase; logo + text-logo in navbar/footer
- `brand.js` — points to local `/brand/logo.jpg`, `/brand/banner.png`, `/brand/text-logo.jpg`; `defaultExportName = "Garuda MX"`
- Brand assets downloaded to `/app/frontend/public/brand/`

## Core requirements (static)
- React SPA + FastAPI + MongoDB
- Gemini Nano Banana for AI edits (pre-existing)
- Browser-native editor — no server-side image processing except AI

## Architecture
- `/app/frontend/src/components/Editor.jsx` — main canvas state/container
- `/app/frontend/src/components/editor/panels/*` — right-side tool panels
- `/app/frontend/src/components/editor/CropOverlay.jsx`, `MaskBrushCanvas.jsx`, `BeforeAfterSlider.jsx` — canvas overlays
- `/app/frontend/src/lib/imageUtils.js` — canvas rendering, export, crop, masked blur

## Verified (testing iteration 1)
- Frontend success rate 100%
- 8-handle crop works interactively (drag resizes overlay)
- Crop format + quality (10-100%) exposed
- Zoom range 10-400%
- 3 blur tabs present, manual brush controls wired
- Brand assets all load, editor + landing show logo + text-logo in parallel
- No console errors on export

## Prioritized backlog
- P1: AI-powered background blur is wired but needs verified Gemini key test run end-to-end
- P2: Wrap editor topbar in semantic `<header>` for a11y
- P2: Add a keyboard shortcut legend (⌘Z, ⌘Y, space to compare)
- P2: Add "Fit to screen" zoom reset button distinct from 100%

## Next tasks list
- Validate AI tools with live Gemini key when user reports ready
- Consider export presets (Instagram 1080, YouTube 1280×720) as one-click shortcuts

## Iteration 2 — Feb 2026
- New text-logo PNG (transparent wordmark) installed at `/brand/text-logo.png`, used in header alongside phoenix logo
- Landing stats row updated: **20+ Pro Tools · AI Garuda MX · ∞ Free · No Watermark**
- **Magic Enhance** — instant client-side one-click enhancement (`magicEnhance()` in imageUtils.js): auto-levels + S-curve contrast + saturation boost + unsharp mask sharpen. No AI key needed, <1s result.
- **AI Deep Enhance** preserved (7 options: auto, hdr, sharpen, denoise, upscale, color_pop, lowlight) — now labelled "AI Garuda MX · Deep Enhance"
- **Reviews system**: `POST /api/reviews` (public create), `GET /api/reviews` (public approved-only list), admin-only `GET/PATCH/DELETE /api/admin/reviews/*`
- **Admin page** at `/admin` with password `GarudaMX2026` (stored in backend `.env` as `ADMIN_PASSWORD`). Pending + approved review management UI.
- Reviews section added to Landing bottom with user form + public list + nav `#reviews` link

## Verified (iteration 2)
- Backend 100% (13/13 pytest tests) — review lifecycle, admin auth, role filtering
- Frontend 100% — landing stats, Reviews form+submit, Admin login+approve+delete, Magic Enhance, Export download (PNG verified with correct filename)
- Admin credentials saved: password = `GarudaMX2026` (also in `/app/memory/test_credentials.md` below)
