import test from "node:test";
import assert from "node:assert/strict";
import { heatmapColor } from "../src/heatmap.js";

test("heatmapColor at zero magnitude is black", () => {
  assert.deepEqual(heatmapColor(0), { r: 0, g: 0, b: 0 });
});

test("heatmapColor at or above the max magnitude is pure yellow", () => {
  assert.deepEqual(heatmapColor(150), { r: 255, g: 255, b: 0 });
  assert.deepEqual(heatmapColor(1000), { r: 255, g: 255, b: 0 });
});

test("heatmapColor at half the max magnitude is pure red", () => {
  assert.deepEqual(heatmapColor(75), { r: 255, g: 0, b: 0 });
});

test("heatmapColor clamps negative magnitudes to black", () => {
  assert.deepEqual(heatmapColor(-50), { r: 0, g: 0, b: 0 });
});

test("heatmapColor's red channel rises monotonically from black to red", () => {
  const low = heatmapColor(10);
  const high = heatmapColor(50);
  assert.ok(high.r > low.r);
  assert.equal(low.g, 0);
  assert.equal(high.g, 0);
});

test("heatmapColor's green channel rises monotonically from red to yellow, with red held at 255", () => {
  const low = heatmapColor(90);
  const high = heatmapColor(140);
  assert.equal(low.r, 255);
  assert.equal(high.r, 255);
  assert.ok(high.g > low.g);
});
