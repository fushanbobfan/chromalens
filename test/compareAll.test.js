import test from "node:test";
import assert from "node:assert/strict";
import { listAllDeficiencies, compareAllDeficiencies } from "../src/compareAll.js";
import { listDichromacies } from "../src/cvd.js";

test("listAllDeficiencies includes every dichromacy plus achromatopsia", () => {
  const all = listAllDeficiencies();
  for (const name of listDichromacies()) assert.ok(all.includes(name));
  assert.ok(all.includes("achromatopsia"));
  assert.equal(all.length, listDichromacies().length + 1);
});

test("compareAllDeficiencies returns one entry per deficiency, same order as listAllDeficiencies", () => {
  const data = new Uint8ClampedArray([200, 50, 50, 255]);
  const results = compareAllDeficiencies(data, 1);
  assert.deepEqual(results.map((r) => r.name), listAllDeficiencies());
});

test("compareAllDeficiencies preserves buffer length for every entry", () => {
  const data = new Uint8ClampedArray([200, 50, 50, 255, 10, 20, 30, 128]);
  const results = compareAllDeficiencies(data, 1);
  for (const { data: output } of results) assert.equal(output.length, data.length);
});

test("compareAllDeficiencies at severity 0 leaves every deficiency's colors unchanged", () => {
  const data = new Uint8ClampedArray([120, 40, 200, 255]);
  const results = compareAllDeficiencies(data, 0);
  for (const { data: output } of results) {
    assert.equal(output[0], 120);
    assert.equal(output[1], 40);
    assert.equal(output[2], 200);
  }
});

test("compareAllDeficiencies produces different colors across deficiencies for a color that confuses differently under each", () => {
  const data = new Uint8ClampedArray([230, 50, 60, 255]); // a saturated red
  const results = compareAllDeficiencies(data, 1);
  const byName = Object.fromEntries(results.map((r) => [r.name, r.data]));
  // Protanopia and deuteranopia both collapse red/green but via different matrices — they
  // need not match each other, and tritanopia (blue/yellow) should differ from both.
  assert.notDeepEqual(Array.from(byName.protanopia), Array.from(byName.tritanopia));
  assert.notDeepEqual(Array.from(byName.deuteranopia), Array.from(byName.tritanopia));
});
