import test from "node:test";
import assert from "node:assert/strict";
import { defaultSweepSeverities, sweepSeverities } from "../src/severitySweep.js";

function solidPixel(r, g, b, a = 255) {
  return new Uint8ClampedArray([r, g, b, a]);
}

test("defaultSweepSeverities runs from unaffected to full in five even steps", () => {
  assert.deepEqual(defaultSweepSeverities(), [0, 0.25, 0.5, 0.75, 1]);
});

test("sweepSeverities returns one entry per default severity, in that order", () => {
  const data = solidPixel(200, 50, 50);
  const results = sweepSeverities(data, "protanopia");
  assert.deepEqual(
    results.map((r) => r.severity),
    defaultSweepSeverities()
  );
});

test("sweepSeverities preserves buffer length and alpha for every entry", () => {
  const data = solidPixel(200, 50, 50, 128);
  const results = sweepSeverities(data, "deuteranopia");
  for (const { data: output } of results) {
    assert.equal(output.length, data.length);
    assert.equal(output[3], 128);
  }
});

test("sweepSeverities at severity 0 leaves the original colors unchanged", () => {
  const data = solidPixel(120, 40, 200);
  const results = sweepSeverities(data, "tritanopia");
  const unaffected = results.find((r) => r.severity === 0);
  assert.equal(unaffected.data[0], 120);
  assert.equal(unaffected.data[1], 40);
  assert.equal(unaffected.data[2], 200);
});

test("sweepSeverities produces progressively more change as severity rises", () => {
  // A saturated red, which protanopia confuses increasingly with green as severity rises.
  const data = solidPixel(230, 50, 60);
  const results = sweepSeverities(data, "protanopia");
  const drift = results.map((r) => Math.abs(r.data[0] - 230) + Math.abs(r.data[1] - 50));
  for (let i = 1; i < drift.length; i++) {
    assert.ok(drift[i] >= drift[i - 1], `drift should not decrease from step ${i - 1} to ${i}`);
  }
  assert.ok(drift[drift.length - 1] > drift[0], "full severity should differ more than unaffected");
});

test("sweepSeverities honors a custom severities array instead of the default", () => {
  const data = solidPixel(200, 50, 50);
  const results = sweepSeverities(data, "achromatopsia", [0, 1]);
  assert.deepEqual(
    results.map((r) => r.severity),
    [0, 1]
  );
});

test("sweepSeverities works for achromatopsia the same way it does for a dichromacy", () => {
  const data = solidPixel(200, 50, 50);
  const results = sweepSeverities(data, "achromatopsia", [1]);
  const { r, g, b } = { r: results[0].data[0], g: results[0].data[1], b: results[0].data[2] };
  assert.equal(r, g);
  assert.equal(g, b);
});
