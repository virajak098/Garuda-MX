/* =========================================================================
   Garuda MX — Static Edition (single-file JS)
   ========================================================================= */

/* ---------- Utilities ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const clamp = (v, lo = 0, hi = 255) => Math.max(lo, Math.min(hi, Math.round(v)));

function toast(msg, type = "info") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  $("#toastContainer").appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

/* ---------- State ---------- */
const DEFAULT_ADJUST = { brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0, sepia: 0, grayscale: 0, invert: 0 };
const DEFAULT_TRANSFORM = { rotate: 0, flipH: false, flipV: false };
const FILTER_PRESETS = {
  none:      { ...DEFAULT_ADJUST },
  vivid:     { ...DEFAULT_ADJUST, saturation: 150, contrast: 115 },
  vintage:   { ...DEFAULT_ADJUST, sepia: 40, saturation: 80, contrast: 95 },
  noir:      { ...DEFAULT_ADJUST, grayscale: 100, contrast: 120 },
  grayscale: { ...DEFAULT_ADJUST, grayscale: 100 },
  sepia:     { ...DEFAULT_ADJUST, sepia: 100 },
  invert:    { ...DEFAULT_ADJUST, invert: 100 },
  cool:      { ...DEFAULT_ADJUST, hue: 180, saturation: 110 },
  warm:      { ...DEFAULT_ADJUST, hue: 15, saturation: 120, brightness: 105 },
};
const CROP_RATIOS = [
  { id: "free", label: "Free", ratio: null },
  { id: "1:1",  label: "1:1 Square",   ratio: 1 },
  { id: "4:5",  label: "4:5 Portrait", ratio: 4 / 5 },
  { id: "9:16", label: "9:16 Story",   ratio: 9 / 16 },
  { id: "16:9", label: "16:9 Wide",    ratio: 16 / 9 },
  { id: "3:2",  label: "3:2 Photo",    ratio: 3 / 2 },
  { id: "4:3",  label: "4:3 Classic",  ratio: 4 / 3 },
];

const state = {
  image: null,           // current data URL (post edits)
  originalImage: null,   // first uploaded image
  naturalW: 0, naturalH: 0,
  adjust: { ...DEFAULT_ADJUST },
  transform: { ...DEFAULT_TRANSFORM },
  smoothness: 0,
  overlays: [],          // text overlays { id, kind:'text', text, xPct, yPct, color, size, bold, font, hidden }
  imageLayers: [],       // image layers  { id, kind:'image', src, xPct, yPct, wPct, hPct, hidden, name }
  selectedId: null,
  zoom: 100,
  activeTool: "adjust",
  // Crop
  cropRatio: "free",
  cropRect: { xPct: 10, yPct: 10, wPct: 80, hPct: 80 },
  cropFormat: "png",
  cropQuality: 95,
  // Export
  exportFormat: "png",
  exportQuality: 92,
  // History
  history: [], histIdx: -1, suppressHist: false,
  // Manual blur
  brushBlurMode: false, brushBlurSize: 50, brushBlurStrength: 12, hasBlurMask: false,
  // Compare
  showBefore: false,
};

/* ---------- Screen switching ---------- */
function go(screen) {
  $$("#landing, #editor").forEach(el => el.classList.remove("active"));
  $(`#${screen}`).classList.add("active");
}
$$("[data-go]").forEach(el => el.addEventListener("click", (e) => { e.preventDefault(); go(el.dataset.go); }));

/* ---------- File upload ---------- */
const fileInput = $("#fileInput");
const uploadToolBtn = $("#uploadToolBtn");
$("#chooseImageBtn").addEventListener("click", () => fileInput.click());
uploadToolBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => handleFile(e.target.files?.[0]));
$("#canvasArea").addEventListener("dragover", (e) => e.preventDefault());
$("#canvasArea").addEventListener("drop", (e) => {
  e.preventDefault();
  handleFile(e.dataTransfer.files?.[0]);
});

function handleFile(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) return toast("Please upload an image file.", "error");
  const reader = new FileReader();
  reader.onload = async (e) => {
    const src = e.target.result;
    state.image = src;
    state.originalImage = src;
    state.adjust = { ...DEFAULT_ADJUST };
    state.transform = { ...DEFAULT_TRANSFORM };
    state.overlays = []; state.imageLayers = []; state.selectedId = null;
    state.zoom = 100; state.smoothness = 0;
    state.history = []; state.histIdx = -1;
    const img = await loadImage(src);
    state.naturalW = img.naturalWidth; state.naturalH = img.naturalHeight;
    $("#projectName").value = file.name.replace(/\.[^.]+$/, "") || "Untitled";
    $("#emptyState").classList.add("hidden");
    $("#imageWrapper").classList.remove("hidden");
    $("#zoomBar").classList.remove("hidden");
    renderCanvas(); renderPanel(); renderOverlays(); snapshot();
    toast("Image loaded", "success");
  };
  reader.readAsDataURL(file);
}

/* ---------- Canvas rendering ---------- */
function buildFilterString(a, smoothness = 0) {
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
function buildTransformString(t) {
  return `rotate(${t.rotate}deg) scaleX(${t.flipH ? -1 : 1}) scaleY(${t.flipV ? -1 : 1})`;
}

function renderCanvas() {
  const img = $("#canvasImage");
  const wrapper = $("#imageWrapper");
  if (!state.image) return;
  img.src = state.showBefore && state.originalImage ? state.originalImage : state.image;
  img.style.filter = state.showBefore ? "none" : buildFilterString(state.adjust, state.smoothness);
  img.style.transform = state.showBefore ? "none" : buildTransformString(state.transform);
  wrapper.style.transform = `scale(${state.zoom / 100})`;
  if (state.activeTool === "crop") positionCropOverlay();
}

/* ---------- Overlays (text + image layers) ---------- */
function renderOverlays() {
  const layer = $("#overlaysLayer");
  layer.innerHTML = "";
  // image layers underneath text
  for (const l of state.imageLayers) {
    if (l.hidden) continue;
    const d = document.createElement("div");
    d.className = "image-layer-overlay" + (state.selectedId === l.id ? " selected" : "");
    d.style.left = `${l.xPct}%`; d.style.top = `${l.yPct}%`;
    d.style.width = `${l.wPct}%`; d.style.height = `${l.hPct}%`;
    const im = document.createElement("img"); im.src = l.src; im.draggable = false;
    d.appendChild(im);
    d.addEventListener("mousedown", startDragOverlay(l.id, "image", "move"));
    d.addEventListener("click", (e) => { e.stopPropagation(); state.selectedId = l.id; renderOverlays(); });
    if (state.selectedId === l.id) {
      const rh = document.createElement("div");
      rh.className = "image-layer-resize";
      rh.addEventListener("mousedown", startDragOverlay(l.id, "image", "resize"));
      d.appendChild(rh);
      const del = document.createElement("button");
      del.className = "overlay-delete"; del.textContent = "✕";
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        state.imageLayers = state.imageLayers.filter(x => x.id !== l.id);
        state.selectedId = null; renderOverlays(); snapshot();
      });
      d.appendChild(del);
    }
    layer.appendChild(d);
  }
  // text overlays
  for (const t of state.overlays) {
    if (t.hidden) continue;
    const d = document.createElement("div");
    d.className = "text-overlay" + (state.selectedId === t.id ? " selected" : "");
    d.style.left = `${t.xPct}%`; d.style.top = `${t.yPct}%`;
    d.style.color = t.color || "#fff";
    d.style.fontSize = `${Math.max(12, (t.size || 48) / 3)}px`;
    d.style.fontFamily = t.font || "Space Grotesk, sans-serif";
    d.style.fontWeight = t.bold ? 700 : 400;
    if (t.shadow) d.style.textShadow = "2px 2px 6px rgba(0,0,0,0.7)";
    d.textContent = t.text || "Your text";
    d.addEventListener("mousedown", startDragOverlay(t.id, "text", "move"));
    d.addEventListener("click", (e) => {
      e.stopPropagation(); state.selectedId = t.id; state.activeTool = "text";
      renderPanel(); renderOverlays();
    });
    if (state.selectedId === t.id) {
      const del = document.createElement("button");
      del.className = "overlay-delete"; del.textContent = "✕";
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        state.overlays = state.overlays.filter(x => x.id !== t.id);
        state.selectedId = null; renderOverlays(); renderPanel(); snapshot();
      });
      d.appendChild(del);
    }
    layer.appendChild(d);
  }
}

