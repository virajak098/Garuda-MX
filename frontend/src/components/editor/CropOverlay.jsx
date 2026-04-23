import React, { useRef, useEffect, useState } from "react";

/**
 * Interactive crop overlay with 8 resize handles (4 corners + 4 edges).
 * Props:
 *  - imageRect: { left, top, width, height } of displayed img in canvas coords
 *  - rectPct: { xPct, yPct, wPct, hPct } 0-100
 *  - onChange(rectPct)
 *  - aspectRatio: number|null (w/h)
 */
export default function CropOverlay({ imageRect, rectPct, onChange, aspectRatio }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(null);

  useEffect(() => {
    const onMove = (e) => {
      if (!drag || !imageRect) return;
      const dx = ((e.clientX - drag.startX) / imageRect.width) * 100;
      const dy = ((e.clientY - drag.startY) / imageRect.height) * 100;
      let r = { ...drag.startRect };
      if (drag.type === "move") {
        r.xPct = Math.max(0, Math.min(100 - r.wPct, r.xPct + dx));
        r.yPct = Math.max(0, Math.min(100 - r.hPct, r.yPct + dy));
      } else if (drag.type === "resize") {
        const { corner } = drag;
        let nx = r.xPct, ny = r.yPct, nw = r.wPct, nh = r.hPct;
        if (corner.includes("e")) nw = Math.max(5, Math.min(100 - nx, r.wPct + dx));
        if (corner.includes("w")) {
          const newX = Math.max(0, Math.min(r.xPct + r.wPct - 5, r.xPct + dx));
          nw = r.wPct + (r.xPct - newX);
          nx = newX;
        }
        if (corner.includes("s")) nh = Math.max(5, Math.min(100 - ny, r.hPct + dy));
        if (corner.includes("n")) {
          const newY = Math.max(0, Math.min(r.yPct + r.hPct - 5, r.yPct + dy));
          nh = r.hPct + (r.yPct - newY);
          ny = newY;
        }
        if (aspectRatio) {
          const pxW = (nw / 100) * imageRect.width;
          const pxH = pxW / aspectRatio;
          nh = (pxH / imageRect.height) * 100;
          if (corner.includes("n")) ny = r.yPct + r.hPct - nh;
          if (ny < 0) { nh += ny; ny = 0; }
          if (ny + nh > 100) nh = 100 - ny;
        }
        r = { xPct: nx, yPct: ny, wPct: nw, hPct: nh };
      }
      onChange(r);
    };
    const onUp = () => setDrag(null);
    if (drag) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      return () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
    }
  }, [drag, imageRect, onChange, aspectRatio]);

  if (!imageRect) return null;

  const style = {
    left: imageRect.left + (rectPct.xPct / 100) * imageRect.width,
    top: imageRect.top + (rectPct.yPct / 100) * imageRect.height,
    width: (rectPct.wPct / 100) * imageRect.width,
    height: (rectPct.hPct / 100) * imageRect.height,
  };

  const start = (type, corner) => (e) => {
    e.stopPropagation();
    setDrag({
      type, corner,
      startX: e.clientX, startY: e.clientY,
      startRect: { ...rectPct },
    });
  };

  const handles = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

  return (
    <div
      ref={ref}
      data-testid="crop-overlay"
      className="absolute border-2 border-garuda-gold cursor-move z-30"
      style={{ ...style, boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)" }}
      onMouseDown={start("move")}
    >
      {/* Rule-of-thirds grid */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
        <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
        <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
        <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
      </div>

      {/* 8 handles: 4 corners (squares) + 4 edges (bars) */}
      {handles.map((c) => {
        const isCorner = c.length === 2;
        const isHoriz = c === "n" || c === "s";
        const isVert = c === "e" || c === "w";

        const base = {
          position: "absolute",
          background: "#f5c542",
          border: "2px solid #0a0a0a",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.25)",
          cursor: `${c}-resize`,
          pointerEvents: "auto",
        };
        let size;
        if (isCorner) {
          size = { width: 14, height: 14 };
        } else if (isHoriz) {
          size = { width: 28, height: 10 };
        } else {
          size = { width: 10, height: 28 };
        }

        const pos = {};
        if (c.includes("n")) pos.top = -7;
        if (c.includes("s")) pos.bottom = -7;
        if (c.includes("e")) pos.right = -7;
        if (c.includes("w")) pos.left = -7;
        if (isHoriz) { pos.left = "50%"; pos.transform = "translateX(-50%)"; }
        if (isVert)  { pos.top  = "50%"; pos.transform = "translateY(-50%)"; }

        return (
          <div
            key={c}
            onMouseDown={start("resize", c)}
            data-testid={`crop-handle-${c}`}
            className="rounded-[2px] hover:scale-110 transition-transform"
            style={{ ...base, ...size, ...pos }}
          />
        );
      })}

      <div className="absolute -top-7 left-0 bg-garuda-gold text-black text-[10px] font-mono px-2 py-0.5 rounded-sm shadow">
        {Math.round(rectPct.wPct)}% × {Math.round(rectPct.hPct)}%
      </div>
    </div>
  );
}
