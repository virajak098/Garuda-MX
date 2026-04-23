import React, { useRef, useEffect, useImperativeHandle, forwardRef } from "react";

/**
 * Transparent overlay canvas positioned exactly over the image.
 * User can paint with a brush; produces a mask (black/white PNG) on demand.
 * Props:
 *  - imageRect: { left, top, width, height }
 *  - imageNaturalWidth, imageNaturalHeight: real pixel size of base image (for mask export)
 *  - brushSize
 *  - enabled
 */
const MaskBrushCanvas = forwardRef(function MaskBrushCanvas(
  { imageRect, imageNaturalWidth, imageNaturalHeight, brushSize, enabled, onDrawStart, onDrawEnd },
  ref
) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);

  // Resize internal canvas to natural image size so mask is accurate
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !imageNaturalWidth || !imageNaturalHeight) return;
    c.width = imageNaturalWidth;
    c.height = imageNaturalHeight;
  }, [imageNaturalWidth, imageNaturalHeight]);

  useImperativeHandle(ref, () => ({
    clear: () => {
      const c = canvasRef.current;
      if (c) {
        const ctx = c.getContext("2d");
        ctx.clearRect(0, 0, c.width, c.height);
      }
    },
    hasMask: () => {
      const c = canvasRef.current;
      if (!c) return false;
      const ctx = c.getContext("2d");
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) return true;
      }
      return false;
    },
    exportMask: () => {
      // Output white-on-black mask
      const src = canvasRef.current;
      if (!src) return null;
      const out = document.createElement("canvas");
      out.width = src.width;
      out.height = src.height;
      const outCtx = out.getContext("2d");
      outCtx.fillStyle = "#000";
      outCtx.fillRect(0, 0, out.width, out.height);
      // Use source alpha as white mask
      outCtx.globalCompositeOperation = "source-over";
      outCtx.drawImage(src, 0, 0);
      // Convert any painted color to white
      const img = outCtx.getImageData(0, 0, out.width, out.height);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] > 10) {
          d[i] = 255; d[i + 1] = 255; d[i + 2] = 255; d[i + 3] = 255;
        } else {
          d[i] = 0; d[i + 1] = 0; d[i + 2] = 0; d[i + 3] = 255;
        }
      }
      outCtx.putImageData(img, 0, 0);
      return out.toDataURL("image/png");
    },
  }));

  if (!enabled || !imageRect || !imageNaturalWidth) return null;

  const toCanvasCoords = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * imageNaturalWidth;
    const y = (e.clientY - rect.top) / rect.height * imageNaturalHeight;
    return { x, y };
  };

  const drawAt = (ctx, x, y) => {
    const scale = imageNaturalWidth / imageRect.width;
    const size = brushSize * scale;
    ctx.fillStyle = "rgba(255,0,255,0.65)";
    ctx.strokeStyle = "rgba(255,0,255,0.65)";
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (last.current) {
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    last.current = { x, y };
  };

  const onDown = (e) => {
    drawing.current = true;
    last.current = null;
    onDrawStart?.();
    const { x, y } = toCanvasCoords(e);
    drawAt(canvasRef.current.getContext("2d"), x, y);
  };
  const onMove = (e) => {
    if (!drawing.current) return;
    const { x, y } = toCanvasCoords(e);
    drawAt(canvasRef.current.getContext("2d"), x, y);
  };
  const onUp = () => {
    drawing.current = false;
    last.current = null;
    onDrawEnd?.();
  };

  return (
    <canvas
      ref={canvasRef}
      data-testid="mask-brush-canvas"
      className="absolute cursor-crosshair z-30"
      style={{
        left: imageRect.left,
        top: imageRect.top,
        width: imageRect.width,
        height: imageRect.height,
      }}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
    />
  );
});

export default MaskBrushCanvas;