let dragCtx = null;
function startDragOverlay(id, kind, mode) {
  return (e) => {
    e.stopPropagation(); e.preventDefault();
    state.selectedId = id;
    const rect = $("#canvasImage").getBoundingClientRect();
    dragCtx = { id, kind, mode, startX: e.clientX, startY: e.clientY, rect };
    renderOverlays();
  };
}
window.addEventListener("mousemove", (e) => {
  if (!dragCtx) return;
  const { id, kind, mode, rect } = dragCtx;
  const dx = ((e.clientX - dragCtx.startX) / rect.width) * 100;
  const dy = ((e.clientY - dragCtx.startY) / rect.height) * 100;
  dragCtx.startX = e.clientX; dragCtx.startY = e.clientY;
  if (kind === "text" && mode === "move") {
    const t = state.overlays.find(x => x.id === id); if (!t) return;
    t.xPct = Math.max(0, Math.min(95, t.xPct + dx));
    t.yPct = Math.max(0, Math.min(95, t.yPct + dy));
  } else if (kind === "image") {
    const l = state.imageLayers.find(x => x.id === id); if (!l) return;
    if (mode === "move") {
      l.xPct = Math.max(0, Math.min(100 - l.wPct, l.xPct + dx));
      l.yPct = Math.max(0, Math.min(100 - l.hPct, l.yPct + dy));
    } else if (mode === "resize") {
      l.wPct = Math.max(5, Math.min(100 - l.xPct, l.wPct + dx));
      l.hPct = Math.max(5, Math.min(100 - l.yPct, l.hPct + dy));
    }
  }
  renderOverlays();
});
window.addEventListener("mouseup", () => {
  if (dragCtx) { dragCtx = null; snapshot(); }
});

/* Click canvas background to deselect */
$("#canvasArea").addEventListener("click", () => { state.selectedId = null; renderOverlays(); });

/* ---------- Crop overlay ---------- */
function positionCropOverlay() {
  const img = $("#canvasImage");
  const wrapper = $("#imageWrapper");
  const overlay = $("#cropOverlay");
  if (!img.src || state.activeTool !== "crop") { overlay.classList.add("hidden"); return; }
  overlay.classList.remove("hidden");
  // position relative to wrapper
  const wrect = wrapper.getBoundingClientRect();
  const irect = img.getBoundingClientRect();
  const left = (irect.left - wrect.left) / (state.zoom / 100);
  const top = (irect.top - wrect.top) / (state.zoom / 100);
  const w = irect.width / (state.zoom / 100);
  const h = irect.height / (state.zoom / 100);
  const r = state.cropRect;
  overlay.style.left = `${left + (r.xPct / 100) * w}px`;
  overlay.style.top = `${top + (r.yPct / 100) * h}px`;
  overlay.style.width = `${(r.wPct / 100) * w}px`;
  overlay.style.height = `${(r.hPct / 100) * h}px`;
  $("#cropLabel").textContent = `${Math.round(r.wPct)}% × ${Math.round(r.hPct)}%`;
}

let cropDrag = null;
$("#cropOverlay").addEventListener("mousedown", (e) => {
  if (e.target.classList.contains("handle")) return; // let handle listener handle
  e.stopPropagation();
  cropDrag = { mode: "move", startX: e.clientX, startY: e.clientY, rect: { ...state.cropRect } };
});
$$("#cropOverlay .handle").forEach(h => {
  h.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    cropDrag = { mode: "resize", corner: h.dataset.handle, startX: e.clientX, startY: e.clientY, rect: { ...state.cropRect } };
  });
});
window.addEventListener("mousemove", (e) => {
  if (!cropDrag) return;
  const img = $("#canvasImage").getBoundingClientRect();
  const dx = ((e.clientX - cropDrag.startX) / img.width) * 100;
  const dy = ((e.clientY - cropDrag.startY) / img.height) * 100;
  let r = { ...cropDrag.rect };
  const ratio = CROP_RATIOS.find(x => x.id === state.cropRatio)?.ratio || null;
  if (cropDrag.mode === "move") {
    r.xPct = Math.max(0, Math.min(100 - r.wPct, r.xPct + dx));
    r.yPct = Math.max(0, Math.min(100 - r.hPct, r.yPct + dy));
  } else {
    const c = cropDrag.corner;
    let nx = r.xPct, ny = r.yPct, nw = r.wPct, nh = r.hPct;
    if (c.includes("e")) nw = Math.max(5, Math.min(100 - nx, r.wPct + dx));
    if (c.includes("w")) {
      const newX = Math.max(0, Math.min(r.xPct + r.wPct - 5, r.xPct + dx));
      nw = r.wPct + (r.xPct - newX); nx = newX;
    }
    if (c.includes("s")) nh = Math.max(5, Math.min(100 - ny, r.hPct + dy));
    if (c.includes("n")) {
      const newY = Math.max(0, Math.min(r.yPct + r.hPct - 5, r.yPct + dy));
      nh = r.hPct + (r.yPct - newY); ny = newY;
    }
    if (ratio) {
      const pxW = (nw / 100) * img.width;
      const pxH = pxW / ratio;
      nh = (pxH / img.height) * 100;
      if (c.includes("n")) ny = r.yPct + r.hPct - nh;
      if (ny < 0) { nh += ny; ny = 0; }
      if (ny + nh > 100) nh = 100 - ny;
    }
    r = { xPct: nx, yPct: ny, wPct: nw, hPct: nh };
  }
  state.cropRect = r;
  positionCropOverlay();
});
window.addEventListener("mouseup", () => { cropDrag = null; });

