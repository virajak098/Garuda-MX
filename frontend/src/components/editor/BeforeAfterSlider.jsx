import React, { useRef, useState, useEffect } from "react";
import { buildFilterString, buildTransformString } from "@/lib/imageUtils";

/**
 * Before/After draggable split slider.
 * - `originalImage`: first uploaded data URL
 * - `currentImage`: current image (may be AI-edited)
 * - `adjust`, `transform`: applied only to currentImage (right side)
 * Props: enabled (bool), textOverlays
 */
export default function BeforeAfterSlider({
  enabled,
  originalImage,
  currentImage,
  adjust,
  transform,
  textOverlays = [],
  onDisable,
}) {
  const [pos, setPos] = useState(50);
  const containerRef = useRef(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const onMove = (e) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const p = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setPos(p);
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [enabled]);

  if (!enabled || !originalImage || !currentImage) return null;

  const filterStr = buildFilterString(adjust);
  const transformStr = buildTransformString(transform);

  return (
    <div
      ref={containerRef}
      data-testid="before-after-slider"
      className="absolute inset-0 flex items-center justify-center select-none z-30"
    >
      <div className="relative max-w-full max-h-full">
        {/* BEFORE (original) base layer */}
        <img
          src={originalImage}
          alt="before"
          className="block max-w-full max-h-[calc(100vh-10rem)] object-contain shadow-2xl pointer-events-none"
          draggable={false}
        />
        {/* AFTER (edited) clipped to pos */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
        >
          <img
            src={currentImage}
            alt="after"
            className="block max-w-full max-h-[calc(100vh-10rem)] object-contain"
            style={{ filter: filterStr, transform: transformStr }}
            draggable={false}
          />
          {textOverlays.map((t) => (
            <div
              key={t.id}
              style={{
                position: "absolute",
                left: `${t.xPct}%`,
                top: `${t.yPct}%`,
                color: t.color,
                fontSize: `${Math.max(12, (t.size || 48) / 3)}px`,
                fontFamily: t.font || '"IBM Plex Sans", sans-serif',
                fontWeight: t.bold ? 700 : 400,
                textShadow: t.shadow
                  ? `${t.shadowX || 2}px ${t.shadowY || 2}px ${t.shadowBlur || 4}px ${t.shadowColor || "rgba(0,0,0,0.6)"}`
                  : "none",
                WebkitTextStroke: t.stroke ? `${t.strokeWidth || 1}px ${t.strokeColor || "#000"}` : "none",
              }}
            >
              {t.text}
            </div>
          ))}
        </div>
        {/* Divider handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-garuda-gold garuda-glow pointer-events-auto cursor-ew-resize"
          style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
          onMouseDown={() => { dragging.current = true; }}
          onTouchStart={() => { dragging.current = true; }}
          data-testid="before-after-handle"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-garuda-gold text-black flex items-center justify-center text-xs font-bold shadow-xl">
            ⇆
          </div>
        </div>
        {/* Labels */}
        <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm text-white text-[10px] uppercase tracking-[0.25em] font-mono px-2 py-1 rounded-sm">
          Before
        </div>
        <div className="absolute top-3 right-3 bg-garuda-gold text-black text-[10px] uppercase tracking-[0.25em] font-mono px-2 py-1 rounded-sm font-bold">
          After
        </div>
        <button
          onClick={onDisable}
          data-testid="before-after-close"
          className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-3 py-1.5 rounded-sm hover:bg-garuda-gold hover:text-black transition-colors"
        >
          Close Compare
        </button>
      </div>
    </div>
  );
}
