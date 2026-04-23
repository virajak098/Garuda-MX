import React from "react";
import { Loader2, Sparkles, Sun, Droplets, ZoomIn, Moon, Gem, Wand2, Zap } from "lucide-react";

const AI_OPTIONS = [
  { id: "auto", label: "Auto Enhance", icon: Sparkles, desc: "Balanced pro-grade enhancement" },
  { id: "hdr", label: "HDR", icon: Sun, desc: "Recover shadow/highlight detail" },
  { id: "sharpen", label: "Sharpen", icon: Gem, desc: "Crisp detail, clean edges" },
  { id: "denoise", label: "Denoise", icon: Droplets, desc: "Remove grain, preserve texture" },
  { id: "upscale", label: "AI Upscale", icon: ZoomIn, desc: "Super-resolution upscale" },
  { id: "color_pop", label: "Color Pop", icon: Wand2, desc: "Cinematic vibrant grade" },
  { id: "lowlight", label: "Low-light Fix", icon: Moon, desc: "Fix dark / night photos" },
];

export default function EnhancePanel({ onEnhance, onMagicEnhance, loading, magicLoading }) {
  return (
    <div className="p-4 space-y-3" data-testid="enhance-panel">
      {/* Instant one-click magic enhance — no AI key required */}
      <button
        onClick={onMagicEnhance}
        disabled={loading || magicLoading}
        data-testid="magic-enhance-button"
        className="w-full bg-gradient-to-r from-garuda-gold to-[#f0a830] text-black py-3 rounded-sm text-sm font-bold hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-garuda-gold/20"
      >
        {magicLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
        Magic Enhance — One Click
      </button>
      <p className="text-[10px] text-garuda-textTertiary leading-relaxed text-center">
        Instant client-side fix · auto-levels · contrast · sharpen · saturation
      </p>

      <div className="pt-3 border-t border-garuda-border">
        <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-garuda-textSecondary mb-2 font-mono flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-garuda-gold" /> AI Garuda MX · Deep Enhance
        </div>
        <p className="text-[11px] text-garuda-textSecondary leading-relaxed mb-3">
          Pick a target. Each takes 15–40s (AI call).
        </p>
        <div className="space-y-2">
          {AI_OPTIONS.map((o) => (
            <button
              key={o.id}
              onClick={() => onEnhance(o.id)}
              disabled={loading || magicLoading}
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
      </div>
    </div>
  );
}