/* ---------- Tool switching ---------- */
$$(".tool[data-tool]").forEach(btn => {
  if (btn.dataset.tool === "upload") return;
  btn.addEventListener("click", () => {
    state.activeTool = btn.dataset.tool;
    $$(".tool").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderPanel();
    positionCropOverlay();
    toggleBlurMask();
  });
});

/* ---------- PANEL rendering (per tool) ---------- */
function renderPanel() {
  const title = {
    adjust: "ADJUST", filters: "FILTERS", crop: "CROP", blur: "BLUR",
    transform: "TRANSFORM", text: "TEXT", layers: "LAYERS", enhance: "ENHANCE",
  }[state.activeTool] || "PANEL";
  $("#panelTitle").textContent = title;
  const body = $("#panelBody");
  body.innerHTML = "";
  if (state.activeTool === "adjust")    renderAdjustPanel(body);
  if (state.activeTool === "filters")   renderFiltersPanel(body);
  if (state.activeTool === "crop")      renderCropPanel(body);
  if (state.activeTool === "blur")      renderBlurPanel(body);
  if (state.activeTool === "transform") renderTransformPanel(body);
  if (state.activeTool === "text")      renderTextPanel(body);
  if (state.activeTool === "layers")    renderLayersPanel(body);
  if (state.activeTool === "enhance")   renderEnhancePanel(body);
}

function sliderRow(label, value, min, max, unit, onChange) {
  const row = document.createElement("div"); row.className = "slider-row";
  row.innerHTML = `<div class="row-between"><span>${label}</span><b>${value}${unit}</b></div>`;
  const input = document.createElement("input");
  input.type = "range"; input.min = min; input.max = max; input.value = value;
  input.addEventListener("input", (e) => {
    const v = Number(e.target.value);
    row.querySelector("b").textContent = `${v}${unit}`;
    onChange(v);
  });
  input.addEventListener("change", () => snapshot());
  row.appendChild(input);
  return row;
}

function renderAdjustPanel(body) {
  const a = state.adjust;
  body.appendChild(sliderRow("Brightness", a.brightness, 0, 200, "%", v => { a.brightness = v; renderCanvas(); }));
  body.appendChild(sliderRow("Contrast",   a.contrast,   0, 200, "%", v => { a.contrast = v;   renderCanvas(); }));
  body.appendChild(sliderRow("Saturation", a.saturation, 0, 200, "%", v => { a.saturation = v; renderCanvas(); }));
  body.appendChild(sliderRow("Hue",        a.hue,     -180, 180, "°", v => { a.hue = v;        renderCanvas(); }));
  body.appendChild(sliderRow("Blur",       a.blur,       0, 100, "%", v => { a.blur = v;       renderCanvas(); }));
  body.appendChild(sliderRow("Sepia",      a.sepia,      0, 100, "%", v => { a.sepia = v;      renderCanvas(); }));
  body.appendChild(sliderRow("Grayscale",  a.grayscale,  0, 100, "%", v => { a.grayscale = v;  renderCanvas(); }));
}

function renderFiltersPanel(body) {
  const grid = document.createElement("div"); grid.className = "grid-2";
  Object.keys(FILTER_PRESETS).forEach(name => {
    const b = document.createElement("button");
    b.className = "preset-btn"; b.textContent = name;
    b.addEventListener("click", () => {
      state.adjust = { ...FILTER_PRESETS[name] };
      renderCanvas(); renderPanel(); snapshot();
      toast(`Filter: ${name}`, "success");
    });
    grid.appendChild(b);
  });
  body.appendChild(grid);
}

function renderCropPanel(body) {
  const p = document.createElement("p");
  p.style.fontSize = "11px"; p.style.color = "var(--text-2)"; p.style.lineHeight = "1.5"; p.style.marginBottom = "14px";
  p.textContent = "Drag corners or sides. Pick aspect ratio, output format and quality — then Apply.";
  body.appendChild(p);

  // ratio grid
  const head1 = document.createElement("div"); head1.className = "panel-head"; head1.style.padding = "0 0 8px"; head1.style.border = "none"; head1.textContent = "Aspect ratio";
  body.appendChild(head1);
  const grid = document.createElement("div"); grid.className = "grid-2"; grid.style.marginBottom = "16px";
  CROP_RATIOS.forEach(r => {
    const b = document.createElement("button");
    b.className = "chip-btn" + (state.cropRatio === r.id ? " active" : "");
    b.textContent = r.label;
    b.addEventListener("click", () => { state.cropRatio = r.id; renderPanel(); });
    grid.appendChild(b);
  });
  body.appendChild(grid);

  // format
  const head2 = document.createElement("div"); head2.className = "panel-head"; head2.style.padding = "0 0 8px"; head2.style.border = "none"; head2.textContent = "Output format";
  body.appendChild(head2);
  const fmtRow = document.createElement("div"); fmtRow.className = "fmt-row";
  ["png","jpg","webp"].forEach(f => {
    const b = document.createElement("button");
    b.className = "fmt-btn" + (state.cropFormat === f ? " active" : "");
    b.textContent = f.toUpperCase();
    b.addEventListener("click", () => { state.cropFormat = f; renderPanel(); });
    fmtRow.appendChild(b);
  });
  body.appendChild(fmtRow);

  if (state.cropFormat !== "png") {
    const q = state.cropQuality;
    const label = q < 40 ? "Low" : q < 75 ? "Medium" : q < 92 ? "High" : "Max";
    const qrow = sliderRow("Quality", q, 10, 100, `% — ${label}`, v => { state.cropQuality = v; renderPanel(); });
    body.appendChild(qrow);
  }

  const actions = document.createElement("div");
  actions.style.display = "flex"; actions.style.gap = "6px"; actions.style.marginTop = "12px";
  const cancel = document.createElement("button"); cancel.className = "btn-grey"; cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => { state.activeTool = "adjust"; $$(".tool").forEach(b => b.classList.toggle("active", b.dataset.tool === "adjust")); renderPanel(); positionCropOverlay(); });
  const apply = document.createElement("button"); apply.className = "btn-gold-sm"; apply.textContent = "✓ Apply Crop";
  apply.addEventListener("click", applyCrop);
  actions.append(cancel, apply); body.appendChild(actions);
}

