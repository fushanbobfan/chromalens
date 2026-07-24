import test from "node:test";
import assert from "node:assert/strict";
import { simulateColor, simulateImageData } from "../src/simulateImage.js";

function solidPixel(r, g, b, a = 255) {
  return new Uint8ClampedArray([r, g, b, a]);
}

test("simulateColor dispatches dichromacies to simulateDichromacy", () => {
  const result = simulateColor("protanopia", 200, 50, 50, 1);
  assert.notEqual(result.r, 200);
});

test("simulateColor dispatches achromatopsia to simulateAchromatopsia", () => {
  const result = simulateColor("achromatopsia", 200, 50, 50, 1);
  assert.equal(result.r, result.g);
  assert.equal(result.g, result.b);
});

test("simulateImageData preserves buffer length and alpha", () => {
  const data = solidPixel(200, 50, 50, 128);
  const output = simulateImageData(data, "protanopia", 1);
  assert.equal(output.length, data.length);
  assert.equal(output[3], 128);
});

test("simulateImageData does not mutate the input buffer", () => {
  const data = solidPixel(200, 50, 50);
  const before = Array.from(data);
  simulateImageData(data, "protanopia", 1);
  assert.deepEqual(Array.from(data), before);
});

test("simulateImageData at severity 0 returns the original colors", () => {
  const data = solidPixel(120, 40, 200);
  const output = simulateImageData(data, "tritanopia", 0);
  assert.equal(output[0], 120);
  assert.equal(output[1], 40);
  assert.equal(output[2], 200);
});

test("simulateImageData handles multiple pixels independently", () => {
  const data = new Uint8ClampedArray([200, 50, 50, 255, 50, 50, 200, 255]);
  const output = simulateImageData(data, "achromatopsia", 1);
  // Each pixel converges to its own gray, not to a shared value across pixels.
  assert.notEqual(output[0], output[4]);
});
