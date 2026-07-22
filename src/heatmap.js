// Maps a color-distance magnitude to a black -> red -> yellow "heat" color, for visualizing
// per-pixel how much a color changed under simulation rather than the simulated color itself.
// Kept as a pure, DOM-free function (like cvd.js) so the color ramp is tested with plain
// numbers.

import { clamp255 } from "./cvd.js";

// A magnitude at or above this is treated as "maximally different" (full yellow) — chosen well
// below the theoretical max distance (~441, black to white) since most real confusions are far
// subtler than a full black/white swap, and clamping here keeps ordinary photos from reading as
// mostly black.
const MAX_MAGNITUDE = 150;

/**
 * @param {number} magnitude a non-negative color distance (see cvd.js's colorDistance)
 * @returns {{r: number, g: number, b: number}}
 */
export function heatmapColor(magnitude) {
  const t = Math.max(0, Math.min(1, magnitude / MAX_MAGNITUDE));
  if (t < 0.5) {
    const s = t / 0.5;
    return { r: clamp255(255 * s), g: 0, b: 0 };
  }
  const s = (t - 0.5) / 0.5;
  return { r: 255, g: clamp255(255 * s), b: 0 };
}
