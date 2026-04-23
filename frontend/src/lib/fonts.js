// Curated font library for Garuda — 100+ fonts across categories
// Each font entry: { family: 'Google Font Name', category: 'cat', stack: 'css font-family stack' }

export const FONT_CATEGORIES = [
  "all",
  "minimal",
  "ancient",
  "thumbnail",
  "script",
  "display",
  "multilang",
];

export const FONTS = [
  // ---- MINIMAL / MODERN ----
  { family: "Inter", category: "minimal" },
  { family: "Poppins", category: "minimal" },
  { family: "Manrope", category: "minimal" },
  { family: "Outfit", category: "minimal" },
  { family: "DM Sans", category: "minimal" },
  { family: "Space Grotesk", category: "minimal" },
  { family: "Archivo", category: "minimal" },
  { family: "Plus Jakarta Sans", category: "minimal" },
  { family: "Urbanist", category: "minimal" },
  { family: "Figtree", category: "minimal" },
  { family: "Lexend", category: "minimal" },
  { family: "Nunito", category: "minimal" },
  { family: "Work Sans", category: "minimal" },
  { family: "Sora", category: "minimal" },
  { family: "Onest", category: "minimal" },
  { family: "Albert Sans", category: "minimal" },
  { family: "IBM Plex Sans", category: "minimal" },

  // ---- ANCIENT / CLASSICAL / SERIF ----
  { family: "Cinzel", category: "ancient" },
  { family: "Cormorant Garamond", category: "ancient" },
  { family: "Playfair Display", category: "ancient" },
  { family: "Marcellus", category: "ancient" },
  { family: "IM Fell English", category: "ancient" },
  { family: "UnifrakturMaguntia", category: "ancient" },
  { family: "Uncial Antiqua", category: "ancient" },
  { family: "Almendra", category: "ancient" },
  { family: "MedievalSharp", category: "ancient" },
  { family: "Macondo", category: "ancient" },
  { family: "Pirata One", category: "ancient" },
  { family: "Eczar", category: "ancient" },
  { family: "EB Garamond", category: "ancient" },
  { family: "Cormorant Unicase", category: "ancient" },
  { family: "Metamorphous", category: "ancient" },
  { family: "Berkshire Swash", category: "ancient" },
  { family: "Cinzel Decorative", category: "ancient" },
  { family: "DM Serif Display", category: "ancient" },
  { family: "Libre Caslon Display", category: "ancient" },
  { family: "Fraunces", category: "ancient" },

  // ---- YT THUMBNAIL BOLD / IMPACT ----
  { family: "Bebas Neue", category: "thumbnail" },
  { family: "Anton", category: "thumbnail" },
  { family: "Oswald", category: "thumbnail" },
  { family: "Russo One", category: "thumbnail" },
  { family: "Bungee", category: "thumbnail" },
  { family: "Fjalla One", category: "thumbnail" },
  { family: "Archivo Black", category: "thumbnail" },
  { family: "Passion One", category: "thumbnail" },
  { family: "Alfa Slab One", category: "thumbnail" },
  { family: "Bowlby One", category: "thumbnail" },
  { family: "Ultra", category: "thumbnail" },
  { family: "Titan One", category: "thumbnail" },
  { family: "Abril Fatface", category: "thumbnail" },
  { family: "Black Ops One", category: "thumbnail" },
  { family: "Rubik Mono One", category: "thumbnail" },
  { family: "Squada One", category: "thumbnail" },
  { family: "Rozha One", category: "thumbnail" },
  { family: "Shrikhand", category: "thumbnail" },
  { family: "Monoton", category: "thumbnail" },
  { family: "Faster One", category: "thumbnail" },
  { family: "Audiowide", category: "thumbnail" },
  { family: "Orbitron", category: "thumbnail" },
  { family: "Stalinist One", category: "thumbnail" },
  { family: "Righteous", category: "thumbnail" },
  { family: "Staatliches", category: "thumbnail" },
  { family: "Bungee Shade", category: "thumbnail" },
  { family: "Bungee Inline", category: "thumbnail" },
  { family: "Sigmar One", category: "thumbnail" },
  { family: "Paytone One", category: "thumbnail" },
  { family: "Ropa Sans", category: "thumbnail" },

  // ---- SCRIPT / HANDWRITTEN ----
  { family: "Dancing Script", category: "script" },
  { family: "Pacifico", category: "script" },
  { family: "Great Vibes", category: "script" },
  { family: "Sacramento", category: "script" },
  { family: "Caveat", category: "script" },
  { family: "Satisfy", category: "script" },
  { family: "Kalam", category: "script" },
  { family: "Shadows Into Light", category: "script" },
  { family: "Permanent Marker", category: "script" },
  { family: "Allura", category: "script" },
  { family: "Parisienne", category: "script" },
  { family: "Homemade Apple", category: "script" },
  { family: "Indie Flower", category: "script" },
  { family: "Patrick Hand", category: "script" },
  { family: "Architects Daughter", category: "script" },
  { family: "Tangerine", category: "script" },
  { family: "Yellowtail", category: "script" },

  // ---- DISPLAY / FUN ----
  { family: "Lobster", category: "display" },
  { family: "Fredoka", category: "display" },
  { family: "Baloo 2", category: "display" },
  { family: "Chewy", category: "display" },
  { family: "Luckiest Guy", category: "display" },
  { family: "Bangers", category: "display" },
  { family: "Creepster", category: "display" },
  { family: "Press Start 2P", category: "display" },
  { family: "VT323", category: "display" },
  { family: "Major Mono Display", category: "display" },
  { family: "Silkscreen", category: "display" },
  { family: "Rubik Burned", category: "display" },
  { family: "Rubik Glitch", category: "display" },
  { family: "Rubik Wet Paint", category: "display" },
  { family: "Rubik Beastly", category: "display" },
  { family: "Rubik Puddles", category: "display" },
  { family: "Caveat Brush", category: "display" },
  { family: "Ribeye", category: "display" },
  { family: "Gloria Hallelujah", category: "display" },
  { family: "Amatic SC", category: "display" },
  { family: "Fredericka the Great", category: "display" },

  // ---- MULTI-LANGUAGE (Hindi/Arabic/CJK) ----
  { family: "Noto Sans Devanagari", category: "multilang" },
  { family: "Tiro Devanagari Hindi", category: "multilang" },
  { family: "Mukta", category: "multilang" },
  { family: "Hind", category: "multilang" },
  { family: "Martel", category: "multilang" },
  { family: "Yatra One", category: "multilang" },
  { family: "Kalam", category: "multilang" },
  { family: "Noto Sans Arabic", category: "multilang" },
  { family: "Amiri", category: "multilang" },
  { family: "Cairo", category: "multilang" },
  { family: "Noto Sans JP", category: "multilang" },
  { family: "Noto Sans SC", category: "multilang" },
  { family: "Noto Sans KR", category: "multilang" },
];

export const CATEGORY_LABELS = {
  all: "All",
  minimal: "Minimal",
  ancient: "Ancient",
  thumbnail: "Thumbnail",
  script: "Script",
  display: "Display",
  multilang: "Multi-lang",
};

// Build Google Fonts URL to load all families
export function buildGoogleFontsUrl() {
  const families = [...new Set(FONTS.map((f) => f.family))]
    .map((f) => f.replace(/\s+/g, "+") + ":wght@400;700")
    .join("&family=");
  return `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
}

// Helper: CSS font-family stack
export function fontStack(family) {
  return `"${family}", sans-serif`;
}
