// Formats and compares a single pixel's original and currently-displayed colors, so a specific
// point in an image can be inspected directly instead of relying only on the sample's four
// fixed swatch pairs or an uploaded photo's extracted dominant-color palette. Kept free of any
// DOM or canvas dependency, like the rest of the project's color math, so it's unit-tested
// without needing a browser.

import { colorDistance } from "./cvd.js";

function toHex(value) {
  return value.toString(16).padStart(2, "0");
}

/** Formats an `{r, g, b}` triple as an uppercase `#RRGGBB` string. */
export function rgbToHex({ r, g, b }) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Describes one pixel's original and displayed color, plus how far apart they are — the same
 * `colorDistance` measure the confusion scores use, so a single picked pixel's own drop reads
 * on the same scale as the rest of the app.
 */
export function describePixel(original, displayed) {
  return {
    original: { ...original, hex: rgbToHex(original) },
    displayed: { ...displayed, hex: rgbToHex(displayed) },
    distance: colorDistance(original, displayed),
  };
}
