import React from "react";
import { Check, X } from "lucide-react";
import { CROP_RATIOS } from "@/lib/imageUtils";

/**
 * CropPanel — lets the user choose aspect ratio, output format and export quality
 * before applying the crop.
 */
export default function CropPanel({
  activeRatio, setActiveRatio,
  cropFormat = "png", setCropFormat,
  cropQuality = 95, setCropQuality,
  onApply, onCancel,
}) {
  const showQuality = cropFormat !== "png";
  return (
    <div className="p-4 space-y-4" data-testid="crop-panel">
      <p className="text-[11px] text-garuda-textSecondary leading-relaxed">
        Drag any corner or side handle on the canvas. Pick an aspect ratio, output format and quality — then apply.
      </p>

      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-garuda-textSecondary mb-2 font-mono">Aspect ratio</div>
        <div className="grid grid-cols-2 gap-2">
          {CROP_RATIOS.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveRatio(r.id)}
              data-testid={`crop-ratio-${r.id}`}
              className={`px-2 py-2 text-[11px] uppercase tracking-wider rounded-sm border transition-colors ${
                activeRatio === r.id
                  ? "bg-garuda-goldMuted border-garuda-gold text-garuda-gold"
                  : "bg-garuda-surface border-garuda-border text-garuda-textSecondary hover:text-white"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-3 border-t border-garuda-border">
        <div className="text-[10px] uppercase tracking-[0.2em] text-garuda-textSecondary mb-2 font-mono">Output format</div>
        <div className="flex gap-2">
          {["png", "jpg", "webp"].map((f) => (
            <button
              key={f}
              onClick={() => setCropFormat && setCropFormat(f)}
              data-testid={`crop-format-${f}`}
              className={`flex-1 py-1.5 rounded-sm text-[11px] font-mono uppercase ${
                cropFormat === f ? "bg-garuda-gold text-black" : "bg-garuda-surface text-garuda-textSecondary hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {showQuality && (
        <div>
          <div className="flex justify-between text-[11px] text-garuda-textSecondary mb-1.5">
            <span className="uppercase tracking-wider">Quality</span>
            <span className="font-mono text-white">
              {cropQuality}% — {cropQuality < 40 ? "Low" : cropQuality < 75 ? "Medium" : cropQuality < 92 ? "High" : "Max"}
            </span>
          </div>
          <input
            type="range"
            min="10" max="100"
            value={cropQuality}
            onChange={(e) => setCropQuality && setCropQuality(Number(e.target.value))}
            data-testid="crop-quality-slider"
            className="w-full accent-garuda-gold"
          />
          <div className="flex justify-between text-[9px] uppercase tracking-wider text-garuda-textTertiary mt-1 font-mono">
            <span>Low</span><span>Medium</span><span>High</span><span>Max</span>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-3 border-t border-garuda-border">
        <button
          onClick={onCancel}
          data-testid="crop-cancel-button"
          className="flex-1 bg-garuda-surface hover:bg-garuda-surfaceHover border border-garuda-border rounded-sm py-2 text-xs flex items-center justify-center gap-1.5"
        >
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
        <button
          onClick={onApply}
          data-testid="crop-apply-button"
          className="flex-1 bg-garuda-gold text-black rounded-sm py-2 text-xs font-semibold hover:bg-garuda-goldHover flex items-center justify-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" /> Apply Crop
        </button>
      </div>
    </div>
  );
}
