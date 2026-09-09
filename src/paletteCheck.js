// Checks a palette you already have — a list of hex codes pasted straight in — for pairs that
// collapse toward each other under a simulated deficiency. paletteGenerator.js builds a fresh
// palette that clears a worst-case-distance floor; this is the other half of that story: score
// an existing set of colors (a chart legend, a brand palette, a set of map categories) the same
// way, and point at the specific pair and the specific deficiency that fails it.
//
// Like the rest of the color modules it has no DOM or canvas dependency, and it reuses cvd.js's
// simulateColor / colorDistance rather than reimplementing either.
import { colorDistance, hexToRgb } from "./cvd.js";
import { simulateColor } from "./simulateImage.js";
import { rgbToHex } from "./pixelInspector.js";

// The deficiencies whose worst case a pair has to survive, matching paletteGenerator.js.
export const CVD_TYPES = ["protanopia", "deuteranopia", "tritanopia", "achromatopsia"];

// "Distinguishable enough" floor for a straight-line RGB distance, the same target
// paletteGenerator.js's tests hold its generated palettes to. Not a perceptual guarantee —
// a consistent yardstick, deliberately shared with the generator so the two features agree.
export const SAFE_DISTANCE = 40;

const HEX_TOKEN = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Pulls hex colors out of a free-form string: whitespace-, comma-, or semicolon-separated,
 * with or without a leading `#`, in 3- or 6-digit form. Anything that isn't a hex color is
 * collected in `invalid` rather than silently dropped, so the UI can say what it skipped.
 * @param {string} text
 * @returns {{ colors: {hex: string, r: number, g: number, b: number}[], invalid: string[] }}
 */
export function parseHexList(text) {
  const colors = [];
  const invalid = [];
  if (typeof text !== "string") return { colors, invalid };

  for (const raw of text.split(/[\s,;]+/)) {
    const token = raw.trim();
    if (token === "") continue;
    const match = token.match(HEX_TOKEN);
    if (!match) {
      invalid.push(token);
      continue;
    }
    let digits = match[1];
    if (digits.length === 3) {
      digits = digits[0].repeat(2) + digits[1].repeat(2) + digits[2].repeat(2);
    }
    const { r, g, b } = hexToRgb(`#${digits}`);
    colors.push({ hex: rgbToHex({ r, g, b }), r, g, b });
  }
  return { colors, invalid };
}

/**
 * Smallest colorDistance between two colors across the original pair and every deficiency in
 * CVD_TYPES at full severity, plus which view produced that minimum ("original" or a
 * deficiency name). A palette is only as readable as its least readable view, so this — not the
 * plain original-color distance — is what scorePalette ranks pairs by.
 * @returns {{ distance: number, limitedBy: string }}
 */
export function worstCaseSeparation(a, b) {
  let distance = colorDistance(a, b);
  let limitedBy = "original";
  for (const type of CVD_TYPES) {
    const simA = simulateColor(type, a.r, a.g, a.b, 1);
    const simB = simulateColor(type, b.r, b.g, b.b, 1);
    const d = colorDistance(simA, simB);
    if (d < distance) {
      distance = d;
      limitedBy = type;
    }
  }
  return { distance, limitedBy };
}

/**
 * Scores every unordered pair in a palette by worst-case separation, worst pair first.
 *
 * @param {{hex: string, r: number, g: number, b: number}[]} colors
 * @param {{ safeDistance?: number }} [options]
 * @returns {{
 *   pairs: { a: object, b: object, distance: number, limitedBy: string, safe: boolean }[],
 *   worst: object | null,
 *   safeDistance: number,
 *   allClear: boolean,
 * }}
 */
export function scorePalette(colors, { safeDistance = SAFE_DISTANCE } = {}) {
  const list = Array.isArray(colors) ? colors : [];
  const pairs = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const { distance, limitedBy } = worstCaseSeparation(list[i], list[j]);
      pairs.push({
        a: list[i],
        b: list[j],
        distance,
        limitedBy,
        safe: distance >= safeDistance,
      });
    }
  }
  pairs.sort((p, q) => p.distance - q.distance);
  return {
    pairs,
    worst: pairs.length > 0 ? pairs[0] : null,
    safeDistance,
    allClear: pairs.length > 0 && pairs.every((p) => p.safe),
  };
}
