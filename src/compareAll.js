// Runs every deficiency against the same source image in one pass, so the UI can show all of
// them side by side instead of asking someone to flip the dropdown four times and rely on
// memory to compare what changed. Kept free of any canvas/DOM dependency, like simulateImage.js.
import { listDichromacies } from "./cvd.js";
import { simulateImageData } from "./simulateImage.js";

/** Every deficiency this project knows how to simulate, in the order they should be displayed. */
export function listAllDeficiencies() {
  return [...listDichromacies(), "achromatopsia"];
}

/**
 * @param {Uint8ClampedArray} data RGBA pixels, 4 bytes per pixel
 * @returns {{ name: string, data: Uint8ClampedArray }[]} one entry per deficiency, in
 *   `listAllDeficiencies()` order
 */
export function compareAllDeficiencies(data, severity) {
  return listAllDeficiencies().map((name) => ({
    name,
    data: simulateImageData(data, name, severity),
  }));
}
