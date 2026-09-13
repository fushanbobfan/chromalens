import test from "node:test";
import assert from "node:assert/strict";
import { relativeLuminance, contrastRatio, wcagRating, WCAG_THRESHOLDS } from "../src/contrast.js";

test("relativeLuminance is 0 for black and 1 for white", () => {
  assert.equal(relativeLuminance({ r: 0, g: 0, b: 0 }), 0);
  assert.equal(relativeLuminance({ r: 255, g: 255, b: 255 }), 1);
});

test("relativeLuminance weights green far more heavily than red or blue", () => {
  // Matches cvd.js's achromatopsia conversion: the eye's luminance response depends far more on
  // green light than red or blue, so equal-magnitude channels contribute very unequally.
  const red = relativeLuminance({ r: 255, g: 0, b: 0 });
  const green = relativeLuminance({ r: 0, g: 255, b: 0 });
  const blue = relativeLuminance({ r: 0, g: 0, b: 255 });
  assert.ok(green > red);
  assert.ok(green > blue);
  assert.ok(red > blue);
});

test("relativeLuminance increases monotonically with a channel's value", () => {
  let previous = -1;
  for (let v = 0; v <= 255; v += 15) {
    const luminance = relativeLuminance({ r: v, g: v, b: v });
    assert.ok(luminance > previous, `luminance should strictly increase at value ${v}`);
    previous = luminance;
  }
});

test("contrastRatio between black and white is exactly 21", () => {
  assert.equal(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }), 21);
});

test("contrastRatio between a color and itself is 1", () => {
  const color = { r: 123, g: 45, b: 200 };
  assert.equal(contrastRatio(color, color), 1);
});

test("contrastRatio doesn't depend on argument order", () => {
  const a = { r: 30, g: 144, b: 255 };
  const b = { r: 255, g: 250, b: 240 };
  assert.equal(contrastRatio(a, b), contrastRatio(b, a));
});

test("contrastRatio is always at least 1 and at most 21", () => {
  let seed = 13579;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return Math.floor((seed / 0x7fffffff) * 256);
  };
  for (let trial = 0; trial < 50; trial++) {
    const a = { r: rand(), g: rand(), b: rand() };
    const b = { r: rand(), g: rand(), b: rand() };
    const ratio = contrastRatio(a, b);
    assert.ok(ratio >= 1 && ratio <= 21, `ratio ${ratio} out of [1, 21] for ${JSON.stringify({ a, b })}`);
  }
});

test("wcagRating reports each threshold independently, right at the boundary", () => {
  assert.deepEqual(wcagRating(WCAG_THRESHOLDS.aaLarge), {
    ratio: WCAG_THRESHOLDS.aaLarge,
    aaNormal: false,
    aaLarge: true,
    aaaNormal: false,
    aaaLarge: false,
  });
  assert.deepEqual(wcagRating(WCAG_THRESHOLDS.aaNormal), {
    ratio: WCAG_THRESHOLDS.aaNormal,
    aaNormal: true,
    aaLarge: true,
    aaaNormal: false,
    aaaLarge: true, // aaNormal's threshold (4.5) equals aaaLarge's, so both clear together
  });
  assert.deepEqual(wcagRating(WCAG_THRESHOLDS.aaaNormal), {
    ratio: WCAG_THRESHOLDS.aaaNormal,
    aaNormal: true,
    aaLarge: true,
    aaaNormal: true,
    aaaLarge: true,
  });
});

test("wcagRating fails every threshold just below aaLarge, the lowest one", () => {
  const rating = wcagRating(WCAG_THRESHOLDS.aaLarge - 0.01);
  assert.equal(rating.aaNormal, false);
  assert.equal(rating.aaLarge, false);
  assert.equal(rating.aaaNormal, false);
  assert.equal(rating.aaaLarge, false);
});

test("wcagRating passes every threshold at the maximum possible ratio", () => {
  const rating = wcagRating(21);
  assert.equal(rating.aaNormal, true);
  assert.equal(rating.aaLarge, true);
  assert.equal(rating.aaaNormal, true);
  assert.equal(rating.aaaLarge, true);
});