function renderTransformPanel(body) {
  const grid = document.createElement("div"); grid.className = "grid-2"; grid.style.marginBottom = "16px";
  const t = state.transform;
  const mk = (label, onClick, active) => {
    const b = document.createElement("button"); b.className = "btn-block" + (active ? " active" : ""); b.textContent = label;
    b.addEventListener("click", () => { onClick(); renderCanvas(); renderPanel(); snapshot(); });
    return b;
  };
  grid.append(
    mk("↶ Rotate -90°", () => t.rotate = (t.rotate - 90 + 360) % 360),
    mk("↷ Rotate +90°", () => t.rotate = (t.rotate + 90) % 360),
    mk("⇆ Flip H", () => t.flipH = !t.flipH, t.flipH),
    mk("⇅ Flip V", () => t.flipV = !t.flipV, t.flipV),
  );
  body.appendChild(grid);
  body.appendChild(sliderRow("Rotation", t.rotate, 0, 359, "°", v => { t.rotate = v; renderCanvas(); }));
}

function renderTextPanel(body) {
  const addBtn = document.createElement("button");
  addBtn.className = "btn-gold-sm"; addBtn.textContent = "+ Add Text Layer";
  addBtn.addEventListener("click", () => {
    const id = Date.now();
    state.overlays.push({ id, kind: "text", text: "Your text", xPct: 30, yPct: 40, color: "#ffffff", size: 54, bold: true, font: "Space Grotesk, sans-serif", shadow: true, hidden: false });
    state.selectedId = id; renderOverlays(); renderPanel(); snapshot();
  });
  body.appendChild(addBtn);

  const sel = state.overlays.find(x => x.id === state.selectedId);
  if (!sel) {
    const hint = document.createElement("p");
    hint.style.cssText = "font-size:11px;color:var(--text-3);margin-top:12px;line-height:1.5";
    hint.textContent = "Click an existing text on canvas to edit it, or add a new one.";
    body.appendChild(hint);
    return;
  }
  const mkField = (label, input) => {
    const f = document.createElement("div"); f.className = "text-field";
    const l = document.createElement("label"); l.textContent = label; f.appendChild(l); f.appendChild(input); return f;
  };
  const textInput = document.createElement("input"); textInput.type = "text"; textInput.value = sel.text;
  textInput.addEventListener("input", (e) => { sel.text = e.target.value; renderOverlays(); });
  textInput.addEventListener("blur", snapshot);
  body.appendChild(mkField("Text", textInput));

  body.appendChild(sliderRow("Size", sel.size || 54, 12, 200, "px", v => { sel.size = v; renderOverlays(); }));

  const colorInput = document.createElement("input"); colorInput.type = "color"; colorInput.value = sel.color;
  colorInput.addEventListener("input", (e) => { sel.color = e.target.value; renderOverlays(); });
  body.appendChild(mkField("Color", colorInput));

  const fontSelect = document.createElement("select");
  ["Space Grotesk, sans-serif", "Georgia, serif", "Impact, sans-serif", "Courier New, monospace", "Arial, sans-serif"].forEach(f => {
    const o = document.createElement("option"); o.value = f; o.textContent = f.split(",")[0]; if (f === sel.font) o.selected = true;
    fontSelect.appendChild(o);
  });
  fontSelect.addEventListener("change", (e) => { sel.font = e.target.value; renderOverlays(); snapshot(); });
  body.appendChild(mkField("Font", fontSelect));

  const row = document.createElement("div"); row.className = "grid-2"; row.style.marginBottom = "12px";
  const boldBtn = document.createElement("button"); boldBtn.className = "btn-block" + (sel.bold ? " active" : ""); boldBtn.textContent = "B Bold";
  boldBtn.addEventListener("click", () => { sel.bold = !sel.bold; renderOverlays(); renderPanel(); snapshot(); });
  const shadowBtn = document.createElement("button"); shadowBtn.className = "btn-block" + (sel.shadow ? " active" : ""); shadowBtn.textContent = "◐ Shadow";
  shadowBtn.addEventListener("click", () => { sel.shadow = !sel.shadow; renderOverlays(); renderPanel(); snapshot(); });
  row.append(boldBtn, shadowBtn); body.appendChild(row);
}

function renderLayersPanel(body) {
  const add = document.createElement("button"); add.className = "btn-gold-sm"; add.style.marginBottom = "12px"; add.textContent = "+ Add Image Layer";
  add.addEventListener("click", () => {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
    inp.addEventListener("change", (e) => {
      const f = e.target.files?.[0]; if (!f) return;
      const r = new FileReader();
      r.onload = (ev) => {
        const id = Date.now();
        state.imageLayers.push({ id, kind: "image", src: ev.target.result, xPct: 20, yPct: 20, wPct: 40, hPct: 40, hidden: false, name: f.name.slice(0, 24) });
        state.selectedId = id; renderOverlays(); renderPanel(); snapshot();
        toast("Image layer added", "success");
      };
      r.readAsDataURL(f);
    });
    inp.click();
  });
  body.appendChild(add);

  const combined = [...state.imageLayers.map(l => ({ ...l })), ...state.overlays.map(l => ({ ...l }))];
  if (combined.length === 0) {
    const empty = document.createElement("p"); empty.style.cssText = "text-align:center;color:var(--text-3);font-size:12px;padding:24px 0"; empty.textContent = "No layers yet.";
    body.appendChild(empty); return;
  }
  // topmost first (reverse)
  combined.reverse().forEach(l => {
    const row = document.createElement("div"); row.className = "layer-item";
    if (l.kind === "image") {
      const im = document.createElement("img"); im.src = l.src; row.appendChild(im);
    } else {
      const ic = document.createElement("span"); ic.textContent = "T"; ic.style.cssText = "width:28px;height:28px;display:flex;align-items:center;justify-content:center;background:var(--gold-muted);color:var(--gold);border-radius:2px;font-weight:700"; row.appendChild(ic);
    }
    const name = document.createElement("div"); name.className = "layer-name"; name.textContent = l.name || l.text || (l.kind === "image" ? "Image" : "Text");
    row.appendChild(name);

    const up = document.createElement("button"); up.className = "layer-btn"; up.textContent = "↑";
    up.addEventListener("click", () => moveLayer(l.id, +1));
    const down = document.createElement("button"); down.className = "layer-btn"; down.textContent = "↓";
    down.addEventListener("click", () => moveLayer(l.id, -1));
    const vis = document.createElement("button"); vis.className = "layer-btn"; vis.textContent = l.hidden ? "⊘" : "◉";
    vis.addEventListener("click", () => toggleLayer(l.id));
    const del = document.createElement("button"); del.className = "layer-btn danger"; del.textContent = "✕";
    del.addEventListener("click", () => removeLayer(l.id));
    row.append(up, down, vis, del);
    body.appendChild(row);
  });
}
function moveLayer(id, dir) {
  // Treat imageLayers+overlays as a single stack with imageLayers BELOW text overlays
  const all = [...state.imageLayers, ...state.overlays];
  const idx = all.findIndex(x => x.id === id);
  const ni = idx + dir;
  if (ni < 0 || ni >= all.length) return;
  [all[idx], all[ni]] = [all[ni], all[idx]];
  state.imageLayers = all.filter(x => x.kind === "image");
  state.overlays = all.filter(x => x.kind !== "image");
  renderOverlays(); renderPanel(); snapshot();
}
function toggleLayer(id) {
  const a = state.imageLayers.find(x => x.id === id) || state.overlays.find(x => x.id === id);
  if (a) { a.hidden = !a.hidden; renderOverlays(); renderPanel(); snapshot(); }
}
function removeLayer(id) {
  state.imageLayers = state.imageLayers.filter(x => x.id !== id);
  state.overlays = state.overlays.filter(x => x.id !== id);
  if (state.selectedId === id) state.selectedId = null;
  renderOverlays(); renderPanel(); snapshot();
}

