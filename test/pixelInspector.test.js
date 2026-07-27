import test from "node:test";
import assert from "node:assert/strict";
import { rgbToHex, describePixel } from "../src/pixelInspector.js";

test("rgbToHex formats black as #000000", () => {
  assert.equal(rgbToHex({ r: 0, g: 0, b: 0 }), "#000000");
});

test("rgbToHex formats white as #FFFFFF", () => {
  assert.equal(rgbToHex({ r: 255, g: 255, b: 255 }), "#FFFFFF");
});

test("rgbToHex zero-pads single-digit channel values", () => {
  assert.equal(rgbToHex({ r: 5, g: 10, b: 0 }), "#050A00");
});

test("rgbToHex formats a mid-range color, uppercase", () => {
  assert.equal(rgbToHex({ r: 230, g: 57, b: 70 }), "#E63946");
});

test("describePixel reports zero distance when original and displayed match", () => {
  const pixel = { r: 100, g: 150, b: 200 };
  const result = describePixel(pixel, pixel);
  assert.equal(result.distance, 0);
  assert.equal(result.original.hex, result.displayed.hex);
});

test("describePixel reports the straight-line distance between differing colors", () => {
  const result = describePixel({ r: 0, g: 0, b: 0 }, { r: 3, g: 4, b: 0 });
  assert.equal(result.distance, 5);
});

test("describePixel attaches the correct hex string to each side independently", () => {
  const result = describePixel({ r: 255, g: 0, b: 0 }, { r: 0, g: 255, b: 0 });
  assert.equal(result.original.hex, "#FF0000");
  assert.equal(result.displayed.hex, "#00FF00");
});

test("describePixel preserves the original r/g/b fields alongside the added hex", () => {
  const result = describePixel({ r: 10, g: 20, b: 30 }, { r: 40, g: 50, b: 60 });
  assert.deepEqual(
    { r: result.original.r, g: result.original.g, b: result.original.b },
    { r: 10, g: 20, b: 30 }
  );
  assert.deepEqual(
    { r: result.displayed.r, g: result.displayed.g, b: result.displayed.b },
    { r: 40, g: 50, b: 60 }
  );
});
