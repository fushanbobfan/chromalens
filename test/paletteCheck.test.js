import test from "node:test";
import assert from "node:assert/strict";
import {
  parseHexList,
  scorePalette,
  worstCaseSeparation,
  SAFE_DISTANCE,
} from "../src/paletteCheck.js";
import { colorDistance } from "../src/cvd.js";

test("parseHexList reads whitespace-, comma-, and semicolon-separated codes", () => {
  const { colors } = parseHexList("#ff0000, #00ff00\n#0000ff ; #ffffff");
  assert.deepEqual(
    colors.map((c) => c.hex),
    ["#FF0000", "#00FF00", "#0000FF", "#FFFFFF"],
  );
});

test("parseHexList accepts a missing '#' and expands 3-digit shorthand", () => {
  const { colors } = parseHexList("f00 0a0 #abc");
  assert.deepEqual(
    colors.map((c) => [c.r, c.g, c.b]),
    [
      [255, 0, 0],
      [0, 170, 0],
      [170, 187, 204],
    ],
  );
});

test("parseHexList collects unparseable tokens instead of dropping them", () => {
  const { colors, invalid } = parseHexList("#123456 nope #12 tomato #abcdef #xyzxyz");
  assert.deepEqual(
    colors.map((c) => c.hex),
    ["#123456", "#ABCDEF"],
  );
  assert.deepEqual(invalid, ["nope", "#12", "tomato", "#xyzxyz"]);
});

test("parseHexList tolerates empty and non-string input", () => {
  assert.deepEqual(parseHexList(""), { colors: [], invalid: [] });
  assert.deepEqual(parseHexList("   \n  "), { colors: [], invalid: [] });
  assert.deepEqual(parseHexList(null), { colors: [], invalid: [] });
});

test("worstCaseSeparation never exceeds the plain original-color distance", () => {
  const a = { r: 200, g: 40, b: 40 };
  const b = { r: 40, g: 160, b: 40 };
  const { distance, limitedBy } = worstCaseSeparation(a, b);
  assert.ok(distance <= colorDistance(a, b) + 1e-9);
  assert.ok(["original", "protanopia", "deuteranopia", "tritanopia", "achromatopsia"].includes(limitedBy));
});

test("worstCaseSeparation blames a red/green pair on a red/green deficiency", () => {
  // a saturated red and green stay far apart to unaffected vision but collapse under
  // protanopia or deuteranopia.
  const { limitedBy, distance } = worstCaseSeparation(
    { r: 210, g: 30, b: 30 },
    { r: 30, g: 160, b: 30 },
  );
  assert.ok(["protanopia", "deuteranopia"].includes(limitedBy));
  assert.ok(distance < colorDistance({ r: 210, g: 30, b: 30 }, { r: 30, g: 160, b: 30 }));
});

test("scorePalette ranks every unordered pair worst-first", () => {
  const { colors } = parseHexList("#ff0000 #00ff00 #0000ff #ffff00");
  const result = scorePalette(colors);
  assert.equal(result.pairs.length, 6); // C(4, 2)
  for (let i = 1; i < result.pairs.length; i++) {
    assert.ok(result.pairs[i - 1].distance <= result.pairs[i].distance);
  }
  assert.equal(result.pairs[0], result.worst);
});

test("scorePalette flags a near-duplicate pair and clears a well-spread one", () => {
  const tight = scorePalette(parseHexList("#2244aa #2547ad #ee7700").colors);
  assert.equal(tight.allClear, false);
  assert.ok(tight.worst.distance < tight.safeDistance);
  assert.equal(tight.worst.safe, false);

  const spread = scorePalette(parseHexList("#000000 #ffffff").colors);
  assert.equal(spread.allClear, true);
  assert.ok(spread.pairs.every((p) => p.safe));
});

test("scorePalette exposes the threshold and honours an override", () => {
  const { colors } = parseHexList("#ff0000 #00ff00");
  assert.equal(scorePalette(colors).safeDistance, SAFE_DISTANCE);
  const strict = scorePalette(colors, { safeDistance: 9999 });
  assert.equal(strict.safeDistance, 9999);
  assert.equal(strict.allClear, false);
});

test("scorePalette handles fewer than two colors", () => {
  assert.deepEqual(scorePalette([]), {
    pairs: [],
    worst: null,
    safeDistance: SAFE_DISTANCE,
    allClear: false,
  });
  assert.deepEqual(scorePalette(parseHexList("#123456").colors).pairs, []);
});
