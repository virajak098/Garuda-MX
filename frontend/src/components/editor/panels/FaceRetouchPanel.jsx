import React, { useState } from "react";
import { Loader2, ChevronDown, Sparkles } from "lucide-react";
import { SliderRow } from "./TextPanel";

/**
 * FaceRetouchPanel — sections with 0-100 sliders. Each Apply triggers AI call.
 * Props: onRetouch(feature, intensity, params), loading
 */
export default function FaceRetouchPanel({ onRetouch, loading }) {
  const [open, setOpen] = useState("skin_natural");

  // Natural Skin AI
  const [skinSmooth, setSkinSmooth] = useState(50);
  const [skinTexture, setSkinTexture] = useState(70);
  const [skinGlow, setSkinGlow] = useState(30);

  // Teeth / smile
  const [teethInt, setTeethInt] = useState(50);
  const [smileInt, setSmileInt] = useState(30);

  // Eyes
  const [eyeBright, setEyeBright] = useState(40);
  const [eyeSharp, setEyeSharp] = useState(40);
  const [eyeColor, setEyeColor] = useState("");

  // Reshape
  const [jawline, setJawline] = useState(0);
  const [faceSlim, setFaceSlim] = useState(0);
  const [nose, setNose] = useState(0);
  const [chin, setChin] = useState(0);

  // Skin tone
  const [toneInt, setToneInt] = useState(50);

  const toggle = (id) => setOpen(open === id ? "" : id);
  const noop = () => {};

  return (
    <div className="p-3 space-y-2 text-[13px]" data-testid="face-retouch-panel">
      <p className="text-[11px] text-garuda-textSecondary leading-relaxed mb-2">
        Pro face editing. Texture preserved — <span className="text-garuda-gold">no plastic look</span>.
      </p>

      <Section title="Natural Skin AI" id="skin_natural" open={open} onToggle={toggle}>
        <SliderRow label="Smoothness" value={skinSmooth} min={0} max={100} unit="%" onChange={setSkinSmooth} onCommit={noop} testId="face-skin-smooth" />
        <SliderRow label="Texture retain" value={skinTexture} min={0} max={100} unit="%" onChange={setSkinTexture} onCommit={noop} testId="face-skin-texture" />
        <SliderRow label="Glow" value={skinGlow} min={0} max={100} unit="%" onChange={setSkinGlow} onCommit={noop} testId="face-skin-glow" />
        <ApplyBtn
          onClick={() => onRetouch("skin_natural", skinSmooth, { smooth: skinSmooth, texture: skinTexture, glow: skinGlow })}
          loading={loading} testId="face-skin-apply" label="Apply Natural Skin"
        />
      </Section>

      <Section title="Teeth Whitening" id="teeth_whiten" open={open} onToggle={toggle}>
        <SliderRow label="Whitening" value={teethInt} min={0} max={100} unit="%" onChange={setTeethInt} onCommit={noop} testId="face-teeth-int" />
        <ApplyBtn onClick={() => onRetouch("teeth_whiten", teethInt)} loading={loading} testId="face-teeth-apply" label="Whiten Teeth" />
      </Section>

      <Section title="Smile Lift" id="smile_lift" open={open} onToggle={toggle}>
        <SliderRow label="Smile" value={smileInt} min={0} max={100} unit="%" onChange={setSmileInt} onCommit={noop} testId="face-smile-int" />
        <ApplyBtn onClick={() => onRetouch("smile_lift", smileInt)} loading={loading} testId="face-smile-apply" label="Lift Smile" />
      </Section>

      <Section title="Eye Enhance" id="eye_enhance" open={open} onToggle={toggle}>
        <SliderRow label="Brightness" value={eyeBright} min={0} max={100} unit="%" onChange={setEyeBright} onCommit={noop} testId="face-eye-bright" />
        <SliderRow label="Sharpness" value={eyeSharp} min={0} max={100} unit="%" onChange={setEyeSharp} onCommit={noop} testId="face-eye-sharp" />
        <div>
          <div className="text-[11px] uppercase tracking-wider text-garuda-textSecondary mb-1">Color shift (optional)</div>
          <div className="flex flex-wrap gap-1">
            {["", "blue", "green", "hazel", "amber", "gray"].map((c) => (
              <button key={c || "none"} onClick={() => setEyeColor(c)}
                data-testid={`face-eye-color-${c || "none"}`}
                className={`px-2 py-1 text-[10px] uppercase tracking-wider rounded-sm ${
                  eyeColor === c ? "bg-garuda-gold text-black" : "bg-garuda-surface text-garuda-textSecondary hover:text-white"
                }`}>{c || "none"}</button>
            ))}
          </div>
        </div>
        <ApplyBtn
          onClick={() => onRetouch("eye_enhance", Math.max(eyeBright, eyeSharp), { brightness: eyeBright, sharpness: eyeSharp, color: eyeColor })}
          loading={loading} testId="face-eye-apply" label="Enhance Eyes"
        />
      </Section>

      <Section title="Face Reshape" id="face_reshape" open={open} onToggle={toggle}>
        <p className="text-[10px] text-garuda-textTertiary leading-relaxed">Keep subtle for natural look.</p>
        <SliderRow label="Jawline slim" value={jawline} min={0} max={40} unit="%" onChange={setJawline} onCommit={noop} testId="face-reshape-jaw" />
        <SliderRow label="Face slim" value={faceSlim} min={0} max={40} unit="%" onChange={setFaceSlim} onCommit={noop} testId="face-reshape-face" />
        <SliderRow label="Nose refine" value={nose} min={0} max={40} unit="%" onChange={setNose} onCommit={noop} testId="face-reshape-nose" />
        <SliderRow label="Chin" value={chin} min={0} max={40} unit="%" onChange={setChin} onCommit={noop} testId="face-reshape-chin" />
        <ApplyBtn
          onClick={() => onRetouch("face_reshape", Math.max(jawline, faceSlim, nose, chin), { jawline, face_slim: faceSlim, nose, chin })}
          loading={loading} testId="face-reshape-apply" label="Reshape"
        />
      </Section>

      <Section title="Skin Tone" id="skin_tone" open={open} onToggle={toggle}>
        <SliderRow label="Even tone" value={toneInt} min={0} max={100} unit="%" onChange={setToneInt} onCommit={noop} testId="face-tone-int" />
        <ApplyBtn onClick={() => onRetouch("skin_tone", toneInt)} loading={loading} testId="face-tone-apply" label="Even Skin Tone" />
      </Section>

      <Section title="Blemish Remover" id="blemish_remove" open={open} onToggle={toggle}>
        <p className="text-[11px] text-garuda-textSecondary">1-tap removal of pimples & temporary spots. Freckles & moles kept intact.</p>
        <ApplyBtn onClick={() => onRetouch("blemish_remove", 100)} loading={loading} testId="face-blemish-apply" label="Remove Blemishes" />
      </Section>
    </div>
  );
}

function Section({ title, id, open, onToggle, children }) {
  const isOpen = open === id;
  return (
    <div className="border border-garuda-border rounded-sm bg-garuda-canvas" data-testid={`face-section-${id}`}>
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs hover:bg-garuda-surface transition-colors"
      >
        <span className="font-semibold uppercase tracking-wider text-white">{title}</span>
        <ChevronDown className={`w-4 h-4 text-garuda-gold transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && <div className="p-3 space-y-2.5 border-t border-garuda-border">{children}</div>}
    </div>
  );
}

function ApplyBtn({ onClick, loading, testId, label }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      data-testid={testId}
      className="w-full mt-1 bg-garuda-gold text-black py-2 rounded-sm text-xs font-semibold hover:bg-garuda-goldHover disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}
