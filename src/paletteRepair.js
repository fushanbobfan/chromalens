// Suggests the smallest color changes that lift a failing palette over the worst-case-distance
// floor paletteCheck.js grades against. paletteGenerator.js builds a fresh palette from scratch
// and paletteCheck.js points at the pairs that fail; this fills the gap between them for a
// palette that can't simply be replaced — a brand set, an established chart legend — by nudging
// as few colors as possible, each as little as possible, until every pair clears the floor.
//
// Like the other color modules it has no DOM or canvas dependency and reuses the shared
// worst-case separation measure rather than defining its own.
import { colorDistance } from "./cvd.js";
import { rgbToHex } from "./pixelInspector.js";
import { hslToRgb } from "./paletteGenerator.js";
import { SAFE_DISTANCE, scorePalette, worstCaseSeparation } from "./paletteCheck.js";

// How far a single nudge may wander from the original color in HSL space. Hue moves matter most
// for deficiency confusions, lightness moves are what actually separate colors under
// achromatopsia, saturation is a tiebreaker.
const HUE_OFFSETS = [-60, -50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50, 60];
const SATURATION_OFFSETS = [-30, -15, 0, 15, 30];
const LIGHTNESS_OFFSETS = [-30, -20, -10, 0, 10, 20, 30];
const MIN_SL = 8;
const MAX_SL = 92;

/** `{r, g, b}` (0-255) to `{h, s, l}` with h in degrees and s, l in percent. */
export function rgbToHsl({ r, g, b }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s: s * 100, l: l * 100 };
}

function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}

// Every nudged version of a color within the offset grid, as full color objects. A color with
// no saturation has no meaningful hue, so hue offsets are skipped for it; saturation offsets then
// give it one.
function neighborhood(color) {
  const { h, s, l } = rgbToHsl(color);
  const hues = s < 1 ? [0] : HUE_OFFSETS;
  const out = [];
  for (const dh of hues) {
    for (const ds of SATURATION_OFFSETS) {
      for (const dl of LIGHTNESS_OFFSETS) {
        const rgb = hslToRgb(((h + dh) % 360 + 360) % 360, clamp(s + ds, MIN_SL, MAX_SL), clamp(l + dl, MIN_SL, MAX_SL));
        out.push({ ...rgb, hex: rgbToHex(rgb) });
      }
    }
  }
  return out;
}

// Smallest worst-case separation between `candidate` and every color in `others`.
function clearance(candidate, others) {
  let min = Infinity;
  for (const other of others) {
    min = Math.min(min, worstCaseSeparation(candidate, other).distance);
  }
  return min;
}

// Which member of the worst pair to move: the one involved in more failing pairs, since moving
// it can fix several at once; on a tie the later color moves, so the front of a palette — where
// the primary brand color usually sits — is disturbed last.
function pickMover(worst, failing, colors) {
  const ia = colors.indexOf(worst.a);
  const ib = colors.indexOf(worst.b);
  const involvement = (color) => failing.filter((p) => p.a === color || p.b === color).length;
  return involvement(worst.a) > involvement(worst.b) ? ia : ib;
}

/**
 * Nudges colors in `colors` until every pair clears `safeDistance` under every simulated
 * deficiency, or until `maxRounds` moves have been tried. Each round moves one color — a member
 * of the currently worst pair — to the candidate in its HSL neighbourhood that clears the floor
 * against every other color while staying closest to where it was; if nothing in the
 * neighbourhood clears, the candidate with the most clearance is taken instead so later rounds
 * can build on it.
 *
 * @param {{hex: string, r: number, g: number, b: number}[]} colors
 * @param {{ safeDistance?: number, maxRounds?: number }} [options]
 * @returns {{
 *   colors: {hex: string, r: number, g: number, b: number}[],
 *   changes: { index: number, from: object, to: object, shift: number }[],
 *   allClear: boolean,
 *   rounds: number,
 * }}
 */
export function repairPalette(colors, { safeDistance = SAFE_DISTANCE, maxRounds = 24 } = {}) {
  const list = Array.isArray(colors) ? colors.map((c) => ({ ...c })) : [];
  const originals = list.map((c) => ({ ...c }));
  const changed = new Map(); // index -> latest replacement
  let rounds = 0;
  let score = scorePalette(list, { safeDistance });

  while (list.length >= 2 && !score.allClear && rounds < maxRounds) {
    rounds++;
    const failing = score.pairs.filter((p) => !p.safe);
    const index = pickMover(score.worst, failing, list);
    const others = list.filter((_, i) => i !== index);
    const origin = originals[index];

    let best = null;
    let bestShift = Infinity;
    let fallback = null;
    let fallbackClearance = -Infinity;
    for (const candidate of neighborhood(list[index])) {
      const c = clearance(candidate, others);
      const shift = colorDistance(candidate, origin);
      if (c >= safeDistance && shift < bestShift) {
        best = candidate;
        bestShift = shift;
      }
      if (c > fallbackClearance) {
        fallback = candidate;
        fallbackClearance = c;
      }
    }

    const replacement = best || fallback;
    if (!replacement || replacement.hex === list[index].hex) break;
    list[index] = replacement;
    changed.set(index, replacement);
    score = scorePalette(list, { safeDistance });
  }

  const changes = [...changed.entries()]
    .filter(([index, to]) => to.hex !== originals[index].hex)
    .sort((x, y) => x[0] - y[0])
    .map(([index, to]) => ({
      index,
      from: originals[index],
      to,
      shift: colorDistance(originals[index], to),
    }));

  return { colors: list, changes, allClear: score.allClear, rounds };
}