function renderEnhancePanel(body) {
  const magic = document.createElement("button");
  magic.className = "enhance-hero"; magic.innerHTML = "⚡ Magic Enhance — One Click";
  magic.addEventListener("click", () => runEnhance("auto", true));
  body.appendChild(magic);
  const hint = document.createElement("p");
  hint.style.cssText = "font-size:10px;color:var(--text-3);text-align:center;margin:8px 0 16px;line-height:1.5";
  hint.textContent = "Instant · auto-levels · contrast · sharpen · saturation";
  body.appendChild(hint);

  const sectionHead = document.createElement("div");
  sectionHead.style.cssText = "font-family:var(--font-mono);font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--text-2);padding-top:14px;border-top:1px solid var(--border);margin-bottom:10px";
  sectionHead.textContent = "✦ Pro Enhancements";
  body.appendChild(sectionHead);

  const opts = [
    { id: "hdr",       label: "HDR",            desc: "Recover shadow/highlight detail" },
    { id: "sharpen",   label: "Sharpen",        desc: "Crisp detail, clean edges" },
    { id: "denoise",   label: "Denoise",        desc: "Remove grain, preserve texture" },
    { id: "upscale",   label: "Upscale 2×",     desc: "Super-resolution resample" },
    { id: "color_pop", label: "Color Pop",      desc: "Cinematic vibrant grade" },
    { id: "lowlight",  label: "Low-light Fix",  desc: "Fix dark / night photos" },
  ];
  opts.forEach(o => {
    const b = document.createElement("button"); b.className = "enhance-opt";
    b.innerHTML = `<span class="icon">✦</span><span class="info"><b>${o.label}</b><span>${o.desc}</span></span>`;
    b.addEventListener("click", () => runEnhance(o.id));
    body.appendChild(b);
  });
}

function renderBlurPanel(body) {
  const tabs = document.createElement("div"); tabs.className = "tabs";
  ["uniform","manual"].forEach(t => {
    const b = document.createElement("button");
    b.className = "tab" + ((state.brushBlurMode && t === "manual") || (!state.brushBlurMode && t === "uniform") ? " active" : "");
    b.textContent = t;
    b.addEventListener("click", () => { state.brushBlurMode = (t === "manual"); renderPanel(); toggleBlurMask(); });
    tabs.appendChild(b);
  });
  body.appendChild(tabs);

  if (!state.brushBlurMode) {
    const p = document.createElement("p"); p.style.cssText = "font-size:11px;color:var(--text-2);line-height:1.5;margin-bottom:10px";
    p.textContent = "Uniform CSS blur over whole image. Smoothness softens grain.";
    body.appendChild(p);
    body.appendChild(sliderRow("Blur", state.adjust.blur, 0, 100, "%", v => { state.adjust.blur = v; renderCanvas(); }));
    body.appendChild(sliderRow("Smoothness", state.smoothness, 0, 100, "%", v => { state.smoothness = v; renderCanvas(); }));
    const reset = document.createElement("button"); reset.className = "btn-grey"; reset.textContent = "Reset";
    reset.addEventListener("click", () => { state.adjust.blur = 0; state.smoothness = 0; renderCanvas(); renderPanel(); snapshot(); });
    body.appendChild(reset);
  } else {
    const p = document.createElement("p"); p.style.cssText = "font-size:11px;color:var(--text-2);line-height:1.5;margin-bottom:10px";
    p.textContent = "Paint on canvas to mark areas, then Apply. Useful for privacy, selective bokeh or softening.";
    body.appendChild(p);
    body.appendChild(sliderRow("Brush size", state.brushBlurSize, 5, 200, "px", v => state.brushBlurSize = v));
    body.appendChild(sliderRow("Strength",   state.brushBlurStrength, 1, 40, "px", v => state.brushBlurStrength = v));
    const row = document.createElement("div"); row.className = "grid-2"; row.style.marginTop = "10px";
    const clear = document.createElement("button"); clear.className = "btn-grey"; clear.textContent = "Clear";
    clear.addEventListener("click", clearBlurMask);
    const apply = document.createElement("button"); apply.className = "btn-gold-sm"; apply.textContent = "Apply Blur";
    apply.addEventListener("click", applyManualBlur);
    row.append(clear, apply); body.appendChild(row);
  }
}

/* ---------- Enhance algorithms (client-side) ---------- */
function applyPixelOp(ctx, w, h, fn) {
  const d = ctx.getImageData(0, 0, w, h); const p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const o = fn(p[i], p[i+1], p[i+2]);
    p[i] = o[0]; p[i+1] = o[1]; p[i+2] = o[2];
  }
  ctx.putImageData(d, 0, 0);
}
function unsharpMask(c, radius = 2, amount = 0.6) {
  const w = c.width, h = c.height;
  const bl = document.createElement("canvas"); bl.width = w; bl.height = h;
  const bCtx = bl.getContext("2d"); bCtx.filter = `blur(${radius}px)`; bCtx.drawImage(c, 0, 0);
  const ctx = c.getContext("2d");
  const s = ctx.getImageData(0, 0, w, h), b = bCtx.getImageData(0, 0, w, h).data, d = s.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i]   = clamp(d[i]   + (d[i]   - b[i])   * amount);
    d[i+1] = clamp(d[i+1] + (d[i+1] - b[i+1]) * amount);
    d[i+2] = clamp(d[i+2] + (d[i+2] - b[i+2]) * amount);
  }
  ctx.putImageData(s, 0, 0);
  return c.toDataURL("image/png");
}
function sCurve(v, k = 0.25) {
  const x = v / 255, y = 0.5 + (x - 0.5) * (1 + k * (1 - 4 * (x - 0.5) * (x - 0.5)));
  return clamp(y * 255);
}
function autoLevels(c, cutoff = 0.005) {
  const ctx = c.getContext("2d"); const w = c.width, h = c.height;
  const d = ctx.getImageData(0, 0, w, h); const p = d.data; const n = p.length / 4;
  const hR = new Uint32Array(256), hG = new Uint32Array(256), hB = new Uint32Array(256);
  for (let i = 0; i < p.length; i += 4) { hR[p[i]]++; hG[p[i+1]]++; hB[p[i+2]]++; }
  const pct = (h, t) => { let s = 0; for (let v = 0; v < 256; v++) { s += h[v]; if (s >= t) return v; } return 255; };
  const lo = Math.floor(n * cutoff), hi = Math.floor(n * (1 - cutoff));
  const rL = pct(hR, lo), rH = pct(hR, hi), gL = pct(hG, lo), gH = pct(hG, hi), bL = pct(hB, lo), bH = pct(hB, hi);
  const s = (v, L, H) => H <= L ? v : clamp((v - L) / (H - L) * 255);
  for (let i = 0; i < p.length; i += 4) { p[i] = s(p[i], rL, rH); p[i+1] = s(p[i+1], gL, gH); p[i+2] = s(p[i+2], bL, bH); }
  ctx.putImageData(d, 0, 0);
}
function canvasFromImage(img, sw = null, sh = null) {
  const w = sw || img.width, h = sh || img.height;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d"); ctx.imageSmoothingQuality = "high"; ctx.drawImage(img, 0, 0, w, h);
  return { c, ctx };
}

