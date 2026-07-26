// Extracts a small palette of dominant colors from an arbitrary image and scores which pairs of
// them become hardest to tell apart under a color vision deficiency — generalizing the
// confusion score (see main.js) beyond the sample image's four fixed swatch pairs to any
// uploaded photo, whose colors nobody hand-picked in advance. Kept free of any canvas/DOM
// dependency, like the rest of the color modules, so it can be tested with a plain typed array.
import { colorDistance } from "./cvd.js";
import { simulateColor } from "./simulateImage.js";

/**
 * Groups every opaque pixel into a coarse color bucket (3 bits per channel, 512 buckets total)
 * and returns the `maxColors` most common buckets' true average color, most common first. A
 * full k-means clustering isn't necessary for "which few colors actually dominate this image" —
 * coarse-bucket-then-average is deterministic, dependency-free, and groups near-identical
 * colors together without merging genuinely distinct hues.
 * @param {Uint8ClampedArray} data RGBA pixels, 4 bytes per pixel
 * @returns {{r: number, g: number, b: number, count: number}[]}
 */
export function extractPalette(data, maxColors = 5) {
  const buckets = new Map();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue; // Fully transparent pixels contribute no visible color.
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = ((r >> 5) << 10) | ((g >> 5) << 5) | (b >> 5);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { count: 0, rSum: 0, gSum: 0, bSum: 0 };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    bucket.rSum += r;
    bucket.gSum += g;
    bucket.bSum += b;
  }

  return [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, maxColors)
    .map((bucket) => ({
      r: Math.round(bucket.rSum / bucket.count),
      g: Math.round(bucket.gSum / bucket.count),
      b: Math.round(bucket.bSum / bucket.count),
      count: bucket.count,
    }));
}

/**
 * Scores every pair of colors in `palette` by how much distinguishability they lose under
 * `deficiency` at `severity`, using the same before/after `colorDistance` comparison as the
 * sample image's confusion score, and returns the `maxPairs` worst (biggest-drop) pairs, worst
 * first. Fewer than two colors has no pairs to score.
 * @param {{r: number, g: number, b: number}[]} palette
 * @returns {{a: {r:number,g:number,b:number}, b: {r:number,g:number,b:number}, before: number, after: number, drop: number}[]}
 */
export function findConfusablePairs(palette, deficiency, severity, maxPairs = 4) {
  const pairs = [];
  for (let i = 0; i < palette.length; i++) {
    for (let j = i + 1; j < palette.length; j++) {
      const a = palette[i];
      const b = palette[j];
      const before = colorDistance(a, b);
      const after = colorDistance(
        simulateColor(deficiency, a.r, a.g, a.b, severity),
        simulateColor(deficiency, b.r, b.g, b.b, severity)
      );
      const percentOfOriginal = before === 0 ? 100 : (after / before) * 100;
      pairs.push({ a, b, before, after, drop: 100 - percentOfOriginal });
    }
  }
  return pairs.sort((x, y) => y.drop - x.drop).slice(0, maxPairs);
}
