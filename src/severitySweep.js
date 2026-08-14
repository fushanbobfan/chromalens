// Runs the currently selected deficiency against the same source image at several severities in
// one pass, so the UI can show a gradual progression from unaffected to full instead of only the
// single point the severity slider happens to be at. Kept free of any canvas/DOM dependency,
// like compareAll.js.
import { simulateImageData } from "./simulateImage.js";

/** The severities (0-1) shown by the sweep when the caller doesn't supply its own. */
export function defaultSweepSeverities() {
  return [0, 0.25, 0.5, 0.75, 1];
}

/**
 * @param {Uint8ClampedArray} data RGBA pixels, 4 bytes per pixel
 * @param {"protanopia"|"deuteranopia"|"tritanopia"|"achromatopsia"} deficiency
 * @param {number[]} [severities] defaults to `defaultSweepSeverities()`
 * @returns {{ severity: number, data: Uint8ClampedArray }[]} one entry per severity, in the
 *   order given
 */
export function sweepSeverities(data, deficiency, severities = defaultSweepSeverities()) {
  return severities.map((severity) => ({
    severity,
    data: simulateImageData(data, deficiency, severity),
  }));
}
