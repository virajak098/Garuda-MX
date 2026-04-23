import React, { useState, useRef } from "react";
import { ChevronUp, ChevronDown, Eye, EyeOff, Trash2, Lock, Image as ImageIcon, Type, Plus } from "lucide-react";
import { fontStack } from "@/lib/fonts";

/**
 * Unified layers panel. overlays array contains both text AND image layers:
 *  - text layer: { id, kind: 'text', text, font, size, ... }
 *  - image layer: { id, kind: 'image', src, xPct, yPct, wPct, hPct, name, hidden }
 * Layer at array end is rendered last (top-most).
 */
export default function LayersPanel({ overlays, setOverlays, onCommit, hasImage, imageName, onAddImageLayer }) {
  const reordered = [...overlays].reverse();
  const fileInputRef = useRef(null);

  const move = (id, delta) => {
    const idx = overlays.findIndex((o) => o.id === id);
    if (idx < 0) return;
    const newIdx = idx + delta;
    if (newIdx < 0 || newIdx >= overlays.length) return;
    const copy = [...overlays];
    [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
    setOverlays(copy);
    setTimeout(onCommit, 0);
  };
  const toggle = (id) => {
    setOverlays((o) => o.map((x) => x.id === id ? { ...x, hidden: !x.hidden } : x));
    setTimeout(onCommit, 0);
  };
  const remove = (id) => {
    setOverlays((o) => o.filter((x) => x.id !== id));
    setTimeout(onCommit, 0);
  };
  const rename = (id, name) => {
    setOverlays((o) => o.map((x) => x.id === id ? { ...x, name } : x));
    setTimeout(onCommit, 0);
  };

  const handleAddImage = (e) => {
    const file = e.target.files?.[0];
    if (!file || !onAddImageLayer) return;
    const reader = new FileReader();
    reader.onload = (ev) => onAddImageLayer(ev.target.result, file.name);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="p-4 space-y-2" data-testid="layers-panel">
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          data-testid="add-image-layer-button"
          className="flex-1 bg-garuda-gold text-black py-2 rounded-sm text-xs font-semibold hover:bg-garuda-goldHover flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Add Image Layer
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          data-testid="image-layer-file-input"
          onChange={handleAddImage}
        />
      </div>

      <p className="text-[11px] text-garuda-textSecondary leading-relaxed mb-2">
        Reorder • Rename (dbl-click) • Show/Hide • Delete. Base image is locked at bottom.
      </p>

      {reordered.length === 0 && (
        <div className="text-center text-xs text-garuda-textTertiary py-6">No layers yet.</div>
      )}

      {reordered.map((t, revIdx) => {
        const isTop = revIdx === 0;
        const isBottom = revIdx === reordered.length - 1;
        return (
          <LayerRow
            key={t.id}
            layer={t}
            isTop={isTop}
            isBottom={isBottom}
            onUp={() => move(t.id, +1)}
            onDown={() => move(t.id, -1)}
            onToggle={() => toggle(t.id)}
            onDelete={() => remove(t.id)}
            onRename={(name) => rename(t.id, name)}
          />
        );
      })}

      {/* Base image layer */}
      {hasImage && (
        <div className="flex items-center gap-2 p-2 bg-garuda-canvas border border-garuda-borderSubtle rounded-sm opacity-80" data-testid="layer-base-image">
          <ImageIcon className="w-4 h-4 text-garuda-textTertiary" />
          <span className="flex-1 text-xs truncate">{imageName || "Base image"}</span>
          <Lock className="w-3.5 h-3.5 text-garuda-textTertiary" />
        </div>
      )}
    </div>
  );
}

function LayerRow({ layer, isTop, isBottom, onUp, onDown, onToggle, onDelete, onRename }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(layer.name || layer.text || (layer.kind === "image" ? "Image layer" : "Text layer"));

  const commit = () => {
    onRename(val || "Layer");
    setEditing(false);
  };

  const isImage = layer.kind === "image";

  return (
    <div
      className="flex items-center gap-2 p-2 bg-garuda-surface border border-garuda-border rounded-sm hover:border-garuda-gold transition-colors group"
      data-testid={`layer-row-${layer.id}`}
    >
      {isImage ? (
        <img src={layer.src} alt="" className="w-7 h-7 object-cover rounded-sm shrink-0 border border-garuda-border" />
      ) : (
        <Type className="w-4 h-4 text-garuda-gold shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            value={val}
            autoFocus
            onChange={(e) => setVal(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
            data-testid={`layer-rename-input-${layer.id}`}
            className="w-full bg-transparent text-xs border-b border-garuda-gold outline-none"
          />
        ) : (
          <button
            onDoubleClick={() => setEditing(true)}
            data-testid={`layer-name-${layer.id}`}
            className="w-full text-left text-xs truncate block"
            style={!isImage ? { fontFamily: fontStack(layer.font || "IBM Plex Sans"), fontWeight: layer.bold ? 700 : 400 } : {}}
          >
            {layer.name || layer.text || (isImage ? "Image" : "Text")}
          </button>
        )}
        <div className="text-[9px] text-garuda-textTertiary uppercase tracking-wider">
          {isImage ? "image" : (layer.font || "text")} {!isImage && `• ${layer.size || 48}px`}
        </div>
      </div>
      <button onClick={onUp} disabled={isTop} data-testid={`layer-up-${layer.id}`}
        className="p-1 text-garuda-textSecondary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
        <ChevronUp className="w-3.5 h-3.5" />
      </button>
      <button onClick={onDown} disabled={isBottom} data-testid={`layer-down-${layer.id}`}
        className="p-1 text-garuda-textSecondary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      <button onClick={onToggle} data-testid={`layer-toggle-${layer.id}`}
        className="p-1 text-garuda-textSecondary hover:text-white">
        {layer.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
      <button onClick={onDelete} data-testid={`layer-delete-${layer.id}`}
        className="p-1 text-garuda-textSecondary hover:text-destructive">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