async function enhance_auto(src) {
  const img = await loadImage(src);
  const { c, ctx } = canvasFromImage(img);
  autoLevels(c, 0.005);
  applyPixelOp(ctx, c.width, c.height, (r, g, b) => {
    let nr = sCurve(r), ng = sCurve(g), nb = sCurve(b);
    const L = 0.2126*nr + 0.7152*ng + 0.0722*nb;
    nr = clamp(nr + (nr - L) * 0.18); ng = clamp(ng + (ng - L) * 0.18); nb = clamp(nb + (nb - L) * 0.18);
    return [nr, ng, nb];
  });
  return unsharpMask(c, 2, 0.6);
}
async function enhance_hdr(src) {
  const img = await loadImage(src);
  const { c, ctx } = canvasFromImage(img);
  applyPixelOp(ctx, c.width, c.height, (r, g, b) => {
    const L = 0.2126*r + 0.7152*g + 0.0722*b;
    if (L < 1) return [r, g, b];
    const Ln = L / 255, Lm = (Ln * (1 + Ln / 0.7)) / (1 + Ln);
    const gain = (Lm * 255) / L;
    let nr = r * gain, ng = g * gain, nb = b * gain;
    const nL = 0.2126*nr + 0.7152*ng + 0.0722*nb;
    nr += (nr - nL) * 0.22; ng += (ng - nL) * 0.22; nb += (nb - nL) * 0.22;
    return [clamp(nr), clamp(ng), clamp(nb)];
  });
  return unsharpMask(c, 6, 0.55);
}
async function enhance_sharpen(src) {
  const img = await loadImage(src); const { c } = canvasFromImage(img);
  return unsharpMask(c, 1.2, 1.3);
}
async function enhance_denoise(src) {
  const img = await loadImage(src); const { c, ctx } = canvasFromImage(img);
  const bl = document.createElement("canvas"); bl.width = c.width; bl.height = c.height;
  bl.getContext("2d").filter = "blur(1.2px)"; bl.getContext("2d").drawImage(c, 0, 0);
  ctx.clearRect(0, 0, c.width, c.height); ctx.drawImage(bl, 0, 0);
  return unsharpMask(c, 1.5, 0.5);
}
async function enhance_upscale(src) {
  const img = await loadImage(src);
  const MAX = 6000; let scale = 2;
  if (img.width * 2 > MAX || img.height * 2 > MAX) scale = Math.min(MAX / img.width, MAX / img.height);
  const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d"); ctx.imageSmoothingQuality = "high";
  // two-pass
  const mid = document.createElement("canvas"); mid.width = Math.round(img.width * Math.sqrt(scale)); mid.height = Math.round(img.height * Math.sqrt(scale));
  const mCtx = mid.getContext("2d"); mCtx.imageSmoothingQuality = "high"; mCtx.drawImage(img, 0, 0, mid.width, mid.height);
  ctx.drawImage(mid, 0, 0, w, h);
  return unsharpMask(c, 1.2, 0.85);
}
async function enhance_color_pop(src) {
  const img = await loadImage(src); const { c, ctx } = canvasFromImage(img);
  applyPixelOp(ctx, c.width, c.height, (r, g, b) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const sat = mx ? (mx - mn) / mx : 0;
    const vib = 0.38 * (1 - sat);
    const L = 0.2126*r + 0.7152*g + 0.0722*b;
    let nr = r + (r - L) * (0.18 + vib), ng = g + (g - L) * (0.18 + vib), nb = b + (b - L) * (0.18 + vib);
    nr = sCurve(nr, 0.3); ng = sCurve(ng, 0.3); nb = sCurve(nb, 0.3);
    nr = clamp(nr + 4); nb = clamp(nb - 3);
    return [clamp(nr), clamp(ng), clamp(nb)];
  });
  return unsharpMask(c, 1, 0.4);
}
async function enhance_lowlight(src) {
  const img = await loadImage(src); const { c, ctx } = canvasFromImage(img);
  const lut = new Uint8Array(256); const gamma = 0.55;
  for (let i = 0; i < 256; i++) lut[i] = clamp(255 * Math.pow(i/255, gamma));
  applyPixelOp(ctx, c.width, c.height, (r, g, b) => [lut[r], lut[g], lut[b]]);
  const bl = document.createElement("canvas"); bl.width = c.width; bl.height = c.height;
  bl.getContext("2d").filter = "blur(0.8px)"; bl.getContext("2d").drawImage(c, 0, 0);
  ctx.drawImage(bl, 0, 0);
  autoLevels(c, 0.003);
  applyPixelOp(c.getContext("2d"), c.width, c.height, (r, g, b) => {
    const L = 0.2126*r + 0.7152*g + 0.0722*b;
    return [clamp(r + (r - L) * 0.15), clamp(g + (g - L) * 0.15), clamp(b + (b - L) * 0.15)];
  });
  return unsharpMask(c, 1.5, 0.5);
}

