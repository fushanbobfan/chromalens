import test from "node:test";
import assert from "node:assert/strict";
import {
  clamp255,
  simulateDichromacy,
  simulateAchromatopsia,
  listDichromacies,
  colorDistance as distance,
  hexToRgb,
} from "../src/cvd.js";

test("clamp255 clamps to the 0-255 range and rounds", () => {
  assert.equal(clamp255(-10), 0);
  assert.equal(clamp255(300), 255);
  assert.equal(clamp255(127.6), 128);
});

test("listDichromacies lists exactly the three supported dichromacies", () => {
  assert.deepEqual(listDichromacies().sort(), ["deuteranopia", "protanopia", "tritanopia"]);
});

test("simulateDichromacy throws on an unknown name", () => {
  assert.throws(() => simulateDichromacy("nonexistent", 100, 100, 100), /Unknown dichromacy/);
});

test("simulateDichromacy at severity 0 returns the original color unchanged", () => {
  for (const name of listDichromacies()) {
    const result = simulateDichromacy(name, 200, 80, 40, 0);
    assert.deepEqual(result, { r: 200, g: 80, b: 40 });
  }
});

test("simulateDichromacy leaves a neutral gray unchanged at full severity", () => {
  // Each matrix's rows sum to 1, so brightness (not just hue) should be preserved for gray.
  for (const name of listDichromacies()) {
    const result = simulateDichromacy(name, 128, 128, 128, 1);
    assert.equal(result.r, 128);
    assert.equal(result.g, 128);
    assert.equal(result.b, 128);
  }
});

test("simulateDichromacy interpolates linearly between original and full severity", () => {
  for (const name of listDichromacies()) {
    const original = { r: 200, g: 60, b: 30 };
    const full = simulateDichromacy(name, original.r, original.g, original.b, 1);
    const half = simulateDichromacy(name, original.r, original.g, original.b, 0.5);
    // The halfway point should sit roughly midway between original and full for every channel.
    for (const channel of ["r", "g", "b"]) {
      const expectedMid = (original[channel] + full[channel]) / 2;
      assert.ok(Math.abs(half[channel] - expectedMid) <= 1, `${name} ${channel} channel not at midpoint`);
    }
  }
});

test("protanopia brings red and green much closer together (the confusion it's named for)", () => {
  const red = { r: 255, g: 0, b: 0 };
  const green = { r: 0, g: 255, b: 0 };
  const before = distance(red, green);
  const after = distance(simulateDichromacy("protanopia", red.r, red.g, red.b, 1), simulateDichromacy("protanopia", green.r, green.g, green.b, 1));
  assert.ok(after < before / 2, `expected red/green to converge under protanopia (before=${before}, after=${after})`);
});

test("deuteranopia also brings red and green much closer together", () => {
  const red = { r: 255, g: 0, b: 0 };
  const green = { r: 0, g: 255, b: 0 };
  const before = distance(red, green);
  const after = distance(simulateDichromacy("deuteranopia", red.r, red.g, red.b, 1), simulateDichromacy("deuteranopia", green.r, green.g, green.b, 1));
  assert.ok(after < before / 2, `expected red/green to converge under deuteranopia (before=${before}, after=${after})`);
});

test("tritanopia brings blue and yellow noticeably closer together", () => {
  const blue = { r: 0, g: 0, b: 255 };
  const yellow = { r: 255, g: 255, b: 0 };
  const before = distance(blue, yellow);
  const after = distance(simulateDichromacy("tritanopia", blue.r, blue.g, blue.b, 1), simulateDichromacy("tritanopia", yellow.r, yellow.g, yellow.b, 1));
  assert.ok(after < before * 0.7, `expected blue/yellow to converge under tritanopia (before=${before}, after=${after})`);
});

test("simulateAchromatopsia at severity 0 returns the original color unchanged", () => {
  assert.deepEqual(simulateAchromatopsia(200, 80, 40, 0), { r: 200, g: 80, b: 40 });
});

test("simulateAchromatopsia at full severity produces an equal r/g/b (true gray)", () => {
  const result = simulateAchromatopsia(200, 80, 40, 1);
  assert.equal(result.r, result.g);
  assert.equal(result.g, result.b);
});

test("simulateAchromatopsia weighs green more than red and blue in the resulting brightness", () => {
  // Pure green should look brighter than pure red or pure blue at equal intensity, matching
  // human luminance perception (BT.709 weights: 0.7152 green vs 0.2126 red, 0.0722 blue).
  const fromGreen = simulateAchromatopsia(0, 255, 0, 1).r;
  const fromRed = simulateAchromatopsia(255, 0, 0, 1).r;
  const fromBlue = simulateAchromatopsia(0, 0, 255, 1).r;
  assert.ok(fromGreen > fromRed);
  assert.ok(fromRed > fromBlue);
});

test("colorDistance is zero for an identical color and positive otherwise", () => {
  const color = { r: 10, g: 20, b: 30 };
  assert.equal(distance(color, color), 0);
  assert.ok(distance(color, { r: 11, g: 20, b: 30 }) > 0);
});

test("colorDistance matches the straight-line distance between pure black and pure white", () => {
  const black = { r: 0, g: 0, b: 0 };
  const white = { r: 255, g: 255, b: 255 };
  assert.ok(Math.abs(distance(black, white) - Math.sqrt(3 * 255 * 255)) < 1e-9);
});

test("hexToRgb parses a #rrggbb string into its component channels", () => {
  assert.deepEqual(hexToRgb("#e63946"), { r: 230, g: 57, b: 70 });
  assert.deepEqual(hexToRgb("#000000"), { r: 0, g: 0, b: 0 });
  assert.deepEqual(hexToRgb("#ffffff"), { r: 255, g: 255, b: 255 });
});

test("hexToRgb works the same with or without the leading #", () => {
  assert.deepEqual(hexToRgb("2a9d8f"), hexToRgb("#2a9d8f"));
});
