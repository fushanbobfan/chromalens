// Runs the per-pixel color-vision-deficiency simulation over a whole image buffer, kept free
// of any canvas/DOM dependency so it can be tested with a plain typed array. main.js and
// compareAll.js both build on this instead of duplicating the same per-pixel loop.
import { simulateDichromacy, simulateAchromatopsia } from "./cvd.js";

/** @param {"protanopia"|"deuteranopia"|"tritanopia"|"achromatopsia"} deficiency */
export function simulateColor(deficiency, r, g, b, severity) {
  return deficiency === "achromatopsia"
    ? simulateAchromatopsia(r, g, b, severity)
    : simulateDichromacy(deficiency, r, g, b, severity);
}

/**
 * Simulates `deficiency` at `severity` across every pixel in an RGBA buffer (as found on
 * `ImageData.data`), returning a new buffer rather than mutating the input — callers running
 * several deficiencies against the same source image (see compareAll.js) can reuse it as a
 * clean copy each time instead of re-reading it from a canvas.
 * @param {Uint8ClampedArray} data RGBA pixels, 4 bytes per pixel
 */
export function simulateImageData(data, deficiency, severity) {
  const output = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const result = simulateColor(deficiency, data[i], data[i + 1], data[i + 2], severity);
    output[i] = result.r;
    output[i + 1] = result.g;
    output[i + 2] = result.b;
    output[i + 3] = data[i + 3]; // Alpha is untouched — a vision deficiency doesn't change transparency.
  }
  return output;
}
