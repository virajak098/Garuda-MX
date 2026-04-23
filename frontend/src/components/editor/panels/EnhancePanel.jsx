import React from "react";
import { Loader2, Sparkles, Sun, Droplets, ZoomIn, Moon, Gem, Wand2 } from "lucide-react";

const OPTIONS = [
  { id: "auto", label: "Auto Enhance", icon: Sparkles, desc: "Balanced pro-grade enhancement" },
  { id: "hdr", label: "HDR", icon: Sun, desc: "Recover shadow/highlight detail" },
  { id: "sharpen", label: "Sharpen", icon: Gem, desc: "Crisp detail, clean edges" },
  { id: "denoise", label: "Denoise", icon: Droplets, desc: "Remove grain, preserve texture" },
  { id: "upscale", label: "AI Upscale", icon: ZoomIn, desc: "Super-resolution upscale" },
  { id: "color_pop", label: "Color Pop", icon: Wand2, desc: "Cinematic vibrant grade" },
  { id: "lowlight", label: "Low-light Fix", icon: Moon, desc: "Fix dark / night photos" },
];

export default function EnhancePanel({ onEnhance, loading }) {
  return (
    <div className="p-4 space-y-2" data-testid="enhance-panel">
      <p className="text-[11px] text-garuda-textSecondary leading-relaxed mb-2">
        AI-powered photo enhancement. Each takes 15–40s.
      </p>
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          onClick={() => onEnhance(o.id)}
          disabled={loading}
          data-testid={`enhance-${o.id}`}
          className="w-full bg-garuda-surface hover:bg-garuda-surfaceHover border border-garuda-border hover:border-garuda-gold rounded-sm p-3 text-left transition-all disabled:opacity-50 group flex items-start gap-3"
        >
          <o.icon className="w-5 h-5 text-garuda-gold shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">{o.label}</div>
            <div className="text-[11px] text-garuda-textSecondary">{o.desc}</div>
          </div>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-garuda-gold shrink-0" />}
        </button>
      ))}
    </div>
  );
}