async function runEnhance(mode, isMagic = false) {
  if (!state.image) return toast("Upload an image first", "error");
  $("#loadingOverlay").classList.remove("hidden");
  $(".loading-label").textContent = isMagic ? "Magic enhancing…" : "Processing…";
  try {
    await new Promise(r => setTimeout(r, 30));
    let result;
    switch (mode) {
      case "auto":      result = await enhance_auto(state.image); break;
      case "hdr":       result = await enhance_hdr(state.image); break;
      case "sharpen":   result = await enhance_sharpen(state.image); break;
      case "denoise":   result = await enhance_denoise(state.image); break;
      case "upscale":   result = await enhance_upscale(state.image); break;
      case "color_pop": result = await enhance_color_pop(state.image); break;
      case "lowlight":  result = await enhance_lowlight(state.image); break;
      default:          result = await enhance_auto(state.image);
    }
    state.image = result;
    state.adjust = { ...DEFAULT_ADJUST };
    state.transform = { ...DEFAULT_TRANSFORM };
    state.smoothness = 0;
    renderCanvas(); renderPanel(); snapshot();
    const labels = { auto: "Auto-enhanced", hdr: "HDR applied", sharpen: "Sharpened", denoise: "Denoised", upscale: "Upscaled 2×", color_pop: "Color pop applied", lowlight: "Low-light fixed" };
    toast(labels[mode] || "Enhanced", "success");
  } catch (e) {
    toast("Enhance failed: " + e.message, "error");
  } finally {
    $("#loadingOverlay").classList.add("hidden");
  }
}

/* ---------- Manual blur brush ---------- */
function toggleBlurMask() {
  const c = $("#blurMaskCanvas");
  if (state.activeTool === "blur" && state.brushBlurMode && state.image) {
    c.classList.remove("hidden");
    resizeMaskCanvas();
  } else c.classList.add("hidden");
}
function resizeMaskCanvas() {
  const c = $("#blurMaskCanvas");
  const img = $("#canvasImage");
  const wrapper = $("#imageWrapper");
  const wRect = wrapper.getBoundingClientRect();
  const iRect = img.getBoundingClientRect();
  c.style.left = `${(iRect.left - wRect.left) / (state.zoom / 100)}px`;
  c.style.top = `${(iRect.top - wRect.top) / (state.zoom / 100)}px`;
  c.style.width = `${iRect.width / (state.zoom / 100)}px`;
  c.style.height = `${iRect.height / (state.zoom / 100)}px`;
  if (c.width !== state.naturalW) { c.width = state.naturalW; c.height = state.naturalH; }
}
let blurPainting = false, lastMask = null;
$("#blurMaskCanvas").addEventListener("mousedown", (e) => {
  if (!state.brushBlurMode) return;
  blurPainting = true; lastMask = null; paintMask(e);
});
$("#blurMaskCanvas").addEventListener("mousemove", (e) => { if (blurPainting) paintMask(e); });
window.addEventListener("mouseup", () => { blurPainting = false; lastMask = null; });
function paintMask(e) {
  const c = $("#blurMaskCanvas");
  const rect = c.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * c.width;
  const y = (e.clientY - rect.top) / rect.height * c.height;
  const ctx = c.getContext("2d");
  const size = state.brushBlurSize * (c.width / rect.width);
  ctx.fillStyle = "rgba(255,0,255,0.65)"; ctx.strokeStyle = "rgba(255,0,255,0.65)";
  ctx.lineWidth = size; ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (lastMask) {
    ctx.beginPath(); ctx.moveTo(lastMask.x, lastMask.y); ctx.lineTo(x, y); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(x, y, size/2, 0, Math.PI*2); ctx.fill();
  }
  lastMask = { x, y }; state.hasBlurMask = true;
}
function clearBlurMask() {
  const c = $("#blurMaskCanvas");
  c.getContext("2d").clearRect(0, 0, c.width, c.height);
  state.hasBlurMask = false;
}
async function applyManualBlur() {
  if (!state.hasBlurMask) return toast("Paint areas to blur first", "error");
  $("#loadingOverlay").classList.remove("hidden");
  try {
    const maskCanvas = $("#blurMaskCanvas");
    const mask = new Image(); mask.src = maskCanvas.toDataURL("image/png");
    await new Promise(r => mask.onload = r);
    const img = await loadImage(state.image);
    const w = img.width, h = img.height;
    // blurred copy
    const blr = document.createElement("canvas"); blr.width = w; blr.height = h;
    const bCtx = blr.getContext("2d"); bCtx.filter = `blur(${state.brushBlurStrength}px)`; bCtx.drawImage(img, 0, 0);
    // mask at native size
    const mc = document.createElement("canvas"); mc.width = w; mc.height = h;
    mc.getContext("2d").drawImage(mask, 0, 0, w, h);
    // tmp: blurred masked
    const tmp = document.createElement("canvas"); tmp.width = w; tmp.height = h;
    const tCtx = tmp.getContext("2d"); tCtx.drawImage(blr, 0, 0);
    tCtx.globalCompositeOperation = "destination-in"; tCtx.drawImage(mc, 0, 0);
    // out: original + blurred-masked on top
    const out = document.createElement("canvas"); out.width = w; out.height = h;
    const oCtx = out.getContext("2d"); oCtx.drawImage(img, 0, 0); oCtx.drawImage(tmp, 0, 0);
    state.image = out.toDataURL("image/png");
    clearBlurMask();
    renderCanvas(); snapshot();
    toast("Blur applied", "success");
  } catch (e) { toast("Blur failed", "error"); }
  finally { $("#loadingOverlay").classList.add("hidden"); }
}

/* ---------- Crop apply ---------- */
async function applyCrop() {
  if (!state.image) return;
  try {
    // Flatten current filter + transform first
    const flattened = await renderFlattenedCanvas();
    const cropped = await cropImage(flattened.toDataURL("image/png"), state.cropRect, state.cropFormat, state.cropQuality / 100);
    state.image = cropped;
    state.adjust = { ...DEFAULT_ADJUST }; state.transform = { ...DEFAULT_TRANSFORM };
    state.overlays = []; state.imageLayers = []; state.selectedId = null;
    state.activeTool = "adjust";
    $$(".tool").forEach(b => b.classList.toggle("active", b.dataset.tool === "adjust"));
    const img = await loadImage(state.image);
    state.naturalW = img.width; state.naturalH = img.height;
    renderCanvas(); renderPanel(); renderOverlays(); snapshot();
    positionCropOverlay();
    toast(`Cropped · ${state.cropFormat.toUpperCase()} ${state.cropFormat === "png" ? "lossless" : state.cropQuality + "%"}`, "success");
  } catch (e) { toast("Crop failed", "error"); }
}
async function cropImage(src, rect, format, quality) {
  const img = await loadImage(src);
  const sx = Math.max(0, Math.round((rect.xPct / 100) * img.width));
  const sy = Math.max(0, Math.round((rect.yPct / 100) * img.height));
  const sw = Math.min(img.width - sx, Math.round((rect.wPct / 100) * img.width));
  const sh = Math.min(img.height - sy, Math.round((rect.hPct / 100) * img.height));
  const c = document.createElement("canvas"); c.width = sw; c.height = sh;
  const ctx = c.getContext("2d"); ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  const mime = format === "jpg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
  return c.toDataURL(mime, quality);
}

