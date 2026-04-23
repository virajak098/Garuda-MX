import React, { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  Feather, Upload, Sliders, Palette, RotateCw, Type, Wand2,
  Download, Undo2, Redo2, Eye, Trash2, Save, FolderOpen,
  FlipHorizontal, FlipVertical, RotateCcw, Loader2, Smile,
  Sparkles, Focus, Columns, Crop as CropIcon, Eraser, Layers as LayersIcon, X,
  ZoomIn, ZoomOut,
} from "lucide-react";
import {
  DEFAULT_ADJUST, FILTER_PRESETS, buildFilterString, buildTransformString,
  exportImage, saveImageAs, makeThumbnail, cropImage, CROP_RATIOS, applyMaskedBlur, magicEnhance, clientEnhance,
} from "@/lib/imageUtils";
import { BRAND } from "@/lib/brand";
import TextPanel, { SliderRow } from "@/components/editor/panels/TextPanel";
import BlurPanel from "@/components/editor/panels/BlurPanel";
import EnhancePanel from "@/components/editor/panels/EnhancePanel";
import FaceRetouchPanel from "@/components/editor/panels/FaceRetouchPanel";
import CropPanel from "@/components/editor/panels/CropPanel";
import MagicErasePanel from "@/components/editor/panels/MagicErasePanel";
import LayersPanel from "@/components/editor/panels/LayersPanel";
import CropOverlay from "@/components/editor/CropOverlay";
import MaskBrushCanvas from "@/components/editor/MaskBrushCanvas";
import BeforeAfterSlider from "@/components/editor/BeforeAfterSlider";
import { fontStack } from "@/lib/fonts";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TOOLS = [
  { id: "adjust", icon: Sliders, label: "Adjust" },
  { id: "filters", icon: Palette, label: "Filters" },
  { id: "crop", icon: CropIcon, label: "Crop" },
  { id: "blur", icon: Focus, label: "Blur" },
  { id: "transform", icon: RotateCw, label: "Transform" },
  { id: "text", icon: Type, label: "Text" },
  { id: "layers", icon: LayersIcon, label: "Layers" },
  { id: "enhance", icon: Sparkles, label: "Enhance" },
  { id: "face", icon: Smile, label: "Face Retouch" },
  { id: "erase", icon: Eraser, label: "Magic Erase" },
  { id: "ai", icon: Wand2, label: "AI Edit" },
];

const DEFAULT_TRANSFORM = { rotate: 0, flipH: false, flipV: false };

