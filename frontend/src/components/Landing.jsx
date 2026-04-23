import React from "react";
import { Link } from "react-router-dom";
import {
  Sparkles, Sliders, Crop, Wand2, Download,
  Eraser, ArrowUpRight, Layers,
} from "lucide-react";
import { BRAND } from "@/lib/brand";

const features = [
  { icon: Sliders, title: "Precise Adjustments", desc: "Brightness, contrast, saturation, hue, blur — tuned in real time." },
  { icon: Wand2, title: "AI Prompt Editing", desc: "Rewrite your image with a sentence. Powered by Gemini Nano Banana." },
  { icon: Eraser, title: "Background Remove & Blur", desc: "One-click subject isolation and portrait-grade background blur." },
  { icon: Crop, title: "Precision Crop", desc: "Drag 8-handle box, lock aspect, export at any quality." },
  { icon: Layers, title: "Layered Editor", desc: "Stack images & text layers. Reorder, hide, rename — pro style." },
  { icon: Sparkles, title: "Curated Filters", desc: "Vivid, Vintage, Noir, Sepia — color-graded presets." },
  { icon: Download, title: "Export Anywhere", desc: "PNG, JPG, WebP. Native Save-As with custom filename." },
  { icon: Wand2, title: "Face Retouch", desc: "Skin smoothing, teeth whitening, eye brightening — subtle by default." },
];

export default function Landing() {
  return (
    <div data-testid="landing-page" className="min-h-screen bg-garuda-app text-white">
      {/* Nav — brand lockup with logo + text logo */}
      <nav className="h-16 px-6 md:px-10 flex items-center justify-between border-b border-garuda-border bg-garuda-panel/80 backdrop-blur-md sticky top-0 z-50">
        <Link to="/" data-testid="nav-home-link" className="flex items-center gap-3 shrink-0">
          <img src={BRAND.logo} alt="Garuda logo" className="w-9 h-9 rounded-sm object-cover ring-1 ring-garuda-gold/50 shadow-md shadow-garuda-gold/10" />
          <img src={BRAND.textLogo} alt="GARUDA" className="h-6 md:h-7 object-contain hidden sm:block" />
          <span className="text-[10px] ml-1 uppercase tracking-[0.25em] text-garuda-textTertiary font-mono">MX · v1.0</span>
        </Link>
        <div className="flex items-center gap-6 text-sm text-garuda-textSecondary">
          <a href="#features" className="hover:text-white transition-colors hidden sm:block">Features</a>
          <Link
            to="/editor"
            data-testid="nav-launch-editor-link"
            className="bg-garuda-gold text-black px-4 py-1.5 rounded-sm text-sm font-medium hover:bg-garuda-goldHover transition-colors flex items-center gap-1"
          >
            Launch Editor <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero — banner 16:9 in the background */}
      <section
        data-testid="landing-hero"
        className="relative overflow-hidden min-h-[82vh] flex items-center garuda-grain"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(5,5,5,0.45) 0%, rgba(5,5,5,0.92) 100%), url(${BRAND.banner})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="relative max-w-6xl mx-auto px-6 md:px-10 py-24 w-full">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-garuda-gold font-mono mb-6 animate-fade-in-up">
            <span className="w-8 h-px bg-garuda-gold" /> Image editor · premium
          </div>
          <h1 className="font-heading text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tighter leading-[0.95] text-balance max-w-4xl animate-fade-in-up">
            Edit with the<br />
            <span className="text-garuda-gold">eye of a Garuda.</span>
          </h1>
          <p className="mt-8 text-lg text-garuda-textSecondary max-w-xl leading-relaxed animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            Layered editing, precision crop with 8 handles, portrait-grade background blur
            and native Save-As export. Browser-native, no installs.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <Link
              to="/editor"
              data-testid="hero-start-editing-button"
              className="group bg-garuda-gold text-black px-6 py-3 rounded-sm text-sm font-semibold hover:bg-garuda-goldHover transition-all flex items-center gap-2 garuda-glow"
            >
              Start Editing — Free
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <a
              href="#features"
              data-testid="hero-learn-more-link"
              className="text-sm text-garuda-textSecondary hover:text-white transition-colors border-b border-transparent hover:border-garuda-gold pb-1"
            >
              See every feature →
            </a>
          </div>

          <div className="mt-20 grid grid-cols-3 gap-6 md:gap-10 max-w-lg animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
            {[
              { k: "20+", v: "Pro Tools" },
              { k: "AI", v: "Nano Banana" },
              { k: "0ms", v: "Live Preview" },
            ].map((s) => (
              <div key={s.v} className="border-l border-garuda-gold pl-3">
                <div className="font-heading text-2xl font-bold">{s.k}</div>
                <div className="text-[11px] uppercase tracking-wider text-garuda-textTertiary">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Bento */}
      <section id="features" data-testid="features-section" className="px-6 md:px-10 py-24 max-w-7xl mx-auto">
        <div className="mb-16 flex items-end justify-between flex-wrap gap-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-garuda-gold font-mono mb-3">Toolkit</div>
            <h2 className="font-heading text-4xl md:text-5xl font-bold tracking-tighter max-w-2xl">
              Every tool a serious editor reaches for.
            </h2>
          </div>
          <p className="text-garuda-textSecondary max-w-sm">
            Hand-built for the browser. No plugins, no downloads. Open an image and get to work.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-garuda-border">
          {features.map((f) => (
            <div
              key={f.title}
              data-testid={`feature-card-${f.title.toLowerCase().replace(/\s+/g, "-")}`}
              className="bg-garuda-panel p-8 hover:bg-garuda-surface transition-colors group"
            >
              <f.icon className="w-6 h-6 text-garuda-gold mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="font-heading text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-garuda-textSecondary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Showcase — banner reused */}
      <section className="px-6 md:px-10 pb-24 max-w-7xl mx-auto">
        <div className="relative overflow-hidden border border-garuda-border bg-garuda-panel">
          <img src={BRAND.banner} alt="Garuda banner" className="w-full h-[420px] object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-garuda-app via-garuda-app/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h3 className="font-heading text-3xl md:text-4xl font-bold tracking-tight max-w-xl">
                Built for the moment the image needs to be <span className="text-garuda-gold">perfect.</span>
              </h3>
            </div>
            <Link
              to="/editor"
              data-testid="showcase-try-now-button"
              className="bg-garuda-gold text-black px-6 py-3 rounded-sm text-sm font-semibold hover:bg-garuda-goldHover transition-all whitespace-nowrap"
            >
              Try the Editor →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-garuda-border py-8 px-6 md:px-10 text-xs text-garuda-textTertiary flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <img src={BRAND.logo} alt="Garuda" className="w-7 h-7 rounded-sm object-cover" />
          <img src={BRAND.textLogo} alt="GARUDA" className="h-5 object-contain opacity-80" />
          <span>— pixel-precise editing in the browser.</span>
        </div>
        <div className="font-mono">© 2026</div>
      </footer>
    </div>
  );
}
