import test from "node:test";
import assert from "node:assert/strict";
import { buildShareUrl, decodeSettingsFromHash } from "../src/shareLink.js";

const BASE_URL = "https://example.com/chromalens/";

test("buildShareUrl round-trips through decodeSettingsFromHash", () => {
  const settings = {
    deficiency: "deuteranopia",
    severity: 0.6,
    viewMode: "heatmap",
    compareAll: true,
    severitySweep: false,
  };
  const url = buildShareUrl(settings, BASE_URL);
  const decoded = decodeSettingsFromHash(new URL(url).hash);
  assert.deepEqual(decoded, settings);
});

test("buildShareUrl rounds severity to a whole percent", () => {
  const url = buildShareUrl(
    { deficiency: "protanopia", severity: 0.333, viewMode: "simulated", compareAll: false, severitySweep: false },
    BASE_URL,
  );
  assert.match(new URL(url).hash, /severity=33(?!\d)/);
});

test("buildShareUrl omits compare and sweep flags when both are off", () => {
  const url = buildShareUrl(
    { deficiency: "tritanopia", severity: 1, viewMode: "daltonize", compareAll: false, severitySweep: false },
    BASE_URL,
  );
  const hash = new URL(url).hash;
  assert.doesNotMatch(hash, /compare=/);
  assert.doesNotMatch(hash, /sweep=/);
});

test("buildShareUrl replaces any existing hash on the base URL", () => {
  const url = buildShareUrl(
    { deficiency: "achromatopsia", severity: 0, viewMode: "simulated", compareAll: false, severitySweep: false },
    `${BASE_URL}#leftover-fragment`,
  );
  assert.doesNotMatch(new URL(url).hash, /leftover-fragment/);
});

test("decodeSettingsFromHash accepts a leading # or not", () => {
  const withHash = decodeSettingsFromHash("#deficiency=protanopia&severity=50&view=simulated");
  const withoutHash = decodeSettingsFromHash("deficiency=protanopia&severity=50&view=simulated");
  assert.deepEqual(withHash, withoutHash);
  assert.equal(withHash.deficiency, "protanopia");
  assert.equal(withHash.severity, 0.5);
});

test("decodeSettingsFromHash returns null for an empty or missing hash", () => {
  assert.equal(decodeSettingsFromHash(""), null);
  assert.equal(decodeSettingsFromHash(undefined), null);
  assert.equal(decodeSettingsFromHash(null), null);
});

test("decodeSettingsFromHash returns null for an unrelated hash rather than throwing", () => {
  assert.equal(decodeSettingsFromHash("#some-other-app-state=42"), null);
});

test("decodeSettingsFromHash rejects an unrecognized deficiency or view mode", () => {
  assert.equal(decodeSettingsFromHash("deficiency=nonsense&severity=50&view=simulated"), null);
  assert.equal(decodeSettingsFromHash("deficiency=protanopia&severity=50&view=nonsense"), null);
});

test("decodeSettingsFromHash rejects a severity outside 0-100 or that isn't a number", () => {
  assert.equal(decodeSettingsFromHash("deficiency=protanopia&severity=-1&view=simulated"), null);
  assert.equal(decodeSettingsFromHash("deficiency=protanopia&severity=101&view=simulated"), null);
  assert.equal(decodeSettingsFromHash("deficiency=protanopia&severity=nonsense&view=simulated"), null);
});

test("decodeSettingsFromHash treats missing compare/sweep flags as false", () => {
  const decoded = decodeSettingsFromHash("deficiency=protanopia&severity=50&view=simulated");
  assert.equal(decoded.compareAll, false);
  assert.equal(decoded.severitySweep, false);
});

test("decodeSettingsFromHash accepts severity 0 and 100 at the boundary", () => {
  assert.equal(decodeSettingsFromHash("deficiency=protanopia&severity=0&view=simulated").severity, 0);
  assert.equal(decodeSettingsFromHash("deficiency=protanopia&severity=100&view=simulated").severity, 1);
});
