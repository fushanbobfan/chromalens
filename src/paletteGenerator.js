// Picks a set of colors chosen to stay distinguishable from each other under every deficiency
// this app simulates, not just to unaffected vision — for picking colors for a chart legend or
// UI ahead of time, the opposite direction from palette.js's findConfusablePairs, which checks
// an existing image's colors for confusable pairs after the fact. Kept free of any DOM or canvas
// dependency, like the rest of the color modules, so the selection itself is unit-tested without
// a browser.
import { colorDistance } from "./cvd.js";
import { simulateColor } from "./simulateImage.js";
import { rgbToHex } from "./pixelInspector.js";

const CVD_TYPES = ["protanopia", "deuteranopia", "tritanopia", "achromatopsia"];
const HUE_STEP = 12;
const SATURATIONS = [60, 85];
const LIGHTNESSES = [40, 60];

function hslToRgb(h, s, l) {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  let r1, g1, b1;
  if (h < 60) [r1, g1, b1] = [c, x, 0];
  else if (h < 120) [r1, g1, b1] = [x, c, 0];
  else if (h < 180) [r1, g1, b1] = [0, c, x];
  else if (h < 240) [r1, g1, b1] = [0, x, c];
  else if (h < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

// A fixed grid of candidates in HSL space rather than random sampling, so the generator is
// reproducible: the same `count` always returns the same palette. Mid-range saturation and
// lightness keep every candidate a plausible UI/chart color rather than something near-black or
// near-white, where hue barely matters and most deficiencies already agree.
function buildCandidatePool() {
  const candidates = [];
  for (let h = 0; h < 360; h += HUE_STEP) {
    for (const s of SATURATIONS) {
      for (const l of LIGHTNESSES) {
        candidates.push(hslToRgb(h, s, l));
      }
    }
  }
  return candidates;
}

// The worst-case distance between two colors: the minimum colorDistance across the original
// pair and every simulated deficiency at full severity. A palette is only as distinguishable as
// its least distinguishable view, so this — not the plain original-color distance — is what
// generateAccessiblePalette actually maximizes.
function worstCaseDistance(a, b) {
  let min = colorDistance(a, b);
  for (const type of CVD_TYPES) {
    const simA = simulateColor(type, a.r, a.g, a.b, 1);
    const simB = simulateColor(type, b.r, b.g, b.b, 1);
    min = Math.min(min, colorDistance(simA, simB));
  }
  return min;
}

/**
 * Greedily builds a palette of `count` colors by maximin selection from a fixed candidate pool:
 * the first color is a fixed starting point, and each subsequent one is whichever remaining
 * candidate maximizes its worst-case distance (see worstCaseDistance) to every color already
 * chosen — so the palette stays as distinguishable as possible under every deficiency simulated
 * here, not just to unaffected vision, without needing any one pair to be scored in isolation.
 * @returns {{r: number, g: number, b: number, hex: string}[]}
 */
export function generateAccessiblePalette(count) {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`count must be a positive integer, got ${count}`);
  }
  const pool = buildCandidatePool();
  if (count > pool.length) {
    throw new Error(`count (${count}) exceeds the candidate pool size (${pool.length})`);
  }

  const chosen = [pool[0]];
  while (chosen.length < count) {
    let best = null;
    let bestScore = -Infinity;
    for (const candidate of pool) {
      if (chosen.includes(candidate)) continue;
      const score = Math.min(...chosen.map((c) => worstCaseDistance(c, candidate)));
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    chosen.push(best);
  }

  return chosen.map((c) => ({ ...c, hex: rgbToHex(c) }));
}