export default function Editor() {
  const [image, setImage] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [fileName, setFileName] = useState("Untitled");
  const [adjust, setAdjust] = useState(DEFAULT_ADJUST);
  const [transform, setTransform] = useState(DEFAULT_TRANSFORM);
  const [smoothness, setSmoothness] = useState(0);
  const [textOverlays, setTextOverlays] = useState([]);
  const [imageLayers, setImageLayers] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [activeTool, setActiveTool] = useState("adjust");
  const [showBefore, setShowBefore] = useState(false);
  const [compareMode, setCompareMode] = useState(false);

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Background blur
  const [bgBlur, setBgBlur] = useState(60);
  const [bgSmooth, setBgSmooth] = useState(60);

  // Crop state
  const [cropRatio, setCropRatio] = useState("free");
  const [cropRect, setCropRect] = useState({ xPct: 10, yPct: 10, wPct: 80, hPct: 80 });
  const [cropFormat, setCropFormat] = useState("png");
  const [cropQuality, setCropQuality] = useState(95);

  // Manual brush blur
  const [brushBlurMode, setBrushBlurMode] = useState(false);
  const [brushBlurSize, setBrushBlurSize] = useState(50);
  const [brushBlurStrength, setBrushBlurStrength] = useState(12);
  const [hasBrushBlur, setHasBrushBlur] = useState(false);
  const blurMaskRef = useRef(null);

  // Magic Erase state
  const [brushSize, setBrushSize] = useState(40);
  const [eraseDesc, setEraseDesc] = useState("");
  const [hasMask, setHasMask] = useState(false);
  const maskRef = useRef(null);

  // Image rect for overlays (crop, mask brush, draggable text)
  const imgRef = useRef(null);
  const [imageRect, setImageRect] = useState(null);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });

  const [exportFormat, setExportFormat] = useState("png");
  const [exportQuality, setExportQuality] = useState(92);
  const [projects, setProjects] = useState([]);
  const [projectsOpen, setProjectsOpen] = useState(false);

  // history
  const [history, setHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const suppressHistRef = useRef(false);

  const fileInputRef = useRef(null);

  const snapshot = useCallback((img, adj, tr, texts, sm) => {
    if (suppressHistRef.current) return;
    setHistory((h) => {
      const trimmed = h.slice(0, histIdx + 1);
      trimmed.push({ image: img, adjust: adj, transform: tr, textOverlays: texts, smoothness: sm });
      if (trimmed.length > 30) trimmed.shift();
      return trimmed;
    });
    setHistIdx((i) => Math.min(i + 1, 29));
  }, [histIdx]);

  useEffect(() => {
    if (!image) return;
    snapshot(image, adjust, transform, textOverlays, smoothness);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image]);

  const commitHistory = () => snapshot(image, adjust, transform, textOverlays, smoothness);

  const undo = () => {
    if (histIdx <= 0) return;
    const prev = history[histIdx - 1];
    suppressHistRef.current = true;
    setImage(prev.image); setAdjust(prev.adjust); setTransform(prev.transform);
    setTextOverlays(prev.textOverlays); setSmoothness(prev.smoothness || 0);
    setHistIdx(histIdx - 1);
    setTimeout(() => { suppressHistRef.current = false; }, 0);
  };
  const redo = () => {
    if (histIdx >= history.length - 1) return;
    const next = history[histIdx + 1];
    suppressHistRef.current = true;
    setImage(next.image); setAdjust(next.adjust); setTransform(next.transform);
    setTextOverlays(next.textOverlays); setSmoothness(next.smoothness || 0);
    setHistIdx(histIdx + 1);
    setTimeout(() => { suppressHistRef.current = false; }, 0);
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please upload an image file.");
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target.result;
      setImage(src);
      setOriginalImage(src);
      setFileName(file.name.replace(/\.[^.]+$/, "") || "Untitled");
      setAdjust(DEFAULT_ADJUST);
      setTransform(DEFAULT_TRANSFORM);
      setTextOverlays([]);
      setImageLayers([]);
      setSelectedLayerId(null);
      setZoom(100);
      setSmoothness(0);
      setHistory([]);
      setHistIdx(-1);
      toast.success("Image loaded");
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setAdjust(DEFAULT_ADJUST);
    setTransform(DEFAULT_TRANSFORM);
    setSmoothness(0);
    setTimeout(commitHistory, 0);
    toast("Reset adjustments");
  };

  const applyFilter = (name) => {
    setAdjust({ ...FILTER_PRESETS[name] });
    setTimeout(commitHistory, 0);
  };

  // Recompute imageRect when image or viewport changes
  useEffect(() => {
    if (!image) { setImageRect(null); return; }
    const update = () => {
      const el = imgRef.current;
      if (!el) return;
      const wrapper = el.parentElement;
      if (!wrapper) return;
      const wr = wrapper.getBoundingClientRect();
      const ir = el.getBoundingClientRect();
      setImageRect({
        left: ir.left - wr.left,
        top: ir.top - wr.top,
        width: ir.width,
        height: ir.height,
      });
    };
    // Multiple updates to catch layout settle
    const t1 = setTimeout(update, 50);
    const t2 = setTimeout(update, 200);
    window.addEventListener("resize", update);
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener("resize", update); };
  }, [image, activeTool, compareMode]);

  const onImgLoad = () => {
    const el = imgRef.current;
    if (!el) return;
    setNaturalSize({ w: el.naturalWidth, h: el.naturalHeight });
    setCropRect({ xPct: 10, yPct: 10, wPct: 80, hPct: 80 });
  };

  // AI calls
  const runAIEdit = async (mode) => {
    if (!image) return toast.error("Upload an image first");
    if (mode === "edit" && !aiPrompt.trim()) return toast.error("Enter a prompt");
    setAiLoading(true);
    try {
      const { data } = await axios.post(`${API}/ai/edit`, {
        image_base64: image, prompt: aiPrompt, mode,
      }, { timeout: 240000 });
      setImage(`data:${data.mime_type};base64,${data.image_base64}`);
      setAdjust(DEFAULT_ADJUST); setTransform(DEFAULT_TRANSFORM);
      toast.success(mode === "remove_bg" ? "Background removed" : "AI edit applied");
    } catch (e) {
      toast.error(`AI failed: ${e.response?.data?.detail || e.message}`);
    } finally { setAiLoading(false); }
  };

  const runEnhance = async (mode) => {
    if (!image) return toast.error("Upload an image first");
    setAiLoading(true);
    try {
      // Give the loader a chance to paint, then run heavy pixel work
      await new Promise((r) => setTimeout(r, 30));
      const result = await clientEnhance(image, mode);
      setImage(result);
      setAdjust(DEFAULT_ADJUST);
      setTransform(DEFAULT_TRANSFORM);
      setSmoothness(0);
      setTimeout(commitHistory, 0);
      const labels = {
        auto: "Auto-enhanced",
        hdr: "HDR applied",
        sharpen: "Sharpened",
        denoise: "Denoised",
        upscale: "Upscaled 2×",
        color_pop: "Color pop applied",
        lowlight: "Low-light fixed",
      };
      toast.success(labels[mode] || "Enhanced");
    } catch (e) {
      toast.error(`Enhance failed: ${e.message}`);
    } finally { setAiLoading(false); }
  };

  const [magicLoading, setMagicLoading] = useState(false);
  const runMagicEnhance = async () => {
    if (!image) return toast.error("Upload an image first");
    setMagicLoading(true);
    try {
      // small delay lets the loader paint
      await new Promise((r) => setTimeout(r, 30));
      const result = await magicEnhance(image);
      setImage(result);
      setAdjust(DEFAULT_ADJUST);
      setTransform(DEFAULT_TRANSFORM);
      setSmoothness(0);
      toast.success("Magic enhance applied");
      setTimeout(commitHistory, 0);
    } catch (e) {
      toast.error("Magic enhance failed");
    } finally { setMagicLoading(false); }
  };

  const runFaceRetouch = async (feature, intensity, params) => {
    if (!image) return toast.error("Upload an image first");
    setAiLoading(true);
    try {
      const { data } = await axios.post(`${API}/ai/face-retouch`, {
        image_base64: image, feature, intensity, params: params || null,
      }, { timeout: 240000 });
      setImage(`data:${data.mime_type};base64,${data.image_base64}`);
      toast.success(`Applied: ${feature.replace("_", " ")}`);
    } catch (e) {
      toast.error(`Retouch failed: ${e.response?.data?.detail || e.message}`);
    } finally { setAiLoading(false); }
  };

  const runBackgroundBlur = async () => {
    if (!image) return toast.error("Upload an image first");
    setAiLoading(true);
    try {
      const { data } = await axios.post(`${API}/ai/background-blur`, {
        image_base64: image, blur: bgBlur, smoothness: bgSmooth,
      }, { timeout: 240000 });
      setImage(`data:${data.mime_type};base64,${data.image_base64}`);
      toast.success("Background blurred");
    } catch (e) {
      toast.error(`Blur failed: ${e.response?.data?.detail || e.message}`);
    } finally { setAiLoading(false); }
  };

  const runMagicErase = async () => {
    if (!image) return toast.error("Upload an image first");
    let mask_base64 = null;
    if (hasMask && maskRef.current) {
      mask_base64 = maskRef.current.exportMask();
    }
    if (!mask_base64 && !eraseDesc.trim()) return toast.error("Paint a mask or describe what to remove");
    setAiLoading(true);
    try {
      const { data } = await axios.post(`${API}/ai/magic-erase`, {
        image_base64: image,
        mask_base64,
        description: eraseDesc.trim() || null,
      }, { timeout: 240000 });
      setImage(`data:${data.mime_type};base64,${data.image_base64}`);
      toast.success("Object removed");
      if (maskRef.current) maskRef.current.clear();
      setHasMask(false);
      setEraseDesc("");
    } catch (e) {
      toast.error(`Erase failed: ${e.response?.data?.detail || e.message}`);
    } finally { setAiLoading(false); }
  };

  const applyCrop = async () => {
    if (!image) return;
    try {
      // Flatten base image through current filter + transform first so crop respects them
      const flattenedUrl = await exportImage(image, adjust, transform, [], "png", 1.0, smoothness);
      const cropped = await cropImage(flattenedUrl, cropRect, cropFormat, cropQuality / 100);
      setImage(cropped);
      setAdjust(DEFAULT_ADJUST);
      setTransform(DEFAULT_TRANSFORM);
      setTextOverlays([]);
      setImageLayers([]);
      setActiveTool("adjust");
      toast.success(`Cropped · ${cropFormat.toUpperCase()} ${cropFormat === "png" ? "lossless" : cropQuality + "%"}`);
    } catch (e) {
      toast.error("Crop failed");
    }
  };

  // Manual masked blur
  const runManualBlur = async () => {
    if (!image) return toast.error("Upload an image first");
    if (!blurMaskRef.current || !blurMaskRef.current.hasMask()) {
      return toast.error("Paint over areas you want to blur");
    }
    try {
      const maskUrl = blurMaskRef.current.exportMask();
      const result = await applyMaskedBlur(image, maskUrl, brushBlurStrength);
      setImage(result);
      blurMaskRef.current.clear();
      setHasBrushBlur(false);
      setTimeout(commitHistory, 0);
      toast.success("Blur applied");
    } catch (e) {
      toast.error("Blur failed");
    }
  };

  const clearManualBlur = () => {
    blurMaskRef.current?.clear();
    setHasBrushBlur(false);
  };

  const handleExport = async () => {
    if (!image) return toast.error("Nothing to export");
    try {
      const visible = textOverlays.filter((t) => !t.hidden);
      const dataUrl = await exportImage(image, adjust, transform, visible, exportFormat, exportQuality / 100, smoothness, imageLayers.filter((l) => !l.hidden));
      // Default name uses the project name if user changed it, otherwise the brand default
      const defaultName = (fileName && fileName !== "Untitled") ? fileName : BRAND.defaultExportName;
      const res = await saveImageAs(dataUrl, defaultName, exportFormat);
      if (res.cancelled) return;
      if (res.ok) toast.success("Exported");
    } catch { toast.error("Export failed"); }
  };

  const saveProject = async () => {
    if (!image) return toast.error("Nothing to save");
    try {
      const visible = textOverlays.filter((t) => !t.hidden);
      const dataUrl = await exportImage(image, adjust, transform, visible, "jpg", 0.85, smoothness);
      const thumb = await makeThumbnail(dataUrl, 300);
      await axios.post(`${API}/projects`, {
        name: fileName, image_base64: image, thumbnail_base64: thumb,
        adjustments: { adjust, transform, textOverlays, smoothness, originalImage },
      });
      toast.success("Project saved");
      loadProjects();
    } catch { toast.error("Save failed"); }
  };

  const loadProjects = async () => {
    try { const { data } = await axios.get(`${API}/projects`); setProjects(data); } catch {}
  };

  const openProject = async (id) => {
    try {
      const { data } = await axios.get(`${API}/projects/${id}`);
      setImage(data.image_base64);
      setFileName(data.name);
      if (data.adjustments) {
        setAdjust(data.adjustments.adjust || DEFAULT_ADJUST);
        setTransform(data.adjustments.transform || DEFAULT_TRANSFORM);
        setTextOverlays(data.adjustments.textOverlays || []);
        setImageLayers(data.adjustments.imageLayers || []);
        setSmoothness(data.adjustments.smoothness || 0);
        setOriginalImage(data.adjustments.originalImage || data.image_base64);
      }
      setProjectsOpen(false);
      toast.success(`Loaded: ${data.name}`);
    } catch { toast.error("Load failed"); }
  };

  const deleteProject = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API}/projects/${id}`);
      toast.success("Deleted");
      loadProjects();
    } catch { toast.error("Delete failed"); }
  };

  useEffect(() => { loadProjects(); }, []);

  // Update hasMask flag periodically in erase mode
  useEffect(() => {
    if (activeTool !== "erase") return;
    const t = setInterval(() => {
      setHasMask(maskRef.current?.hasMask?.() || false);
    }, 500);
    return () => clearInterval(t);
  }, [activeTool]);

  // Update hasBrushBlur flag periodically in manual blur mode
  useEffect(() => {
    if (activeTool !== "blur" || !brushBlurMode) return;
    const t = setInterval(() => {
      setHasBrushBlur(blurMaskRef.current?.hasMask?.() || false);
    }, 500);
    return () => clearInterval(t);
  }, [activeTool, brushBlurMode]);

  const filterStr = showBefore ? "none" : buildFilterString(adjust, smoothness);
  const transformStr = showBefore ? "none" : buildTransformString(transform);
  const displayImage = showBefore && originalImage ? originalImage : image;

  // Draggable overlays (text + image)
  const dragRef = useRef(null);
  const startDragOverlay = (id, kind = "text") => (e) => {
    e.stopPropagation();
    setSelectedLayerId(id);
    dragRef.current = { id, kind, mode: "move", startX: e.clientX, startY: e.clientY, rect: imageRect };
  };
  const startResizeImageLayer = (id) => (e) => {
    e.stopPropagation();
    setSelectedLayerId(id);
    dragRef.current = { id, kind: "image", mode: "resize", startX: e.clientX, startY: e.clientY };
  };
  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current || !imageRect) return;
      const { id, kind, mode, startX, startY } = dragRef.current;
      const dx = ((e.clientX - startX) / imageRect.width) * 100;
      const dy = ((e.clientY - startY) / imageRect.height) * 100;
      dragRef.current.startX = e.clientX;
      dragRef.current.startY = e.clientY;
      if (mode === "move") {
        if (kind === "text") {
          setTextOverlays((list) =>
            list.map((o) => o.id === id ? {
              ...o,
              xPct: Math.max(0, Math.min(95, o.xPct + dx)),
              yPct: Math.max(0, Math.min(95, o.yPct + dy)),
            } : o)
          );
        } else {
          setImageLayers((list) =>
            list.map((o) => o.id === id ? {
              ...o,
              xPct: Math.max(0, Math.min(100 - o.wPct, o.xPct + dx)),
              yPct: Math.max(0, Math.min(100 - o.hPct, o.yPct + dy)),
            } : o)
          );
        }
      } else if (mode === "resize" && kind === "image") {
        setImageLayers((list) =>
          list.map((o) => o.id === id ? {
            ...o,
            wPct: Math.max(5, Math.min(100 - o.xPct, o.wPct + dx)),
            hPct: Math.max(5, Math.min(100 - o.yPct, o.hPct + dy)),
          } : o)
        );
      }
    };
    const onUp = () => { if (dragRef.current) { dragRef.current = null; commitHistory(); } };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [imageRect]); // eslint-disable-line

  const addImageLayer = (src, name) => {
    const id = Date.now();
    setImageLayers((o) => [...o, {
      id, kind: "image", src, name: name?.slice(0, 30) || "Image",
      xPct: 20, yPct: 20, wPct: 40, hPct: 40, hidden: false,
    }]);
    setSelectedLayerId(id);
    setActiveTool("layers");
    setTimeout(commitHistory, 0);
    toast.success("Image layer added");
  };

  return (
    <div data-testid="editor-page" className="h-screen flex flex-col bg-garuda-app overflow-hidden">
      {/* Topbar */}
      <div className="h-16 flex items-center justify-between px-3 md:px-4 border-b border-garuda-border bg-garuda-panel z-50 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="flex items-center gap-3 shrink-0" data-testid="editor-home-link">
            <img src={BRAND.logo} alt="Garuda" className="w-10 h-10 rounded-sm object-cover ring-1 ring-garuda-gold/50 shadow-md shadow-garuda-gold/10" />
            <img src={BRAND.textLogo} alt="GARUDA" className="h-6 object-contain hidden sm:block" />
            <span className="text-[9px] uppercase tracking-[0.2em] text-garuda-textTertiary font-mono hidden md:inline">MX</span>
          </Link>
          <div className="w-px h-8 bg-garuda-border mx-1 hidden sm:block" />
          <input
            data-testid="project-name-input"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="Garuda MX"
            className="bg-transparent text-sm text-white border-b border-transparent hover:border-garuda-border focus:border-garuda-gold outline-none px-1 max-w-[140px] md:max-w-[200px] min-w-0"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          <button data-testid="undo-button" onClick={undo} disabled={histIdx <= 0}
            className="p-2 rounded-sm text-garuda-textSecondary hover:text-white hover:bg-garuda-surfaceHover disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0">
            <Undo2 className="w-4 h-4" />
          </button>
          <button data-testid="redo-button" onClick={redo} disabled={histIdx >= history.length - 1}
            className="p-2 rounded-sm text-garuda-textSecondary hover:text-white hover:bg-garuda-surfaceHover disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0">
            <Redo2 className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-garuda-border mx-1" />
          <button data-testid="compare-hold-button"
            onMouseDown={() => setShowBefore(true)}
            onMouseUp={() => setShowBefore(false)}
            onMouseLeave={() => setShowBefore(false)}
            disabled={!originalImage}
            className="p-2 rounded-sm text-garuda-textSecondary hover:text-white hover:bg-garuda-surfaceHover disabled:opacity-30 transition-colors shrink-0">
            <Eye className="w-4 h-4" />
          </button>
          <button data-testid="compare-split-button"
            onClick={() => setCompareMode(!compareMode)}
            disabled={!originalImage}
            className={`p-2 rounded-sm disabled:opacity-30 transition-colors shrink-0 ${
              compareMode ? "bg-garuda-goldMuted text-garuda-gold" : "text-garuda-textSecondary hover:text-white hover:bg-garuda-surfaceHover"
            }`}>
            <Columns className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-garuda-border mx-1" />
          <button data-testid="projects-toggle-button" onClick={() => setProjectsOpen(!projectsOpen)}
            className="px-2 md:px-3 py-1.5 rounded-sm text-garuda-textSecondary hover:text-white hover:bg-garuda-surfaceHover text-xs flex items-center gap-1.5 shrink-0">
            <FolderOpen className="w-4 h-4" /> <span className="hidden md:inline">Projects</span>
          </button>
          <button data-testid="save-project-button" onClick={saveProject}
            className="px-2 md:px-3 py-1.5 rounded-sm text-garuda-textSecondary hover:text-white hover:bg-garuda-surfaceHover text-xs flex items-center gap-1.5 shrink-0">
            <Save className="w-4 h-4" /> <span className="hidden md:inline">Save</span>
          </button>
          <button data-testid="export-button" onClick={handleExport}
            className="ml-1 bg-garuda-gold text-black px-3 md:px-4 py-1.5 rounded-sm text-sm font-semibold hover:bg-garuda-goldHover transition-colors flex items-center gap-1.5 shrink-0">
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left toolbar */}
        <div className="w-14 md:w-16 flex flex-col items-center py-3 gap-1 border-r border-garuda-border bg-garuda-panel overflow-y-auto shrink-0">
          <button onClick={() => fileInputRef.current?.click()}
            data-testid="upload-tool-button"
            className="w-10 h-10 rounded-sm flex items-center justify-center text-garuda-gold hover:bg-garuda-surfaceHover transition-colors mb-1"
            title="Upload image">
            <Upload className="w-5 h-5" />
          </button>
          <div className="w-8 h-px bg-garuda-border my-1" />
          {TOOLS.map((t) => (
            <button
              key={t.id}
              data-testid={`tool-${t.id}-button`}
              onClick={() => setActiveTool(t.id)}
              title={t.label}
              className={`w-10 h-10 rounded-sm flex items-center justify-center transition-colors ${
                activeTool === t.id
                  ? "bg-garuda-goldMuted text-garuda-gold"
                  : "text-garuda-textSecondary hover:text-white hover:bg-garuda-surfaceHover"
              }`}
            >
              <t.icon className="w-5 h-5" />
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={reset} data-testid="reset-button" title="Reset adjustments"
            className="w-10 h-10 rounded-sm flex items-center justify-center text-garuda-textSecondary hover:text-destructive hover:bg-garuda-surfaceHover transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas */}
        <div
          data-testid="canvas-area"
          className="flex-1 relative garuda-canvas-bg overflow-hidden flex items-center justify-center p-4 md:p-8"
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => setSelectedLayerId(null)}
        >
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            data-testid="file-input"
            onChange={(e) => handleFile(e.target.files?.[0])} />

          {!image ? (
            <div className="text-center max-w-md animate-fade-in-up">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-garuda-goldMuted flex items-center justify-center">
                <Upload className="w-7 h-7 text-garuda-gold" />
              </div>
              <h2 className="font-heading text-3xl font-bold mb-3">Drop an image to begin</h2>
              <p className="text-sm text-garuda-textSecondary mb-6">PNG, JPG or WebP. Or click below to choose.</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                data-testid="empty-state-upload-button"
                className="bg-garuda-gold text-black px-6 py-3 rounded-sm text-sm font-semibold hover:bg-garuda-goldHover transition-colors">
                Choose Image
              </button>
            </div>
          ) : (
            <div className="relative max-w-full max-h-full" data-testid="canvas-image-wrapper"
                 style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center center", transition: "transform 0.2s ease-out" }}
                 onClick={(e) => e.stopPropagation()}>
              <img
                ref={imgRef}
                onLoad={onImgLoad}
                data-testid="canvas-image"
                src={displayImage}
                alt="editing"
                className="max-w-full max-h-[calc(100vh-10rem)] object-contain shadow-2xl block"
                style={{
                  filter: filterStr,
                  transform: transformStr,
                  transition: "filter 0.15s ease-out, transform 0.2s ease-out",
                  visibility: compareMode ? "hidden" : "visible",
                }}
              />
              {/* Image layers */}
              {!compareMode && imageLayers.map((l) => !l.hidden && (
                <div
                  key={l.id}
                  data-testid={`image-layer-${l.id}`}
                  onMouseDown={startDragOverlay(l.id, "image")}
                  onClick={(e) => { e.stopPropagation(); setSelectedLayerId(l.id); }}
                  className={`absolute cursor-move select-none group ${
                    selectedLayerId === l.id ? "ring-2 ring-garuda-gold" : ""
                  }`}
                  style={{
                    left: `${l.xPct}%`,
                    top: `${l.yPct}%`,
                    width: `${l.wPct}%`,
                    height: `${l.hPct}%`,
                  }}
                >
                  <img src={l.src} alt={l.name || "layer"} className="w-full h-full object-contain pointer-events-none" draggable={false} />
                  {selectedLayerId === l.id && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageLayers((o) => o.filter((x) => x.id !== l.id));
                          setSelectedLayerId(null);
                        }}
                        data-testid={`image-layer-delete-${l.id}`}
                        className="absolute -top-3 -right-3 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center text-[10px] shadow-lg"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      {/* Corner resize handle */}
                      <div
                        onMouseDown={(e) => { e.stopPropagation(); startResizeImageLayer(l.id)(e); }}
                        data-testid={`image-layer-resize-${l.id}`}
                        className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-garuda-gold border border-black cursor-se-resize"
                      />
                    </>
                  )}
                </div>
              ))}
              {/* Text overlays (draggable) */}
              {!compareMode && textOverlays.map((t) => !t.hidden && (
                <div
                  key={t.id}
                  data-testid={`overlay-${t.id}`}
                  onMouseDown={startDragOverlay(t.id)}
                  onClick={(e) => { e.stopPropagation(); setSelectedLayerId(t.id); setActiveTool("text"); }}
                  className={`absolute cursor-move select-none group ${
                    selectedLayerId === t.id ? "ring-1 ring-garuda-gold ring-offset-2 ring-offset-transparent" : ""
                  }`}
                  style={{
                    left: `${t.xPct}%`,
                    top: `${t.yPct}%`,
                    color: t.color,
                    fontSize: `${Math.max(12, (t.size || 48) / 3)}px`,
                    fontFamily: fontStack(t.font || "IBM Plex Sans"),
                    fontWeight: t.bold ? 700 : 400,
                    textShadow: t.shadow
                      ? `${t.shadowX || 2}px ${t.shadowY || 2}px ${t.shadowBlur || 4}px ${t.shadowColor || "rgba(0,0,0,0.6)"}`
                      : "none",
                    WebkitTextStroke: t.stroke ? `${Math.max(0.3, (t.strokeWidth || 1) / 3)}px ${t.strokeColor || "#000"}` : "none",
                    whiteSpace: "nowrap",
                    userSelect: "none",
                  }}
                >
                  {t.text || "Your text"}
                  {selectedLayerId === t.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTextOverlays((o) => o.filter((x) => x.id !== t.id));
                        setSelectedLayerId(null);
                      }}
                      data-testid={`overlay-delete-${t.id}`}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              {/* Crop overlay */}
              {activeTool === "crop" && !compareMode && (
                <CropOverlay
                  imageRect={imageRect ? { left: 0, top: 0, width: imageRect.width, height: imageRect.height } : null}
                  rectPct={cropRect}
                  onChange={setCropRect}
                  aspectRatio={CROP_RATIOS.find((r) => r.id === cropRatio)?.ratio || null}
                />
              )}
              {/* Manual blur brush (paint areas to blur) */}
              {activeTool === "blur" && brushBlurMode && !compareMode && (
                <MaskBrushCanvas
                  ref={blurMaskRef}
                  imageRect={imageRect ? { left: 0, top: 0, width: imageRect.width, height: imageRect.height } : null}
                  imageNaturalWidth={naturalSize.w}
                  imageNaturalHeight={naturalSize.h}
                  brushSize={brushBlurSize}
                  enabled={true}
                  onDrawEnd={() => setHasBrushBlur(true)}
                />
              )}
              {/* Magic Erase brush */}
              {activeTool === "erase" && !compareMode && (
                <MaskBrushCanvas
                  ref={maskRef}
                  imageRect={imageRect ? { left: 0, top: 0, width: imageRect.width, height: imageRect.height } : null}
                  imageNaturalWidth={naturalSize.w}
                  imageNaturalHeight={naturalSize.h}
                  brushSize={brushSize}
                  enabled={true}
                  onDrawEnd={() => setHasMask(true)}
                />
              )}
              {(aiLoading || magicLoading) && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center flex-col gap-3 backdrop-blur-sm z-40">
                  <Loader2 className="w-10 h-10 text-garuda-gold animate-spin" />
                  <span className="text-sm uppercase tracking-[0.25em] text-garuda-gold font-mono">
                    {magicLoading ? "Magic enhancing…" : "Processing…"}
                  </span>
                  <span className="text-[11px] text-garuda-textTertiary">Analyzing pixels · runs on your device</span>
                </div>
              )}
            </div>
          )}

          {/* Before/After split slider */}
          <BeforeAfterSlider
            enabled={compareMode && !!originalImage && !!image}
            originalImage={originalImage}
            currentImage={image}
            adjust={adjust}
            transform={transform}
            textOverlays={textOverlays.filter((t) => !t.hidden)}
            onDisable={() => setCompareMode(false)}
          />

          {/* Zoom control (bottom center) */}
          {image && (
            <div
              data-testid="zoom-control"
              className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-garuda-panel/90 backdrop-blur-md border border-garuda-border rounded-sm px-3 py-1.5 flex items-center gap-3 shadow-xl z-20"
            >
              <button
                onClick={() => setZoom((z) => Math.max(10, z - 10))}
                data-testid="zoom-out-button"
                className="text-garuda-textSecondary hover:text-garuda-gold p-1"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min="10"
                max="400"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                data-testid="zoom-slider"
                className="w-32 accent-garuda-gold"
              />
              <button
                onClick={() => setZoom((z) => Math.min(400, z + 10))}
                data-testid="zoom-in-button"
                className="text-garuda-textSecondary hover:text-garuda-gold p-1"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom(100)}
                data-testid="zoom-reset-button"
                className="text-[10px] font-mono text-white hover:text-garuda-gold min-w-[40px] text-right"
              >
                {zoom}%
              </button>
            </div>
          )}

          {/* Projects drawer */}
          {projectsOpen && (
            <div className="absolute top-4 right-4 bottom-4 w-72 bg-garuda-panel border border-garuda-border shadow-2xl overflow-y-auto z-40" data-testid="projects-drawer">
              <div className="p-4 border-b border-garuda-border flex items-center justify-between">
                <h3 className="font-heading font-semibold">Saved Projects</h3>
                <button onClick={() => setProjectsOpen(false)} className="text-garuda-textTertiary hover:text-white text-sm">✕</button>
              </div>
              {projects.length === 0 ? (
                <div className="p-6 text-center text-sm text-garuda-textTertiary">No saved projects yet.</div>
              ) : (
                <div className="p-2">
                  {projects.map((p) => (
                    <div key={p.id} onClick={() => openProject(p.id)}
                      data-testid={`project-item-${p.id}`}
                      className="p-2 hover:bg-garuda-surface cursor-pointer rounded-sm flex gap-3 items-center group">
                      {p.thumbnail_base64 ? (
                        <img src={p.thumbnail_base64} alt={p.name} className="w-12 h-12 object-cover rounded-sm" />
                      ) : (
                        <div className="w-12 h-12 bg-garuda-surface rounded-sm" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{p.name}</div>
                        <div className="text-[10px] text-garuda-textTertiary">{new Date(p.updated_at).toLocaleDateString()}</div>
                      </div>
                      <button onClick={(e) => deleteProject(p.id, e)} className="opacity-0 group-hover:opacity-100 text-garuda-textTertiary hover:text-destructive p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="w-72 md:w-80 flex flex-col border-l border-garuda-border bg-garuda-panel overflow-y-auto shrink-0">
          <div className="p-4 border-b border-garuda-border">
            <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-garuda-textSecondary mb-1 font-mono">
              {TOOLS.find((t) => t.id === activeTool)?.label || "Panel"}
            </div>
          </div>

          {activeTool === "adjust" && <AdjustPanel adjust={adjust} setAdjust={setAdjust} onCommit={commitHistory} />}
          {activeTool === "filters" && <FiltersPanel onApply={applyFilter} />}
          {activeTool === "crop" && (
            <CropPanel
              activeRatio={cropRatio}
              setActiveRatio={setCropRatio}
              cropFormat={cropFormat}
              setCropFormat={setCropFormat}
              cropQuality={cropQuality}
              setCropQuality={setCropQuality}
              onApply={applyCrop}
              onCancel={() => setActiveTool("adjust")}
            />
          )}
          {activeTool === "blur" && (
            <BlurPanel
              adjust={adjust} setAdjust={setAdjust}
              smoothness={smoothness} setSmoothness={setSmoothness}
              bgBlur={bgBlur} setBgBlur={setBgBlur}
              bgSmooth={bgSmooth} setBgSmooth={setBgSmooth}
              onCommit={commitHistory}
              aiLoading={aiLoading}
              onApplyBackgroundBlur={runBackgroundBlur}
              brushBlurMode={brushBlurMode} setBrushBlurMode={setBrushBlurMode}
              brushBlurSize={brushBlurSize} setBrushBlurSize={setBrushBlurSize}
              brushBlurStrength={brushBlurStrength} setBrushBlurStrength={setBrushBlurStrength}
              hasBrushBlur={hasBrushBlur}
              onApplyManualBlur={runManualBlur}
              onClearManualBlur={clearManualBlur}
            />
          )}
          {activeTool === "transform" && <TransformPanel transform={transform} setTransform={setTransform} onCommit={commitHistory} />}
          {activeTool === "text" && (
            <TextPanel
              overlays={textOverlays}
              setOverlays={setTextOverlays}
              selectedId={selectedLayerId}
              setSelectedId={setSelectedLayerId}
              onCommit={commitHistory}
            />
          )}
          {activeTool === "layers" && (
            <LayersPanel
              overlays={[...imageLayers, ...textOverlays]}
              setOverlays={(updaterOrList) => {
                const resolved = typeof updaterOrList === "function"
                  ? updaterOrList([...imageLayers, ...textOverlays])
                  : updaterOrList;
                setImageLayers(resolved.filter((x) => x.kind === "image"));
                setTextOverlays(resolved.filter((x) => x.kind !== "image"));
              }}
              onCommit={commitHistory}
              hasImage={!!image}
              imageName={fileName}
              onAddImageLayer={addImageLayer}
            />
          )}
          {activeTool === "enhance" && <EnhancePanel onEnhance={runEnhance} onMagicEnhance={runMagicEnhance} loading={aiLoading} magicLoading={magicLoading} />}
          {activeTool === "face" && <FaceRetouchPanel onRetouch={runFaceRetouch} loading={aiLoading} />}
          {activeTool === "erase" && (
            <MagicErasePanel
              brushSize={brushSize} setBrushSize={setBrushSize}
              hasMask={hasMask}
              onClearMask={() => { maskRef.current?.clear(); setHasMask(false); }}
              description={eraseDesc} setDescription={setEraseDesc}
              onApply={runMagicErase}
              loading={aiLoading}
            />
          )}
          {activeTool === "ai" && (
            <AIPanel
              prompt={aiPrompt} setPrompt={setAiPrompt} loading={aiLoading}
              onEdit={() => runAIEdit("edit")}
              onRemoveBg={() => runAIEdit("remove_bg")}
            />
          )}

          <div className="mt-auto border-t border-garuda-border p-4 space-y-3">
            <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-garuda-textSecondary font-mono">Export</div>
            <div className="flex gap-2">
              {["png", "jpg", "webp"].map((f) => (
                <button key={f} onClick={() => setExportFormat(f)}
                  data-testid={`format-${f}-button`}
                  className={`flex-1 py-1.5 rounded-sm text-[11px] font-mono uppercase ${
                    exportFormat === f ? "bg-garuda-gold text-black" : "bg-garuda-surface text-garuda-textSecondary hover:text-white"
                  }`}>{f}</button>
              ))}
            </div>
            {exportFormat !== "png" && (
              <div>
                <div className="flex justify-between text-[11px] text-garuda-textSecondary mb-1">
                  <span>Quality</span><span className="font-mono text-white">{exportQuality}%</span>
                </div>
                <input type="range" min="10" max="100" value={exportQuality}
                  data-testid="quality-slider"
                  onChange={(e) => setExportQuality(Number(e.target.value))}
                  className="w-full accent-garuda-gold" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ========= Inline sub-panels =========
function AdjustPanel({ adjust, setAdjust, onCommit }) {
  const set = (k) => (v) => setAdjust((a) => ({ ...a, [k]: v }));
  return (
    <div className="p-4 space-y-4" data-testid="adjust-panel">
      <SliderRow label="Brightness" value={adjust.brightness} min={0} max={200} onChange={set("brightness")} onCommit={onCommit} unit="%" testId="slider-brightness" />
      <SliderRow label="Contrast" value={adjust.contrast} min={0} max={200} onChange={set("contrast")} onCommit={onCommit} unit="%" testId="slider-contrast" />
      <SliderRow label="Saturation" value={adjust.saturation} min={0} max={200} onChange={set("saturation")} onCommit={onCommit} unit="%" testId="slider-saturation" />
      <SliderRow label="Hue" value={adjust.hue} min={-180} max={180} onChange={set("hue")} onCommit={onCommit} unit="°" testId="slider-hue" />
      <SliderRow label="Blur" value={adjust.blur} min={0} max={100} onChange={set("blur")} onCommit={onCommit} unit="%" testId="slider-blur" />
      <SliderRow label="Sepia" value={adjust.sepia} min={0} max={100} onChange={set("sepia")} onCommit={onCommit} unit="%" testId="slider-sepia" />
      <SliderRow label="Grayscale" value={adjust.grayscale} min={0} max={100} onChange={set("grayscale")} onCommit={onCommit} unit="%" testId="slider-grayscale" />
    </div>
  );
}

function FiltersPanel({ onApply }) {
  const presets = Object.keys(FILTER_PRESETS);
  return (
    <div className="p-4 grid grid-cols-2 gap-2" data-testid="filters-panel">
      {presets.map((p) => (
        <button key={p} onClick={() => onApply(p)}
          data-testid={`filter-preset-${p}`}
          className="aspect-square bg-garuda-surface hover:bg-garuda-surfaceHover border border-garuda-border hover:border-garuda-gold rounded-sm flex items-end justify-start p-2 transition-all text-[11px] uppercase tracking-wider font-mono text-garuda-textSecondary hover:text-white">
          {p}
        </button>
      ))}
    </div>
  );
}

function TransformPanel({ transform, setTransform, onCommit }) {
  const commit = (patch) => {
    setTransform((t) => ({ ...t, ...patch }));
    setTimeout(onCommit, 0);
  };
  return (
    <div className="p-4 space-y-4" data-testid="transform-panel">
      <div className="grid grid-cols-2 gap-2">
        <button data-testid="rotate-left-button" onClick={() => commit({ rotate: (transform.rotate - 90 + 360) % 360 })}
          className="bg-garuda-surface hover:bg-garuda-surfaceHover border border-garuda-border px-3 py-3 text-xs flex items-center justify-center gap-2 rounded-sm">
          <RotateCcw className="w-4 h-4" /> Rotate -90°
        </button>
        <button data-testid="rotate-right-button" onClick={() => commit({ rotate: (transform.rotate + 90) % 360 })}
          className="bg-garuda-surface hover:bg-garuda-surfaceHover border border-garuda-border px-3 py-3 text-xs flex items-center justify-center gap-2 rounded-sm">
          <RotateCw className="w-4 h-4" /> Rotate +90°
        </button>
        <button data-testid="flip-h-button" onClick={() => commit({ flipH: !transform.flipH })}
          className={`border px-3 py-3 text-xs flex items-center justify-center gap-2 rounded-sm ${transform.flipH ? "bg-garuda-goldMuted border-garuda-gold text-garuda-gold" : "bg-garuda-surface hover:bg-garuda-surfaceHover border-garuda-border"}`}>
          <FlipHorizontal className="w-4 h-4" /> Flip H
        </button>
        <button data-testid="flip-v-button" onClick={() => commit({ flipV: !transform.flipV })}
          className={`border px-3 py-3 text-xs flex items-center justify-center gap-2 rounded-sm ${transform.flipV ? "bg-garuda-goldMuted border-garuda-gold text-garuda-gold" : "bg-garuda-surface hover:bg-garuda-surfaceHover border-garuda-border"}`}>
          <FlipVertical className="w-4 h-4" /> Flip V
        </button>
      </div>
      <div>
        <div className="flex justify-between text-[11px] text-garuda-textSecondary mb-1.5">
          <span className="uppercase tracking-wider">Rotation</span>
          <span className="font-mono text-white">{transform.rotate}°</span>
        </div>
        <input type="range" min="0" max="359" value={transform.rotate}
          data-testid="slider-rotate"
          onChange={(e) => setTransform((t) => ({ ...t, rotate: Number(e.target.value) }))}
          onMouseUp={onCommit} onTouchEnd={onCommit}
          className="w-full accent-garuda-gold" />
      </div>
    </div>
  );
}

function AIPanel({ prompt, setPrompt, loading, onEdit, onRemoveBg }) {
  return (
    <div className="p-4 space-y-3" data-testid="ai-panel">
      <p className="text-xs text-garuda-textSecondary leading-relaxed">
        Describe the edit — Gemini Nano Banana will rewrite your image.
      </p>
      <textarea
        value={prompt} onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g. Make the sky a dramatic sunset with golden clouds"
        data-testid="ai-prompt-input"
        className="w-full h-24 bg-garuda-surface border border-garuda-border rounded-sm px-3 py-2 text-sm outline-none focus:border-garuda-gold resize-none"
      />
      <button onClick={onEdit} disabled={loading}
        data-testid="ai-edit-button"
        className="w-full bg-garuda-gold text-black py-2.5 rounded-sm text-sm font-semibold hover:bg-garuda-goldHover disabled:opacity-50 flex items-center justify-center gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
        AI Edit
      </button>
      <div className="pt-2 border-t border-garuda-border">
        <button onClick={onRemoveBg} disabled={loading}
          data-testid="ai-remove-bg-button"
          className="w-full bg-garuda-surface hover:bg-garuda-surfaceHover border border-garuda-border py-2.5 rounded-sm text-sm font-medium disabled:opacity-50">
          Remove Background
        </button>
      </div>
    </div>
  );
}
