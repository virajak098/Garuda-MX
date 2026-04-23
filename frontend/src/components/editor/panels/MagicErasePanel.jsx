import React from "react";
import { Loader2, Eraser, Wand2 } from "lucide-react";
import { SliderRow } from "./TextPanel";

export default function MagicErasePanel({
  brushSize, setBrushSize,
  hasMask, onClearMask,
  description, setDescription,
  onApply, loading,
}) {
  return (
    <div className="p-4 space-y-3" data-testid="magic-erase-panel">
      <div className="flex items-start gap-2 text-[11px] text-garuda-textSecondary leading-relaxed">
        <Eraser className="w-3.5 h-3.5 text-garuda-gold mt-0.5 shrink-0" />
        <span>Paint over anything you want removed. AI will inpaint the background naturally.</span>
      </div>
      <SliderRow
        label="Brush size"
        value={brushSize}
        min={5}
        max={150}
        unit="px"
        onChange={setBrushSize}
        onCommit={() => {}}
        testId="erase-brush-size"
      />
      <button
        onClick={onClearMask}
        disabled={!hasMask}
        data-testid="erase-clear-button"
        className="w-full bg-garuda-surface hover:bg-garuda-surfaceHover border border-garuda-border rounded-sm py-2 text-xs disabled:opacity-50"
      >
        Clear Mask
      </button>

      <div className="pt-3 border-t border-garuda-border">
        <div className="text-[10px] uppercase tracking-wider text-garuda-textSecondary mb-1.5">Or describe</div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. the person in red shirt, the logo, the wires..."
          data-testid="erase-description-input"
          className="w-full h-16 bg-garuda-surface border border-garuda-border rounded-sm px-3 py-2 text-sm outline-none focus:border-garuda-gold resize-none"
        />
      </div>

      <button
        onClick={onApply}
        disabled={loading || (!hasMask && !description.trim())}
        data-testid="erase-apply-button"
        className="w-full bg-garuda-gold text-black py-2.5 rounded-sm text-sm font-semibold hover:bg-garuda-goldHover disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
        Erase & Inpaint
      </button>
      <p className="text-[10px] text-garuda-textTertiary text-center">
        AI inpainting • 15–40s • Identity & lighting preserved
      </p>
    </div>
  );
}
