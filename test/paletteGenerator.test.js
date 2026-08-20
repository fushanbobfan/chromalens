import test from "node:test";
import assert from "node:assert/strict";
import { generateAccessiblePalette } from "../src/paletteGenerator.js";
import { colorDistance } from "../src/cvd.js";
import { simulateColor } from "../src/simulateImage.js";

const CVD_TYPES = ["protanopia", "deuteranopia", "tritanopia", "achromatopsia"];

function worstCaseDistance(a, b) {
  let min = colorDistance(a, b);
  for (const type of CVD_TYPES) {
    const simA = simulateColor(type, a.r, a.g, a.b, 1);
    const simB = simulateColor(type, b.r, b.g, b.b, 1);
    min = Math.min(min, colorDistance(simA, simB));
  }
  return min;
}

test("generateAccessiblePalette returns exactly `count` colors", () => {
  for (const count of [1, 2, 5, 8]) {
    assert.equal(generateAccessiblePalette(count).length, count);
  }
});

test("generateAccessiblePalette rejects a non-positive or non-integer count", () => {
  assert.throws(() => generateAccessiblePalette(0));
  assert.throws(() => generateAccessiblePalette(-1));
  assert.throws(() => generateAccessiblePalette(2.5));
});

test("generateAccessiblePalette rejects a count larger than the candidate pool", () => {
  assert.throws(() => generateAccessiblePalette(100000));
});

test("generateAccessiblePalette is deterministic", () => {
  assert.deepEqual(generateAccessiblePalette(6), generateAccessiblePalette(6));
});

test("generateAccessiblePalette never repeats a color", () => {
  const palette = generateAccessiblePalette(8);
  const hexes = new Set(palette.map((c) => c.hex));
  assert.equal(hexes.size, palette.length);
});

test("generateAccessiblePalette each color reports a well-formed hex string", () => {
  const palette = generateAccessiblePalette(4);
  for (const color of palette) {
    assert.match(color.hex, /^#[0-9A-F]{6}$/);
  }
});

test("generateAccessiblePalette keeps small palettes well separated under every simulated deficiency", () => {
  const palette = generateAccessiblePalette(4);
  for (let i = 0; i < palette.length; i++) {
    for (let j = i + 1; j < palette.length; j++) {
      const worst = worstCaseDistance(palette[i], palette[j]);
      assert.ok(worst > 40, `expected worst-case distance > 40, got ${worst.toFixed(1)}`);
    }
  }
});

test("generateAccessiblePalette a larger palette still keeps every pair distinguishable", () => {
  const palette = generateAccessiblePalette(10);
  let minWorst = Infinity;
  for (let i = 0; i < palette.length; i++) {
    for (let j = i + 1; j < palette.length; j++) {
      minWorst = Math.min(minWorst, worstCaseDistance(palette[i], palette[j]));
    }
  }
  assert.ok(minWorst > 0, `expected every pair to remain distinguishable, got ${minWorst}`);
});
