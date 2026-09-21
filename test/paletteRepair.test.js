import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHexList, scorePalette, SAFE_DISTANCE } from "../src/paletteCheck.js";
import { rgbToHsl, repairPalette } from "../src/paletteRepair.js";
import { hslToRgb } from "../src/paletteGenerator.js";

const palette = (text) => parseHexList(text).colors;

test("rgbToHsl inverts hslToRgb on a spread of colors", () => {
  for (const [h, s, l] of [[0, 80, 50], [120, 60, 40], [200, 85, 60], [300, 40, 70], [45, 100, 50]]) {
    const back = rgbToHsl(hslToRgb(h, s, l));
    assert.ok(Math.abs(back.h - h) < 1.5, `hue ${h} -> ${back.h}`);
    assert.ok(Math.abs(back.s - s) < 1.5, `saturation ${s} -> ${back.s}`);
    assert.ok(Math.abs(back.l - l) < 1.5, `lightness ${l} -> ${back.l}`);
  }
});

test("rgbToHsl reports zero saturation and hue for grays", () => {
  assert.deepEqual(rgbToHsl({ r: 128, g: 128, b: 128 }), { h: 0, s: 0, l: (128 / 255) * 100 });
  assert.equal(rgbToHsl({ r: 0, g: 0, b: 0 }).l, 0);
  assert.equal(rgbToHsl({ r: 255, g: 255, b: 255 }).l, 100);
});

test("a failing palette is repaired until every pair clears the floor", () => {
  const colors = palette("#1f77b4 #ff7f0e #2ca02c #d62728 #9467bd");
  assert.equal(scorePalette(colors).allClear, false, "fixture should start out failing");
  const result = repairPalette(colors);
  assert.equal(result.allClear, true);
  assert.equal(scorePalette(result.colors).allClear, true, "the returned colors re-score clean");
  assert.ok(result.changes.length >= 1 && result.changes.length < colors.length, "not every color moves");
  assert.equal(result.colors.length, colors.length);
});

test("near-duplicate blues are pulled apart", () => {
  const result = repairPalette(palette("#336699 #3366aa #3366bb"));
  assert.equal(result.allClear, true);
  const worst = scorePalette(result.colors).worst;
  assert.ok(worst.distance >= SAFE_DISTANCE, `worst pair ${worst.distance}`);
});

test("colors that were never in a failing pair are left untouched", () => {
  const colors = palette("#1f77b4 #ff7f0e #2ca02c #d62728 #9467bd");
  const result = repairPalette(colors);
  const movedIndexes = new Set(result.changes.map((c) => c.index));
  const failingHexes = new Set();
  for (const pair of scorePalette(colors).pairs.filter((p) => !p.safe)) {
    failingHexes.add(pair.a.hex);
    failingHexes.add(pair.b.hex);
  }
  for (let i = 0; i < colors.length; i++) {
    if (movedIndexes.has(i)) {
      assert.ok(failingHexes.has(colors[i].hex), `${colors[i].hex} moved without being in a failing pair`);
    } else {
      assert.equal(result.colors[i].hex, colors[i].hex);
    }
  }
});

test("each change records the original, the replacement and the shift between them", () => {
  const colors = palette("#e41a1c #377eb8 #4daf4a #984ea3 #ff7f00");
  const { changes, colors: repaired } = repairPalette(colors);
  assert.ok(changes.length > 0);
  for (const change of changes) {
    assert.equal(change.from.hex, colors[change.index].hex);
    assert.equal(change.to.hex, repaired[change.index].hex);
    assert.notEqual(change.from.hex, change.to.hex);
    assert.match(change.to.hex, /^#[0-9A-F]{6}$/);
    assert.ok(change.shift > 0);
    for (const ch of ["r", "g", "b"]) {
      assert.ok(Number.isInteger(change.to[ch]) && change.to[ch] >= 0 && change.to[ch] <= 255);
    }
  }
  const indexes = changes.map((c) => c.index);
  assert.deepEqual(indexes, [...indexes].sort((a, b) => a - b), "changes are in palette order");
});

test("a palette that already clears the floor comes back unchanged", () => {
  const colors = palette("#000000 #ffffff #ff8800");
  const result = repairPalette(colors);
  assert.equal(result.allClear, true);
  assert.equal(result.rounds, 0);
  assert.deepEqual(result.changes, []);
  assert.deepEqual(result.colors.map((c) => c.hex), colors.map((c) => c.hex));
});

test("repair is deterministic and never mutates its input", () => {
  const colors = palette("#1f77b4 #ff7f0e #2ca02c #d62728 #9467bd");
  const snapshot = JSON.stringify(colors);
  const a = repairPalette(colors);
  const b = repairPalette(colors);
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(colors), snapshot);
});

test("a stricter floor forces bigger or more moves, and maxRounds bounds the work", () => {
  const colors = palette("#1f77b4 #ff7f0e #2ca02c #d62728 #9467bd");
  const loose = repairPalette(colors, { safeDistance: 30 });
  const strict = repairPalette(colors, { safeDistance: 70 });
  assert.ok(strict.rounds >= loose.rounds);
  assert.equal(loose.allClear, true);
  const strictWorst = scorePalette(strict.colors).worst.distance;
  const looseWorst = scorePalette(loose.colors).worst.distance;
  assert.ok(strictWorst >= looseWorst, `strict ${strictWorst} vs loose ${looseWorst}`);
  const capped = repairPalette(colors, { safeDistance: 70, maxRounds: 1 });
  assert.equal(capped.rounds, 1);
  assert.equal(capped.changes.length, 1);
});

test("fewer than two colors or bad input is returned as-is", () => {
  const one = repairPalette(palette("#123456"));
  assert.equal(one.colors.length, 1);
  assert.deepEqual(one.changes, []);
  assert.equal(one.allClear, false);
  assert.deepEqual(repairPalette(null).colors, []);
  assert.deepEqual(repairPalette(undefined).changes, []);
});