/* ---------- Render flattened (with filters+transform+overlays) ---------- */
async function renderFlattenedCanvas() {
  const img = await loadImage(state.image);
  const { rotate = 0, flipH = false, flipV = false } = state.transform;
  const rad = rotate * Math.PI / 180;
  const cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad));
  const w = img.width, h = img.height;
  const outW = Math.round(w * cos + h * sin), outH = Math.round(w * sin + h * cos);
  const c = document.createElement("canvas"); c.width = outW; c.height = outH;
  const ctx = c.getContext("2d"); ctx.imageSmoothingQuality = "high";
  ctx.filter = buildFilterString(state.adjust, state.smoothness);
  ctx.translate(outW/2, outH/2); ctx.rotate(rad); ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(img, -w/2, -h/2, w, h);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = "none";
  // image layers
  for (const l of state.imageLayers) {
    if (l.hidden) continue;
    try {
      const li = await loadImage(l.src);
      ctx.drawImage(li, (l.xPct/100)*outW, (l.yPct/100)*outH, (l.wPct/100)*outW, (l.hPct/100)*outH);
    } catch {}
  }
  // text
  for (const t of state.overlays) {
    if (t.hidden) continue;
    ctx.font = `${t.bold ? "bold " : ""}${t.size || 48}px ${t.font || 'Space Grotesk, sans-serif'}`;
    ctx.textBaseline = "top"; ctx.fillStyle = t.color || "#fff";
    if (t.shadow) { ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 4; ctx.shadowBlur = 8; }
    ctx.fillText(t.text, (t.xPct/100)*outW, (t.yPct/100)*outH);
    ctx.shadowColor = "transparent";
  }
  return c;
}

/* ---------- Export ---------- */
$("#exportBtn").addEventListener("click", exportImage);
async function exportImage() {
  if (!state.image) return toast("Nothing to export", "error");
  try {
    const canvas = await renderFlattenedCanvas();
    const mime = state.exportFormat === "jpg" ? "image/jpeg" : state.exportFormat === "webp" ? "image/webp" : "image/png";
    const dataUrl = canvas.toDataURL(mime, state.exportQuality / 100);
    const defaultName = ($("#projectName").value && $("#projectName").value !== "Untitled") ? $("#projectName").value : "Garuda MX";
    const ext = state.exportFormat === "jpg" ? "jpg" : state.exportFormat;
    const blob = await (await fetch(dataUrl)).blob();
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: `${defaultName}.${ext}`,
          types: [{ description: `${state.exportFormat.toUpperCase()} image`, accept: { [mime]: [`.${ext}`] } }],
        });
        const w = await handle.createWritable(); await w.write(blob); await w.close();
        toast("Exported", "success"); return;
      } catch (e) { if (e.name === "AbortError") return; }
    }
    const name = window.prompt("Save image as:", `${defaultName}.${ext}`);
    if (!name) return;
    const a = document.createElement("a");
    a.href = dataUrl; a.download = name.endsWith(`.${ext}`) ? name : `${name}.${ext}`;
    document.body.appendChild(a); a.click(); a.remove();
    toast("Exported", "success");
  } catch (e) { toast("Export failed", "error"); }
}

/* Export footer controls */
$$(".fmt-btn").forEach(b => {
  b.addEventListener("click", () => {
    state.exportFormat = b.dataset.fmt;
    $$(".fmt-btn").forEach(x => x.classList.toggle("active", x.dataset.fmt === state.exportFormat));
    $("#qualityRow").classList.toggle("hidden", state.exportFormat === "png");
  });
});
$("#qualitySlider").addEventListener("input", (e) => {
  state.exportQuality = Number(e.target.value);
  $("#qualityVal").textContent = `${state.exportQuality}%`;
});

/* ---------- Zoom ---------- */
$("#zoomSlider").addEventListener("input", (e) => { state.zoom = Number(e.target.value); $("#zoomReset").textContent = `${state.zoom}%`; renderCanvas(); positionCropOverlay(); });
$("#zoomIn").addEventListener("click",  () => { state.zoom = Math.min(400, state.zoom + 10); syncZoom(); });
$("#zoomOut").addEventListener("click", () => { state.zoom = Math.max(10,  state.zoom - 10); syncZoom(); });
$("#zoomReset").addEventListener("click", () => { state.zoom = 100; syncZoom(); });
function syncZoom() {
  $("#zoomSlider").value = state.zoom; $("#zoomReset").textContent = `${state.zoom}%`;
  renderCanvas(); positionCropOverlay();
}

/* ---------- Compare (hold) ---------- */
const compareBtn = $("#compareBtn");
compareBtn.addEventListener("mousedown", () => { state.showBefore = true; renderCanvas(); });
["mouseup","mouseleave"].forEach(ev => compareBtn.addEventListener(ev, () => { state.showBefore = false; renderCanvas(); }));

/* ---------- History (undo/redo) ---------- */
function snapshot() {
  if (state.suppressHist) return;
  const snap = {
    image: state.image,
    adjust: { ...state.adjust },
    transform: { ...state.transform },
    overlays: JSON.parse(JSON.stringify(state.overlays)),
    imageLayers: JSON.parse(JSON.stringify(state.imageLayers)),
    smoothness: state.smoothness,
  };
  state.history = state.history.slice(0, state.histIdx + 1);
  state.history.push(snap);
  if (state.history.length > 30) state.history.shift();
  state.histIdx = state.history.length - 1;
  refreshHistoryButtons();
}
function refreshHistoryButtons() {
  $("#undoBtn").disabled = state.histIdx <= 0;
  $("#redoBtn").disabled = state.histIdx >= state.history.length - 1;
}
async function applyHistory(snap) {
  state.suppressHist = true;
  state.image = snap.image;
  state.adjust = { ...snap.adjust };
  state.transform = { ...snap.transform };
  state.overlays = JSON.parse(JSON.stringify(snap.overlays));
  state.imageLayers = JSON.parse(JSON.stringify(snap.imageLayers));
  state.smoothness = snap.smoothness;
  const img = await loadImage(state.image);
  state.naturalW = img.width; state.naturalH = img.height;
  renderCanvas(); renderOverlays(); renderPanel();
  setTimeout(() => state.suppressHist = false, 0);
  refreshHistoryButtons();
}
$("#undoBtn").addEventListener("click", () => { if (state.histIdx > 0) { state.histIdx--; applyHistory(state.history[state.histIdx]); } });
$("#redoBtn").addEventListener("click", () => { if (state.histIdx < state.history.length - 1) { state.histIdx++; applyHistory(state.history[state.histIdx]); } });

/* ---------- Reset ---------- */
$("#resetBtn").addEventListener("click", () => {
  state.adjust = { ...DEFAULT_ADJUST }; state.transform = { ...DEFAULT_TRANSFORM }; state.smoothness = 0;
  renderCanvas(); renderPanel(); snapshot();
  toast("Adjustments reset");
});

/* ---------- Initial render ---------- */
renderPanel();
refreshHistoryButtons();
window.addEventListener("resize", () => { positionCropOverlay(); resizeMaskCanvas(); });
