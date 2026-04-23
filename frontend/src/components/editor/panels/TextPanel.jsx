import React, { useState, useMemo, useEffect } from "react";
import { Search, Plus, Trash2 } from "lucide-react";
import { FONTS, FONT_CATEGORIES, CATEGORY_LABELS, fontStack } from "@/lib/fonts";

export default function TextPanel({ overlays, setOverlays, onCommit, selectedId, setSelectedId }) {
  const selected = overlays.find((o) => o.id === selectedId);
  const [draft, setDraft] = useState("");
  const [font, setFont] = useState("Bebas Neue");
  const [size, setSize] = useState(64);
  const [bold, setBold] = useState(true);
  const [color, setColor] = useState("#FFFFFF");

  // Stroke
  const [stroke, setStroke] = useState(true);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [strokeColor, setStrokeColor] = useState("#000000");

  // Shadow
  const [shadow, setShadow] = useState(true);
  const [shadowX, setShadowX] = useState(2);
  const [shadowY, setShadowY] = useState(4);
  const [shadowBlur, setShadowBlur] = useState(8);
  const [shadowColor, setShadowColor] = useState("#000000");
  const [shadowOpacity, setShadowOpacity] = useState(70);

  // Search / category
  const [category, setCategory] = useState("all");
  const [q, setQ] = useState("");

  // Sync from selected layer
  useEffect(() => {
    if (!selected) return;
    setDraft(selected.text || "");
    setFont(selected.font || "Bebas Neue");
    setSize(selected.size || 64);
    setBold(selected.bold ?? true);
    setColor(selected.color || "#FFFFFF");
    setStroke(selected.stroke ?? false);
    setStrokeWidth(selected.strokeWidth || 3);
    setStrokeColor(selected.strokeColor || "#000000");
    setShadow(selected.shadow ?? false);
    setShadowX(selected.shadowX || 2);
    setShadowY(selected.shadowY || 4);
    setShadowBlur(selected.shadowBlur || 8);
    // shadowColor stored as rgba; we keep hex picker independent
    setShadowOpacity(70);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredFonts = useMemo(() => {
    return FONTS.filter((f) =>
      (category === "all" || f.category === category) &&
      (q === "" || f.family.toLowerCase().includes(q.toLowerCase()))
    );
  }, [category, q]);

  const shadowRgba = (hex, op) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${op / 100})`;
  };

  // Live-update selected layer as user edits
  useEffect(() => {
    if (!selectedId) return;
    setOverlays((list) =>
      list.map((o) =>
        o.id === selectedId
          ? {
              ...o, text: draft, font, size, bold, color,
              stroke, strokeWidth, strokeColor,
              shadow, shadowX, shadowY, shadowBlur,
              shadowColor: shadowRgba(shadowColor, shadowOpacity),
            }
          : o
      )
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, font, size, bold, color, stroke, strokeWidth, strokeColor, shadow, shadowX, shadowY, shadowBlur, shadowColor, shadowOpacity]);

  const addNew = () => {
    const text = draft.trim() || "Your text";
    const id = Date.now();
    const overlay = {
      id, text, name: text.slice(0, 24), font, size, bold, color,
      stroke, strokeWidth, strokeColor,
      shadow, shadowX, shadowY, shadowBlur,
      shadowColor: shadowRgba(shadowColor, shadowOpacity),
      xPct: 10, yPct: 10, hidden: false,
    };
    setOverlays((o) => [...o, overlay]);
    setSelectedId?.(id);
    setDraft(text === "Your text" ? "" : text);
    setTimeout(onCommit, 0);
  };

  const remove = (id) => {
    setOverlays((o) => o.filter((x) => x.id !== id));
    if (selectedId === id) setSelectedId?.(null);
    setTimeout(onCommit, 0);
  };

  return (
    <div className="p-4 space-y-4" data-testid="text-panel">
      {/* Input */}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        data-testid="text-input"
        placeholder="Type text (supports हिन्दी, 日本語, العربية...)"
        className="w-full bg-garuda-surface border border-garuda-border rounded-sm px-3 py-2 text-sm outline-none focus:border-garuda-gold"
      />

      {selected ? (
        <div className="text-[10px] uppercase tracking-[0.2em] text-garuda-gold font-mono">
          Editing layer • drag on canvas to move
        </div>
      ) : (
        <button
          onClick={addNew}
          disabled={!draft.trim()}
          data-testid="add-text-button"
          className="w-full bg-garuda-gold text-black py-2.5 rounded-sm text-sm font-semibold hover:bg-garuda-goldHover disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Text Layer
        </button>
      )}

      {/* Font preview */}
      <div
        className="bg-garuda-canvas border border-garuda-border rounded-sm px-3 py-4 text-center truncate"
        style={{
          fontFamily: fontStack(font),
          fontWeight: bold ? 700 : 400,
          color,
          WebkitTextStroke: stroke ? `${strokeWidth}px ${strokeColor}` : "none",
          textShadow: shadow
            ? `${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowRgba(shadowColor, shadowOpacity)}`
            : "none",
          fontSize: "28px",
        }}
      >
        {draft || "Aa Bb Cc 123"}
      </div>

      {/* Font picker */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-garuda-textSecondary">
          <span>Font</span>
          <span className="text-garuda-gold font-mono normal-case tracking-normal truncate flex-1" style={{ fontFamily: fontStack(font) }}>
            {font}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {FONT_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              data-testid={`font-category-${c}`}
              className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-sm transition-colors ${
                category === c
                  ? "bg-garuda-gold text-black font-bold"
                  : "bg-garuda-surface text-garuda-textSecondary hover:text-white"
              }`}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-garuda-textTertiary" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="font-search-input"
            placeholder="Search fonts..."
            className="w-full pl-7 bg-garuda-surface border border-garuda-border rounded-sm px-2 py-1.5 text-xs outline-none focus:border-garuda-gold"
          />
        </div>
        <div className="max-h-48 overflow-y-auto border border-garuda-border rounded-sm bg-garuda-canvas" data-testid="font-list">
          {filteredFonts.map((f, idx) => (
            <button
              key={`${f.family}-${f.category}-${idx}`}
              onClick={() => setFont(f.family)}
              data-testid={`font-option-${f.family.replace(/\s+/g, "-")}`}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-garuda-surfaceHover border-b border-garuda-borderSubtle last:border-b-0 transition-colors ${
                font === f.family ? "bg-garuda-goldMuted text-garuda-gold" : "text-white"
              }`}
              style={{ fontFamily: fontStack(f.family), fontWeight: 700 }}
            >
              {f.family}
            </button>
          ))}
          {filteredFonts.length === 0 && (
            <div className="p-4 text-xs text-garuda-textTertiary text-center">No fonts</div>
          )}
        </div>
      </div>

      {/* Size + bold + color */}
      <div className="space-y-2">
        <SliderRow label="Size" value={size} min={8} max={300} unit="px" onChange={setSize} onCommit={onCommit} testId="text-size-slider" />
        <div className="flex gap-2 items-center">
          <label className="text-[11px] uppercase tracking-wider text-garuda-textSecondary flex-1">Fill</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
            data-testid="text-color-input"
            className="w-10 h-7 bg-transparent border border-garuda-border rounded-sm cursor-pointer" />
          <button onClick={() => setBold(!bold)}
            data-testid="text-bold-toggle"
            className={`px-3 h-7 rounded-sm text-sm font-bold border ${bold ? "bg-garuda-goldMuted border-garuda-gold text-garuda-gold" : "bg-garuda-surface border-garuda-border text-garuda-textSecondary"}`}>B</button>
        </div>
      </div>

      {/* Stroke */}
      <CollapsibleSection title="Stroke / Outline" enabled={stroke} onToggle={() => setStroke(!stroke)} testId="stroke-section">
        <SliderRow label="Width" value={strokeWidth} min={0} max={20} unit="px" onChange={setStrokeWidth} onCommit={onCommit} testId="stroke-width-slider" />
        <div className="flex gap-2 items-center">
          <label className="text-[11px] uppercase tracking-wider text-garuda-textSecondary flex-1">Color</label>
          <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)}
            data-testid="stroke-color-input"
            className="w-10 h-7 bg-transparent border border-garuda-border rounded-sm cursor-pointer" />
        </div>
      </CollapsibleSection>

      {/* Shadow */}
      <CollapsibleSection title="Shadow" enabled={shadow} onToggle={() => setShadow(!shadow)} testId="shadow-section">
        <SliderRow label="Offset X" value={shadowX} min={-40} max={40} unit="px" onChange={setShadowX} onCommit={onCommit} testId="shadow-x-slider" />
        <SliderRow label="Offset Y" value={shadowY} min={-40} max={40} unit="px" onChange={setShadowY} onCommit={onCommit} testId="shadow-y-slider" />
        <SliderRow label="Blur" value={shadowBlur} min={0} max={80} unit="px" onChange={setShadowBlur} onCommit={onCommit} testId="shadow-blur-slider" />
        <SliderRow label="Opacity" value={shadowOpacity} min={0} max={100} unit="%" onChange={setShadowOpacity} onCommit={onCommit} testId="shadow-opacity-slider" />
        <div className="flex gap-2 items-center">
          <label className="text-[11px] uppercase tracking-wider text-garuda-textSecondary flex-1">Color</label>
          <input type="color" value={shadowColor} onChange={(e) => setShadowColor(e.target.value)}
            data-testid="shadow-color-input"
            className="w-10 h-7 bg-transparent border border-garuda-border rounded-sm cursor-pointer" />
        </div>
      </CollapsibleSection>

      {/* Existing layers quick-pick */}
      {overlays.length > 0 && (
        <div className="space-y-1 pt-3 border-t border-garuda-border">
          <div className="text-[10px] uppercase tracking-[0.2em] font-mono text-garuda-textSecondary mb-1">Layers ({overlays.length})</div>
          {overlays.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelectedId?.(t.id)}
              data-testid={`text-layer-${t.id}`}
              className={`flex items-center justify-between text-xs py-1.5 px-2 rounded-sm cursor-pointer ${
                t.id === selectedId ? "bg-garuda-goldMuted border border-garuda-gold" : "bg-garuda-surface hover:bg-garuda-surfaceHover"
              }`}
            >
              <span className="truncate flex-1" style={{ fontFamily: fontStack(t.font), fontWeight: t.bold ? 700 : 400 }}>{t.name || t.text}</span>
              <button onClick={(e) => { e.stopPropagation(); remove(t.id); }} className="text-garuda-textTertiary hover:text-destructive p-1">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SliderRow({ label, value, min, max, unit, onChange, onCommit, testId }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] text-garuda-textSecondary mb-1">
        <span className="uppercase tracking-wider">{label}</span>
        <span className="font-mono text-white">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        data-testid={testId}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseUp={onCommit} onTouchEnd={onCommit}
        className="w-full accent-garuda-gold" />
    </div>
  );
}

function CollapsibleSection({ title, enabled, onToggle, children, testId }) {
  return (
    <div className="border border-garuda-border rounded-sm" data-testid={testId}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-garuda-surface transition-colors"
      >
        <span className="uppercase tracking-wider text-garuda-textSecondary">{title}</span>
        <span className={`w-8 h-4 rounded-full relative transition-colors ${enabled ? "bg-garuda-gold" : "bg-garuda-border"}`}>
          <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-black transition-all ${enabled ? "left-4" : "left-0.5"}`} />
        </span>
      </button>
      {enabled && <div className="p-3 space-y-2 border-t border-garuda-border">{children}</div>}
    </div>
  );
}
