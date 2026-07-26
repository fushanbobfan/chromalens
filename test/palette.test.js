import test from "node:test";
import assert from "node:assert/strict";
import { extractPalette, findConfusablePairs } from "../src/palette.js";

function pixel(r, g, b, a = 255) {
  return [r, g, b, a];
}

function image(pixels) {
  return new Uint8ClampedArray(pixels.flat());
}

test("extractPalette on a single-color image returns exactly that color", () => {
  const data = image([pixel(200, 50, 50), pixel(200, 50, 50), pixel(200, 50, 50)]);
  const palette = extractPalette(data);
  assert.equal(palette.length, 1);
  assert.equal(palette[0].r, 200);
  assert.equal(palette[0].g, 50);
  assert.equal(palette[0].b, 50);
  assert.equal(palette[0].count, 3);
});

test("extractPalette ignores fully transparent pixels", () => {
  const data = image([pixel(200, 50, 50), pixel(10, 10, 10, 0), pixel(10, 10, 10, 0)]);
  const palette = extractPalette(data);
  assert.equal(palette.length, 1);
  assert.equal(palette[0].r, 200);
});

test("extractPalette orders colors by frequency, most common first", () => {
  const data = image([
    pixel(200, 50, 50),
    pixel(200, 50, 50),
    pixel(200, 50, 50),
    pixel(50, 200, 50),
  ]);
  const palette = extractPalette(data);
  assert.equal(palette.length, 2);
  assert.equal(palette[0].r, 200);
  assert.equal(palette[0].g, 50);
  assert.equal(palette[0].count, 3);
  assert.equal(palette[1].g, 200);
  assert.equal(palette[1].count, 1);
});

test("extractPalette respects maxColors, keeping the most common buckets", () => {
  const data = image([
    pixel(0, 0, 0),
    pixel(0, 0, 0),
    pixel(255, 255, 255),
    pixel(255, 0, 0),
    pixel(0, 255, 0),
  ]);
  const palette = extractPalette(data, 2);
  assert.equal(palette.length, 2);
  assert.equal(palette[0].r, 0);
  assert.equal(palette[0].count, 2);
});

test("extractPalette averages the true colors within a shared bucket rather than snapping to a bucket edge", () => {
  // Both fall in the same coarse bucket (each channel >> 5), so the palette should report their
  // true average rather than either individual color.
  const data = image([pixel(100, 100, 100), pixel(102, 102, 102)]);
  const palette = extractPalette(data);
  assert.equal(palette.length, 1);
  assert.equal(palette[0].r, 101);
});

test("findConfusablePairs returns no pairs for a palette with fewer than two colors", () => {
  assert.deepEqual(findConfusablePairs([], "protanopia", 1), []);
  assert.deepEqual(findConfusablePairs([{ r: 1, g: 2, b: 3 }], "protanopia", 1), []);
});

test("findConfusablePairs scores a known red/green confusion as a large drop under protanopia", () => {
  const palette = [
    { r: 220, g: 20, b: 20 },
    { r: 20, g: 220, b: 20 },
  ];
  const [pair] = findConfusablePairs(palette, "protanopia", 1);
  assert.ok(pair.drop > 50, `expected a large confusion drop, got ${pair.drop}`);
  assert.ok(pair.after < pair.before);
});

test("findConfusablePairs reports no drop at severity 0", () => {
  const palette = [
    { r: 220, g: 20, b: 20 },
    { r: 20, g: 220, b: 20 },
  ];
  const [pair] = findConfusablePairs(palette, "protanopia", 0);
  assert.equal(Math.round(pair.drop), 0);
});

test("findConfusablePairs sorts the worst (biggest-drop) pair first", () => {
  const palette = [
    { r: 220, g: 20, b: 20 }, // red/green: badly confused under protanopia
    { r: 20, g: 220, b: 20 },
    { r: 20, g: 20, b: 220 }, // blue stays clearly distinguishable from red/green
  ];
  const pairs = findConfusablePairs(palette, "protanopia", 1);
  for (let i = 1; i < pairs.length; i++) {
    assert.ok(pairs[i - 1].drop >= pairs[i].drop);
  }
});

test("findConfusablePairs caps the result at maxPairs", () => {
  const palette = [
    { r: 0, g: 0, b: 0 },
    { r: 60, g: 60, b: 60 },
    { r: 120, g: 120, b: 120 },
    { r: 180, g: 180, b: 180 },
    { r: 255, g: 255, b: 255 },
  ];
  const pairs = findConfusablePairs(palette, "achromatopsia", 1, 3);
  assert.equal(pairs.length, 3);
});
