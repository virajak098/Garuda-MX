import React, { useState } from "react";
import { Loader2, Focus, Brush, Eraser } from "lucide-react";
import { SliderRow } from "./TextPanel";

/**
 * BlurPanel — three modes:
 *  - standard: uniform CSS blur on whole image (adjust.blur + smoothness)
 *  - background: AI-powered subject/background separation + blur
 *  - manual: paint areas to blur with a brush
 */
export default function BlurPanel({
  adjust, setAdjust,
  bgBlur, setBgBlur,
  bgSmooth, setBgSmooth,
  onCommit,
  onApplyBackgroundBlur,
  aiLoading,
  smoothness, setSmoothness,
  brushBlurMode, setBrushBlurMode,
  brushBlurSize, setBrushBlurSize,
  brushBlurStrength, setBrushBlurStrength,
  hasBrushBlur,
  onApplyManualBlur,
  onClearManualBlur,
}) {
  const [tab, setTab] = useState("standard");

  return (
    <div className="p-4 space-y-4" data-testid="blur-panel">
      <div className="flex gap-1 bg-garuda-surface rounded-sm p-1">
        {[
          { id: "standard", label: "Uniform" },
          { id: "background", label: "Background" },
          { id: "manual", label: "Manual" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              if (setBrushBlurMode) setBrushBlurMode(t.id === "manual");
            }}
            data-testid={`blur-tab-${t.id}`}
            className={`flex-1 text-[11px] uppercase tracking-wider py-1.5 rounded-sm transition-colors ${
              tab === t.id
                ? "bg-garuda-gold text-black font-bold"
                : "text-garuda-textSecondary hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "standard" && (
        <div className="space-y-3" data-testid="blur-standard-panel">
          <p className="text-[11px] text-garuda-textSecondary leading-relaxed">
            Apply a uniform blur over the whole image. Smoothness softens grain and fine detail.
          </p>
          <SliderRow label="Blur" value={adjust.blur} min={0} max={100} unit="%"
            onChange={(v) => setAdjust((a) => ({ ...a, blur: v }))}
            onCommit={onCommit} testId="slider-standard-blur" />
          <SliderRow label="Smoothness" value={smoothness} min={0} max={100} unit="%"
            onChange={setSmoothness} onCommit={onCommit} testId="slider-standard-smoothness" />
          <button
            onClick={() => { setAdjust((a) => ({ ...a, blur: 0 })); setSmoothness(0); onCommit(); }}
            data-testid="blur-standard-reset"
            className="w-full bg-garuda-surface hover:bg-garuda-surfaceHover border border-garuda-border text-xs py-2 rounded-sm"
          >
            Reset
          </button>
        </div>
      )}

      {tab === "background" && (
        <div className="space-y-3" data-testid="blur-background-panel">
          <div className="flex items-start gap-2 text-[11px] text-garuda-textSecondary leading-relaxed">
            <Focus className="w-3.5 h-3.5 text-garuda-gold mt-0.5 shrink-0" />
            <span>AI auto-detects the subject and blurs the background (portrait-mode bokeh). Preserves hair & edge detail.</span>
          </div>
          <SliderRow label="Blur strength" value={bgBlur} min={0} max={100} unit="%" onChange={setBgBlur} onCommit={() => {}} testId="slider-bg-blur" />
          <SliderRow label="Edge smoothness" value={bgSmooth} min={0} max={100} unit="%" onChange={setBgSmooth} onCommit={() => {}} testId="slider-bg-smoothness" />
          <button
            onClick={onApplyBackgroundBlur}
            disabled={aiLoading}
            data-testid="apply-bg-blur-button"
            className="w-full bg-garuda-gold text-black py-2.5 rounded-sm text-sm font-semibold hover:bg-garuda-goldHover disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Focus className="w-4 h-4" />}
            Apply Background Blur
          </button>
          <p className="text-[10px] text-garuda-textTertiary">AI call may take 15–40s.</p>
        </div>
      )}

      {tab === "manual" && (
        <div className="space-y-3" data-testid="blur-manual-panel">
          <div className="flex items-start gap-2 text-[11px] text-garuda-textSecondary leading-relaxed">
            <Brush className="w-3.5 h-3.5 text-garuda-gold mt-0.5 shrink-0" />
            <span>Paint on the canvas to mark areas. Apply to blur only those regions. Great for privacy, lens blur and selective softening.</span>
          </div>
          <SliderRow label="Brush size" value={brushBlurSize} min={5} max={200} unit="px"
            onChange={setBrushBlurSize} onCommit={() => {}} testId="slider-brush-blur-size" />
          <SliderRow label="Blur strength" value={brushBlurStrength} min={1} max={40} unit="px"
            onChange={setBrushBlurStrength} onCommit={() => {}} testId="slider-brush-blur-strength" />

          <div className="flex gap-2">
            <button
              onClick={onClearManualBlur}
              disabled={!hasBrushBlur}
              data-testid="manual-blur-clear"
              className="flex-1 bg-garuda-surface hover:bg-garuda-surfaceHover border border-garuda-border text-xs py-2 rounded-sm flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <Eraser className="w-3.5 h-3.5" /> Clear
            </button>
            <button
              onClick={onApplyManualBlur}
              disabled={!hasBrushBlur || aiLoading}
              data-testid="manual-blur-apply"
              className="flex-1 bg-garuda-gold text-black py-2 rounded-sm text-xs font-semibold hover:bg-garuda-goldHover disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brush className="w-3.5 h-3.5" />}
              Apply Blur
            </button>
          </div>
          <p className="text-[10px] text-garuda-textTertiary">Tip: lower strength for skin softening, higher strength for background bokeh or redaction.</p>
        </div>
      )}
    </div>
  );
}
